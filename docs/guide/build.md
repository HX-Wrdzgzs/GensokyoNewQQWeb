# 编译构建

## 环境要求

- **Go 1.26.10+**（`go.mod:3` 的 `go 1.26.10` 是硬性下限，低于该版本 `go build` 会拒绝编译）
- Node.js 18+（构建前端时需要）
- npm（构建前端时需要）
- PowerShell 5.1+（`build.ps1` 对原生命令 stderr 有专门兼容处理）

## 快速开始

```powershell
# 克隆仓库
git clone https://github.com/Te-River/Gensokyo-NewQQ.git
cd Gensokyo-NewQQ

# 构建前端（可选，仓库已包含预构建 dist）
cd frontend
npm install
npm run build
cd ..

# 编译（当前平台）
go build -trimpath -ldflags="-s -w" -o gensokyo.exe .
```

> [!WARNING]
> 手动 `go build` 的前提是 **`webui/dist/` 目录存在**：前端产物通过 `//go:embed` 嵌入，目录缺失时编译直接失败。仓库以 `.gitignore` 忽略该目录，所以克隆后需要先跑 `.\build.ps1`（它的 `Ensure-WebUIDist` 会在缺 `webui/dist/css/style.css` 时自动补 **5 个占位文件**：`placeholder.html`、`css/placeholder.css`、`fonts/placeholder.txt`、`icons/placeholder.txt`、`js/placeholder.js`，见 `build.ps1:45-55`），或自己建出这组占位文件。

## 使用构建脚本

`build.ps1` 的开关只有四个：`-All`、`-LinuxOnly`、`-NoUPX`、`-NoWebUI`（`build.ps1:10-24`），前三个位置参数依次是 `TargetOS`、`TargetArch`、`UPXLevel`（默认 `7`）。脚本自身会设 `CGO_ENABLED=0`（`:30`，交叉编译必需）、`GOPROXY` 国内镜像链（`:28`）与 `GOFLAGS=-mod=mod`（`:29`）。

```powershell
# 编译当前平台
.\build.ps1

# 编译指定平台（位置参数：os arch）
.\build.ps1 linux amd64
.\build.ps1 windows 386

# 编译所有支持平台（双版本：完整版 + noWebui 精简版）
.\build.ps1 -All

# 仅编译 Linux 平台
.\build.ps1 -LinuxOnly

# 无 WebUI 精简版（排除云存储 SDK / gRPC / 二维码，见下节）
.\build.ps1 -NoWebUI

# 跳过 UPX 压缩
.\build.ps1 -NoUPX
```

脚本同时兼容 `--xxx` 写法与位置参数 `all`（`build.ps1:32-40`），例如 `.\build.ps1 --NoWebUI`、`.\build.ps1 all` 都能用。

> [!NOTE]
> **不存在 `-Small` 这个开关**。精简版靠 `-NoWebUI` 触发，脚本内部把它翻译成编译标签 `-tags=small`（`build.ps1:94`），产物文件名追加 `-noWebui` 后缀（`:93,:95`）。

## 产物位置与命名

产物统一输出到 `release/` 目录（`.gitignore` 忽略），命名与 Rust 版逐字一致：

```
release/gensokyo-{os}-{arch}[-noWebui][.exe]
```

例如 `release/gensokyo-linux-arm64`、`release/gensokyo-windows-amd64.exe`、`release/gensokyo-windows-386-noWebui.exe`（`build.ps1:92-96` 拼接 `os` / `arch` / `-noWebui` 后缀与 `.exe`）。

CI（`.github/workflows/cross_compile.yml`）构建的是**九目标矩阵**：linux × amd64/386/arm/arm64、darwin × amd64/arm64、windows × amd64/386、android × arm64（`cross_compile.yml:53-70`），`fail-fast: false`，逐目标最长 45 分钟。本地 `.\build.ps1 -All` 与该矩阵对齐。

## 体积优化

### 优化参数说明

| 参数 | 说明 |
|---|---|
| `-ldflags=-s` | 剥离符号表 |
| `-ldflags=-w` | 剥离 DWARF 调试信息 |
| `-trimpath` | 移除编译路径信息（同时让产物可复现） |
| `-tags=small` | 排除云存储 SDK（阿里云 / 腾讯云 / 百度云 / 百度 AI）、gRPC、gopsutil 系统监控、go-mp3、go-qrcode 等非核心依赖 |
| `-NoUPX` | 跳过 UPX 压缩（默认按 `UPXLevel=7` 压缩） |

### 两种构建模式

| 模式 | 命令 | 功能差异 | 适用场景 |
|---|---|---|---|
| **完整版** | `go build .` 或 `.\build.ps1` | 完整云存储 + gRPC + 系统监控 + WebUI | 需要使用云图床或 Lotus 多进程模式 |
| **精简版** | `.\build.ps1 -NoWebUI` | 移除 WebUI、gRPC、二维码、OSS 后端（阿里云 / 百度云 / 腾讯云） | 不需要云存储，追求最小体积 |

`-tags=small` 通过源码里的 `//go:build !small` / `//go:build small` 成对文件切换实现（例如 `silk/mp3_real.go` 与 `silk/mp3_stub.go`）。精简版下图片走本地存储（`channel_temp` 目录），监控面板返回模拟数据；需要完整功能时用 `go build .` 重新编译。

> [!WARNING]
> **历史体积数字已撤下**：本页此前给出的「52 MB / 40 MB / 35 MB / 33 MB」以及「`-tags=small` 缩小约 8 MB」没有可核对的构建记录与日期，属过期口径，不再作为现值引用。想知道当前体积，请按上面的命令各构建一次，直接读 `release/` 目录里的文件大小（构建日志也会打印每个产物的实际大小）。
