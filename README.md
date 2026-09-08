# 药枢 NeuroPharm · 精神药理学习 App

单文件 HTML 学习原型，带邮箱账号注册/登录与多设备云端同步（后端为独立 Cloudflare Worker + D1）。

## 在线版（GitHub Pages）
> 主页（网页版 App）：`https://CochraneK.github.io/neuropharm/`
> 桌面端页面右侧含「下载 Android App」二维码，扫码安装离线 App。

主页即 `psychopharm.html`（单文件 H5 学习原型，自带手机屏预览）；桌面端右侧扫码（二维码指向 GitHub Releases）即可下载 Android APK。登录后进度（积分 · 连续天数 · 徽章 · 已学药物）在多台设备间同步。

## Android APK
见仓库 **Releases**：原生 WebView 壳，离线打包本仓库最新 H5 与账号同步脚本（`js/auth.js`/`js/sync.js`）。
账号注册/登录与多设备同步首次需联网（对接 Cloudflare 后端）。
（APK 由 `.github/workflows/build-apk.yml` 在打 `v*` tag 时由 GitHub Actions 云端构建，产物见 Releases。）

## 目录
```
├── psychopharm.html            主程序（单文件 H5）
├── drugs.json                  药物数据（唯一真源）
├── scripts/gen-data.js         数据生成器
├── drugs-data.js               生成的 JS 数据
├── js/                         客户端 JS（auth.js / sync.js）
├── img/                        静态资源（二维码等）
├── scripts/                    工具脚本（卡片 PDF / 质检 / 发布）
├── pages/                      辅助页面（认证 / 海报 / 设计文档）
├── pdf/                        打印卡片 PDF
├── docs/                       架构文档
├── neuropharm-worker/          Cloudflare Worker 同步后端
└── psychopharm-android/        Android WebView 壳工程
```

## 本地开发
浏览器直接打开 `psychopharm.html` 即可；账号同步走 Cloudflare Worker（见 `pages/auth-sync-design.md`）。
