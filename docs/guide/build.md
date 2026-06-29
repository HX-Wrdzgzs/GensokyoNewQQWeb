# 编译构建

## 环境要求

- Go 1.21+（推荐 1.26+）
- Node.js 18+（构建前端时需要）
- npm（构建前端时需要）

## 快速开始

```powershell
# 克隆仓库
git clone https://github.com/HX-Wrdzgzs/Gensokyo-NewQQ.git
cd Gensokyo-NewQQ

# 构建前端（可选，已包含预构建 dist）
cd frontend
npm install
npm run build
cd ..

# 编译（当前平台）
go build -trimpath -ldflags="-s -w" -o gensokyo.exe .
```

## 使用构建脚本

项目提供了 `build.ps1` 构建脚本，支持多平台编译：

```powershell
# 编译当前平台
.\build.ps1

# 编译指定平台
.\build.ps1 linux amd64
.\build.ps1 windows 386

# 编译所有支持平台
.\build.ps1 -All

# 仅编译 Linux 平台
.\build.ps1 -LinuxOnly

# 小型化编译（排除云存储 SDK，缩小体积）
.\build.ps1 -Small
```

## 体积优化

### 优化参数说明

| 参数 | 说明 | 效果 |
|---|---|---|
| `-ldflags=-s` | 剥离符号表 | 缩小约 10-15% |
| `-ldflags=-w` | 剥离 DWARF 调试信息 | 缩小约 10-15% |
| `-trimpath` | 移除编译路径信息 | 略微缩小 |
| `-tags=small` | 排除云存储 SDK、gRPC、系统监控等非核心依赖 | 缩小约 **8MB** |

### 两种构建模式

| 模式 | 命令 | 体积 | 功能差异 | 适用场景 |
|---|---|---|---|---|
| **完整版** | `go build .` 或 `.\build.ps1` | ~40MB | 完整云存储 + gRPC + 系统监控 | 需要使用云图床或 Lotus 多进程模式 |
| **小型版** | `.\build.ps1 -Small` | ~**33MB** | 仅本地存储，无 gRPC/系统监控 | 不需要云存储，追求最小体积 |

> 小型版使用 `-tags=small` 编译标签，排除云存储 SDK（阿里云/腾讯云/百度云/百度AI）、gRPC（约 1.8MB）、gopsutil 系统监控、go-mp3 和 go-qrcode 等非核心依赖。
> 图片将使用本地存储（`channel_temp` 目录），监控面板返回模拟数据。如需完整功能，用 `go build .` 重新编译即可。

### 历史体积变化

| 版本 | 体积 | 说明 |
|---|---|---|
| 原始版 | 52 MB | 无优化参数 |
| 优化参数 | 40 MB | +`-ldflags=-s -w -trimpath` |
| 小型版 v1 | 35 MB | +`-tags=small` 排除云 SDK |
| 小型版 v2 | **33 MB** | +排除 gRPC/gopsutil/go-mp3/go-qrcode |
