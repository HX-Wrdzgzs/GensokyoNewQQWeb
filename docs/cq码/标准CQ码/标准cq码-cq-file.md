# [CQ:file]

## 用途

`[CQ:file]` 用于发送文件消息。QQ Bot API v2 支持 `file_type=4` 的富媒体文件上传，Gensokyo-NewQQ 在 Release008 中补全了出站发送能力。

范围：`q群 (Group Chat)` / `私聊 (C2C)` / `C2C 互动召回`

## 语法

```text
[CQ:file,file=file:///path/to/file]
[CQ:file,file=http://example.com/file.zip]
[CQ:file,file=https://example.com/file.zip]
[CQ:file,file=base64://<base64_data>]
[CQ:file,file=file:///path/to/file,file_name=report.pdf]
```

数组消息段：

```json
{
  "type": "file",
  "data": {
    "file": "file:///path/to/file",
    "file_name": "report.pdf"
  }
}
```

## 与 OneBot V11 的差异

标准 OneBot V11 中，文件消息段主要用于接收侧文件信息。Gensokyo-NewQQ 扩展了出站文件发送，并把文件转换为 QQ Bot API v2 富媒体请求。

| 能力 | 标准 OneBot V11 | Gensokyo-NewQQ |
|---|---|---|
| 出站发送文件 | 未规定通用实现 | 支持 |
| 本地文件 | 不适用 | `file:///` |
| 远程文件 | 不适用 | `http://` / `https://` |
| base64 文件 | 不适用 | `base64://` |
| 指定文件名 | 不适用 | `file_name` |

## 解析行为

| 来源 | 内部类型 | 处理方式 |
|---|---|---|
| `file:///` | `local_file` | URL 解码后读取本地文件，转 base64 并上传 QQ CDN |
| `http://` | `url_file` | 由 QQ 富媒体接口拉取 URL |
| `https://` | `url_files` | 由 QQ 富媒体接口拉取 URL |
| `base64://` | `base64_file` | 去掉前缀后上传 QQ CDN |

本地文件路径中的中文、空格等 URL 编码字符会先执行解码。无前缀的未知 URL 会经过 SSRF 检查后再进入兼容 fallback。

## 文件名优先级

1. 显式传入的 `file_name`。
2. 从本地路径或 URL 末尾提取的文件名。
3. 无法推断时留空。

base64 来源通常无法自动推断文件名，建议明确填写 `file_name`。

## NoneBot2 示例

```python
from nonebot.adapters.onebot.v11 import Message, MessageSegment

await bot.send_group_msg(
    group_id=123456,
    message=Message([
        MessageSegment("file", {
            "file": "file:///D:/data/report.pdf",
            "file_name": "报告.pdf",
        }),
    ]),
)

await bot.send_private_msg(
    user_id="目标 OpenID 或虚拟用户 ID",
    message=Message([
        MessageSegment("file", {
            "file": "https://example.com/archive.zip",
        }),
    ]),
)
```

## 注意事项

- 本地路径由 Gensokyo 进程读取，必须确保运行账户具有文件权限。
- 不要允许不可信用户任意提交本地路径或内网 URL。
- 大文件、网络超时、QQ 官方限制和文件类型策略仍可能导致发送失败。
- `send_private_msg_wakeup` 的实际结果会通过 `c2c_wakeup_resp` notice 上报。
