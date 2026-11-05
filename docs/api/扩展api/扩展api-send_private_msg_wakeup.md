# send_private_msg_wakeup

> 🧪 **测试插件**：[gsk-wakeup](https://github.com/Te-River/Gensokyo-NewQQ-Test-plugins/tree/main/gsk-wakeup) — 发送「召回测试」体验

## 说明

向用户发送 C2C 召回消息。发送时会设置 `is_wakeup=true`，不依赖被动回复上下文中的 `msg_id` 或 `event_id`。

范围：`私聊 (C2C)`

## 请求参数

与 `send_private_msg` 一致：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `user_id` | string | 是 | 目标用户 OpenID；不是 32 位 OpenID 时，会尝试按虚拟用户 ID 反查。 |
| `message` | array/string | 是 | 消息内容，支持文本、图片、Markdown、语音、视频和文件。 |

无法把 `user_id` 解析为 32 位 OpenID 时，请求不会发送。

## 行为（Release008 起）

- Handler 同步处理请求，避免异步任务未返回造成 WebSocket 调用超时。
- `[CQ:active]`、`active_type`、`active_sub_type` 与 `[CQ:wakeup]` 会被消费并跳过，不会作为媒体类型发送。
- 每一次发送都单独构造 `MessageToCreate`，强制 `is_wakeup=true` 且 `msg_id` / `event_id` 留空（两者与 `is_wakeup` 互斥）。
- 单图文混合走 `msg_type=7`；纯媒体消息的正文为空格 `" "`。
- 只有 `[CQ:active]`、没有其他内容时，会发送一个内容为空格的召回请求。
- `[CQ:file]` 支持本地路径、HTTP(S) URL、base64 与可选 `file_name`。
- 富媒体上传或最终发送出现超时时，按 `postC2CWakeupMessageWithRetry` 的策略重试（最多 3 次，间隔 3 秒）。
- `self_id` 取配置中的机器人 AppID。

## Action 返回

Handler 完成同步处理后返回：

```json
{
  "status": "ok",
  "retcode": 0
}
```

该响应表示 Action 已完成处理，不等同于 QQ 侧每一条媒体消息都发送成功。实际结果会通过 notice 上报。

## 结果 notice

```json
{
  "post_type": "notice",
  "notice_type": "c2c_wakeup_resp",
  "user_id": 0,
  "real_user_id": "32位OpenID",
  "status": "success",
  "message_id": "QQ消息ID",
  "error_msg": "",
  "self_id": 123456,
  "time": 1700000000
}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `real_user_id` | 实际使用的目标 OpenID。 |
| `status` | `success` 或 `failed`。 |
| `message_id` | QQ 返回的消息 ID，失败或无返回时可能为空。 |
| `error_msg` | 失败原因，成功时通常为空。 |
| `user_id` | 当前实现固定为 `0`（`int64`，兼容 NoticeEvent 反序列化），真实字符串 ID 在 `real_user_id`；这与请求参数 `user_id` 可传虚拟数字 ID 是两件事。 |
| `self_id` | 机器人 AppID。 |
| `time` | 通知产生时间（Unix 秒）。 |

## NoneBot2 示例

```python
from nonebot.adapters.onebot.v11 import Bot, Message, MessageSegment

async def send_wakeup(bot: Bot, user_id: str) -> None:
    await bot.call_api(
        "send_private_msg_wakeup",
        user_id=user_id,
        message=Message([
            MessageSegment.text("这是一条 C2C 召回消息"),
        ]),
    )
```

发送文件：

```python
await bot.call_api(
    "send_private_msg_wakeup",
    user_id="目标 OpenID 或虚拟用户 ID",
    message=Message([
        MessageSegment("file", {
            "file": "file:///D:/data/report.pdf",
            "file_name": "报告.pdf",
        }),
    ]),
)
```

## 注意事项

- C2C 互动召回是否可用仍受 QQ 官方权限、用户状态和接口策略限制。
- 应用端需要监听 `c2c_wakeup_resp`，不能只依赖 Action 的 `retcode` 判断实际发送结果。
- 目标 ID、文件路径和远程 URL 不应直接接受未经校验的不可信输入。
