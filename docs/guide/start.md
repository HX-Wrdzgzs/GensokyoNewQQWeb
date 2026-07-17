# 快速上手

本页用于完成一条最小可用链路：创建 QQ 官方机器人、启动 Gensokyo-NewQQ，并连接一个 OneBot V11 客户端。

## 1. 创建 QQ 官方机器人

1. 打开 [QQ 开放平台](https://q.qq.com/qqbot/) 并完成开发者注册。
2. 创建机器人应用。
3. 在控制台取得 `AppID`、`Token` 和 `ClientSecret`。
4. 根据实际场景申请群聊、C2C 私聊或 QQ 频道相关权限与 Intent。

> [!CAUTION]
> `Token` 与 `ClientSecret` 是敏感凭证。不要发到群聊、Issue、截图、网页前端或公开仓库中。

## 2. 下载 Gensokyo-NewQQ

前往 [Te-River/Gensokyo-NewQQ Releases](https://github.com/Te-River/Gensokyo-NewQQ/releases) 下载与你的系统和架构匹配的构建产物，并解压到独立目录。

建议目录中只放置当前实例需要的程序、配置、日志和运行数据，便于升级和备份。

## 3. 首次启动并生成配置

在程序目录中启动 Gensokyo。Windows 可运行对应的 `.exe` 文件，Linux 或 macOS 可在终端中执行：

```bash
chmod +x ./gensokyo
./gensokyo
```

首次运行后，程序会在工作目录生成 `config.yml`。若进程因缺少凭证退出，这是正常现象；先完成配置再重新启动。

## 4. 填写最小配置

打开 `config.yml`，先确认以下核心字段：

```yaml
version: 1
settings:
  app_id: 123456789
  token: "your_app_token"
  client_secret: "your_client_secret"

  text_intent:
    - "GroupATMessageEventHandler"
    - "GroupMessageEventHandler"
    - "C2CMessageEventHandler"

  ws_address:
    - "ws://127.0.0.1:8080/onebot/v11/ws"
  ws_token:
    - "your_ws_token"
```

- `app_id`、`token`、`client_secret` 必须与同一个 QQ 开放平台应用对应。
- `text_intent` 只填写已经获批且确实需要的事件。
- `ws_address` 应指向下游 OneBot 客户端提供的反向 WebSocket 地址。
- `ws_token` 应与下游客户端的鉴权配置一致。

完整字段说明见[配置指南](/guide/configuration)。

## 5. 启动下游 OneBot 客户端

以 NoneBot2、Koishi 或其他支持 OneBot V11 的框架为例，确保它已经：

1. 启用 OneBot V11 适配器。
2. 开放反向 WebSocket 服务，或配置为主动连接 Gensokyo 的正向 WebSocket。
3. 使用与 Gensokyo 一致的 Token。
4. 监听正确的地址、端口和路径。

连接方向不要混淆：

| 模式 | 主动发起连接的一方 |
|---|---|
| 反向 WebSocket | Gensokyo 主动连接下游客户端 |
| 正向 WebSocket | 下游客户端主动连接 Gensokyo |

## 6. 重新启动并验证

重新启动 Gensokyo 后，同时观察 Gensokyo 与下游客户端日志。至少确认：

- QQ 官方连接已经建立。
- OneBot WebSocket 或 HTTP 连接已经建立。
- 下游客户端能够收到生命周期或消息事件。
- 机器人能够处理一条获批场景中的测试消息。

不要只根据网页是否能打开判断网关已经可用。WebUI、QQ 官方连接和 OneBot 下游连接是三条不同链路。

## 常见问题

### QQ 官方连接失败

检查凭证是否填错、是否包含多余空格，以及机器人应用当前是否可用。修改凭证后完整重启进程。

### 群消息或私聊没有上报

检查 QQ 开放平台权限、审核状态和 `text_intent`。Intent 写入配置并不代表平台已经授予对应事件权限。

### WebSocket 一直重连

检查连接方向、地址、端口、路径和 Token。还要确认下游服务监听的网卡地址是否允许 Gensokyo 访问。

### 能收到事件但无法回复

检查消息类型、ID 映射、官方接口权限和限频信息，并同时查看两侧日志。部分 OneBot 能力在 QQ 官方机器人场景中需要转换或使用项目扩展接口。

## 下一步

- [项目概览](/guide/overview)：了解网关职责和数据流。
- [配置指南](/guide/configuration)：配置 Intent、WebSocket、HTTP 与 WebUI。
- [能力矩阵](/guide/matrix)：检索 API、CQ 码和扩展能力。
- [idmap 虚拟 ID 映射](/idmap)：理解 OpenID 与下游数字 ID 的转换。
