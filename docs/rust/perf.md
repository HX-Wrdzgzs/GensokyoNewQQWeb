# Rust 性能对比

本页转写主仓库 `docs/rust-perf.md` 的两组数字：Rust 与 Go 的**同负载端到端对比**（10 轮均值 ± 标准差），以及 Rust 热路径**微基准基线**。测量时间 2026-10-25。

> [!IMPORTANT]
> **口径**：单机 loopback 的管线对比，不代表公网 SLA 或 QQ 端到端延迟。场景为本地 `get_login_info`（无 QQ 网络 I/O）；Go 走 HTTP API 路径分发 `/get_login_info`，Rust 走统一 action 入口 `POST /action`；两边均 `disable_webui: true`、`log_level: 3`（error）、无反向 WS、请求体相同。64 并发 × 50,000 请求/轮，Go/Rust **交替**跑 10 轮取均值 ± 标准差，预热 3,000。验收基线（M0 裁决 5）：常驻内存 ≤ Go 版 1.2 倍、吞吐不低于同配置 Go 版，M4 以 72 小时压测验收。

## 同负载端到端对比（Rust vs Go）

环境：AMD Ryzen 5 5600U（6C/12T）、13.8 GB 内存、Windows 11 26300、Go 1.26.4、rustc 1.99.1（release，LTO=thin）、oha 1.16.0。

| 指标 | Go 1.26.4 | Rust 1.99.1 | 对比 |
|------|-----------|-------------|------|
| 吞吐 | 49,137 ± 4,085 req/s（10 轮区间 41,954–56,059） | **50,581 ± 5,241 req/s**（区间 40,157–58,006） | ≈1.03×，区间重叠 |
| 平均延迟 | 1.295 ms | **1.264 ms** | Rust 约低 2.4% |
| P50 | **0.779 ms** | 1.144 ms | Go 低约 32% |
| P99 | 11.02 ms | **3.43 ms** | Rust 约 3.2× 更低 |
| 常驻内存（RSS） | 43.4 MB | **10.8 MB** | Rust 约 4.0× 更低 |
| 二进制体积 | 43.81 MB | **8.12 MB** | Rust 约 5.4× 更小 |
| 成功率 | 100% | 100% | — |

**读法**：吞吐分布高度重叠，**不能宣称 Rust 吞吐显著领先**；稳定差异在尾部延迟（P99）、内存与体积，而 Go 的 P50 更低。高并发下单次均值受调度与后台进程影响，必须多轮取均值并看标准差。Rust 的 RSS 10.8 MB 远低于「≤ Go 1.2 倍」的验收基线，但最终结论以 M4 的 72 小时压测为准。

> [!WARNING]
> **关键方法学**：Go 保持默认 `INFO` 级别且每请求打日志时，吞吐会掉到约 2.9k req/s（约 15× 差距），P99 升到百毫秒级；关掉后两端恢复同一量级。压测必须统一日志级别，否则结论完全失真。

### 复现要点

- Go 侧 `config.yml` 用完整模板（`template/config_template.go`）：`app_id: 12345`（Go 的免 token 启动分支）、`http_address: 127.0.0.1:5701`、`disable_webui: true`、`log_level: 3`。
- Rust 侧同模板：`app_id: 0`、`http_address: 127.0.0.1:5702`、`log_level: 3`。
- 压测命令（两侧 body 相同，URL 不同）：

```powershell
# Go
oha -c 64 -n 50000 -m POST -H "Content-Type: application/json" -d '{"action":"get_login_info","params":{},"echo":1}' http://127.0.0.1:5701/get_login_info

# Rust：同 body，URL 换 http://127.0.0.1:5702/action
```

## 热路径微基准基线

单进程内同步跑的三条热路径，`windows-x86_64`、rustc 1.99.1（GNU host）、release 口径（`lto=thin`、`codegen-units=1`、`opt-level=3`）。三次独立运行各 100,000 次迭代取中位数：

| 用例 | 中位 ns/op | 三次区间（ns/op） |
|------|-----------|------------------|
| `cqcode::parse`：20 段混合 CQ 文本 → `Vec<Segment>` | 15,771 | 15,711 – 16,991 |
| `Event::deserialize`：典型 `GROUP_MESSAGE_CREATE`（数组形态消息） | 4,942 | 4,932 – 5,004 |
| `plan_send_group_msg`：5 段消息参数 → `SendRequest` | 6,794 | 6,673 – 7,031 |

后续优化轮（同机对照）：CQ 解析约 2.0×（14.7 µs → 约 7.3 µs）、事件反序列化 −40%（手写 `Deserialize`）、`dispatch_json`（get_status）−69.6%。CQ 剩余成本是 `Segment` 形状固定的分配地板，进一步优化属 API 级改动，留待评估。

> [!IMPORTANT]
> 微基准噪声约 ±10%：连续跑 3 次取中位数，别拿单次数字下结论；跨迭代数、跨机器比较没有意义。复跑命令：`cargo run --release -p xtask -- bench`（`--iters` 可改，对照历史数字必须用同一值）。这些数字只覆盖同步热路径，不含 tokio 调度、网络/磁盘 IO 与 QQ 上游 RTT。

## 数据出处

- 本页全部数字转写自主仓库 [docs/rust-perf.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-perf.md)（原始三次区间、方法学表格与优化清单）。
- 构建口径见 [docs/rust-build.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-build.md)。
- 重构过程与审计存档：[reports/](https://github.com/Te-River/Gensokyo-NewQQ/tree/Refactor/reports)（`refactor` 与 `refactor-validation` 两组）。

## 继续阅读

- [Rust 重构概览](/rust/overview)：双树现状与 M4 验收里程碑。
- [构建与验证](/rust/build)：release 口径与基准命令的构建链。
- [Prometheus 监控指标](/guide/metrics)：Go 版运行期指标口径。
