# 🐸 妙蛙种字 (MiaoWaZhongZi)

> 小红书虚拟资料卖家的图文笔记批量生成工具

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## ✨ 项目介绍

**妙蛙种字**是一款专为小红书虚拟资料卖家打造的 AI 图文笔记批量生成工具。通过 AI 技术，帮助卖家快速生成高质量、符合平台调性的种草笔记，大幅提升内容创作效率。

🔗 **在线体验**: [https://74vr5fb6fk.coze.site](https://74vr5fb6fk.coze.site)

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
| AI SDK | coze-coding-dev-sdk |
| 图标 | Lucide React |
| 包管理 | pnpm 9 |

## 📦 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 9.0.0

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

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 📁 项目结构

```
miaowazhongzi/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/route.ts      # 笔记生成 API
│   │   │   ├── title-boost/route.ts   # 标题强化 API
│   │   │   └── infographic/route.ts   # 信息图生成 API
│   │   ├── generate/page.tsx          # 生成页面
│   │   ├── globals.css                # 全局样式
│   │   ├── layout.tsx                 # 根布局
│   │   └── page.tsx                   # 首页
│   ├── components/
│   │   ├── home-page.tsx              # 主页组件
│   │   └── ui/                        # shadcn/ui 组件
│   └── lib/
│       ├── banned-words.ts            # 敏感词库
│       ├── content-cleaner.ts         # 内容清洗工具
│       ├── parse-llm-json.ts          # LLM 输出解析
│       ├── platform-config.ts         # 平台配置
│       ├── prompts.ts                 # AI 提示词
│       ├── types.ts                   # 类型定义
│       └── utils.ts                   # 工具函数
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── LICENSE
└── README.md
```

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

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<p align="center">
  Made with 🐸 by the MiaoWaZhongZi team
</p>
