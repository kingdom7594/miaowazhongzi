# ADR-0001:雷达只做上游选题源

- 状态:Accepted
- 日期:2026-10-10

## 背景
radar-dashboard 已是一套成熟的「独立开发者信号雷达」(23 源采集 + role 打分 + 外置 prompt + LLM-as-judge 评估框架)。内容工厂需要"选题来源",但不应把内容生产的复杂度倒灌进雷达。

## 决策
雷达(radar-dashboard)**只承担 L1 信号层**:在既有机会日报之上,新增内容选题 brief(`generate_content.py` + `config/content_prompt.md` + `GET /api/content`)。下游(miaowazhongzi)通过该只读接口拉取选题。雷达**不**引入内容生产/发布逻辑。

## 后果
- 优点:边界清晰;复用雷达成熟的采集/打分/评估;新增内容层不改采集器;下游可独立演进。
- 代价:新增一次 LLM 转译调用;需维护 content prompt。
- 约束:contentBrief schema 冻结后,变更需走契约评审(见 `contracts/`)。
