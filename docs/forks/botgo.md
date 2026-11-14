# botgo Fork Inventory

> 本地 fork 依赖：`go.mod` 中 `replace github.com/tencent-connect/botgo => ./botgo`

## 基本信息

| 项 | 值 |
|----|----|
| upstream | https://github.com/tencent-connect/botgo |
| 本地 module | `github.com/tencent-connect/botgo`（路径 `./botgo`） |
| 用途 | QQ 开放平台机器人 SDK（OpenAPI + WebSocket gateway） |
| 引用方式 | go.mod `replace`（本地目录，非发布版本） |

## 为什么需要 fork

官方 SDK 未暴露部分自定义事件类型（群消息、C2C、好友等），本仓库需要这些事件才能
实现 OneBot 协议的入站映射。

## 本地 patch 内容（已知）

- 自定义事件类型：群消息（`GROUP_AT_MESSAGE_CREATE` / `GROUP_MESSAGE_CREATE`）、
  C2C、好友添加/删除等官方 SDK 未暴露的事件。
- `dto/` 扩展：`User` 等结构补充 OpenID 相关字段。

> ⚠️ 完整本地 patch 清单需维护者补齐（相对 upstream 的 diff）。

## 未来同步方式

- 定期对比 upstream，仅将官方新增的稳定改动合并回本地 fork（`git fetch upstream` + cherry-pick）。
- 若官方 SDK 最终暴露所需事件，应评估移除 fork、回到 upstream 依赖。

## Rust 侧对应

> [!NOTE]
> 本页描述的 `replace` 机制**只适用于 Go 主链**：`go.mod:42` 的 `replace github.com/tencent-connect/botgo => ./botgo` 是 Go 模块系统的能力，Rust 工作区没有 `go.mod`，也**没有「fork 一个依赖再 replace」的概念**。

主仓库 `Refactor` 分支用 Rust 重写时，botgo 承担的职责被拆进 workspace 成员 crate **`crates/gensokyo-qq`**（crate 自述：「QQ 官方 API 适配：token、OpenAPI v1/v2、群管理、事件 DTO」）——本 fork 新增的自定义事件类型、群管理 API 与 DTO 扩展，在 Rust 侧是对应模块的**原生实现**，不再有「相对上游 SDK 的本地 patch」这层差异要维护。事件 DTO 与 intents 位表的对齐结论记录在 parity 审计里（`reports/refactor/17-go-rust-parity.md:26-27`：15 类 QQ 事件转换「已对齐」，intents 位表「已对齐（待 #70 消费）」）。

因此：**Go 版继续跟 upstream 比对与 cherry-pick；Rust 版不需要，也不应该照搬本 fork 的 patch 清单。** 两树关系与逐 action 差异见 [Rust 重构概览](/rust/overview) 与 [Rust 与 Go 的差异清单](/rust/actions)。

## 参考

- `botgo/README.md`
- `botgo/DEVELOP.md`
