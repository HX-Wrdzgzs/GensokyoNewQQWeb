# GensokyoNewQQWeb

GensokyoNewQQWeb 是 [Te-River/Gensokyo-NewQQ](https://github.com/Te-River/Gensokyo-NewQQ) 的配套 Web 文档与项目入口，基于 VitePress 构建。

本站用于整理项目概览、快速开始、配置说明、OneBot V11 能力矩阵、WebUI 使用边界以及扩展 API/CQ 码。涉及具体行为、默认值和版本差异时，以主仓库源码、Release 说明和当前版本自动生成的配置文件为准。

## 本地开发

运行环境建议使用当前维护中的 Node.js LTS 版本。

```bash
npm install
npm run dev
```

构建与本地预览：

```bash
npm run build
npm run preview
```

VitePress 源文件位于 `docs/`，构建产物位于 `docs/.vitepress/dist/`。

## 内容结构

- `docs/index.md`：项目首页。
- `docs/guide/`：项目概览、快速开始、配置、构建、WebUI 和能力矩阵。
- `docs/api/`：OneBot API 与项目扩展 API 文档。
- `docs/cq码/`：标准 CQ 码差异与项目扩展 CQ 码。
- `docs/components/`：首页演练场和能力矩阵等 Vue 组件。
- `docs/.vitepress/`：站点配置与主题样式。

## 维护原则

- 主仓库是功能与版本信息的事实来源。
- 不把未经测试的性能数字、兼容性结论或默认路径写成稳定承诺。
- 标准 OneBot 映射、QQ 官方能力限制和 Gensokyo 项目扩展应明确区分。
- 示例配置必须使用占位符，不得提交真实 Token、ClientSecret、Access Token 或登录密码。
- 修改导航或新增页面后，应执行 `npm run build` 检查内部链接和 Vue 组件。

## 相关项目

- 主仓库：[Te-River/Gensokyo-NewQQ](https://github.com/Te-River/Gensokyo-NewQQ)
- OneBot V11 规范：[botuniverse/onebot-11](https://github.com/botuniverse/onebot-11)
