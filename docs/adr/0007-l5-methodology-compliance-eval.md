# ADR-0007:L5 方法论吸收 + 合规引擎 + 内容质量评估

- 状态:Accepted
- 日期:2026-10-10

## 背景
L5(方法论层)要把上游 `xhs-virtual-product` 的**模板/清单**(对标拆解、复盘、标题爆款公式、合规检查清单)吸收进 miaowazhongzi,并补齐**合规引擎**与**内容质量评估**,使每份 draft 在人工放行前先过「规则 + 独立 judge」双闸门,并支持 prompt 改动的 A/B 非劣检验。

## 决策

1. **只取模板/清单,不引代码**。方法论以 markdown 落 `src/lib/knowledge/methodology/`(对标拆解 / 复盘 / 标题公式),合规清单并入 `src/lib/knowledge/compliance.md`。**砍掉**上游「虚拟资料选品 / 上架」部分与其 `scripts/*.py`。
2. **prompt 模块**。`src/lib/prompts.ts` 注入「标题公式摘要 + 合规检查清单」到生成 prompt;`buildBenchmarkTeardownPrompt` / `buildReviewPrompt` 作为独立方法论 prompt 模块(UI 接线非本里程碑必需)。
3. **合规引擎 = 离线规则 + 独立 LLM judge**。
   - 规则(`src/lib/compliance/rules.ts`,纯函数、无网络):违规词/绝对化用语;数据来源必填 + 来源 URL(仅离线校验「存在 + 可映射选题 evidence」,不做 URL 实活抓取)。
   - judge(`src/lib/compliance/judge.ts`):独立调用,解析失败即抛错(不静默判过)。
   - **独立性契约**:`getJudgeConfig()` 复用 `LLM_*` 的 key/base,但 `JUDGE_MODEL` 默认 `deepseek-reasoner`,并**硬断言 judge 模型 ≠ 生成模型**,杜绝自评。
4. **内容质量评估**。`src/lib/eval/` 移植雷达 `eval_opportunities.py` 思路:rubric = 钩子强度 / 受众契合 / 依据支撑 / 平台规范 / 原创性(1–5);**run 级先聚合再跨 run 统计**;中位数非劣门 `cand_median >= base_median − tolerance`(默认 0.5);缺失维剔除不置 0。CLI `scripts/eval-drafts.ts`(`pnpm eval:drafts`)。
5. **契约回填**。draft `scores` 增 `audienceFit` / `originality`;`compliance.checkedBy` / `scores.by` 由 L5 独立 judge 回填(M2 review #2)。
6. **docs-guard CI**(落实 ADR-0005)。`scripts/docs-guard.ts` + `.github/workflows/ci.yml`:代码路径变更但未同步映射文档 ⇒ 失败;PR 带 `docs-guard: skip` 标签可逃生。

## 后果
- 优点:合规与质量从「生成模型自评」改为「独立 judge + 规则」双闸门;prompt 迭代有可复现的非劣检验;方法论可追溯、可审计。
- 代价:每次生成多一次 judge 调用(默认开,`skipEval` 可关);引入 `tsx` 作为 devDependency(eval/docs-guard CLI);多一个 CI 门禁需维护映射表。
- 约束:judge 与生成**必须不同模型**;规则层不联网,来源真实性由选题(L1)保证;非劣门覆盖总分与全部 5 维(比雷达更严,后续可调 `GATE_DIMS`)。
