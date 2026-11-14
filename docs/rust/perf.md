# Rust 性能对比

本页转写主仓库 `docs/rust-perf.md` 的数字：**当前口径的同负载端到端复测**（§4.4，测量时间 2026-11-10）、**历史口径的旧一轮对比**（§4.2，2026-10-25），以及 Rust 热路径**微基准基线**。

> [!IMPORTANT]
> **口径**：单机 loopback 的管线对比，不代表公网 SLA 或 QQ 端到端延迟。场景为本地 `get_login_info`（无 QQ 网络 I/O）；Go 走 HTTP API 路径分发 `/get_login_info`，Rust 走统一 action 入口 `POST /action`；两边 `app_id: 12345`、`disable_webui: true`、`log_level: 3`（error）、无反向 WS / webhook、请求体相同。64 并发 × **49,984 请求/轮**（`50000/64` 向下取整 × 64，保证整除）、keep-alive、预热 3,000（c=8）、各跑 10 轮。
> **执行顺序是「Go 先全程单独跑完并关停，再 Rust 单独跑」**，两侧各自独占机器，期间无并行编译 / 子代理等后台任务。压测器为**本仓自写的 Go stdlib 工具 `loadgen`**（`oha` 本机不可用），两侧用同一个二进制。
> 编译口径：Rust release 为 `lto = "fat"` + `panic = "abort"` + mimalloc；Go 侧带官方 `-faststart`（跳过 `InitBase` 的安全启动弹窗与控制台标题，不影响 HTTP 链路）。
> 验收基线（M0 裁决 5）：常驻内存 ≤ Go 版 1.2 倍、吞吐不低于同配置 Go 版，M4 以 72 小时压测验收。

## 同负载端到端对比（当前口径，2026-11-10）

环境：AMD Ryzen 5 5600U（6C/12T）、Windows 11；Go 1.26.10（`main` 仓 `0c151b6`，`go build` 产物 44.82 MiB）、Rust `Refactor` 仓 `2805da2`（release：`lto=fat` + `panic=abort` + mimalloc，产物 10.31 MiB）。

| 指标 | Go（main@`0c151b6`） | Rust（@`2805da2`） | 对比 |
|------|---------------------|--------------------|------|
| 吞吐（10 轮均值） | 44,939 req/s（42,700–46,717） | **45,584 req/s**（43,396–46,436） | ≈1.014×，区间重叠 |
| 平均延迟 | 1.40 ms | **1.38 ms** | Rust 约低 1.4% |
| P50（各轮均值） | **1.12 ms**（1.07–1.19） | 1.14 ms（1.12–1.17） | Go 低约 1.8% |
| P99（各轮均值） | 5.43 ms（5.26–5.82） | **4.93 ms**（4.60–5.35） | Rust 约 9.2% 更低 |
| 常驻内存（RSS） | 39.8 MB | **17.3 MB** | Rust 约 2.3× 更低 |
| 二进制体积 | 44.82 MiB | **10.31 MiB** | Rust 约 4.3× 更小 |
| 成功率 | 100%（499,840） | 100%（499,840） | — |

**读法**：吞吐与均值基本打平（区间高度重叠，**不能宣称 Rust 吞吐显著领先**）；稳定差异在**尾部延迟（P99 约 −9%）、内存（约 2.3× 更低）与体积（约 4.3× 更小）**，Go 的 P50 略低（约 2%）。Rust 的 RSS 远低于「≤ Go 1.2 倍」的验收基线，但最终结论仍以 M4 的 72 小时压测为准。

### 复现要点

```powershell
# Go（必须先单独跑完；无控制台环境下 safelaunch 会弹窗，-faststart 跳过 InitBase）
.\run-perf.ps1 -Exe <go>\gensokyo-go.exe -Port 5701 -WorkDir <go-dir> -Label go -ActionPath /get_login_info -ServerArgs '-faststart'
# Rust（关停 Go 并静置后再跑，同 body、URL 换 POST /action）
```

两侧 `config.yml` 同模板：Go `app_id: 12345`（Go 的免 token 启动分支）、`http_address: 127.0.0.1:5701`、`disable_webui: true`、`log_level: 3`；Rust `127.0.0.1:5702`、`log_level: 3`。

> [!WARNING]
> **关键方法学**：Go 保持默认 `INFO` 级别且每请求打日志时，吞吐会掉到约 2.9k req/s（约 15× 差距），P99 升到百毫秒级；关掉后两端恢复同一量级。压测必须统一日志级别，否则结论完全失真。同理，**两侧不可并行跑**——独占口径不满足时数字不可比。

## 历史口径对比（2026-10-25，仅作存档）

> [!NOTE]
> 下表是 `rust-perf.md` §4.2 那一轮的**历史口径**，与当前差异有三点：①压测器是 `oha 1.16.0`（后换本仓自写 `loadgen`）；②Rust 编译口径是 `lto = "thin"`（现为 `fat` + `panic=abort` + mimalloc）；③Go 未带 `-faststart`、每轮 50,000 请求。**不同会话的压测器与机器状态不同，跨会话绝对值不可比**，本表只用于对照当时的量级，不要引用为现值。环境：AMD Ryzen 5 5600U、13.8 GB 内存、Windows 11 26300、Go 1.26.4、rustc 1.99.1（release，LTO=thin）、oha 1.16.0，Go/Rust 交替跑 10 轮。

| 指标 | Go 1.26.4 | Rust 1.99.1 | 对比 |
|------|-----------|-------------|------|
| 吞吐 | 49,137 ± 4,085 req/s（10 轮区间 41,954–56,059） | 50,581 ± 5,241 req/s（区间 40,157–58,006） | ≈1.03×，区间重叠 |
| 平均延迟 | 1.295 ms | 1.264 ms | Rust 约低 2.4% |
| P50 | **0.779 ms** | 1.144 ms | Go 低约 32% |
| P99 | 11.02 ms | **3.43 ms** | Rust 约 3.2× 更低 |
| 常驻内存（RSS） | 43.4 MB | **10.8 MB** | Rust 约 4.0× 更低 |
| 二进制体积 | 43.81 MB | 8.12 MB | Rust 约 5.4× 更小 |
| 成功率 | 100% | 100% | — |

## 热路径微基准基线

单进程内同步跑的三条热路径，`windows-x86_64`、rustc 1.99.1（GNU host）、release 口径（`lto=thin`、`codegen-units=1`、`opt-level=3`）。三次独立运行各 100,000 次迭代取中位数：

| 用例 | 中位 ns/op | 三次区间（ns/op） |
|------|-----------|------------------|
| `cqcode::parse`：20 段混合 CQ 文本 → `Vec<Segment>` | 15,771 | 15,711 – 16,991 |
| `Event::deserialize`：典型 `GROUP_MESSAGE_CREATE`（数组形态消息） | 4,942 | 4,932 – 5,004 |
| `plan_send_group_msg`：5 段消息参数 → `SendRequest` | 6,794 | 6,673 – 7,031 |

后续优化轮（同机对照）：CQ 解析约 2.0×（14.7 µs → 约 7.3 µs）、事件反序列化 −40%（手写 `Deserialize`）、`dispatch_json`（get_status）−69.6%；mimalloc 0.1.52 全局分配器一轮再降 `cqcode::parse` −51%、`plan_send_group_msg` −47%、`Event::deserialize` −21%，代价是产物 10.06 → 10.31 MiB（一次性体积，无运行期开销），口径见 `docs/rust-m0.md:33`（R4h 波次）。CQ 剩余成本是 `Segment` 形状固定的分配地板，进一步优化属 API 级改动，留待评估。

> [!IMPORTANT]
> 微基准噪声约 ±10%：连续跑 3 次取中位数，别拿单次数字下结论；跨迭代数、跨机器比较没有意义。复跑命令：`cargo run --release -p xtask -- bench`（`--iters` 可改，对照历史数字必须用同一值）。这些数字只覆盖同步热路径，不含 tokio 调度、网络/磁盘 IO 与 QQ 上游 RTT。

## 优化手段可用性

| 手段 | 当前状态 | 原因 / 约束 |
|------|----------|-------------|
| **PGO** | **本机（`x86_64-pc-windows-gnu`）不可用** | 该 rustc 发行版**不带 profiler runtime**，插桩构建直接 `error[E0463]: can't find crate for 'profiler_builtins'`（连 `cfg-if` 这类依赖都编不过），拿不到 PGO 前后数字；本机也未装 `llvm-tools-preview`（merge 步骤缺工具）。`cargo xtask pgo` 在这两种情况下都给可操作提示，不会静默跳过或伪造数字 |
| PGO（Linux CI） | 可行，但**尚未接入发布链** | `x86_64-unknown-linux-gnu` + `rustup component add llvm-tools-preview` 可跑完整流水线（`cargo xtask pgo --iters 20000`，报告 `target/pgo/pgo-report.md`）；但 `build.ps1` / `xtask build` 目前不调用它，**发布物仍是 plain release + UPX** |
| **BOLT** | **仅 Linux，且不进流水线** | 需要 `perf record` 与 `llvm-bolt`（还要求 `perf_event_paranoid` 允许采样），Windows 没有可用实现与等价采样后端。前置：`RUSTFLAGS="-C debuginfo=1 -C force-frame-pointers=yes"` 构建且临时**不** `strip = "symbols"`；预估 QPS +5–15%、P99 略降，体积 +5–10%，与 PGO 互补（PGO 改代码生成，BOLT 改布局） |
| **UPX** | **保留**，构建链默认步骤 | `cargo xtask build` 复制产物后压缩；PATH 无 `upx` 只提示并跳过，不算构建失败（`-NoUPX` / `--no-upx` 可显式关闭） |
| Windows PGO 出路 | 换 msvc 宿主，或等 rustc 给 gnu 宿主补 profiler runtime | 本机缺 `link.exe`，msvc 宿主口径见[构建与验证](/rust/build)的工具链告警 |

## 数据出处

- 本页全部数字转写自主仓库 [docs/rust-perf.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-perf.md)（§4.2 历史口径、§4.4 当前口径、原始区间、方法学表格与优化清单）。
- 构建口径与 `panic=abort` 的运维影响见 [docs/rust-build.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-build.md)，站内口径见 [构建与验证](/rust/build)。
- 重构过程与审计存档：[reports/](https://github.com/Te-River/Gensokyo-NewQQ/tree/Refactor/reports)（`refactor` 与 `refactor-validation` 两组）。

## 继续阅读

- [Rust 重构概览](/rust/overview)：双树现状、里程碑与 M4 验收。
- [构建与验证](/rust/build)：release 口径、交叉工具链引导与基准命令。
- [Rust 与 Go 的差异清单](/rust/actions)：action 与端点层面的两端差异。
- [Prometheus 监控指标](/guide/metrics)：Go 版运行期指标口径。
