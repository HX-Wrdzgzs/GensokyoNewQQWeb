# GensokyoNewQQWeb

Gensokyo-NewQQ 官方介绍与帮助文档网站，基于 VitePress 构建。

## 项目简介

本项目是 [Gensokyo-NewQQ](https://github.com/HX-Wrdzgzs/Gensokyo-NewQQ) 的配套文档与展示站，用于集中呈现项目介绍、快速开始、功能说明、OneBot V11 兼容性、扩展 API、扩展 CQ 码与常见使用路径。

站点目标不是替代仓库源码文档，而是为新用户提供更清晰的入口，把“能不能用、怎么接、支持哪些能力、遇到问题去哪看”这几类信息放到同一个帮助站里。

## 核心功能

- **文档聚合**：整理 Gensokyo-NewQQ 的开始使用、配置、API、事件、CQ 码与扩展能力说明。
- **兼容性说明**：展示 OneBot V11 标准 API、扩展 API 与 CQ 码在网关中的支持状态。
- **用户入口**：面向机器人部署者、插件开发者和普通使用者提供更低门槛的阅读路径。
- **静态部署**：基于 VitePress 输出纯静态文件，适合部署到 Pages、对象存储或任意静态站点托管服务。

## 技术栈

- VitePress
- Vite
- Vue 3
- Markdown

## 本地开发

运行本项目需要 Node.js 环境。

### 1. 安装依赖

```bash
npm install --registry=https://registry.npmmirror.com
```

也可以使用默认 npm registry：

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动后可在本地访问：

```text
http://localhost:5173/
```

### 3. 构建静态文件

```bash
npm run build
```

构建生成的静态资源会输出到：

```text
docs/.vitepress/dist
```

### 4. 本地预览构建结果

```bash
npm run preview
```

## 内容维护约定

- 面向用户的教程优先放在 `docs/` 下。
- 涉及源码行为的说明应尽量和 `Gensokyo-NewQQ` 主仓库保持同步。
- API、事件、CQ 码等支持矩阵应标明“已支持 / 部分支持 / 未支持 / 实验性”。
- 不确定的行为不要写成稳定承诺，避免文档误导部署者。

## 开源协议

本项目基于 MIT 协议开源。
