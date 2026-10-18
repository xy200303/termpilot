# TermPilot 官网

TermPilot 的宣传站 + 使用文档，VitePress 工程，部署在 GitHub Pages（term.xyun.dev）。

```bash
npm install        # 装依赖
npm run dev        # 本地预览 http://localhost:5173
npm run build      # 构建到 .vitepress/dist
npm run preview    # 预览构建产物
```

部署：推送到 main 且 `website/` 有改动时，`.github/workflows/pages.yml` 自动构建发布。

素材：`public/shots/` 的截图来自真实运行的 TermPilot（干净演示数据，WSL Ubuntu 做 SSH 目标）；重新截取时保持窗口 1280×800、同名覆盖。`og-image.png` 用 `og.html` 在浏览器 1200×630 视口截图生成。版本号和下载链接写在 `config.ts` 与 `theme/Home.vue` 顶部常量里，发新版时同步修改。
