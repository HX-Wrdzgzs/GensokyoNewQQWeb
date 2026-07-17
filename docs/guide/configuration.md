# 配置指南

Gensokyo 首次运行时会在工作目录生成 `config.yml`。配置文件包含机器人凭证、事件订阅、OneBot 连接方式、HTTP 服务和 WebUI 等设置。

> [!CAUTION]
> `token`、`client_secret`、WebSocket Token 和 HTTP Access Token 都属于敏感信息。不要把真实值提交到 Git、截图或公开日志中。

## 最小配置示例

下面的示例仅保留启动和连接所需的核心字段。字段是否可用以及默认值可能随版本变化，应以当前版本自动生成的 `config.yml` 为准。

```yaml
version: 1
settings:
  # QQ 开放平台机器人凭证
  app_id: 123456789
  token: "your_app_token"
  client_secret: "your_client_secret"

  # 订阅的事件类型
  text_intent:
    - "ATMessageEventHandler"
    - "GroupATMessageEventHandler"
    - "GroupMessageEventHandler"
    - "C2CMessageEventHandler"

  # 反向 WebSocket：Gensokyo 主动连接下游框架
  ws_address:
    - "ws://127.0.0.1:8080/onebot/v11/ws"
  ws_token:
    - "your_ws_token"

  # 正向 WebSocket：下游框架主动连接 Gensokyo
  enable_ws_server: true
  ws_server_path: "ws"
  ws_server_token: "change_me"

  # Gensokyo HTTP / WebUI 服务端口
  port: "15630"
  disable_webui: false
  server_user_name: "admin"
  server_user_password: "change_me_now"
```

## 机器人凭证

| 字段 | 作用 |
|---|---|
| `app_id` | QQ 开放平台应用 ID |
| `token` | 应用令牌 |
| `client_secret` | 应用密钥 |
| `uin` | 可选的机器人 QQ 号配置 |
| `use_uin` | 是否在部分场景使用 QQ 号作为 Bot ID |

凭证填写错误、包含多余空格或与当前应用不匹配时，官方连接通常无法建立。修改凭证后应完整重启进程。

## Intent 与事件订阅

`text_intent` 决定 Gensokyo 注册和处理哪些事件。常见事件包括：

| Intent | 说明 |
|---|---|
| `ATMessageEventHandler` | QQ 频道中的 @ 消息 |
| `DirectMessageHandler` | QQ 频道私信 |
| `GroupATMessageEventHandler` | QQ 群中的 @ 消息 |
| `GroupMessageEventHandler` | QQ 群普通消息 |
| `C2CMessageEventHandler` | C2C 私聊消息 |
| `GroupMemberAddEventHandler` | 群成员新增事件 |
| `GroupMemberRemoveEventHandler` | 群成员移除事件 |

仅在 QQ 开放平台已经授予相应权限时启用 Intent。事件没有上报时，先核对开放平台权限与审核状态，再检查 `text_intent` 和运行日志。

## 选择连接方式

### 反向 WebSocket

Gensokyo 根据 `ws_address` 主动连接 NoneBot2、Koishi 等下游客户端。适合下游客户端已经开放 OneBot 反向 WS 地址的部署方式。

多个地址按数组填写，`ws_token` 与地址按顺序对应：

```yaml
ws_address:
  - "ws://127.0.0.1:8080/onebot/v11/ws"
  - "ws://127.0.0.1:6700/onebot/v11/ws"
ws_token:
  - "token_for_first_client"
  - "token_for_second_client"
```

### 正向 WebSocket

开启 `enable_ws_server` 后，下游客户端主动连接 Gensokyo。连接路径由 `ws_server_path` 决定，并建议始终设置 `ws_server_token`。

### HTTP API 与反向 HTTP POST

需要 HTTP 调用时，可配置 `http_address` 与 `http_access_token`；需要把事件推送到 HTTP 服务时，可使用 `post_url` 与 `post_secret`。不要在公网暴露无鉴权的 HTTP API。

## WebUI

`disable_webui` 控制是否启用 WebUI，`server_user_name` 与 `server_user_password` 用于登录。默认或弱密码只适合本地首次启动，部署前必须修改。

将 WebUI 暴露到局域网或公网时，建议：

- 使用高强度独立密码。
- 通过反向代理启用 HTTPS。
- 限制来源 IP，或增加额外身份验证。
- 不在网页、日志和问题反馈中展示完整配置文件。

## 修改配置后的行为

部分字段支持运行期间重新加载，但连接地址、机器人凭证、Intent、服务端口、WebSocket 服务和 WebUI 登录信息等关键字段通常需要重启才能完全生效。

修改后建议按以下顺序验证：

1. 检查 YAML 缩进和数组格式。
2. 重启 Gensokyo。
3. 确认 QQ 官方连接建立成功。
4. 确认下游 OneBot 客户端连接成功。
5. 分别测试群聊、C2C 或频道事件。
6. 检查 Gensokyo 与下游客户端两侧日志。

## 配置维护建议

- 保留一份移除敏感值的示例配置用于版本管理。
- 升级后对照新版本自动生成的模板补充字段。
- 不要直接复制其他用户的完整配置，尤其是 Intent、ID 映射和消息转换设置。
- 记录每次变更和对应版本，便于发生兼容性问题时回滚。
