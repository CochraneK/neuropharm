# 药枢 NeuroPharm · 精神药理学习 App

单文件 HTML 学习原型，覆盖 **50 味精神科药物**，含 SRS 间隔重复闪卡、药物相互作用查询（72 对）、194+ 题库、游戏化进度追踪，带邮箱账号注册/登录与多设备云端同步（后端为独立 Cloudflare Worker + D1）。

## 在线版（GitHub Pages）
> 主页（网页版 App）：`https://CochraneK.github.io/neuropharm/`
> 桌面端页面右侧含「下载 Android App」二维码，扫码安装离线 App。

主页即 `psychopharm.html`（单文件 H5 学习原型，自带手机屏预览）；桌面端右侧扫码（二维码指向 GitHub Releases）即可下载 Android APK。登录后进度（积分 · 连续天数 · 徽章 · 已学药物）在多台设备间同步。

## 功能亮点

- **50 味精神科药物**：覆盖 SSRI、SNRI、NaSSA、MAOI、典型/非典型抗精神病药、心境稳定剂、苯二氮䓬类、抗帕金森药、β受体阻滞剂、抗痴呆药等
- **SRS 间隔重复闪卡**：基于简化 SM-2 算法（reps/ease/interval/nextReview），记住翻倍间隔、没记住重置，专注薄弱药物
- **药物相互作用查询**：72 对已知相互作用（含 class 级 fallback 匹配），高危/中危/低危三级标注
- **自测 / 题库**：194+ 自定义题目 + 自动生成题，覆盖药名（通用名/商品名）、分类、适应症、副作用、相互作用
- **游戏化系统**：积分、连续天数、等级、徽章

## Android APK
见仓库 **Releases**：原生 WebView 壳，离线打包本仓库最新 H5 与账号同步脚本（`js/auth.js`/`js/sync.js`）。
账号注册/登录与多设备同步首次需联网（对接 Cloudflare 后端）。
（APK 由 `.github/workflows/build-apk.yml` 在打 `v*` tag 时由 GitHub Actions 云端构建，产物见 Releases。）

## 目录
```
├── psychopharm.html            主程序（单文件 H5）
├── data/drugs.json              药物数据（唯一真源）
├── scripts/gen-data.js          数据生成器
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
浏览器直接打开 `psychopharm.html` 即可；账号同步走 Cloudflare Worker（见 `docs/auth-sync-design.md`）。
