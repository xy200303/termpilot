# 贡献

感谢你改进 TermPilot。提交代码、文档或问题前，请先阅读本文。

## 开始之前

- 先搜索已有 Issue 和 Pull Request，避免重复。
- 缺陷、体验问题和新功能请分别提出。改动范围较大时，先开 Issue 说明动机和做法，再写代码。
- 不要在 Issue、提交说明或代码中写入主机地址、口令、跳板令牌或密钥。

## 本地开发

环境需要 Node.js 22。

```bash
npm install
npm run dev
```

提交前运行：

```bash
npm run typecheck
```

只构建当前系统时使用 `npm run dist:win`、`npm run dist:mac` 或 `npm run dist:linux`。安装包不做代码签名。

## 提交说明

使用 Conventional Commits。标题一行，书面语，说明结果，句末不加句号。

```text
feat(scope): 做了什么
fix(scope): 修正了什么
docs: 改了哪份说明
release: x.y.z
```

`scope` 可省略。常用范围：`ui`、`term`、`ssh`、`sftp`、`agent`、`cli`、`build`。

功能和修复分开提交。发版提交只包含版本号、`CHANGELOG.md`、`.github/release-body.md` 和锁文件中的版本字段。其余约定见 [AGENT.md](AGENT.md)。

## 拉取请求

- 一个 Pull Request 只处理一件事。
- 说明动机、改动结果和验证方式。
- 更新日志只记录用户可感知的变化，不使用 `feat`、`fix` 等提交前缀。

## 行为准则

参与讨论和提交时遵循 [Contributor Covenant 2.1](CODE_OF_CONDUCT.md)。

## 安全问题

可被利用的漏洞请按 [安全策略](SECURITY.md) 私下报告，不要开公开 Issue。

## 协议

贡献的代码和文档以 [MIT 协议](LICENSE) 授权。提交 Pull Request 即表示你同意该授权。
