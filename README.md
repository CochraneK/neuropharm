# 药枢 NeuroPharm · 精神药理学习 App

单文件 HTML 学习原型，带邮箱账号注册/登录与多设备云端同步（后端为独立 Cloudflare Worker + D1）。

## 落地页 / 在线版（GitHub Pages）
> 落地页：`https://CochraneK.github.io/neuropharm/`
> 网页版 App：`https://CochraneK.github.io/neuropharm/psychopharm-app.html`

首页是项目落地页（功能介绍 + 网页版 / APK 下载入口）。点「打开网页版」即用浏览器学习；登录后进度（积分 · 连续天数 · 徽章 · 已学药物）在多台设备间同步。

## Android APK
见仓库 **Releases**：原生 WebView 壳，离线打包本仓库最新 H5 与账号同步脚本（`auth.js`/`sync.js`）。
账号注册/登录与多设备同步首次需联网（对接 Cloudflare 后端）。
（APK 由 `.github/workflows/build-apk.yml` 在打 `v*` tag 时由 GitHub Actions 云端构建，产物见 Releases。）

## 目录
- `landing.html` — 项目落地页（首页，功能介绍 + 下载入口）
- `psychopharm-app.html` — 主程序（移动端原型）
- `auth.js` / `sync.js` — 账号与同步客户端
- `neuropharm-worker/` — Cloudflare Worker 同步后端（crypto/worker/schema/deploy）
- `make_cards.py` / `qa_pairing.py` — 双面打印记忆卡片 PDF 生成与质检
- `psychopharm-android/` — 真实 Android WebView 壳工程（APK 由 CI 在打 `v*` tag 时云端构建，产物见 Releases）

## 本地开发
浏览器直接打开 `psychopharm-app.html` 即可；账号同步走 Cloudflare Worker（见 `neuropharm-worker/` 与 `auth-sync-design.md`）。
