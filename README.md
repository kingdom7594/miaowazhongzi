# 🐸 妙蛙种字 (MiaoWaZhongZi)

> 小红书虚拟资料卖家的图文笔记批量生成工具

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## ✨ 项目介绍

**妙蛙种字**是一套内容工厂控制台:上游雷达产出选题 brief,中枢负责多平台文案生产、视觉出图与分发,面向小红书虚拟资料/虚拟产品卖家。

> 当前迭代 **M2**:去厂商锁定(OpenAI 兼容,默认 DeepSeek)+ 雷达选题接入 + SQLite 持久化 + 知识库。

## 🚀 功能特性

### 📝 原创生成
- 根据资料类型、关键词、目标人群自动生成种草笔记
- 支持多种写作风格：智能混合、种草分享、干货教程、痛点共鸣、对比测评、真人日记感
- 每篇笔记从不同角度切入，避免内容同质化

### 🔄 爆款仿写
- 粘贴已有爆款笔记，AI 提取核心信息后重新创作
- 不是简单洗稿，而是从不同角度重新表达
- 保留原文价值点的同时确保原创性

### 🌐 多平台改写
- 一键将内容改写为适合小红书、抖音、公众号、B站的版本
- 各平台独立的内容规范和风格适配

### 📊 质量评分
- 标题吸引力、转化力、完整度、安全合规四维评分

### 🎨 封面图提示词生成
- 自动生成英文封面图提示词，可直接用于 AI 图片生成工具

### 🔤 标题强化
- 10个爆款标题，按痛点型/数字型/悬念型/对比型/干货型分类

### 🛡️ 违规检测
- 自动检测绝对化用语和限流敏感词，提供修改建议

### 🎛️ AI 浓度控制
- 滑块调节 AI 痕迹浓度 (0-100%)
- 低浓度更口语化，高浓度更专业

### ⏰ 发布时段建议
- 根据目标平台推荐最佳发布时段

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| UI 组件 | shadcn/ui + Radix UI |
| AI SDK | OpenAI 兼容客户端(默认 DeepSeek) |
| 数据层 | SQLite(`node:sqlite`,单文件) |
| 图标 | Lucide React |
| 包管理 | pnpm 9 |

## 📦 快速开始

### 环境要求

- Node.js >= 22.5(`node:sqlite` 内置)
- pnpm >= 9.0.0

### 配置

复制 `.env.example` 为 `.env` 并填写:

| 变量 | 说明 | 默认 |
|---|---|---|
| `LLM_API_KEY` | OpenAI 兼容 API Key(必填,缺失则生成报错,不 mock) | — |
| `LLM_BASE_URL` | OpenAI 兼容端点 | `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 模型 | `deepseek-chat` |
| `RADAR_BASE_URL` | 上游雷达 | `http://127.0.0.1:5080` |
| `DB_PATH` | SQLite 文件 | `./data/content-factory.db` |

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/IceAmerciano820/miaowazhongzi.git
cd miaowazhongzi

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)(默认进入 `/topic` 选题看板)。

### 构建生产版本

```bash
pnpm build
pnpm start
```

### 测试

```bash
pnpm test          # vitest 单测(db 迁移/去重、contract 校验、prompt 解析、知识库)
pnpm exec tsc -p tsconfig.json --noEmit   # 类型检查
```

## 📁 项目结构

```
miaowazhongzi/
├── docs/                               # 架构 SSOT(architecture.md / adr/ / contracts/)
├── src/
│   ├── app/
│   │   ├── (console)/                  # 控制台:topic / workbench / visual / review / library / publish / settings
│   │   ├── api/
│   │   │   ├── radar/ingest/route.ts   # 拉雷达选题入库
│   │   │   ├── topics/route.ts         # 选题库
│   │   │   ├── drafts/route.ts         # 稿件库
│   │   │   ├── drafts/generate/route.ts# 选题 → 多平台 draft
│   │   │   ├── knowledge/route.ts      # 知识库
│   │   │   ├── health/route.ts         # 依赖健康检查
│   │   │   ├── generate/route.ts       # 笔记生成(OpenAI 兼容)
│   │   │   ├── title-boost/route.ts    # 标题强化
│   │   │   └── infographic/route.ts    # 信息图生成
│   │   └── ...                         # layout / globals / generate(旧版单页工具)
│   ├── components/console/             # 控制台外壳 + UI 基元
│   └── lib/
│       ├── ai/client.ts                # OpenAI 兼容流式客户端
│       ├── radar/{client,ingest,types} # 雷达选题接入
│       ├── db/{client,migrations,topics,drafts,publications}  # SQLite 数据层
│       ├── knowledge/{loader,*.md}     # 产品档案 / 人设 / 合规词库
│       ├── contracts/validate.ts       # draft / contentBrief schema 校验(ajv)
│       ├── production/drafts.ts        # 选题 → draft 生产
│       └── ...                         # platform-config / prompts / types ...
├── package.json
└── README.md
```

## 🧩 数据流
`radar contentBrief (L1) → draft (L2, 落 SQLite) → 图片 (L3, M3) → 发布记录 (L4, M4)`

契约见 `docs/contracts/`: `contentBrief.schema.json`(L1→L2)、`draft.schema.json`(L2 产出)。

## 🎯 支持的资料类型

- 📚 育儿资料
- 📖 考公考研
- 💼 职场模板
- 📊 PPT 模板
- 🧠 认知成长
- 🎓 教师课件教案
- 📦 其他（自定义）

## 📱 支持的平台

| 平台 | 特点 |
|------|------|
| 📕 小红书 | 300-500字，emoji丰富，口语化种草风格 |
| 🎵 抖音 | 180-220字，口播脚本，含画面标注 |
| 💬 公众号 | 1200-1800字，深度长文，逻辑严密 |
| 📺 B站 | 800-1500字，信息密度高，可玩梗 |
| ⚡ 快手 | 120-200字，口播利益点，社区语感 |
| 🎬 视频号 | 200-400字，正向价值，稳重可信 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<p align="center">
  Made with 🐸 by the MiaoWaZhongZi team
</p>
