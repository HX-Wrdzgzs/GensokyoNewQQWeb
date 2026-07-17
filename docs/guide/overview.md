# 项目概览

Gensokyo-NewQQ 是一个面向 QQ 官方机器人 API 的 OneBot V11 协议网关。它负责接收 QQ 官方平台的事件，将其转换为 OneBot V11 事件，并把 OneBot 客户端发起的调用转换回 QQ 官方 API 请求。

本仓库是 Gensokyo-NewQQ 的配套 Web 文档与项目入口，不替代主仓库源码和版本发布说明。涉及行为差异时，应以当前使用版本的源码、Release 说明和运行日志为准。

## 数据流

```text
QQ 开放平台
    │ 官方 WebSocket 事件 / HTTP API
    ▼
Gensokyo-NewQQ
    │ 事件转换、ID 映射、消息转换、连接管理
    ▼
OneBot V11 客户端
    ├─ NoneBot2
    ├─ Koishi
    └─ 其他支持 OneBot V11 的框架
```

## 主要能力

- 将 QQ 官方机器人事件转换为 OneBot V11 事件。
- 提供 HTTP API、反向 HTTP POST、正向 WebSocket和反向 WebSocket 等连接方式。
- 支持群聊、C2C 私聊和 QQ 频道相关事件的转换。
- 通过 idmap 在 OpenID 与下游使用的数字 ID 之间建立映射。
- 支持文字、图片、语音、视频、Markdown 等消息类型，并提供项目扩展 API 与 CQ 码。
- 提供 WebUI 管理入口，便于查看和调整实例配置。

## 本站适合谁

### 部署者

从快速开始和配置指南入手，完成凭证、Intent、连接方式和 WebUI 的基础设置。

### 插件开发者

重点阅读兼容性矩阵、API 文档、扩展 CQ 码和 idmap 说明，确认下游框架能够接收的事件与调用方式。

### 维护者

修改网页内容时，应同步核对主仓库的 README、配置模板、源码和 Release 说明。未经验证的性能数据、默认路径和兼容性结论不应写成稳定承诺。

## 项目边界

Gensokyo-NewQQ 是协议网关，不是机器人业务框架。命令系统、插件加载、权限模型和业务数据通常由下游 OneBot 客户端或机器人框架负责。

QQ 官方平台的权限、Intent、接口限频和审核规则也不由 Gensokyo-NewQQ 控制。出现事件缺失或调用失败时，需要同时检查 QQ 开放平台配置、Gensokyo 日志和下游客户端日志。
