# Gensokyo-NewQQWeb

Gensokyo-NewQQ 官方介绍与帮助文档网站项目。

## 项目简介

本项目为 [Gensokyo-NewQQ](https://github.com/Te-River/Gensokyo-NewQQ) 机器人网关的配套文档与展示网站，基于 VitePress 静态站点生成器构建。

## 核心功能

- **文档聚合**：整合了 Gensokyo-NewQQ 所有的原生接口与机制说明文档。
- **兼容性矩阵**：提供 OneBot V11 标准 API 及 CQ 码在网关中的支持状态检索。
- **演练场组件**：内置 CQ 码解析模拟器，用于展示网关对 OneBot CQ 码的解析与渲染逻辑。

## 本地开发

运行本项目需要 Node.js 环境：

### 1. 安装依赖

```bash
npm install --registry=https://registry.npmmirror.com
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动后可在本地访问 `http://localhost:5173/` 进行预览。

### 3. 构建静态文件

```bash
npm run build
```

构建生成的静态资源将输出至 `docs/.vitepress/dist` 目录。

## 开源协议

本项目基于 MIT 协议开源。
