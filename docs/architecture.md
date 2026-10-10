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
| L3 | 视觉层 | miaowazhongzi + skill-runner | 卡片图/封面/信息图/PPT/图解(调 baoyu/mondo) |
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
- `src/lib/image`:调 skill-runner。
- `src/lib/publish`:分发适配器。
- SQLite:选题库 / 稿件库 / 发布记录。

### L3 skill-runner(独立进程)
- 统一 HTTP 契约 `POST /render {skill, inputs, aspect}` → 图片文件。
- 封装 baoyu-cover-image / baoyu-xhs-images / baoyu-infographic / baoyu-slide-deck / baoyu-diagram / mondo。
- 运行时:Node/bun(baoyu)+ Python(mondo),与雷达 venv 隔离。

## 5. 部署拓扑
| 组件 | 位置 | 端口 | 管理 |
|---|---|---|---|
| radar-dashboard | 当前服务器 | 127.0.0.1:5080 | systemd(`radar-*`) |
| radar 网关 | nginx | radar.*.nip.io | basic auth |
| miaowazhongzi | 待定 | TBD | TBD |
| skill-runner | 待定 | TBD | TBD |

## 6. 关键决策(ADR 索引)
- [ADR-0001 雷达只做上游选题源](./adr/0001-radar-as-upstream.md)
- [ADR-0002 L3 视觉走适配器调用](./adr/0002-visual-adapter.md)
- [ADR-0003 数据层选型 SQLite](./adr/0003-sqlite.md)
- [ADR-0004 L2–L5 内聚进 miaowazhongzi](./adr/0004-consolidate-into-miaowazhongzi.md)

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
