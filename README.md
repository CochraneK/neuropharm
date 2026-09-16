<div align="center">

# 药枢 · NeuroPharm

**精神药理学习 App · 药库 · SRS · 相互作用规则 · 题库 · PWA**

<p>
  <img alt="Drugs" src="https://img.shields.io/badge/drugs-62-6C63FF">
  <img alt="Questions" src="https://img.shields.io/badge/questions-295-2F80ED">
  <img alt="SRS" src="https://img.shields.io/badge/learning-SRS-27AE60">
  <img alt="PWA" src="https://img.shields.io/badge/app-PWA%20%2B%20Android-F2994A">
</p>

</div>

单文件 HTML 学习原型，覆盖精神科药物复习、间隔重复闪卡、相互作用规则推导、自测、游戏化进度与多设备同步。

> [!WARNING]
> 本项目是**学习工具**，不是处方、用药决策或临床相互作用检查器。药物适应证、剂量、禁忌与相互作用应以最新官方说明书、权威药学资料和合格专业人员判断为准。

## 在线版（GitHub Pages）
> 主页（网页版 App）：`https://CochraneK.github.io/neuropharm/`
> 桌面端页面右侧含「下载 Android App」二维码，扫码安装离线 App。

主页即 `psychopharm.html`（单文件 H5 学习原型，自带手机屏预览）；桌面端右侧扫码（二维码指向 GitHub Releases）即可下载 Android APK。登录后进度（积分 · 连续天数 · 徽章 · 已学药物）在多台设备间同步。

## 功能亮点

- **62 味精神科药物**：覆盖 SSRI、SNRI、NaSSA、MAOI、典型/非典型抗精神病药、心境稳定剂、苯二氮䓬类、抗帕金森药、β受体阻滞剂、抗痴呆药等
- **SRS 间隔重复闪卡**：基于简化 SM-2 算法（reps/ease/interval/nextReview），记住翻倍间隔、没记住重置，专注薄弱药物
- **药物相互作用查询**：由药理标签（CYP 酶、5-HT 能、镇静强度、QT 风险等）**规则自动推导**，覆盖 1891 对全组合中的 1048 对；禁忌/严重/中等三级标注，新增药物自动纳入
- **自测 / 题库**：295 题（248 自动生成 + 31 精选 + 16 场景病例），覆盖分类、适应症、不良反应、药名反查
- **场景病例题**：16 道虚拟病例 + 临床解析（社交焦虑、精神病性抑郁、双相躁狂、难治性抑郁、成瘾医学、妊娠用药、MAOI 洗脱等）
- **药物对比**：药库选 2–3 味并排对比 9 个维度（机制 / 半衰期 / 适应症 / 不良反应 / 剂量 / 警示…）
- **智能搜索**：中文 / 英文 / **拼音**（全拼 `shequlin` 或首字母 `sql`）/ 适应症，命中高亮 + 按类别分组 + 相关性排序
- **PWA 离线**：`manifest.json` + Service Worker，浏览器可「添加到主屏幕」，免安装离线使用
- **设置生效**：每日学习提醒、间隔重复开关、仅显示通用名、数据导出（JSON）——均随账号云同步
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
├── data/drugs-data.js             生成的 JS 数据
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
