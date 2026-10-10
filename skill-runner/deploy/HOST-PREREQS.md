# skill-runner 主机前置依赖 (Host Prerequisites)

> 记录 L3 skill-runner 运行所需的**主机级运行时**及安装方式，供可复现部署。
> 采集时间：2026-10-10；主机：`radar-dashboard` 同机（Ubuntu 24.04，systemd + nginx 网关）。

## 快照（已验证）

| 组件 | 版本 | 路径 | 用途 |
|---|---|---|---|
| OS | Ubuntu 24.04.3 LTS (x86_64) | — | 目标主机 |
| node | v24.13.0 | `/usr/bin/node` | skill-runner 服务本体（`dist/bin/start.js`） |
| npm | 11.6.2 | `/usr/bin/npm` | 安装 bun |
| python3 | 3.12.3 | `/usr/bin/python3` | mondo prompt 组装（`generate_mondo.py --no-generate`） |
| bun | 1.4.3 (`1.4.3+c6da4a4d3`) | `/usr/bin/bun` → `/usr/lib/node_modules/bun/bin/bun.exe` | 运行 baoyu 脚本（`.ts` 直跑） |
| libreoffice / soffice | 未安装（评估结论：**非必需**，见下） | — | 若启用 pptx/pdf 转换的 soffice 路径才需要 |

## 1. bun

baoyu-skills 的脚本用 `${BUN_X}` 运行，解析顺序：`bun`（PATH 优先）→ `npx -y bun` → 提示安装。
skill-runner 的 `BUN_BIN`（默认 `bun`）即指向此可执行文件。

**本机安装方式（经 npm，走内网镜像，可复现）：**

```bash
npm install -g bun          # registry: https://registry.npmmirror.com
bun --version               # 1.4.3
command -v bun              # /usr/bin/bun
```

- 实际落盘：`/usr/bin/bun` 是 npm 生成的软链，真实二进制在
  `/usr/lib/node_modules/bun/bin/bun.exe`（Linux ELF x86-64，包目录约 85 MB）。
- `npx -y bun --version` 与 `bunx --version` 同样输出 `1.4.3`（baoyu 的兜底路径可用）。

**验证（本机已执行）：**

```bash
bun --version          # 1.4.3
bun run /tmp/bun-smoke.ts   # TS 直跑 → "bun-ts-ok 5"
npx -y bun --version   # 1.4.3
```

> 备选：官方安装脚本 `curl -fsSL https://bun.sh/install | bash`（装到 `~/.bun/bin/bun`，需自行加 PATH）。
> ⚠️ 官方脚本从 GitHub Releases 拉取；本机网络对 `github.com` 可达但 `objects.githubusercontent.com`
> 返回 404，下载可能不稳，故**采用 npm 方式**（镜像稳定、版本可钉）。

## 2. libreoffice（评估，未安装）

### 结论：当前 M3 不需要

- M3 产出为 **png / svg**，不触发 Office 转换。
- vendored baoyu 的 slide-deck 合并脚本为**纯 JS**：
  `merge-to-pptx.ts`（`pptxgenjs`）、`merge-to-pdf.ts`（`pdf-lib`），由 bun 运行，**不调用 soffice**。
- 全量 grep vendored `baoyu-skills` 无任何 `soffice` / `libreoffice` 引用；`ImageMagick` 仅出现在
  「禁止用程序化覆盖修字」的约束文案里（即**禁止使用**，非依赖）。
- `sharp`（baoyu 依赖的位图处理）随 npm 分发预编译 libvips，无需系统库。

### 如需启用（体积 / 命令，`--no-install-recommends`）

| 方案 | 下载 | 安装后占用 | 说明 |
|---|---|---|---|
| `libreoffice-impress`（仅演示，最小） | ~85 MB | ~282 MB | pptx→pdf 够用 |
| impress + calc + writer | ~107 MB | ~366 MB | 含表格/文档 |
| `libreoffice`（完整，无 recommends） | ~111 MB | ~383 MB | 全家桶（不含 Java/GUI 推荐） |
| `libreoffice`（默认含 recommends） | ~266 MB | ~1009 MB | 含 Java、字体、GUI 组件，**不推荐**在服务器用 |

```bash
# 仅在确有 soffice 转换需求时执行（当前不需要）
sudo apt-get install -y --no-install-recommends libreoffice-impress
soffice --version    # 记录版本
```

> ⚠️ 本机磁盘：`/` 99G，已用 87%（可用约 13G）。完整版装完约 1 GB，安装前需确认余量。
> 无头转换建议加 `soffice --headless --convert-to ...`，并配置独立 `-env:UserInstallation` 目录避免锁冲突。

## 3. 复现清单

```bash
node -v            # v24.13.0
python3 --version  # Python 3.12.3
npm install -g bun
bun --version      # 1.4.3
# soffice --version  # 仅当安装了 libreoffice
```

skill-runner 的 systemd unit（[`skill-runner.service`](./skill-runner.service)）默认 PATH 已含
`/usr/bin`，`bun` 无需额外配置即可被 `BUN_BIN=bun` 找到。
