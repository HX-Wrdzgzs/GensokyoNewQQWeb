# Gensokyo API 介绍

> **「适用版本」列说明**：Gensokyo 存在两份实现——**Go 生产版**（主仓 `Gensokyo-NewQQ`，本表默认行为口径）与 **Rust 重构版**（`Gensokyo-NewQQ-Refactor`，`crates/gensokyo-actions`），action 注册表与上游调用链并不完全相同，一个 action 在一侧可用不代表另一侧同样可用，因此本表族增加「适用版本」列：
>
> - `两侧`：两仓均已注册该 action（行为细节差异见「行为」列与专属文档页）；
> - `仅 Rust 重构版` / `仅 Go`：另一仓**未注册**，调用会得到未知 action 回执；
> - `Rust 实现中`：Rust 侧已注册但读侧/上游尚未接线，当前返回错误回执。
>
> 注册依据：Go 侧 `handlers/*.go` 的 `callapi.RegisterHandler`；Rust 侧 `crates/gensokyo-actions/src/register.rs:70-318`（75 个注册名）+ `crates/gensokyo-runtime/src/builtin.rs:153-155` + 别名表 `crates/gensokyo-protocol/src/registry.rs:210-217`。HTTP 端点（上传、`/getid`、指标、短链）见 [HTTP 端点](./http端点.md)。

## 标准 OneBot V11 API

以下 API 符合 [OneBot V11 标准](https://github.com/botuniverse/onebot-11)。

| Action | 文件 | 场景 | 行为 | 适用版本 |
|--------|------|------|------|----------|
| `send_msg` | send_msg.go | `私聊 (C2C)` / `q群 (Group Chat)` | 按 echo/msgType 缓存和 ID 映射分流到对应发送处理器。 | 两侧 |
| `send_msg_async` | send_msg_async.go | 同 `send_msg` | 注册到 `HandleSendMsg`，处理逻辑同 `send_msg`。 | 两侧 |
| `send_group_msg` | send_group_msg.go | `q群 (Group Chat)` | 发送消息，支持 Gensokyo 的消息解析和 ID 转换。 | 两侧 |
| `send_group_msg_async` | send_group_msg_async.go | `q群 (Group Chat)` | 注册到 `HandleSendGroupMsg`，处理逻辑同 `send_group_msg`。 | 两侧 |
| `send_group_msg_raw` | send_group_msg_raw.go | `q群 (Group Chat)` | 发送消息，保留更多原始参数，少做预处理。 | 两侧 |
| `send_private_msg` | send_private_msg.go | `私聊 (C2C)` | 发送 C2C 私聊消息。 | 两侧 |
| `send_private_msg_async` | send_private_msg_async.go | `私聊 (C2C)` | 注册到 `HandleSendPrivateMsg`，处理逻辑同 `send_private_msg`。 | 两侧 |
| `delete_msg` | delete_msg.go | `私聊 (C2C)` / `q群 (Group Chat)` | 按消息所属场景调用对应撤回接口。 | 两侧 |
| `get_login_info` | get_login_info.go | `-` | 获取当前机器人登录信息。 | 两侧 |
| `get_friend_list` | get_friend_list.go | `私聊 (C2C)` | **Go 已注册可用**：本地 idmap 枚举全部 C2C 私聊用户的虚拟 ID，恒回 `retcode=0`（`handlers/get_friend_list.go:14,29-47`）。**Rust 重构版实现中**：handler 已注册，但上游链路未落地，当前回 `1500`，读侧正对齐 Go 的 idmap 枚举口径（`crates/gensokyo-actions/src/users.rs:7,93-96`、`crates/gensokyo-storage/src/idmap/mod.rs:795-803`）。 | Go 可用 / Rust 实现中 |
| `get_group_list` | get_group_list.go | `q群 (Group Chat)` | 获取群列表：逐群拉取真实群名/简介/成员数（`get_g_list_delay` 毫秒节流），`group_create_time` 诚实置 0。 | 两侧 |
| `get_group_info` | get_group_info.go | `q群 (Group Chat)` | 调用 QQ 官方 v2 群信息接口返回真实群名/简介/成员数。 | 两侧 |
| `get_group_member_info` | get_group_member_info.go | `q群 (Group Chat)` | 获取成员信息：真实调用 QQ v2 接口，失败时回退中性值。 | 两侧 |
| `get_group_member_list` | get_group_member_list.go | `q群 (Group Chat)` | 获取成员列表：真实调用 QQ v2 接口，游标分页全量拉取（单页≤30、安全上限 100 页）；官方接口不可用回退 idmap-pro 缓存。 | 两侧 |
| `get_status` | get_status.go | `-` | 获取运行状态：包收发/断线/丢包统计诚实置 0，消息收发计数为 botstats 真实数据。 | 两侧 |
| `get_version_info` | get_version_info.go | `-` | 获取版本信息。 | 两侧 |
| `get_online_clients` | get_online_clients.go | `-` | 获取在线客户端。 | 两侧 |
| `send_group_forward_msg` | send_group_forward_msg.go | `q群 (Group Chat)` | 发送合并转发消息。 | 两侧 |
| `set_group_ban` | set_group_ban.go | `q群 (Group Chat)` | 单人禁言，`duration` 秒数（0=解除禁言）。与 `[CQ:set_group,action=ban]` 共享实现底层。 | 两侧 |
| `set_group_whole_ban` | set_group_whole_ban.go | `q群 (Group Chat)` | ⚠️ **固定失败（Go 行为）**：官方 POST /restrict_chat_setting 无全员禁言写入字段，返回 retcode 100（`handlers/set_group_whole_ban.go:38-44`）。与 `[CQ:set_group,action=whole_ban]` 共享实现底层。 | 两侧 |
| `set_group_kick` | set_group_kick.go | `q群 (Group Chat)` | 批量移出群成员（单批≤20，`user_id`/`user_ids` 二选一、可合并去重），可同步拉黑。与 `[CQ:set_group,action=kick]` 共享实现底层。 | 两侧 |
| `set_group_card` | set_group_card.go | `-` | QQ 官方 API 未提供设置群名片接口，明确失败回执（retcode 100，`handlers/set_group_card.go:12-14`）。 | 两侧 |
| `.handle_quick_operation` | handle_quick_operation.go | `-` | OneBot 快速操作。 | 两侧 |
| `.handle_quick_operation_async` | handle_quick_operation_async.go | `-` | OneBot 快速操作的 async action 名称。 | 两侧 |
| `mark_msg_as_read` | mark_msg_as_read.go | `-` | 标记消息已读：官方无已读上报接口，空实现仅回执 ok（`handlers/mark_msg_as_read.go:29-31`）。 | 两侧 |

> **delete_msg 差异说明：**
>
> | 参数 | 类型 | 说明 |
> |------|------|------|
> | `message_id` | int32 | 消息 ID |
> | `user_id` | int64/string | 私聊 (C2C) 时需要 |
> | `group_id` | int64/string | q群 (Group Chat) 时需要 |

## Gensokyo 扩展 API

| Action | 文件 | 场景 | 行为 | 适用版本 |
|--------|------|------|------|----------|
| [`get_avatar`](./扩展api/扩展api-get_avatar.md) | get_avatar.go | `-` | 按虚拟用户 ID 反查 OpenID 并返回头像直链。 | 两侧 |
| [`get_robot_share_link`](./扩展api/扩展api-get_robot_share_link.md) | get_robot_share_link.go | `-` | 获取机器人资料页分享链接。 | 两侧 |
| [`upload_media_image`](./扩展api/扩展api-media_images.md) | `media_image.rs`(Rust) / `media_asset.go`(Go 内部链) | `-` | 上传素材图片（prepare → 预签名 PUT → complete），返回 `image_id` 与 `qqbot-media://` 引用。**Go 版未注册为 action**：素材上传链在 Go 中只被 Markdown/keyboard 图片消费点内部调用，`handlers/media_asset.go:18-19` 明确「将来若要暴露再复用」；Rust 重构版已注册（`crates/gensokyo-actions/src/register.rs:315`）。 | **仅 Rust 重构版** |
| [`get_media_image_list`](./扩展api/扩展api-media_images.md) | 同上 | `-` | 素材图片列表，`cursor` 分页（取上一页 `next_cursor`）。注册与未注册口径同 `upload_media_image`（Rust `register.rs:166`）。 | **仅 Rust 重构版** |
| [`delete_media_image`](./扩展api/扩展api-media_images.md) | 同上 | `-` | 删除素材图片并释放配额；已发送消息不受影响。注册与未注册口径同上（Rust `register.rs:94`）。 | **仅 Rust 重构版** |
| [`put_interaction`](./扩展api/扩展api-put_interaction.md) | put_interaction.go | `q群 (Group Chat)` | 回复按钮交互结果。 | 两侧 |
| [`send_private_msg_wakeup`](./扩展api/扩展api-send_private_msg_wakeup.md) | send_private_msg_wakeup.go | `私聊 (C2C)` | 发送 `is_wakeup=true` 的 C2C 召回消息。 | 两侧 |
| `send_private_msg_sse` | send_private_msg_sse.go | `私聊 (C2C)` | SSE 私聊消息。 | 两侧 |
| `get_group_ban` | set_group_ban.go | `q群 (Group Chat)` | 兼容入口，处理逻辑等同 `set_group_ban`。 | 两侧 |
| `get_group_whole_ban` | set_group_whole_ban.go | `q群 (Group Chat)` | 兼容入口，处理逻辑等同 `set_group_whole_ban`（同样固定失败 retcode 100，Go `set_group_whole_ban.go:11-12,44`）。 | 两侧 |
| `set_group_add_request` | set_group_add_request.go | `q群 (Group Chat)` | 入群申请审批。与 `[CQ:set_group,action=add_request]` 共享实现底层。 | 两侧 |
| `send_to_group` | send_group_msg.go | `q群 (Group Chat)` | `send_group_msg` 别名。 | 两侧 |
| [`delete_group_msg`](./扩展api/扩展api-delete_group_msg.md) | delete_group_msg.go | `q群 (Group Chat)` | 撤回群内指定用户或 Bot 自身的消息；支持自动查找最后一条消息。 | 两侧 |
| [`get_group_join_request_list`](./扩展api/扩展api-get_group_join_request_list.md) | get_group_join_request_list.go | `q群 (Group Chat)` | 拉取入群申请列表，`cursor`/`limit` 分页（旧 `next_index` 兼容回退）；返回的 `group_id`/`user_id`/`flag` 可直接回传 `set_group_add_request` 审批。 | 两侧 |
| [`get_group_bot_state`](./扩展api/扩展api-get_group_bot_state.md) | get_group_bot_state.go | `q群 (Group Chat)` | 获取机器人在群内状态（入群时间/可推送/角色）。 | 两侧 |
| [`join_approval_strategy_create`](./扩展api/扩展api-join_approval_strategy.md) | join_approval_strategy.go | `-` | 创建入群自动审批策略（`group_openids`/`group_ids` 二选一）。 | 两侧 |
| [`join_approval_strategy_list`](./扩展api/扩展api-join_approval_strategy.md) | join_approval_strategy.go | `-` | 查询策略列表（`cursor`/`limit` 分页）。 | 两侧 |
| [`join_approval_strategy_update`](./扩展api/扩展api-join_approval_strategy.md) | join_approval_strategy.go | `-` | 修改策略（`strategy_id` + `is_enable`/`expire_at`/`remark`/`op`+关联群）。 | 两侧 |
| [`join_approval_strategy_execute`](./扩展api/扩展api-join_approval_strategy.md) | join_approval_strategy.go | `-` | 执行策略全量扫描（异步约 10 分钟）。 | 两侧 |
| [`join_approval_strategy_whitelist`](./扩展api/扩展api-join_approval_strategy.md) | join_approval_strategy.go | `-` | 修改策略白名单（`strategy_id` + `op` + `whitelist_users`）。 | 两侧 |
| [`join_approval_strategy_delete`](./扩展api/扩展api-join_approval_strategy.md) | join_approval_strategy.go | `-` | 删除策略（`strategy_id`）。 | 两侧 |
| `get_group_member_blacklist` / `set_group_member_blacklist` | get_group_member_blacklist.go / set_group_member_blacklist.go | `q群 (Group Chat)` | 群黑名单查询 / 增删（单批≤20）。 | 两侧 |
| `get_custom_menu` / `set_custom_menu` | get_custom_menu.go / set_custom_menu.go | `私聊 (C2C)` | C2C 自定义菜单读取 / 设置（覆盖式，仅 C2C 全局生效）。 | 两侧 |
| `get_panel_list` / `create_panel` / `get_panel` / `set_panel` / `delete_panel` / `set_panel_target` | get_panel_list.go / create_panel.go / get_panel.go / set_panel.go / delete_panel.go / set_panel_target.go | `-` | 指令面板管理：列表 / 创建 / 详情 / 更新元素与备注 / 删除 / 增删关联对象（支持 c2c/group/channel/dm）。 | 两侧 |

## 消息事件扩展字段

### `to_me` 字段

Gensokyo 在 q群 消息事件中增加了 `to_me` 字段，标识消息是否 @ 了机器人。

```json
{
    "group_id": 123456,
    "message": [...],
    "to_me": true,   // 本版新增
    "user_id": 789012,
    ...
}
```

**取值逻辑：**
- `GROUP_AT_MESSAGE_CREATE`（@消息事件）→ `to_me: true` **始终为 true**
- `GROUP_MESSAGE_CREATE`（普通 q群 消息事件）→ 检测 `Mentions` 中是否有 `IsYou=true`，有为 `true`，否则为 `false`

**nonebot2 获取方式：**
```python
from nonebot import on_message
from nonebot.adapters.onebot.v11 import GroupMessageEvent

@on_message().handle()
async def handler(event: GroupMessageEvent):
    # 直接通过 event.to_me 获取
    if event.to_me:
        await event.finish("你@我了")
```
或者通过 raw event 获取：
```python
event.json()  # 查看完整字段
```

### 非自身 @ 处理

在 `GROUP_MESSAGE_CREATE`（普通 q群 消息）中，若内容包含对其他用户/机器人的 `@`，Gensokyo 会自动将原始 `<@OpenID>` 替换为标准的 `[CQ:at,qq=虚拟ID]` 格式，并建立 OpenID 与虚拟 ID 的映射。

这是一种 **双向转换**：

```
入站（QQ API → 后端）：
  QQ API:   <@B1FE88...> 贴贴
  后端收到: [CQ:at,qq=713011248] 贴贴

出站（后端 → QQ API）：
  后端发送 [CQ:at,qq=713011248] 贴贴
  QQ API:   <@!B1FE88...> 贴贴
```

**规则：**
- 入站 `@bot` 从 content 中剥离（`to_me = true`）
- 入站 `@其他人` 转为 `[CQ:at,qq=虚拟ID]`
- 出站 `[CQ:at,qq=数字]`：纯文本消息转为 `@用户名 `（带空格），Markdown 消息转为 `<qqbot-at-user id="OpenID" />`
- 纯文本出站时 @ 转为 `@用户名` 格式，用户名来自内存缓存（入站时自动缓存，10 分钟 TTL）

### Markdown 中的 @ 能力

在 Markdown 卡片（`msg_type=2`）内容中嵌入 `[CQ:at,qq=数字]`，Gensokyo 会自动将其转换为 QQ API 的 `<qqbot-at-user>` 标签，并且**整个 `messageText`**（含 `<qqbot-at-user>` 标签和文本内容）会合并到 Markdown 内容头部，确保文本不丢失。

**nonebot2 示例：**

```python
from nonebot import on_command
from nonebot.adapters.onebot.v11 import Bot, Event, Message

@on_command("md_at").handle()
async def _(bot: Bot, event: Event):
    md_content = f"你好 [CQ:at,qq={event.user_id}]，欢迎使用！"
    md_seg = {"type":"markdown","data":{"data":md_content}}
    await bot.send(event, Message(md_seg))
```

### Sender.Nickname 自动填充

Gensokyo 在群消息和私聊消息中，当 `card_nick` 配置为空时，会自动从 QQ API 返回的 `data.Author.Username` 中提取用户名填充到 `event.sender.nickname`。

```json
{
    "sender": {
        "nickname": "NIKO",   // 自动从 Author.Username 获取
        "user_id": 123456789,
        ...
    }
}
```

优先顺序：`card_nick` 配置 > `Author.Username` > 空

### Sender.Role 身份标识

群消息中 `sender.role` 字段会优先使用 QQ API 返回的 `member_role`，不再仅依赖 `master_id` 配置。

```json
{
    "sender": {
        "user_id": 10000001,
        "role": "owner",
        "nickname": "群主"
    }
}
```

取值：
- `owner` → 群主
- `admin` → 管理员
- `member` → 普通群员

API 未返回时回退到 `master_id` 配置判断，保持兼容。详见[本版新增功能](./../本版新增功能.md#群消息-senderrole-支持-member_role)。
