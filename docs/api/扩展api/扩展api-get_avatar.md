# API: get_avatar

> 🧪 **测试插件**：[gsk-avatar](https://github.com/Te-River/Gensokyo-NewQQ-Test-plugins/tree/main/gsk-avatar) — 发送「头像 / 获取头像 / avatar」体验

获取用户 QQ 头像直链（Gensokyo 扩展 API）。

## 请求

```json
{
    "action": "get_avatar",
    "params": {
        "user_id": 1234567890
    }
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | int64/string | **是** | 用户的虚拟 ID（OneBot 层看到的数字 ID） |
| `group_id` | int64/string | 否 | 可选上下文，用于在同一 vUIN 有多个身份时辅助选择当前身份 |

## 返回值

```json
{
    "data": {
        "message": "https://q.qlogo.cn/qqapp/987654321/ABCDEFGHIJKLMNOPQRSTUVWXYZ123456/640",
        "user_id": 1234567890
    },
    "message": "",
    "retcode": 0,
    "status": "ok",
    "echo": null
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.message` | string | 头像直链 URL，格式：`https://q.qlogo.cn/qqapp/{appid}/{openid}/640` |
| `data.user_id` | int64 | 传入的虚拟用户 ID（原样返回） |

> [!IMPORTANT]
> 头像直链在 **`data.message`** 里（Go `handlers/get_avatar.go:15-18,59-62`：`AvatarData.Message` 承载 URL 并嵌在 `data` 字段内，`get_avatar.go:21`）。顶层的 `message` 是 OneBot 状态字段，恒为空串（`get_avatar.go:22-23,63`）——**不要**从 `result["message"]` 取头像。

## 工作原理

1. 接收虚拟 `user_id`
2. 通过 ID 映射反向查询真实的 QQ OpenID
3. 拼接 QQ 官方头像 CDN 链接返回

## nonebot2 示例

```python
from nonebot import on_command
from nonebot.adapters.onebot.v11 import Bot, Event, Message

avatar = on_command("头像")

@avatar.handle()
async def _(bot: Bot, event: Event):
    result = await bot.call_api("get_avatar", user_id=event.user_id)
    # 头像直链在 data.message，顶层 message 只是状态字段（恒为空串）
    avatar_url = result["data"]["message"]
    await avatar.finish(Message(f"[CQ:image,file={avatar_url}]"))
```
