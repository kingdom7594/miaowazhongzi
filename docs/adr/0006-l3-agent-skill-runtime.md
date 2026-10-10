# ADR-0006:L3 视觉采用 agent 技能运行时

- 状态:Accepted
- 日期:2026-10-10
- 关联:ADR-0002(适配器调用)、ADR-0004(内聚进 miaowazhongzi)

## 背景

上游 baoyu-skills 中,**出图后端** `baoyu-image-gen` 是确定性 CLI(吃最终 prompt),但**组装式 skill**
(`baoyu-xhs-images / baoyu-cover-image / baoyu-infographic / baoyu-slide-deck`)本质是 **agent 工作流**:
SKILL.md 指示一个 LLM agent 完成「读 `references/` 模板 → 分析内容 → 组装 prompt → 调出图后端」,
没有可独立调用的确定性脚本。因此"M3 把 skill 封装成 curl 可测的确定性服务"对组装式 skill 不成立,
必须在三种形态中选一:

- **A**:由一个**能无头加载 SKILL.md 的 agent 运行时**执行上游技能(含其分析→组装→出图全流程)。
- **B**:L2 用 vendored 模板自行组装 prompt,skill-runner 只做确定性渲染。
- **C**:skill-runner 内置 LLM 复刻 skill 的分析+组装逻辑。

owner 复核后**采纳 A**(质量 / 可扩展 / 生态最优;且本机已装 `opencode`,可无头加载 SKILL.md)。

## 决策

1. **L3 采用 agent 技能运行时**:组装式 skill 由运行时无头执行其 SKILL.md 工作流。
2. **首选运行时 = opencode**(本机已装,`opencode run` 非交互执行,加载 vendored skills)。
   **治理增强备选 = OpenClaw**(skill 版本锁定 / gating / 沙箱 / 注册表)—— **后续**评估,不在 M3。
3. **运行时抽象为可替换适配器接口** `AgentRuntime`(`src/agent/`),默认实现 `OpencodeAgentRuntime`;
   调用方(skill handler、HTTP 层)不感知具体运行时,避免二次锁定。
4. **出图后端经 Shim → relay**:运行时内的 `baoyu-image-gen` 走 OpenAI 兼容 `OPENAI_BASE_URL`,
   指向本服务的 `POST /shim/v1/images/generations`(同步语义 → 中转站异步任务式),**不改上游源码**。
5. **skills 来源 pin commit,`vendor/` 快照**,运行时按需软链到工作目录的 `.opencode/skills/`。
6. **接受非确定性**:以 **skill 版本 pin + E2E smoke 断言**替代细粒度单测。
7. **契约不变**:`POST /render {skill, inputs, aspect, output_dir}` 语义不变,内部改为驱动 opencode run
   (**异步 / 长超时**:`AGENT_TIMEOUT_MS`,默认 600s)。

## 后果

- 优点:零重复实现,直接复用上游打磨过的 prompt 与工作流;自动跟上上游更新;质量高;适配器化后运行时可选。
- 代价:引入第三个运行时(opencode)+ 需 LLM key;**非确定**;单次 render **长耗时**(本地实测封面 ~3 min);
  观察到**成本放大**(一次封面触发 3 次图像任务:含 1 次后端自检 `test`),需成本闸兜底。
- 约束:密钥仅走 env;不改上游 baoyu/mondo 源码(经 shim/适配);skill 版本 pin;单次 render 张数 ≤10、并发 ≤2。

## 备选(未采纳)

- **B**:确定性最强、最省,但 prompt 组装(即 skill 的智能)落在 L2,背离"复用上游 skill"的初衷,且质量随迭代滞后。
- **C**:自足且满足原契约,但工作量最大、重复实现上游逻辑、同样依赖 LLM。
