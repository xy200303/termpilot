package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"unicode/utf16"
	"unicode/utf8"
)

const helpText = `用法:
  termpilot tools
  termpilot schema [工具名]
  termpilot call <工具名> ['<JSON>']
  termpilot call <工具名> --json-stdin
  termpilot call <工具名> --json-file <路径>

窗口没开时，这条命令会先启动 TermPilot，再把调用送进已经开着的窗口。
命令自己读取本机配置，不用把令牌贴出来。工具和参数与窗口里的 MCP 是同一份。

加 --json 时，结果是一行 {"ok":true,"text":"..."}，中文写成 \u 转义。
参数很长时可以写进文件，用 --json-file，或从标准输入传，用 --json-stdin。

例子:
  termpilot tools
  termpilot schema term_exec
  termpilot call term_list
  termpilot call term_exec --json-file args.json
  termpilot call term_write --json-stdin --json

看文字用 term_lines。截图只在必须看画面时用，返回的是图片路径。`

type endpoint struct {
	Host    string
	Port    string
	Token   string
	Enabled bool
	App     string
	Args    []string
}

type stored struct {
	URL     string   `json:"url"`
	Token   string   `json:"token"`
	Enabled *bool    `json:"enabled"`
	App     string   `json:"app"`
	Args    []string `json:"args"`
}

type launchFile struct {
	App  string   `json:"app"`
	Args []string `json:"args"`
}

type result struct {
	OK   bool   `json:"ok"`
	Text string `json:"text"`
}

type parsedArgs struct {
	op       string
	tool     string
	args     any
	jsonMode bool
}

func main() {
	jsonMode := false
	for _, arg := range os.Args[1:] {
		if arg == "--json" {
			jsonMode = true
			break
		}
	}
	code := 0
	if err := run(); err != nil && !errors.Is(err, errSilent) {
		emit(jsonMode, result{OK: false, Text: err.Error()})
		code = 1
	} else if err != nil {
		code = 1
	}
	os.Exit(code)
}

var errSilent = errors.New("silent")

func run() error {
	parsed, err := parseArgs(os.Args[1:])
	if err != nil {
		return err
	}
	if parsed == nil {
		fmt.Fprintln(os.Stdout, helpText)
		return nil
	}
	cfg, err := connect()
	if err != nil {
		return err
	}
	body := map[string]any{"op": parsed.op}
	if parsed.tool != "" {
		body["tool"] = parsed.tool
	}
	if parsed.args != nil {
		body["args"] = parsed.args
	}
	res, err := post(cfg, body)
	if err != nil {
		return err
	}
	emit(parsed.jsonMode, res)
	if !res.OK {
		return errSilent
	}
	return nil
}

func parseArgs(argv []string) (*parsedArgs, error) {
	var rest []string
	parsed := &parsedArgs{}
	jsonFile := ""
	jsonStdin := false
	for i := 0; i < len(argv); i++ {
		item := argv[i]
		switch item {
		case "--json":
			parsed.jsonMode = true
		case "--json-stdin":
			jsonStdin = true
		case "--json-file":
			if i+1 >= len(argv) || strings.HasPrefix(argv[i+1], "--") {
				return nil, errors.New("缺少 --json-file 的路径")
			}
			i++
			jsonFile = argv[i]
		default:
			rest = append(rest, item)
		}
	}
	if jsonStdin && jsonFile != "" {
		return nil, errors.New("不要同时用 --json-stdin 和 --json-file")
	}
	if len(rest) == 0 || rest[0] == "help" || rest[0] == "--help" || rest[0] == "-h" {
		return nil, nil
	}
	if rest[0] == "tools" {
		parsed.op = "tools"
		return parsed, nil
	}
	if rest[0] == "schema" {
		parsed.op = "schema"
		if len(rest) > 1 {
			parsed.tool = rest[1]
		}
		return parsed, nil
	}
	if rest[0] != "call" {
		return nil, errors.New("用法: termpilot tools | schema [工具名] | call <工具名> [--json-stdin | --json-file 路径]")
	}
	if len(rest) < 2 || strings.HasPrefix(rest[1], "--") {
		return nil, errors.New("用法: termpilot call <工具名> [--json-stdin | --json-file 路径]")
	}
	parsed.op = "call"
	parsed.tool = rest[1]
	inline := ""
	if len(rest) > 2 {
		inline = rest[2]
	}
	if inline != "" && (jsonStdin || jsonFile != "") {
		return nil, errors.New("命令行上的 JSON 不要和 --json-stdin、--json-file 一起用")
	}
	raw := inline
	if jsonStdin {
		buf, err := io.ReadAll(os.Stdin)
		if err != nil {
			return nil, err
		}
		raw = string(buf)
	} else if jsonFile != "" {
		buf, err := os.ReadFile(jsonFile)
		if err != nil {
			return nil, err
		}
		raw = string(buf)
	}
	if jsonStdin || jsonFile != "" {
		if strings.TrimSpace(raw) == "" {
			return nil, fmt.Errorf("参数必须是 JSON 对象，收到: %s", preview(raw))
		}
		args, err := parseObject(raw)
		if err != nil {
			return nil, err
		}
		parsed.args = args
		return parsed, nil
	}
	if strings.TrimSpace(raw) == "" {
		parsed.args = map[string]any{}
		return parsed, nil
	}
	args, err := parseObject(raw)
	if err != nil {
		return nil, err
	}
	parsed.args = args
	return parsed, nil
}

func parseObject(raw string) (map[string]any, error) {
	text := strings.TrimPrefix(strings.TrimSpace(raw), "\uFEFF")
	var args map[string]any
	if err := json.Unmarshal([]byte(text), &args); err != nil || args == nil {
		return nil, fmt.Errorf("参数必须是 JSON 对象，收到: %s", preview(text))
	}
	return args, nil
}

func preview(text string) string {
	out := strings.Join(strings.Fields(text), " ")
	if utf8.RuneCountInString(out) <= 200 {
		return out
	}
	count := 0
	for i := range out {
		if count == 200 {
			return out[:i]
		}
		count++
	}
	return out
}

func connect() (*endpoint, error) {
	cfg, err := readEndpoint()
	if err == nil && !cfg.Enabled {
		_ = wake(cfg)
		return nil, errors.New("请先在 TermPilot 设置里允许助手连接。")
	}
	if err == nil && reachable(cfg) {
		return cfg, nil
	}
	appPath, appArgs := launchTarget(cfg)
	if appPath == "" {
		return nil, errors.New("找不到 TermPilot，先安装并打开一次。")
	}
	if err := startApp(appPath, appArgs); err != nil {
		return nil, fmt.Errorf("无法启动 TermPilot: %s", err.Error())
	}
	deadline := time.Now().Add(45 * time.Second)
	for time.Now().Before(deadline) {
		time.Sleep(300 * time.Millisecond)
		next, readErr := readEndpoint()
		if readErr != nil {
			continue
		}
		if !next.Enabled {
			return nil, errors.New("请先在 TermPilot 设置里允许助手连接。")
		}
		if reachable(next) {
			return next, nil
		}
	}
	return nil, errors.New("TermPilot 没有在规定时间内打开。")
}

func wake(cfg *endpoint) error {
	if cfg != nil && reachable(cfg) {
		return nil
	}
	appPath, appArgs := launchTarget(cfg)
	if appPath == "" {
		return nil
	}
	return startApp(appPath, appArgs)
}

func readEndpoint() (*endpoint, error) {
	file, err := configFile()
	if err != nil {
		return nil, err
	}
	buf, err := os.ReadFile(file)
	if err != nil {
		return nil, err
	}
	var data stored
	if err := json.Unmarshal(buf, &data); err != nil {
		return nil, errors.New("TermPilot 配置不完整，请先打开一次窗口。")
	}
	if data.URL == "" || data.Token == "" {
		return nil, errors.New("TermPilot 配置不完整，请先打开一次窗口。")
	}
	host, port, err := splitURL(data.URL)
	if err != nil {
		return nil, err
	}
	enabled := true
	if data.Enabled != nil {
		enabled = *data.Enabled
	}
	return &endpoint{Host: host, Port: port, Token: data.Token, Enabled: enabled, App: data.App, Args: data.Args}, nil
}

func splitURL(raw string) (string, string, error) {
	rest := raw
	if strings.HasPrefix(rest, "http://") {
		rest = strings.TrimPrefix(rest, "http://")
	} else if strings.HasPrefix(rest, "https://") {
		rest = strings.TrimPrefix(rest, "https://")
	} else {
		return "", "", errors.New("TermPilot 配置不完整，请先打开一次窗口。")
	}
	rest = strings.SplitN(rest, "/", 2)[0]
	host, port, ok := strings.Cut(rest, ":")
	if !ok || host == "" || port == "" {
		return "", "", errors.New("TermPilot 配置不完整，请先打开一次窗口。")
	}
	return host, port, nil
}

func configFile() (string, error) {
	if runtime.GOOS == "windows" {
		if appdata := os.Getenv("APPDATA"); appdata != "" {
			return filepath.Join(appdata, "TermPilot", "mcp.json"), nil
		}
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	if runtime.GOOS == "darwin" {
		return filepath.Join(home, "Library", "Application Support", "TermPilot", "mcp.json"), nil
	}
	base := os.Getenv("XDG_CONFIG_HOME")
	if base == "" {
		base = filepath.Join(home, ".config")
	}
	return filepath.Join(base, "TermPilot", "mcp.json"), nil
}

func launchTarget(cfg *endpoint) (string, []string) {
	if cfg != nil && cfg.App != "" {
		return cfg.App, cfg.Args
	}
	exe, err := os.Executable()
	if err != nil {
		return "", nil
	}
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	buf, err := os.ReadFile(filepath.Join(filepath.Dir(exe), "launch.json"))
	if err != nil {
		return "", nil
	}
	var data launchFile
	if json.Unmarshal(buf, &data) != nil || data.App == "" {
		return "", nil
	}
	return data.App, data.Args
}

func reachable(cfg *endpoint) bool {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(cfg.Host, cfg.Port), 300*time.Millisecond)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}

func post(cfg *endpoint, body map[string]any) (result, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return result{}, err
	}
	req, err := http.NewRequest(http.MethodPost, fmt.Sprintf("http://%s/cli", net.JoinHostPort(cfg.Host, cfg.Port)), bytes.NewReader(payload))
	if err != nil {
		return result{}, err
	}
	req.Host = net.JoinHostPort(cfg.Host, cfg.Port)
	req.Header.Set("content-type", "application/json")
	req.Header.Set("authorization", "Bearer "+cfg.Token)
	client := &http.Client{Timeout: 130 * time.Second, Transport: &http.Transport{Proxy: nil}}
	res, err := client.Do(req)
	if err != nil {
		return result{}, errors.New("TermPilot 没有连上。")
	}
	defer res.Body.Close()
	buf, err := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return result{}, err
	}
	var out result
	if json.Unmarshal(buf, &out) != nil {
		text := strings.TrimSpace(string(buf))
		if text == "" {
			text = fmt.Sprintf("请求失败 %d", res.StatusCode)
		}
		return result{}, errors.New(text)
	}
	return out, nil
}

func emit(jsonMode bool, res result) {
	if jsonMode {
		fmt.Fprintln(os.Stdout, asciiJSON(res))
		return
	}
	if !res.OK {
		fmt.Fprintln(os.Stderr, res.Text)
		return
	}
	text := res.Text
	if text == "" {
		return
	}
	fmt.Fprint(os.Stdout, text)
	if !strings.HasSuffix(text, "\n") {
		fmt.Fprintln(os.Stdout)
	}
}

func asciiJSON(res result) string {
	buf, err := json.Marshal(res)
	if err != nil {
		return `{"ok":false,"text":"失败"}`
	}
	var b strings.Builder
	for _, r := range string(buf) {
		if r < 0x80 {
			b.WriteRune(r)
			continue
		}
		if r > 0xFFFF {
			r1, r2 := utf16.EncodeRune(r)
			fmt.Fprintf(&b, `\u%04x\u%04x`, r1, r2)
			continue
		}
		fmt.Fprintf(&b, `\u%04x`, r)
	}
	return b.String()
}
