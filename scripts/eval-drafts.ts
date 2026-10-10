#!/usr/bin/env tsx
/**
 * eval-drafts — L5 内容质量 A/B 非劣检验 CLI(移植 radar eval_opportunities.py 思路)。
 *
 * 用法:
 *   pnpm eval:drafts -- --baseline base.json --candidate cand.json
 *   pnpm eval:drafts -- --candidate cand.json          # 仅评一份
 *
 * 输入文件格式(JSON):
 *   { "items": [ { "topic": {...ContentTopic}, "draft": {...Draft} }, ... ] }
 *   或直接是 items 数组。
 *
 * 裁决:默认按 pooled 四维+总分中位数非劣(cand_median >= base_median - tolerance)。
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { collectChat, getJudgeConfig } from '../src/lib/ai/client';
import type { JudgeCompleter } from '../src/lib/compliance/judge';
import { judgeBatch, type EvalDeps } from '../src/lib/eval/judge';
import { aggregate, formatStat, type JudgeRun } from '../src/lib/eval/stats';
import { nonInferiorityGate, gateReasons } from '../src/lib/eval/gate';
import { METRIC_KEYS, RUBRIC_LABELS, DEFAULT_TOLERANCE, type MetricKey } from '../src/lib/eval/rubric';
import type { EvalJudgeItem } from '../src/lib/eval/prompts';

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
function argValues(flag: string): string[] {
  const out: string[] = [];
  process.argv.forEach((a, i) => {
    if (a === flag && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
}

function loadItems(path: string): EvalJudgeItem[] {
  const raw = JSON.parse(readFileSync(resolve(path), 'utf8'));
  const items = Array.isArray(raw) ? raw : raw.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`eval-drafts: ${path} 里没有 items`);
  }
  return items as EvalJudgeItem[];
}

async function runFile(path: string, deps: EvalDeps[]): Promise<JudgeRun[]> {
  const items = loadItems(path);
  const runs: JudgeRun[] = [];
  for (const d of deps) runs.push(await judgeBatch(items, d));
  return runs;
}

async function main(): Promise<number> {
  const candidates = argValues('--candidate');
  const baselines = argValues('--baseline');
  if (candidates.length === 0) {
    console.error('eval-drafts: 至少需要一个 --candidate <file>');
    return 2;
  }
  const repeats = Number(argValue('--repeats') ?? '1') || 1;
  const tolerance = Number(argValue('--tolerance') ?? String(DEFAULT_TOLERANCE));
  const judgeModel = argValue('--judge-model') ?? getJudgeConfig().model;
  const temperatures = argValue('--judge-temperature')
    ? [Number(argValue('--judge-temperature'))]
    : [0.3, 0.6, 1.0];

  const judgeConfig = getJudgeConfig({ model: judgeModel });
  const completer: JudgeCompleter = ({ system, user, temperature }) =>
    collectChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature },
      judgeConfig,
    );
  const judgeSpecs: EvalDeps[] = [];
  for (let r = 0; r < repeats; r++) {
    for (const t of temperatures) judgeSpecs.push({ completer, model: judgeModel, temperature: t });
  }

  const candRuns: JudgeRun[] = [];
  for (const path of candidates) candRuns.push(...(await runFile(path, judgeSpecs)));
  const baseRuns: JudgeRun[] = [];
  for (const path of baselines) baseRuns.push(...(await runFile(path, judgeSpecs)));

  const candAgg = aggregate(candRuns);
  const baseAgg = aggregate(baseRuns);

  console.log(`\n候选 n_runs=${candRuns.length} judge=${judgeModel} T=${temperatures.join('/')} repeats=${repeats}`);
  for (const key of METRIC_KEYS) {
    console.log(`  ${RUBRIC_LABELS[key]}: ${formatStat(candAgg[key])}`);
  }

  let ok = true;
  let reasons: string[] = [];
  if (baseRuns.length > 0) {
    console.log(`\n基线 n_runs=${baseRuns.length}`);
    for (const key of METRIC_KEYS) {
      console.log(`  ${RUBRIC_LABELS[key]}: ${formatStat(baseAgg[key])}`);
    }
    const gate = nonInferiorityGate(candAgg, baseAgg, tolerance);
    reasons = gateReasons(candAgg, baseAgg, tolerance);
    ok = gate.ok;
    console.log(`\n非劣门(中位数,容差 ${tolerance}):`, JSON.stringify(gate, null, 2));
  } else {
    console.log('\n(未提供 --baseline,仅输出候选评分)');
  }

  const outDir = resolve(argValue('--out') ?? 'data/eval-drafts');
  mkdirSync(outDir, { recursive: true });
  const outName = argValue('--out-name') ?? `eval-drafts-${new Date().toISOString().slice(0, 10)}.json`;
  const outFile = resolve(outDir, outName);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        evaluated_at: new Date().toISOString(),
        judge_model: judgeModel,
        temperatures,
        repeats,
        tolerance,
        stat_unit: 'judge-run',
        candidate: { files: candidates, runs: candRuns, aggregate: candAgg },
        baseline: baselines.length ? { files: baselines, runs: baseRuns, aggregate: baseAgg } : null,
        gate: baseRuns.length ? { ok, reasons } : null,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`\n✅ 结果写入 ${outFile}`);

  if (baseRuns.length > 0) {
    if (ok) {
      console.log('结论: PASS(候选四维+总分中位数非劣)');
      return 0;
    }
    console.error('结论: FAIL — ' + reasons.join('；'));
    return 1;
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error('eval-drafts 失败:', err instanceof Error ? err.message : err);
    process.exit(2);
  },
);
