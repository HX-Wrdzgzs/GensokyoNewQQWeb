# [CQ:active]

## 用途

`[CQ:active]` 是 Gensokyo-NewQQ 用于标记主动或召回消息的扩展消息段。Release008 重点修复了它在 `send_private_msg_wakeup` 中的处理。

范围：`私聊 (C2C)` / `send_private_msg_wakeup`

## 语法

```text
[CQ:active]
[CQ:active,type=<值>,sub_type=<值>]
```

数组消息段：

```json
{"type":"active","data":{"type":"<值>","sub_type":"<值>"}}
```

## 当前行为

消息解析后，可能产生以下内部字段：

- `active`
- `active_type`
- `active_sub_type`

`send_private_msg_wakeup` 遍历消息内容时会跳过这些字段，不会再把 active 标记错误地当作图片、语音或其他富媒体类型发送。

当消息只包含 `[CQ:active]`、没有文本或其他媒体时，召回 Action 会发送一个内容为空格的唤醒请求，以确保 QQ 侧仍能收到互动召回。

## 与普通发送 Action 的区别

- `send_private_msg_wakeup` 会明确消费 active 标记，并强制设置 `is_wakeup=true`。
- 普通 `send_private_msg`、`send_group_msg` 不应依赖 `[CQ:active]` 切换发送通道。
- 需要 C2C 互动召回时，应直接调用 [`send_private_msg_wakeup`](../../api/扩展api/扩展api-send_private_msg_wakeup.md)。

## 返回结果

Action 处理结束后返回标准成功响应；实际 QQ 发送结果会另行上报：

```json
{
  "post_type": "notice",
  "notice_type": "c2c_wakeup_resp",
  "status": "success",
  "real_user_id": "目标 OpenID",
  "message_id": "QQ 消息 ID"
}
```

发送失败时 `status` 为 `failed`，并包含 `error_msg`。
