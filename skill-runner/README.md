# skill-runner (L3 视觉适配器)

miaowazhongzi 通过本地 **skill-runner** 统一调用 baoyu / mondo 出图，不移植模板（ADR-0002）。
独立进程、独立端口（`127.0.0.1:5090`），与雷达隔离。

## 接口契约

### `GET /health`
```json
{ "status": "ok", "skills": [...], "image": { "configured": true, "model": "gpt-image-2", "...": "..." } }
```

### `POST /render`
```json
{ "skill": "baoyu-cover-image", "inputs": { "content": "..." }, "aspect": "3:4", "output_dir": "/abs/under/OUTPUT_ROOT" }
```
→
```json
{ "skill": "baoyu-cover-image",
  "files": [{ "path": "/abs/x.png", "width": 1024, "height": 1365 }],
  "meta": { "runtime": "opencode", "model": "opencode-go/deepseek-v4.1-flash", "durationMs": 180000 } }
```

| skill | inputs | 产出 | 执行方式 |
|---|---|---|---|
| `baoyu-xhs-images` / `baoyu-cover-image` / `baoyu-infographic` / `baoyu-slide-deck` | `content`(string) | PNG | **agent 技能运行时**(默认 opencode)无头加载该 skill 全流程(ADR-0006) |
| `baoyu-image-gen` | `prompt`(string) / `prompts`(string[]) | PNG | 直接走图像 provider |
| `baoyu-diagram` | `svg`(string) | SVG | 落盘(R8:M3 先出 svg) |
| `mondo` | `prompt` 或 `subject`+`kind`+`style` | PNG | vendored 脚本组装 prompt 后渲染 |

> **组装式 skill(方案 A,ADR-0006)**:`baoyu-image-gen` 的组装式技能是上游 **agent 工作流**(分析内容→按
> `references/` 模板组装 prompt→调出图后端)。skill-runner 通过**可替换的 agent 运行时适配器**驱动一个
> 运行时(默认 opencode)无头执行其 SKILL.md;运行时内的出图后端经 **Shim → relay**。
> **非确定 / 长耗时**:单次 render 可能数分钟,`AGENT_TIMEOUT_MS`(默认 600s)可调;接受用 **skill 版本 pin + E2E smoke** 断言。
> **成本闸**:provider 层统一施加**全局并发**(`RENDER_CONCURRENCY`)+ **单次 render 累计张数**(`MAX_IMAGES_PER_RENDER`),
> 直连与 shim/agent 路径同样受限(会话 id 编入 shim base URL 路径 `/shim/v1/r/<id>`)。
> **`aspect` 约束**:组装式 skill 的 `aspect` 目前仅作为 prompt 文本提示,不对返回图尺寸做强校验(待补)。

### `POST /shim/v1/images/generations`（OpenAI 兼容同步 shim）
把同步 `/images/generations` 语义 translate 到中转站的**异步任务式**链路，返回 `{ data:[{ b64_json }] }`。
用途：让 baoyu-image-gen 的 `openai` provider 无需改上游即可复用中转站（`OPENAI_BASE_URL` 指向本 shim）。

## Provider（中转站，异步任务式）

```
POST {IMAGE_BASE_URL}/images/tasks              → { task_id, status:"queued" }
GET  {IMAGE_BASE_URL}/images/tasks/{id}         → queued|processing → succeeded|failed
GET  {IMAGE_BASE_URL}/images/tasks/{id}/content → { data:[{ url }] }  → 下载落盘
```

失败（`failed` / 超时 / `data` 为空）**显式抛错**；`IMAGE_API_KEY` 缺失时 `/render` 报 `not_configured`，**绝不 mock 兜底**。

## 配置（只走 env）

见 [`.env.example`](./.env.example)。真实 `.env` 由 ops-agent 部署时注入，不入库。
关键项：`IMAGE_BASE_URL` / `IMAGE_API_KEY` / `IMAGE_MODEL` / `OUTPUT_ROOT` / `MAX_IMAGES_PER_RENDER` / `RENDER_CONCURRENCY`；
agent 运行时：`AGENT_RUNTIME` / `AGENT_BIN` / `AGENT_MODEL` / `AGENT_TIMEOUT_MS` / `AGENT_SKILLS_DIR`。

## 开发与测试

```bash
pnpm install
pnpm test        # vitest（provider/server/shim，全部 mock，不真调中转站）
pnpm ts-check
pnpm build && node dist/bin/start.js
```

## 部署

systemd unit 模板见 [`deploy/skill-runner.service`](./deploy/skill-runner.service)（由 ops-agent 落地）。
依赖：Node ≥ 22（服务本身）；`bun`（baoyu 脚本）；`python3`（mondo prompt 组装）；`opencode`（agent 技能运行时，需 LLM provider 凭据）。

主机运行时安装方式、版本、路径见 [`deploy/HOST-PREREQS.md`](./deploy/HOST-PREREQS.md)
（本机已装 `bun 1.4.3`；libreoffice 经评估**非必需**）。

## vendored 依赖

上游 skill 以 pin 快照随仓分发，见 [`vendor/VENDOR.md`](./vendor/VENDOR.md)。
