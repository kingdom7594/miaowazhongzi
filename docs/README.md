# 内容工厂 · 文档索引 (SSOT)

> 本目录是「OPC 内容工厂」项目架构与决策的**单一事实来源(SSOT)**。
> issue / 评论里只放「变更摘要 + 索引链接」,事实一律以本目录为准。

| 文档 | 版本 | 状态 | 来源 / 说明 |
|---|---|---|---|
| [architecture.md](./architecture.md) | v0.1 (draft) | 待评审 | 分层架构、数据流、契约、部署拓扑 |
| [contracts/contentBrief.schema.json](./contracts/contentBrief.schema.json) | v0.1 | 待评审 | L1→L2 选题 brief 契约(M1) |
| [contracts/draft.schema.json](./contracts/draft.schema.json) | v0.1 | 待评审 | L2 产出稿件契约(M2) |
| [adr/0001-radar-as-upstream.md](./adr/0001-radar-as-upstream.md) | v1 | Accepted | 雷达只做上游选题源 |
| [adr/0002-visual-adapter.md](./adr/0002-visual-adapter.md) | v1 | Accepted | L3 视觉走适配器调用 |
| [adr/0003-sqlite.md](./adr/0003-sqlite.md) | v1 | Accepted | 数据层选型 SQLite |
| [adr/0004-consolidate-into-miaowazhongzi.md](./adr/0004-consolidate-into-miaowazhongzi.md) | v1 | Accepted | L2–L5 内聚进 miaowazhongzi |
| [adr/0005-docs-ssot-and-guard.md](./adr/0005-docs-ssot-and-guard.md) | v1 | Accepted | 文档 SSOT 落位 miaowazhongzi/docs + 启用 docs-guard |
| [adr/0006-l3-agent-skill-runtime.md](./adr/0006-l3-agent-skill-runtime.md) | v1 | Accepted | L3 视觉采用 agent 技能运行时(首选 opencode,可替换适配器) |
| [adr/0007-l5-methodology-compliance-eval.md](./adr/0007-l5-methodology-compliance-eval.md) | v1 | Accepted | L5 方法论吸收 + 合规引擎 + 内容质量评估(双闸门 + 非劣检验) |

## 维护规则
1. **改架构 ⇒ 同步改 `architecture.md` + 新增/更新 ADR**,否则视为未完成。
2. 决策只在 ADR 里"落定";聊天/评论的结论必须回流成 ADR 才算数。
3. 每个里程碑 issue(M1–M6)在正文**引用本目录对应章节**;交付必须回写「契约是否变化」。
4. (可选)CI `docs-guard`:动了代码路径却未同步本目录 ⇒ 失败。

## 已定(见 ADR-0005)
- 本目录**已落 miaowazhongzi 主仓 `docs/`**(M2 完成迁移)。
- **启用 `docs-guard` CI** 硬门禁(待 ops 接入 CI 后生效)。
