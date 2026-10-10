# ADR-0002:L3 视觉走适配器调用

- 状态:Accepted
- 日期:2026-10-10

## 背景
视觉产出可复用 baoyu-skills(卡片图/信息图/PPT/图解/封面)与 mondo(高定海报)。两种集成方式:
- **A 原生移植**:把其 prompt/模板搬进 miaowazhongzi 代码。
- **B 适配器调用**:miaowazhongzi 通过一个本地 **skill-runner** 统一调用它们的脚本。

## 决策
选择 **B 适配器调用**(owner 以质量优先)。miaowazhongzi 通过 `POST /render {skill, inputs, aspect}` 调用 skill-runner,由后者封装 baoyu / mondo 脚本。

## 后果
- 优点:零重复实现;直接复用已打磨的 prompt 与多 provider 封装;自动跟上上游更新;质量高。
- 代价:引入第二个运行时(Node/bun + Python);部署变重;跨进程调试;与"全内聚进 miaowazhongzi"存在张力(实为编排而非移植)。
- 约束:skill-runner 必须有稳定 HTTP 契约与健康检查;与雷达 venv 隔离。
