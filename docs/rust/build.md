# Rust 构建与验证

Rust 工作区的构建入口只有一个：`cargo xtask build`（`.cargo/config.toml` 里的别名，等价于 `cargo run -p xtask -- build`）。

> [!IMPORTANT]
> 「`build.ps1` 已退化为薄包装」这一句**只适用于主仓库的 `Refactor` 分支**（Rust 工作区所在的那棵树）：那里的 `build.ps1:1-3` 只做「Go 命名参数 → Rust 三元组」的翻译后转发给 xtask，不再调用 Go 工具链。`main` 分支（Go 生产主线）的 `build.ps1` 仍是完整的 Go 构建链，口径见[编译构建](/guide/build)。

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

`--all` 的语义要点：rustup target 缺失时自动 `rustup target add --toolchain <当前工具链>`（幂等），补装失败才打印 `[skip]` 后继续、不计失败；已安装但编译失败的目标记入失败清单并以非零退出码汇总；所有目标都被跳过（无任何产物）也是非零退出。

### Linux 交叉工具链自动引导

**linux-gnu ×4（amd64 / 386 / arm / arm64）无需预装任何交叉链接器，也不需要 `cross` 容器**：xtask 的引导逻辑（`xtask/src/bootstrap.rs`，Windows / Linux 宿主通用）自动探测并下载 `zig` **0.16.0** + `cargo-zigbuild` **v0.24.1**，由 `zig cc` 充当交叉 C 编译器（含 C 代码的依赖如 `ring` 因此不再需要各平台原生工具链）：

1. 先查 PATH（版本与钉死值不符时 warn 并忽略命中），再查 `<workspace>/.tools/` 缓存（已 gitignore），命中即用不重复下载；
2. 缺失时按宿主平台从官方 URL 用 `curl --fail --location --retry 3` 下载到 `.tools/`；
3. cargo-zigbuild 下载官方同名 `.sha256` 并用 `certutil`（Windows）/ `sha256sum`（Linux）逐字比对；zig 官方索引不提供逐文件 sha256，退化为非空检查 + tar 解压完整性校验；
4. `tar -xf` 解压（Windows 自带 bsdtar 同时支持 zip 与 tar.xz），失败时清掉半成品目录，重试即重新下载；
5. 工具目录前置注入构建子进程的 PATH（不污染 xtask 自身环境），随后 `cargo zigbuild --release --locked -p gensokyo-bin --target <triple>`。

`.tools/` 齐全后**二跑零网络**；下载/校验失败直接报错（给出 URL 与原因），**不静默回退到必败的 plain `cargo build`**。`--all` 矩阵下引导失败只把 linux 目标记入失败清单，darwin / windows / android 目标照常继续。版本可用环境变量覆盖：`GENSOKYO_ZIG_VERSION`（默认 `0.16.0`）、`GENSOKYO_CARGO_ZIGBUILD_VERSION`（默认 `0.24.1`），只接受 `数字[.数字]*` 形式，非法值直接报错。

> [!WARNING]
> **引导范围之外仍需自备工具链**：darwin ×2 要 macOS + Xcode CLT；windows-msvc ×2 要 VS Build Tools；android 要 NDK（实验性）；**linux-musl 不在引导范围**（cargo-zigbuild 只路由 linux-gnu，musl 需自备工具链）。另外 macOS / 32 位宿主没有官方预编译的 zig / cargo-zigbuild 源，引导会报错并提示手动安装并加入 PATH。

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
- 根 `Cargo.toml` 的 `profile.release`（`:139-144`）：`lto = "fat"`、`codegen-units = 1`、`opt-level = 3`、`strip = "symbols"`、**`panic = "abort"`**；`profile.bench`（`:149-153`）除 `panic` 一项外同档（cargo 对 bench profile 忽略 `panic = "abort"` 并打 warning，故 bench 段不写这一行）。

## release 的 panic 语义（运维必读）

> [!WARNING]
> **生产部署必须有 supervisor / 服务自启**。`profile.release` 的 `panic = "abort"`（P31 裁决，`Cargo.toml:144`）意味着**任何 panic——包括 tokio 任务内的 panic——直接带走整个进程**，不再是「只丢这一条请求」。进程内的易失状态随之消失：SSM 待补发队列、echo 缓存、延迟队列 / 未完成计划。
>
> - **Linux**：systemd unit 里设 `Restart=always`（配 `RestartSec=`）；
> - **Windows**：服务恢复策略设为「重新启动服务」，或用计划任务 / NSSM 等等价物守护；
> - **容器**：`restartPolicy: always`，并注意队列丢空后的补发由下游重投。
>
> 口径细节：runtime 的 `catch_unwind` handler 隔离（`dispatcher.rs`）**只在 unwind 口径（dev / test）有效**，release 下这层隔离退化为进程退出；单测能覆盖的「panic 回 `1500`」在生产 release 二进制上表现为停机。要恢复请求级隔离，删掉 `Cargo.toml:144` 这一行即可（代价是省不掉展开表、产物变大）。lotus 远程模式下桥线程 panic 同样直接退出进程，降级与人工介入口径见下一节。

### lotus 远程模式的一条补充

`lotus=true` 时 idmap 的 17 个操作走远端（gRPC 客户端，或 `lotus_grpc=false` 时的 HTTP 回退）。Rust 侧启动期建连失败只 **warn 并降级本地**（Go 会 panic），`/getid` 在降级时保留挂载；启动成功后远端不可达则按 Go 语义返回错误，且**无运行时自动切回本地**（避免双写分裂），需要人工介入或重启。逐 action / 端点的差异清单见 [Rust 与 Go 的差异清单](/rust/actions)。

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
- [Rust 与 Go 的差异清单](/rust/actions)：action 覆盖、`/getid` 挂载与 `backup_port` 语义等两端差异。

完整口径见主仓库 [docs/rust-build.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-build.md)（`Refactor` 分支）。
