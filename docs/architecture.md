# 内容工厂 · 架构设计 (SSOT)

版本:v0.1 (draft) · 状态:待评审 · 更新:2026-10-10

## 1. 目标
把「雷达选题 → 多平台内容生产 → 视觉出图 → 分发 → 复盘」串成**一人公司(OPC)可运营**的内容流水线。

- **主平台**:小红书(先做)。
- **受众**:AI 工具 / 效率 / 虚拟资料·虚拟产品(人格测试、心理测试、宠物写真、提示词集合、名著手绘 PPT 课件、报表、校招汇报、AI 知识点图解等)。
- **形态**:hub-and-spoke —— miaowazhongzi 为中枢,雷达只做上游选题源。

## 2. 分层架构
| 层 | 名称 | 归属 | 职责 |
|---|---|---|---|
| L1 | 信号层 | radar-dashboard(独立部署) | 采集 23 源 → 日报 → **内容选题 brief**;对外 `GET /api/content` |
| L2 | 生产层 | miaowazhongzi | 读选题 + 知识库 → 多平台文案(draft) |
| L3 | 视觉层 | miaowazhongzi + skill-runner | 卡片图/封面/信息图/PPT/图解(经 agent 技能运行时加载 baoyu/mondo skill) |
| L4 | 分发层 | miaowazhongzi + worker | 公众号(API)、微博/X(外部 worker);人工放行 |
| L5 | 方法论层 | miaowazhongzi(内置) | xhs-virtual-product 的清单/公式/合规,注入 prompt 与审核 |

## 3. 数据流与契约
```
radar(L1) --contentBrief--> miaowazhongzi(L2) --draft--> skill-runner(L3) --image--> 审核 --(L4)--> 发布
                                                                                        ^
                                                                        L5 方法论/合规贯穿
```
- **contentBrief**:L1→L2,见 [contracts/contentBrief.schema.json](./contracts/contentBrief.schema.json)。
- **draft**:L2 产出,见 [contracts/draft.schema.json](./contracts/draft.schema.json)。
- 图片:skill-runner 产出文件,记录路径与元数据。
- 发布记录:平台、时间、结果。

## 4. 模块职责
### L1 radar-dashboard(Python / Flask)
- `scripts/daily_signals.py`:采集(不动)。
- `scripts/generate_report.py`:机会日报(不动)。
- `scripts/generate_content.py`:**内容选题 brief**(M1,新增)。
- `app.py`:只读 API;新增 `/api/content`、`/api/content/<date>`(M1)。
- `config/content_prompt.md`:外置内容 prompt。
- systemd:`radar-collect`(08:45)/`radar-report`(08:50)/`radar-content`(08:55)`radar-dashboard`(服务)。

### L2 miaowazhongzi 中枢(Next.js 16)
- `src/lib/ai`:provider-agnostic LLM(默认 DeepSeek,去 coze)。
- `src/lib/radar`:拉 `/api/content`,选题入库/去重/追溯。
- `src/lib/knowledge`:产品档案/人设/合规词库注入。
- `src/lib/compliance`:规则 + 独立 judge。
- `src/lib/image`:调 skill-runner 出图。`client.ts` 为 HTTP 契约;`render-draft.ts` 组装 draft→`inputs.content`、
  调 `/render`、回写 `drafts.images`(同技能替换)并把 skill-runner 绝对路径映射为 app 预览 url
  (限制在 `RENDER_OUTPUT_ROOT` 内)。
  - **出图类型放宽(B2)**:`DRAFT_RENDER_SKILLS` 从 2 类扩到 5 类 —— 卡片 `baoyu-xhs-images`、封面
    `baoyu-cover-image`、信息图 `baoyu-infographic`、PPT `baoyu-slide-deck`、图解 `baoyu-diagram`
    (对齐 skill-runner `SKILL_NAMES`);`render-types.ts` 维护「出图类型 ↔ 技能」映射。
  - 图解为 **svg 透传**:`render-draft.ts` 对 `baoyu-diagram` 先经 `diagram.ts`(`collectChat`)产出 SVG 再落盘,
    其余技能走 `inputs.content`;LLM 未返回有效 `<svg>` 时显式报错(不 mock)。
- API:`POST /api/drafts/render {draftId, skill, aspect?, count?}`(L2→L3,失败 502 不 mock)、
  `GET /api/renders/[...path]`(只读预览产物,越界 404)、`GET /api/renderers`(服务端代理 skill-runner `/health`,
  上游不可达 502);`/visual` 为三栏工作站(待出图列表 / 预览画布 + 候选 / 风格 + 参数 + 生成导出)。
- **审核 / 处置(B1)**:`/review` 实装审核队列 → 稿件详情(命中词高亮)→ 双闸门(规则 + judge,复用
  `POST /api/drafts/evaluate`)→ 质量评分 → 通过 / 打回 / 编辑后通过 / 批量放行。
  - `PATCH /api/drafts/[id] {status?, body?, titles?}`:写回 `drafts.status`(`src/lib/review/status.ts` 状态机:
    `draft→in_review/approved/rejected`、`in_review→approved/rejected`、`approved→published/rejected`、
    `rejected→in_review/draft`;非法状态 400、非法流转 409);内容字段用于「编辑后通过」。
  - `GET /api/drafts/[id]`:单篇详情(含图片预览 url)。
- **批量选题(B2)**:`/topic` 卡片多选 + 底部 selbar(已选 N / 预计生成 N 篇 / 清空 / 加入生产队列),
  入队以 `?topicId=…&topicId=…` 传入 `/workbench`;工作台据此**逐选题**调用既有
  `POST /api/drafts/generate`(选定平台),聚合 draft 与 `errors[]`(不改数据模型)。
- **死端点接线(B2/F-11)**:`POST /api/title-boost`(SSE,10 个分类标题)→ 工作台每篇 draft 的「AI 标题备选」,
  应用后经 `PATCH /api/drafts/[id] {titles}` 落库;`POST /api/infographic`(SSE,信息图 HTML)→ 视觉工位
  信息图类型的「信息图 HTML 版」(iframe 预览 + 下载)。
- **生成降级(F-02)**:`POST /api/drafts/generate` 逐平台隔离(`produceBatchIsolated`)——单平台生成/评估失败
  不整批 500,成功 draft 立即入库,失败平台记入 `errors[]`;评估失败时保留已生成正文(仅标注 error)。
- **主题(B1)**:`html[data-theme="light|dark"]`(`layout.tsx` 内联脚本防 FOUC + 顶栏 `ThemeToggle` + `localStorage`),
  `globals.css` 深浅 token 经属性选择器生效。
- **控制台外壳 / 页面结构(B3)**:`ConsoleShell` 侧栏 250 / 顶栏 60,品牌 + 分组导航(流水线 / 系统)、
  今日产出额度卡、用户卡;顶栏含面包屑(状态点 + 标题 + 副标题)、流水线 Stepper(阶段图标 + 真实计数)、
  搜索(⌘K 命令面板,检索页面 / 选题 / 稿件)、刷新、待办通知(待出图 / 待审核 / 待发布)与主题钮。
  - 跨页统一 `Pagehead`(大标题 + 说明 + 右侧动作)。
  - **Stepper 映射修正(F-06)**:阶段由路由推导(`src/lib/console/shell-data.ts` `activeStage`)——
    `topic→1/生成→2/视觉→3/审核→4/发布→5`;**稿件库 / 设置为跨阶段视图 → 0,不再错误高亮「发布」**。
- **稿件库表格化(B3 / L1·L2·L3)**:`/library` 由卡片列表改为表格(稿件 / 来源选题 · 平台 · 产物缩略图 · 阶段 ·
  质量分 · 更新 · 操作),含平台 / 阶段筛选与排序段控件、行多选 + 导出 CSV;**发布记录移出稿件库**(归属 `/publish`)。
- **发布(B3 / P1)**:`/publish` 为 3 张平台占位卡(公众号 / 微博 / X,MVP 占位徽标)+ 发布记录表(读 `publications`)。
- **设置(B3 / S1·S2·S3)**:`/settings` 两栏 —— 左设置导航(产品档案 / 人设 / 合规词库 / 平台配置 / 模型与额度 /
  健康检查),右分区(合规词库为「禁用 → 替换」表格;平台配置;模型与额度含视觉适配器状态与额度进度条)。
- `src/lib/publish`:分发适配器。
- SQLite:选题库 / 稿件库 / 发布记录。

### L3 skill-runner(独立进程)
- 统一 HTTP 契约 `POST /render {skill, inputs, aspect, output_dir}` → 图片文件;`GET /health`。
- **组装式 skill**(xhs-images / cover-image / infographic / slide-deck)由 **agent 技能运行时**(默认 opencode,
  可替换适配器 `AgentRuntime`)无头加载其 SKILL.md 执行「分析 → 组装 prompt → 出图」全流程(ADR-0006)。
- 出图后端 `baoyu-image-gen` 走本服务的 OpenAI 兼容 **Shim**(`POST /shim/v1/images/generations`)→ 中转站
  异步任务式 provider(submit→poll→content→download)。
- `baoyu-diagram`(SVG)、`mondo`(确定性 prompt 组装 + 渲染)为直接适配器。
- 运行时:Node(skill-runner 服务)+ bun(baoyu 脚本)+ Python(mondo)+ opencode(agent 技能运行时),
  与雷达 venv 隔离;密钥仅走 env。

### L5 方法论层(miaowazhongzi 内置)
- `src/lib/knowledge/methodology/`:对标拆解 / 复盘 / 标题爆款公式(模板/清单,无代码);`compliance.md` 含发布前检查清单与版权红线。
- `src/lib/compliance/`:离线规则(违规词/绝对化用语/来源必填)+ **独立 LLM judge**;`getJudgeConfig()` 保证 judge 模型 ≠ 生成模型。规则层只做存在性校验(含数字 ⇒ 有带 url 的 evidence),数值-来源对应交 judge;硬门不含单字/通用风格词(`BANNED_WORDS` 仅作 prompt 建议)。
- `src/lib/eval/`:内容质量 rubric(钩子/受众契合/依据/平台规范/原创性)+ 中位数非劣门(run 级聚合);CLI `pnpm eval:drafts`。
- 回填 draft 可选字段:`compliance.checkedBy` / `scores.by`(及 `scores.audienceFit` / `scores.originality`)。
- CLI(`scripts/`):`pnpm eval:drafts`(质量非劣检验)、`pnpm docs:guard`(文档门禁,ADR-0005)。
- 详见 [ADR-0007](./adr/0007-l5-methodology-compliance-eval.md)。

## 5. 部署拓扑
| 组件 | 位置 | 端口 | 管理 |
|---|---|---|---|
| radar-dashboard | 当前服务器 | 127.0.0.1:5080 | systemd(`radar-*`) |
| radar 网关 | nginx | radar.*.nip.io | basic auth |
| skill-runner | 当前服务器 | 127.0.0.1:5090 | systemd(`skill-runner`) |
| miaowazhongzi | 当前服务器 + edge 网关 | 127.0.0.1:3008(网关路径 `/miaowazhongzi/`) | systemd(`miaowazhongzi`) |

#### 网关路径模式(basePath 约定)
生产经统一网关以子路径 `/miaowazhongzi/` 暴露,Next 的 `basePath` 由构建期环境变量
`NEXT_PUBLIC_BASE_PATH` 注入(见 `next.config.ts`),且**须与网关代理路径、systemd 服务
`Environment=NEXT_PUBLIC_BASE_PATH=` 三处取值一致**,否则单次登录后 API/静态资源会 404。
本地开发 / CI 不设置即为空串,行为与无前缀时一致。`next/link`、`next/navigation` 会自动带
prefix;`fetch()` 与服务端生成的绝对链接不会,统一用 `src/lib/base-path.ts` 的
`withBasePath()` 包裹(客户端 API 调用、渲染产物预览 URL、shell 内 `usePathname` 去前缀)。

## 6. 关键决策(ADR 索引)
- [ADR-0001 雷达只做上游选题源](./adr/0001-radar-as-upstream.md)
- [ADR-0002 L3 视觉走适配器调用](./adr/0002-visual-adapter.md)
- [ADR-0003 数据层选型 SQLite](./adr/0003-sqlite.md)
- [ADR-0004 L2–L5 内聚进 miaowazhongzi](./adr/0004-consolidate-into-miaowazhongzi.md)
- [ADR-0005 文档 SSOT 落位与 docs-guard](./adr/0005-docs-ssot-and-guard.md)
- [ADR-0006 L3 视觉采用 agent 技能运行时](./adr/0006-l3-agent-skill-runtime.md)
- [ADR-0007 L5 方法论吸收 + 合规引擎 + 内容质量评估](./adr/0007-l5-methodology-compliance-eval.md)

## 7. 迭代指引(如何用本文档)
- 新需求先问:**落在哪一层?改哪个契约?**
  - 落不进现有层 ⇒ 要么加层(新 ADR),要么是伪需求。
- 契约变更必须回写 `contracts/` 并同步本文件对应章节。
- 里程碑映射:M1 雷达内容层 · M2 中枢地基 · M3 视觉适配器 · M4 分发 · M5 方法论/合规/eval · M6 编排。

## 8. 风险
- 转译质量(受众错配)→ 靠 L1 prompt + eval 迭代。
- 合规/ToS(收入数据来源、AI 标识、自动发布)→ 人审闸门。
- 成本(日更 + 多平台 + 出图)→ 配额。
- 反馈回流难自动化 → 半闭环。
- L3 agent 技能运行时**非确定 + 长耗时**(本地实测封面 ~3 min)+ 成本放大 → skill 版本 pin + E2E smoke 断言 + 成本闸(≤10 张/并发 2)。
