# 扩展 CQ 码

本页汇总 Gensokyo-NewQQ 在标准 OneBot 消息段基础上增加或扩展的行为。

| CQ 码 | 范围 | 说明 | 文档 |
|-------|------|------|------|
| `[CQ:file]` | `q群 (Group Chat)` / `私聊 (C2C)` / C2C 召回 | Release008 增加出站文件发送，支持本地路径、URL、base64 与 `file_name`。 | [查看](./标准CQ码/标准cq码-cq-file.md) |
| `[CQ:member]` | `q群 (Group Chat)` | 群成员入群/退群通知及回复路由。 | [查看](./扩展CQ码/扩展cq码-cq-member.md) |
| `[CQ:active]` | `私聊 (C2C)` | 召回 Action 会消费 active 标记；纯标记可触发空白唤醒请求。 | [查看](./扩展CQ码/扩展cq码-cq-active.md) |
| `[CQ:remove]` | `q群 (Group Chat)` | 撤回指定群消息（出站单向，需 `user_id` + `msg_id`）。 | [查看](./扩展CQ码/扩展cq码-cq-remove.md) |
| `[CQ:at]` in Markdown | `q群 (Group Chat)` / `q頻 (QQ Guild)` | Markdown 内容中的 @ 转换为 QQ 官方标签，Release008 修复多标签合并顺序。 | [查看](./扩展CQ码/扩展cq码-cq-at.md) |
