# ADR-0004:L2–L5 内聚进 miaowazhongzi

- 状态:Accepted
- 日期:2026-10-10

## 背景
内容工厂的 L2 生产 / L3 视觉 / L4 分发 / L5 方法论分散在多个独立工具(baoyu/mondo/xhs-virtual-product 等)会让单人运营的界面、鉴权、部署、心智都碎片化。

## 决策
将 **L2/L3/L4/L5 全部内聚进 miaowazhongzi**,使其成为「内容工厂控制台」;唯一的外部边界是 **雷达 → 选题**(L1)。L3 通过内嵌的 skill-runner 适配器实现(见 ADR-0002);L4 的 Chrome 类发布外置为 worker(例外)。

## 后果
- 优点:单一界面/鉴权/部署;操作心智统一;OPC 单人运维更省心。
- 代价:miaowazhongzi 从原型重构成真应用(工作量在 L3/L4 集成);单体耦合;L4 无法完全内聚(Chrome worker 例外)。
- 约束:内聚不等于移植——L3/L5 通过适配器/内置清单接入,而非复制上游实现。
