# 快速上手

本文档将引导您从零开始注册、配置并运行 Gensokyo 官方机器人网关。

---

## 1. 注册 QQ 官方机器人

首先，您需要访问 QQ 开放平台注册成为开发者，并创建您的机器人应用：

1. 登录 [QQ 开放平台](https://q.qq.com/) 并完成认证。
2. 在应用管理中点击 **创建应用** -> **机器人**。
3. 创建成功后，您将在控制台获取以下核心凭证：
   - **AppID**（应用 ID）
   - **Token**（应用令牌）
   - **ClientSecret**（客户端密钥）

---

## 2. 下载并安装 Gensokyo

Gensokyo 是单二进制文件，无需搭建环境即可运行：

1. 前往 [GitHub Releases](https://github.com/Te-River/Gensokyo-NewQQ/releases) 下载对应系统的包（Windows, Linux, macOS）。
2. 解压下载的压缩包到独立的文件夹中。

---

## 3. 生成与编辑配置

首次运行主程序会在同级目录自动创建 `config.yml` 配置文件。

```bash
# 首次启动生成配置文件
./gensokyo
```

打开 `config.yml`，在 `settings` 下填写您的应用凭证：

```yaml
version: 1
settings:
  #── 反向 WebSocket 连接（下游适配器地址） ─────────────────
  ws_address: ["ws://127.0.0.1:8080/onebot/v11/ws"]   # 您的 OneBot 客户端（如 Nonebot2）
  ws_token: ["your_ws_token_here"]

  #── 官方机器人凭证（必须填对） ─────────────────────────
  app_id: 123456789                                    # 您的 AppID
  token: "your_app_token"                              # 您的 Token
  client_secret: "your_client_secret"                  # 您的 ClientSecret
  
  #── 事件订阅设置 ─────────────────────────────────────
  text_intent:
    - "ATMessageEventHandler"                          # 频道 @ 消息
    - "GroupATMessageEventHandler"                     # 群聊 @ 消息
    - "GroupMessageEventHandler"                       # 群聊普通消息（非 @ 消息）
    - "C2CMessageEventHandler"                         # 私聊消息
```

> [!IMPORTANT]
> 确保 `app_id`、`token` 以及 `client_secret` 没有前置或后置空格，否则会导致签名校验失败导致连接断开。

---

## 4. 启动网关

完成配置后，在终端中重新启动主程序：

```bash
# 启动 Gensokyo 网关
./gensokyo
```

当看到输出 `[SUCCESS] 官方 WebSocket 频道连接就绪` 时，说明网关已开始运行。此时您的 OneBot 客户端就可以通过反向 WS 或正向 WS（端口默认为 `15630`）建立连接并开始开发插件了！
