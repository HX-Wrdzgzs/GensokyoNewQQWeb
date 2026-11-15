# [CQ:voice]

<script setup>
import TryInPlayground from '../../components/cq/TryInPlayground.vue'
</script>

<TryInPlayground example="[CQ:voice,file=https://example.com/a.mp3]" />

## 用途

`[CQ:voice]` 是 `[CQ:record]` 的**同义别名**（消息段 / `cq_parse_mode: new` 下）：参数、silk 转码与 CDN 上传流程完全复用语音通道，发送效果见 [CQ:record](./标准cq码-cq-record.md)。

范围：`q群 (Group Chat)` / `C2C (私聊)`

> [!WARNING] legacy 模式的字符串入参下，`[CQ:voice]` 不会被消费
> 只有**消息段**路径与 `cq_parse_mode: new`（cqparse）才把 `voice` 与 `record` 视为同义：
>
> - 默认 `cq_parse_mode: legacy`（`template/config_template.go:182`）下，以**字符串**形式传入的消息由 legacy 正则处理，而该正则只认 `[CQ:record]` 字面（`handlers/cqcode.go:30-32`、`:56`、`:60`）。`[CQ:voice,file=…]` 不被消费，会按字面文本发到会话里。
> - 改用消息段 `{"type":"voice",...}`，或把 `cq_parse_mode` 切到 `new`，才与 `[CQ:record]` 等价。

## 语法

```text
[CQ:voice,file=file:///path/to/audio.mp3]
[CQ:voice,file=http://example.com/audio.mp3]
[CQ:voice,file=base64://<base64_data>]
[CQ:voice,url=https://example.com/audio.mp3]
```

## 参数

| 参数名 | 必填 | 说明 |
|--------|------|------|
| `file` | 否 | 语音来源，按前缀判定类型：`file:///`（本地）、`http(s)://`（远程）、`base64://`（编码数据） |
| `url` | 否 | `file` 为空时的兜底来源；`file` 与 `url` 皆空时整码按原文保留，不产出空语音 |
| `asr` | 否 | 语音识别文本，出现在入站上报的 `[CQ:record]` 里（`asr` 为空时省略）；出站解析已排除尾随 `,asr=` 参数 |

## 解析行为

| 路径 | 行为 |
|------|------|
| **Go 版**·字符串（`legacy`） | 正则只匹配 `[CQ:record]`；`[CQ:voice]` 不被消费，按字面文本发出（`handlers/cqcode.go:30-32`、`:56`、`:60`） |
| **Go 版**·段数组 | `case "voice", "record"` 走同一分支，产出语音项（`handlers/message_parser.go:909`、`:1318`） |
| **Go 版**·cqparse（`new`） | 注册表含 `voice` 且与 `record` 同臂，内部键归一为 `*_record`（`handlers/cqparse/handlers_media.go:27-28`、`:34-35`、`:46-50`） |

**Rust 重构版**：码表为 `CodeSpec{name:"voice", params:["file","url","asr"], inbound:false, outbound:true}`（`crates/gensokyo-protocol/src/cqcode.rs:890-896`）；`from_segments` 里与 `record` 同臂（`crates/gensokyo-protocol/src/outbound.rs:618-621`），`file` 为空时兜 `url`（`outbound.rs:862-869`）；`file` / `url` 皆空的裸码按字面放回正文（`outbound.rs:599-602`、`:892-894`）。

> 💡 裸码行为与 [CQ:record](./标准cq码-cq-record.md) 同口径：媒体族 `file` / `url` 皆空时保留原文，而不是被静默移除。参见 [CQ 码汇总](../CQ码汇总.md) 的「无参裸码行为」。

## 使用示例

字符串形式（需要 `cq_parse_mode: new` 才与 `record` 等价）：

```python
from nonebot.adapters.onebot.v11 import Message

await bot.send_private_msg(
    user_id=123456,
    message=Message("[CQ:voice,file=https://example.com/a.mp3]"),
)
```

消息段形式（`legacy` 与 `new` 都可用的推荐写法）：

```python
from nonebot.adapters.onebot.v11 import Message, MessageSegment

await bot.send_private_msg(
    user_id=123456,
    message=Message([
        MessageSegment("voice", {"file": "https://example.com/a.mp3"}),
    ]),
)
```

## 注意

- 默认 `cq_parse_mode: legacy` 下，字符串里的 `[CQ:voice]` 会原样发出 —— 需要别名等价请用消息段或切 `new`。
- `file` 与 `url` 皆空时不产出空语音，整码按原文保留；上表与 [CQ 码汇总](../CQ码汇总.md) 的「无参裸码行为」一致。
- 重构版曾有一段时间 `[CQ:voice]` 落入兜底分支、从未走语音通道，**P57-②** 起修复（`reports/refactor/17-go-rust-parity.md:73`）。
- silk 转码、SSRF 防护与 `record_sampleRate` / `record_bitRate` 等配置项详见 [CQ:record](./标准cq码-cq-record.md)。
