# Gensokyo-NewQQWeb

✨ **Gensokyo-NewQQ 官方介绍与帮助文档网站** ✨

本仓库是 [Gensokyo-NewQQ](https://github.com/Te-River/Gensokyo-NewQQ)（基于 Go 原生的高性能 OneBot V11 QQ 官方机器人网关）的配套官网与帮助文档项目。

## 🌟 网站亮点

- **VitePress 驱动**：使用极速的 VitePress 静态站点生成器构建，完美适配深浅色模式切换。
- **Supabase 极简暗黑风**：遵循 Supabase 设计语言，选用翡翠绿（Emerald Green）作为主题点缀，科技感十足。
- **CQ 码实时演练场**：内置交互式 CQ 码转换模拟器，输入 OneBot CQ 码即可实时预览 Gensokyo 的协议映射与气泡图文渲染。
- **配置与 API 矩阵**：内置对 Gensokyo 的 `config.yml` 示例解析，以及全面、可搜索过滤的 API / CQ 码兼容矩阵。
- **原生文档接入**：完整导入并聚合了 Gensokyo 网关的所有原厂接口使用说明文档。

---

## 🛠️ 本地开发

本网站基于 Node.js 环境开发：

### 安装依赖

推荐使用国内淘宝镜像源加速依赖安装：

```bash
npm install --registry=https://registry.npmmirror.com
```

### 启动开发服务器

```bash
npm run dev
```

启动后可在浏览器中访问 `http://localhost:5173/` 实时预览热更新效果。

### 生成静态构建

```bash
npm run build
```

---

## 🚀 部署至 Cloudflare Pages

本项目已完全适配 Cloudflare Pages 自动构建与部署。将项目关联到 Cloudflare Pages 后，请确保填写如下构建参数：

- **Framework Preset**: `Vite` (或选择 `None`)
- **Build Command**: `npm run build`
- **Build Output Directory**: `docs/.vitepress/dist`
- **Build Branch**: `main`

---

## 📄 开源协议

本项目基于 MIT 协议开源发布。
