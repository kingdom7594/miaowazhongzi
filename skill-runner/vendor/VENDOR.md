# Vendored skills (pinned)

本目录是 L3 出图所依赖的上游 skill 的 **vendored 快照**（可复现，随部署分发，不依赖运行时联网拉取）。

| 上游 | Pin (commit) | 默认分支 | 收录范围 | 未收录 |
|---|---|---|---|---|
| https://github.com/JimLiu/baoyu-skills | `1567581c26ec29f4216c6e6835415bf30343b0e3` | main | `.claude-plugin/marketplace.json`、`LICENSE`、`package.json`、`packages/baoyu-codex-imagegen/`、`skills/{baoyu-xhs-images,baoyu-cover-image,baoyu-infographic,baoyu-slide-deck,baoyu-diagram,baoyu-image-gen}` | `screenshots/`、`docs/`、`CHANGELOG*`、其余 skills |
| https://github.com/joeseesun/qiaomu-mondo-poster-design | `e82e411c403ca5a0327a85682c658ad155cd9cbb` | master | `LICENSE`、`SKILL.md`、`references/`、`scripts/`、`requirements.txt` | `examples/`（体积大，非运行必需） |

## 更新方式

```bash
git clone --depth 1 https://github.com/JimLiu/baoyu-skills.git /tmp/baoyu-skills
git -C /tmp/baoyu-skills rev-parse HEAD   # 记录新 pin
# 拷贝上表「收录范围」到本目录，更新本文件
```

`mondo` 的 `scripts/generate_mondo.py` 内置 API base 指向其自带 AI Gateway；skill-runner 目前仅用其
`--no-generate` 做 **prompt 组装**（确定性、不调网），再经本服务的图像 provider 渲染。参见 `src/skills/registry.ts` 的 `mondo`。
