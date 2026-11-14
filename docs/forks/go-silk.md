# go-silk Fork Inventory

> 本地 fork 依赖：`go.mod` 中 `replace github.com/wdvxdr1123/go-silk => ./go-silk`

## 基本信息

| 项 | 值 |
|----|----|
| upstream | https://github.com/wdvxdr1123/go-silk |
| 本地 module | `github.com/wdvxdr1123/go-silk`（路径 `./go-silk`） |
| 用途 | Silk 音频编码 SDK（QQ 语音消息格式） |
| 引用方式 | go.mod `replace`（本地目录，非发布版本） |
| 隔离边界 | 只允许 `media/audio adapter` import；其余模块调用 `AudioTranscoder`（P5） |

## 为什么需要 fork

- 需要针对当前构建/平台条件的本地调整。
- `silk/` 目录通过 `go:embed exec/*` 嵌入编译产物，`mp3_real.go`/`mp3_stub.go` 由
  `//go:build !small`/`small` 切换，可能与上游默认构建不同。

## 本地 patch 内容（已知）

- 构建产物嵌入与 platform 相关调整。

> ⚠️ 完整本地 patch 清单需维护者补齐（相对 upstream 的 diff）。

## 未来同步方式

- 定期 `git fetch upstream` 对比；仅合并稳定、无破坏的改动。
- 保持 `AudioTranscoder` 边界，避免业务层直接触碰 go-silk。

## Rust 侧对应

> [!NOTE]
> 本页描述的 `replace` 机制**只适用于 Go 主链**：`go.mod:44` 的 `replace github.com/wdvxdr1123/go-silk => ./go-silk` 是 Go 模块系统的能力。Rust 工作区没有 `go.mod`，也**没有 fork + replace 的概念**，本目录的本地 patch 不需要在 Rust 侧「同步」。

主仓库 `Refactor` 分支里，silk 相关职责落在 workspace 成员 crate **`crates/gensokyo-media`**（crate 自述：「下载上传、压缩、图床、silk、QR」，实现文件 `crates/gensokyo-media/src/silk.rs`）。这里有一处**运维必须知道的差异**：Go 版把 8 个平台的 `silk_codec-*` 用 `go:embed exec/*` 打进二进制、运行时解到临时文件再执行；Rust 侧 **不嵌入 `silk/exec/`**（体积与平台矩阵留到 M4），改为调用运行环境已安装的外部工具——PCM 转换 / 重采样用 `ffmpeg`（`GENSOKYO_FFMPEG` 覆盖程序名或路径），Silk v3 编解码用 `pts`（`GENSOKYO_PTS` 覆盖，Windows 下需 `.exe` 或完整路径）（`silk.rs:23-31,51-55`）。

> [!WARNING]
> 由此带来的部署要求与行为差别（`silk.rs:33-49`）：**容器镜像必须显式安装 `ffmpeg` 与 `pts`**，二进制自身不带；程序找不到时回 `Error::SilkUnavailable`（不 panic），非零退出 / 产物缺失回 `Error::SilkCodec`，由调用方决定降级——而 Go 侧同类失败只打日志后返回 `nil`，调用方拿到空音频。Rust 侧也没有 Go 的内建 MP3 解码 / 重采样 / 下混快速路径，统一交给 `ffmpeg`。

Rust 侧没有 `AudioTranscoder` 这个接口名，等价的转码入口是 `gensokyo-media` 的 `SilkCodec`（`silk.rs:197`）；业务层（actions / runtime）仍然只依赖这一层，不直接触碰编解码实现——与 Go 侧的 `AudioTranscoder` 边界同一意图。两树关系与逐端点差异见 [Rust 重构概览](/rust/overview) 与 [Rust 与 Go 的差异清单](/rust/actions)。

## 参考

- `go-silk/README.md`
