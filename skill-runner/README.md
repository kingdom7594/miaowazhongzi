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
{ "skill": "baoyu-xhs-images", "inputs": { "prompts": ["..."] }, "aspect": "3:4", "output_dir": "/abs/under/OUTPUT_ROOT" }
```
→
```json
{ "skill": "baoyu-xhs-images",
  "files": [{ "path": "/abs/x.png", "width": 1024, "height": 1365 }],
  "meta": { "provider": "task-relay", "model": "gpt-image-2" } }
```

| skill | inputs | 产出 | 状态 |
|---|---|---|---|
| `baoyu-image-gen` | `prompt`(string) / `prompts`(string[]) | PNG | ✅ |
| `baoyu-diagram` | `svg`(string) | SVG | ✅（R8：M3 先出 svg） |
| `mondo` | `prompt`(string) 或 `subject`+`kind`+`style` | PNG | ✅（复用 vendored prompt 组装） |
| `baoyu-xhs-images` / `baoyu-cover-image` / `baoyu-infographic` / `baoyu-slide-deck` | `prompt`/`prompts`（**已组装**） | PNG | ⚠️ MVP：见下 |

> ⚠️ **组装式 skill 的边界**：`xhs-images / cover-image / infographic / slide-deck` 上游本质是
> **agent 工作流**（内容分析 + 按 `vendor/.../references/` 模板组装 prompt 需要 LLM），并非确定性脚本。
> 当前 MVP 只接受**已组装好的 prompt**；prompt 组装归属（L2 组 vs skill-runner 内置 LLM）待 owner 裁决。

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
关键项：`IMAGE_BASE_URL` / `IMAGE_API_KEY` / `IMAGE_MODEL` / `OUTPUT_ROOT` / `MAX_IMAGES_PER_RENDER` / `RENDER_CONCURRENCY`。

## 开发与测试

```bash
pnpm install
pnpm test        # vitest（provider/server/shim，全部 mock，不真调中转站）
pnpm ts-check
pnpm build && node dist/bin/start.js
```

## 部署

systemd unit 模板见 [`deploy/skill-runner.service`](./deploy/skill-runner.service)（由 ops-agent 落地）。
依赖：Node ≥ 22（服务本身）；`bun`（baoyu 脚本）；`python3`（mondo prompt 组装）。

## vendored 依赖

上游 skill 以 pin 快照随仓分发，见 [`vendor/VENDOR.md`](./vendor/VENDOR.md)。
