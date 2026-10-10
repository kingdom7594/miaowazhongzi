# ADR-0005:文档 SSOT 落位与 docs-guard

- 状态:Accepted
- 日期:2026-10-10

## 背景
内容工厂横跨雷达(独立部署)与 miaowazhongzi(中枢)。需要一份权威的架构文档来约束迭代,且要防止"代码改了文档没改"。

## 决策
1. 架构文档 SSOT 落在 **miaowazhongzi 主仓 `docs/`**(architecture.md + adr/ + contracts/ + README.md 索引)。
2. **启用 `docs-guard` CI 硬门禁**:当代码路径变更但 `docs/` 未同步时,流水线失败。
3. 维护规则:改架构 ⇒ 同步改了 `docs/` 才算完成;issue/评论只放「变更摘要 + 索引链接」;聊天结论必须回流成 ADR。

## 后果
- 优点:事实单一来源;决策可追溯;防止文档腐烂。
- 代价:每次改架构需同步文档;docs-guard 需维护"代码路径 ↔ 文档"映射表。
- 约束:本目录已于 **M2 迁入 miaowazhongzi 主仓 `docs/`**;`docs-guard` CI 待 ops 接入流水线后生效。
