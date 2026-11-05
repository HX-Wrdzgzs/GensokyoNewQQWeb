# Rust 构建与验证

Rust 工作区的构建入口只有一个：`cargo xtask build`（`.cargo/config.toml` 里的别名，等价于 `cargo run -p xtask -- build`）。Go 时代的 `build.ps1` 已退化为薄包装，把 Go 命名参数翻译成 Rust 三元组后转发给 xtask，不再依赖 Go 工具链。

## 工具链

| 项 | 说明 |
|----|------|
| 版本钉定 | `rust-toolchain.toml` 钉 `1.99.1`（含 `rustfmt`、`clippy`，minimal profile） |
| MSRV | 根 `Cargo.toml` 的 `rust-version = "1.90"`（M1d 按实际依赖校准：`redb 4.4.0` 需 1.90、`time 0.3.55` 需 1.88） |
| 链接器 | 宿主 abi 必须有可用链接器：MSVC 需 VS Build Tools（`link.exe`），GNU 需 mingw |
| `webui/dist` | `rust-embed` **编译期读取该目录**，缺失会直接编译失败（见下文占位机制） |
| UPX（可选） | 默认尝试压缩；PATH 中没有 `upx` 只提示并跳过，不算构建失败 |

> [!WARNING]
> Windows 开发机若没装 MSVC 工具链（缺 `link.exe`），默认的 msvc host 构建会直接失败在链接阶段。当前仓库开发机的可用口径是 **GNU host 工具链 + msys64 的 `dlltool`**（rustc 的 `raw-dylib` 路径需要它）：
>
> ```powershell
> rustup override set 1.99.1-x86_64-pc-windows-gnu
> # 把含 dlltool.exe 及其依赖 DLL 的目录（MSYS2 mingw-w64 binutils）加入 PATH，勿放进仓库
> $env:PATH = "<mingw-bin>;$env:PATH"
> ```
>
> 缺 `dlltool.exe` 时的报错特征：`error calling dlltool 'dlltool.exe': program not found`，或 `failed to add native library ...kernel32.dll_imports.lib`。

## 常用命令

以下均为 CI（`.github/workflows/rust.yml`）与仓库文档实际使用的命令，不存在别的入口：

| 用途 | 命令 |
|------|------|
| 格式检查 | `cargo fmt --all --check` |
| Lint（拒绝 warning） | `cargo clippy --workspace --all-targets --locked -- -D warnings` |
| 全量编译 | `cargo build --workspace --locked` |
| 全量测试 | `cargo test --workspace --locked` |
| 供应链策略检查 | `cargo deny check` |
| RustSec 漏洞通告 | `cargo audit` |
| TLS 版本下限断言 | `cargo run --locked --package xtask -- check-tls-floors` |
| 构建产物 | `cargo xtask build`（参数见下节） |
| 热路径基准 | `cargo run --release -p xtask -- bench` |

`--locked` 必须落在 `cargo run` / `cargo build` 上（CI 同款理由）：防止 cargo 在校验前静默改写 `Cargo.lock`。基准命令务必带 `--release`——`cargo xtask` 别名本身不带，debug 数字没有意义。

## 本地构建与目标矩阵

```powershell
cargo xtask build                          # 宿主（不传 --target，交给 cargo 选当前 abi）
cargo xtask build --target aarch64-unknown-linux-gnu   # 单个交叉目标，可重复 --target
cargo xtask build --no-webui --no-upx      # 精简版开关 + 跳过 UPX
cargo xtask build --all                    # 全矩阵（双版本）
cargo xtask build --linux-only             # 只 Linux
```

`--all` 对齐 CI 的 9 目标矩阵（Go 命名 os/arch 仅用于产物文件名）：

| 三元组 | os | arch | 产物 | 备注 |
|--------|----|------|------|------|
| `x86_64-unknown-linux-gnu` | linux | amd64 | `gensokyo-linux-amd64` | |
| `i686-unknown-linux-gnu` | linux | 386 | `gensokyo-linux-386` | |
| `armv7-unknown-linux-gnueabihf` | linux | arm | `gensokyo-linux-arm` | |
| `aarch64-unknown-linux-gnu` | linux | arm64 | `gensokyo-linux-arm64` | |
| `x86_64-apple-darwin` | darwin | amd64 | `gensokyo-darwin-amd64` | 需 macOS + Xcode CLT |
| `aarch64-apple-darwin` | darwin | arm64 | `gensokyo-darwin-arm64` | 同上 |
| `x86_64-pc-windows-msvc` | windows | amd64 | `gensokyo-windows-amd64.exe` | |
| `i686-pc-windows-msvc` | windows | 386 | `gensokyo-windows-386.exe` | |
| `aarch64-linux-android` | android | arm64 | `gensokyo-android-arm64` | **实验性**（M0 裁决 2：失败不阻塞合入） |

`--all` 的语义要点：未安装的目标打印 `[skip]` 后继续、不计失败；已安装但编译失败的目标记入失败清单并以非零退出码汇总；所有目标都被跳过（无任何产物）也是非零退出。交叉编译前记得 `rustup target add <triple>` 并准备对应链接器或 `cross` 容器。

## `webui/dist` 占位机制对 cargo build 的影响

`gensokyo-webui` 用 `rust-embed` 在**编译期**读取 `webui/dist/` 目录，该目录以 `.gitignore` 忽略——也就是说，克隆仓库后直接 `cargo build` 会因目录缺失而失败，除非先经过下面任一条路径：

- `cargo xtask build` 在目录缺失时自动写入 5 个占位文件（与旧 `build.ps1` 的 `Ensure-WebUIDist`、CI 占位步骤同一组文件）；
- 构建真实前端：`cd frontend && npm run build` 产出完整 `webui/dist`；只要存在 `webui/dist/css/style.css`，xtask 就不再写占位文件。

## `--no-webui` 的当前状态

> [!WARNING]
> Go 版用 `-tags=small` 真实裁剪 WebUI/OSS/gRPC/二维码。Rust 侧目前**没有任何 crate 定义 feature**，`gensokyo-runtime` 无条件依赖 `gensokyo-webui`，所以 `--no-webui` 当前翻译为 `--no-default-features`，在 `gensokyo-bin` 上是 **no-op**：产物名带 `-noWebui`，内容与完整版一致。等 `small`/`webui` 特性落地后只需改 xtask 中的一行。

## TLS 下限与发布配置

- `gensokyo-qq` 的 TLS 依赖下限：`rustls 0.23.46` / `webpki-root-certs 1.0.10` / `rustls-webpki 0.103.16`；`cargo xtask check-tls-floors` 与 CI `tls-floors` job 断言 `Cargo.lock` 不低于下限。
- `deny.toml` 禁用 `openssl`、`openssl-sys`（供应链裁决）。
- 根 `Cargo.toml` 的 `profile.release` / `profile.bench` 同档：`lto = "thin"`、`codegen-units = 1`、`opt-level = 3`、`strip = "symbols"`；**不设 `panic = "abort"`**（runtime 的 handler 隔离依赖 `catch_unwind`）。

## 并行编译建议

xtask 从 `cargo metadata` 的 `target_directory` 推导产物位置，尊重 `CARGO_TARGET_DIR` 与 `.cargo/config.toml`。cargo 对同一 target 目录串行加包锁，若需要**同时**跑多套口径（例如 1.99.1 与 MSRV 1.90 对照、或多交叉目标并行），为每个构建指定独立的 `CARGO_TARGET_DIR` 可避免互相排队等锁：

```powershell
$env:CARGO_TARGET_DIR = "$env:TEMP\gensokyo-target-msrv"
cargo +1.90-x86_64-pc-windows-gnu build --workspace
```

## 产物与验证

产物输出到 `<workspace>/release/`（`.gitignore` 忽略），文件名 `gensokyo-{os}-{arch}[-noWebui][.exe]` 与 Go 版逐字一致；日志会打印每个产物的实际路径与大小（MB），UPX 压缩在复制之后进行。只构建 bin 用 `cargo build --release --locked -p gensokyo-bin --bin gensokyo`，不用 `--workspace`。

本机验证命令（GNU host 口径）：

```powershell
cargo +1.99.1-x86_64-pc-windows-gnu test -p xtask
cargo +1.99.1-x86_64-pc-windows-gnu clippy -p xtask --all-targets -- -D warnings
cargo +1.99.1-x86_64-pc-windows-gnu run -p xtask -- build --help
cargo +1.99.1-x86_64-pc-windows-gnu run -p xtask -- build --no-upx   # 宿主 release 构建
```

## 继续阅读

- [Rust 重构概览](/rust/overview)：动因、双树现状与里程碑。
- [性能对比](/rust/perf)：构建口径对应的实测数字。

完整口径见主仓库 [docs/rust-build.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-build.md)（`Refactor` 分支）。
