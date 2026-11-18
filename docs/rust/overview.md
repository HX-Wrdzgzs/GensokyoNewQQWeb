# Rust 重构概览

Gensokyo-NewQQ 正在主仓库的 `Refactor` 分支上，用 Rust 逐步重写这套 OneBot V11 协议网关。Rust 工作区（`crates/`）与 Go 主链（含 `internal/` + `adapter/` 分层）当前**并存**：Go 版仍是生产主线，Rust 版按里程碑推进。

> [!IMPORTANT]
> 本站其余页面全部以 **Go 版本行为**为准。本节四页只描述 Rust 重构，不构成对 Rust 版功能完整性的承诺；涉及逐 action 对齐状态时，以主仓库源码与运行日志为准。

## 重构动机

- **分层架构**：Rust workspace 强制依赖方向只能向下（`bin → runtime → actions → 能力 crate → config → core`，见根 `Cargo.toml` 注释），每个 crate 职责单一、边界显式。
- **类型安全**：OneBot V11 事件模型、action 参数、CQ 码与出站规划（`OutboundPlan`）都以 Rust 类型建模，handler 通过注册表统一接入，编译期即可拦截大量口径错误。
- **供应链安全**：CI 同时跑 `cargo deny` 与 `cargo audit`；TLS 依赖设版本下限并由 `cargo xtask check-tls-floors` 断言；`deny.toml` 禁用 `openssl`、`openssl-sys`；YAML 解析采用 `serde_norway 0.9.42`（`serde_yaml` 的维护分支），弃用存在 RUSTSEC-2025-0068（unsound/unmaintained）的 `serde_yml`。

## 双树现状

| 树 | 语言 | 位置 | 构建入口 | 状态 |
|----|------|------|----------|------|
| Go 主链 | Go | legacy 目录 + `internal/` + `adapter/` | `go build` / `.\build.ps1`（`main` 分支上是完整 Go 构建链） | 生产主线，按 `arch_mode` 逐请求切换 |
| Rust workspace | Rust | `crates/` + `xtask/` | `cargo xtask build`（`Refactor` 树自 2026-11-18 起已无 `build.ps1`，这是唯一入口） | 独立二进制 `gensokyo`，重写进行中 |

> [!WARNING]
> **`Refactor` 分支自 2026-11-18 起不再包含 `build.ps1`**：该分支的 Go 遗留源码树（`handlers/` / `Processor/` / `botgo/` / `go-silk/` 等）、`go.mod` / `go.sum` 与 Go 专用 CI 一并移除，Rust 构建只剩 `cargo xtask build`。`main` 分支的 `build.ps1` 仍是完整 Go 链：设 `GOPROXY` / `CGO_ENABLED=0`（`build.ps1:28-30`）、`-NoWebUI` 走 `-tags=small`（`:94`）——同名脚本只存在于 Go 主线，别把 Rust 侧的口径套到 Go 版构建文档上（见[编译构建](/guide/build)）。

> [!WARNING]
> `arch_mode` 是 **Go 主链内部**在 legacy 目录与 `internal/` + `adapter/` 分层之间切换的开关，Rust 二进制不在其切换范围内。两者互不混用：Rust 版是独立的可执行程序；Go 源码现在只保留在 `main` 分支（`Refactor` 分支已移除，`main` 侧继续作为 parity 参照与回退路径）。

## 发布状态与命名

Rust 版**尚未发布**：`Refactor` 分支上没有 `Release016Rust` tag，GitHub 也没有对应 Release。发布名定为 **`Release 016 Rust`**（Rust 重构分支的首个 Release，见主仓库 `docs/rust-handover.md:29`），以免与 Go 主线的 `Release016` 混淆；后者同样未封版，见 [Release 更新](/release/)。对齐现状与登记差异见上文「与 Go 版的能力差异」与[差异清单](/rust/actions)，不要据此认为 Rust 版已可替代 Go 主线。

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

### M4 之后的补齐波次（R4k–R4n，2026-11-11 ~ 11-14）

M4 验收仍在进行，链路补齐按波次继续推进（`docs/rust-m0.md:35-74`）：

| 波次 | 日期 | 内容 |
|------|------|------|
| R4k | 2026-11-11 | P50 入站媒体段（`attachments` 图片/语音、`ark_data` / `message_type=3` 卡片、`msg_elements` 引用与嵌套正文；字符串路径追加 CQ 码，段数组路径产 `image`/`record`/`ark`/`reply`/`text` 段，顺序同 Go「正文段 → 图片段 → 事件段」）+ P51 两路评审收口（顶层与嵌套整数组 `null` 按空数组收，不再丢整条事件；入站 CQ 值转义补 `[` → `&#91;`） |
| R4l | 2026-11-13 | P55 lotus gRPC **客户端模式**：`RemoteBridge` 专职 OS 线程 + 独立 current_thread runtime（17 个同步门面）、`IdMapStore::with_remote` 17 方法远程分支与 `idmap_remote_mode` 模式判定、HTTP 回退桥（type 1~17 全表）、boot 装配与 `backup_port`；`/getid` 按实际状态隐藏 |
| R4m | 2026-11-13 | P56 出站 URL 转换与二维码管线：`protocol/src/xurls.rs`（xurls v1.1.0 Relaxed 移植，Go 金样 corpus 逐 span 断言）→ `media/src/qr.rs`（容错级 = Go `qrcode.High`、无静区、Go PNG 尺寸语义，矩阵级金样一致）→ runtime 出站 URL 管线；另含 SSRF 防护补齐 |
| R4n | 2026-11-14 | P59 裸媒体码语义修复（触及外部 JSON 硬约束）：`[CQ:image]`/`[CQ:video]`/`[CQ:file]`/`[CQ:record]`/`[CQ:voice]` 不带 `file`/`url` 时原位保留字面，不再向上游发出 `"media":{"file_info":""}` |

**当前测试基线**：合并树 `cargo test --workspace` **45 suites / 1478 passed / 1 ignored / 0 failed**（2026-11-18 全量门禁，HEAD `59510ca`，含 P83 三码真执行 / P86d-2 回执 / member_list 翻页 / db-location；见主仓库 `docs/rust-handover.md:34`）。历史数字（R4n 轮 43 suites / 1359、换机文档 `docs/rust-migrate.md:161` 的 1356、清理前记录的 1476）各对当时成立，计数随用例增删浮动——引用时以自己刚跑出的 `test result:` 行为准。

## 与 Go 版的能力差异

主仓库的全链路 parity 审计（`reports/refactor/17-go-rust-parity.md`）给出的结论是**已对齐，而非「仍在补齐」**：lotus gRPC idmap 服务端 + 客户端模式（`:36`）、idmap 解绑 / 重绑定 `UpdateVirtualValue*` / `ForceUnbindID`（`:42`）、unioncache / 短链 / `sys`（`:48`）、QR + 出站 URL 转换管线（`:50`）、SSRF 防护（`:51`）均记「已对齐」；action 全集为 **Go 53 个唯一注册名 → Rust 53/53 覆盖，缺失 0**（`:60`）。

仍**登记在册的差异**（不是缺陷，是两端口径不同，逐项见 [Rust 与 Go 的差异清单](/rust/actions)）：

- Rust `KNOWN_ACTIONS` 比 Go 多 3 个素材管理扩展名 `upload_media_image` / `get_media_image_list` / `delete_media_image`——Go 侧从未注册 action，只有内部调用链（Medium，登记）。
- Rust 另实现 25 个 Go 从未注册的 OneBot v11 标准 / go-cqhttp 扩展 action（`EXTENSION_ACTIONS`），其中 15 个因官方无端点回 `1500`、10 个是本地固定回执或本地回填。
- 错误码口径：未注册的 action 回 **`1404`（未知 action）**；已注册但上游端点缺失的占位 action 回 **`1500`**；两者都不是静默丢弃或伪造成功。
- `backup_port` 与 `/getid` 的两端语义差异、`get_friend_list` 写侧未移植（P64b）等，见差异清单页。

[能力矩阵](/guide/matrix)中的「已映射 / 适配实现 / 项目扩展」口径描述的是 **Go 版本**，请勿直接套用到 Rust 二进制。

## 继续阅读

- [构建与验证](/rust/build)：Rust 工具链、`cargo xtask` 命令与构建矩阵。
- [性能对比](/rust/perf)：Rust 与 Go 同负载 10 轮压测的当前口径与历史口径。
- [Rust 与 Go 的差异清单](/rust/actions)：逐 action / 端点的两端差异与占位口径。
- [项目概览](/guide/overview)：Go 版本的定位与数据流。

原始素材位于主仓库 `Refactor` 分支：[docs/rust-m0.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-m0.md)、[docs/rust-build.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-build.md)、[reports/ 重构存档](https://github.com/Te-River/Gensokyo-NewQQ/tree/Refactor/reports)。
