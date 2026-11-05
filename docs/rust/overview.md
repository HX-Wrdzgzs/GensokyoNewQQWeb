# Rust 重构概览

Gensokyo-NewQQ 正在主仓库的 `Refactor` 分支上，用 Rust 逐步重写这套 OneBot V11 协议网关。Rust 工作区（`crates/`）与 Go 主链（含 `internal/` + `adapter/` 分层）当前**并存**：Go 版仍是生产主线，Rust 版按里程碑推进。

> [!IMPORTANT]
> 本站其余页面全部以 **Go 版本行为**为准。本节三页只描述 Rust 重构，不构成对 Rust 版功能完整性的承诺；涉及逐 action 对齐状态时，以主仓库源码与运行日志为准。

## 重构动机

- **分层架构**：Rust workspace 强制依赖方向只能向下（`bin → runtime → actions → 能力 crate → config → core`，见根 `Cargo.toml` 注释），每个 crate 职责单一、边界显式。
- **类型安全**：OneBot V11 事件模型、action 参数、CQ 码与出站规划（`OutboundPlan`）都以 Rust 类型建模，handler 通过注册表统一接入，编译期即可拦截大量口径错误。
- **供应链安全**：CI 同时跑 `cargo deny` 与 `cargo audit`；TLS 依赖设版本下限并由 `cargo xtask check-tls-floors` 断言；`deny.toml` 禁用 `openssl`、`openssl-sys`；YAML 解析采用 `serde_norway 0.9.42`（`serde_yaml` 的维护分支），弃用存在 RUSTSEC-2025-0068（unsound/unmaintained）的 `serde_yml`。

## 双树现状

| 树 | 语言 | 位置 | 构建入口 | 状态 |
|----|------|------|----------|------|
| Go 主链 | Go | legacy 目录 + `internal/` + `adapter/` | `go build` / `.\build.ps1`（已退化为薄包装） | 生产主线，按 `arch_mode` 逐请求切换 |
| Rust workspace | Rust | `crates/` + `xtask/` | `cargo xtask build` | 独立二进制 `gensokyo`，重写进行中 |

> [!WARNING]
> `arch_mode` 是 **Go 主链内部**在 legacy 目录与 `internal/` + `adapter/` 分层之间切换的开关，Rust 二进制不在其切换范围内。两者互不混用：Rust 版是独立的可执行程序，M4 验收前 Go 代码不删除（主仓库 M0 裁决 1）。

## Go 主链的 `arch_mode` 三模式

以下口径取自主仓库 `AGENTS.md`「架构与数据流」章节：

| `arch_mode` | 语义 |
|-------------|------|
| `new`（默认） | 走 `internal/` + `adapter/` 新链 |
| `shadow` | 新旧链并行，差异仅日志上报，行为仍走 legacy |
| `legacy` | 全走旧链，行为零变化，**一键回退** |

逐请求读取配置、热重载即时生效；空值/非法值回退 `new`。新链六个接缝在 Rust/新链未注入或失败时自动落回 legacy：

| 接缝 | 桥文件 |
|------|--------|
| 出站 | `handlers/outbound_bridge.go` |
| 入站 | `Processor/inbound_bridge.go` |
| action | `callapi/dispatch_bridge.go` |
| state | `handlers/state_bridge.go` |
| config | `internal/infrastructure/config/bootstrap.go` |
| media | `handlers/media_bridge.go` |

## `crates/` 十库清单

职责一句话取自各 crate `Cargo.toml` 的 `description`：

| crate | 职责 |
|-------|------|
| `gensokyo-core` | 统一错误、OneBot 虚拟 ID、日志与指标门面 |
| `gensokyo-config` | `config.yml` 映射、访问器与热重载 |
| `gensokyo-protocol` | OneBot V11 模型、CQ 码、`OutboundPlan`、handler 注册表 |
| `gensokyo-qq` | QQ 官方 API 适配：token、OpenAPI v1/v2、群管理、事件 DTO |
| `gensokyo-storage` | idmap、echo、cookie、bbolt 导入、gRPC 服务 |
| `gensokyo-media` | 下载上传、压缩、图床、silk、QR |
| `gensokyo-actions` | 全部出站 action 实现 |
| `gensokyo-runtime` | 入站转换、四种连接、dispatch、队列与限速、优雅关闭 |
| `gensokyo-webui` | 内嵌前端资源与管理 API |
| `gensokyo-bin` | `gensokyo` 可执行入口 |

workspace 另有第 11 个成员 `xtask`：构建、TLS 下限检查与基准测试的统一入口（见[构建与验证](/rust/build)）。

## 里程碑进度

| 里程碑 | 状态 | 内容 |
|--------|------|------|
| M0 脚手架 | 已交付 | workspace（crate + bin + xtask）、fmt/clippy/deny/audit 配置、`core`/`config`/`protocol` 骨架；此时二进制仅支持 `--version`，无子命令时以退出码 2 提示而非假装启动 |
| M1 主链路 | 分批交付（M1g–M1r） | QQ OpenAPI 客户端（M1g）；运行时正向 WS/HTTP + dispatcher、反向 WS/webhook 入站事件转换（M1h-a/b）；二进制装配与 CLI（M1j）；查询/管理 action 与 `QqApi` 抽象（M1k）；常用 action 再实现与批次二、async 变体（M1l/M1m）；入站 12 类事件与 `text_intent`（M1n）；action 全量注册与 deferred 发送执行（M1o），bin 装配 QQ 客户端与 47 actions；剩余 action 与面板/互动占位（M1q）；deferred 媒体上传、reply/echo 与 `POST /` 修复（M1r）；另含 gRPC IDMapService（tonic/prost） |
| M2 媒体管线 | 分批交付（M2a–M2d） | 媒体基础能力：下载/解析/格式识别（M2a）；图片尺寸与图床抽象（M2b）；图片压缩（M2c）；silk 编解码外部进程封装（M2d） |
| M3 WebUI | 已交付 | WebUI 静态资源编译期嵌入与 cookie 登录；挂载与 `/health` 端点 |
| M4 验收 | 未交付 | 性能基线验收：常驻内存 ≤ Go 版 1.2 倍、吞吐不低于同配置 Go 版，以 72 小时压测收尾（M0 裁决 5） |

## 与 Go 版的能力差异

Rust 链仍在补齐 action 与媒体覆盖面。**未注册的 action、或上游端点尚未落地的 action，会显式回执 `retcode=1500`**（上游失败语义），而不是静默丢弃或伪造成功。[能力矩阵](/guide/matrix)中的「已映射 / 适配实现 / 项目扩展」口径描述的是 Go 版本，请勿直接套用到 Rust 二进制。

## 继续阅读

- [构建与验证](/rust/build)：Rust 工具链、`cargo xtask` 命令与构建矩阵。
- [性能对比](/rust/perf)：Rust 与 Go 同负载 10 轮压测的均值 ± 标准差。
- [项目概览](/guide/overview)：Go 版本的定位与数据流。

原始素材位于主仓库 `Refactor` 分支：[docs/rust-m0.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-m0.md)、[docs/rust-build.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-build.md)、[reports/ 重构存档](https://github.com/Te-River/Gensokyo-NewQQ/tree/Refactor/reports)。
