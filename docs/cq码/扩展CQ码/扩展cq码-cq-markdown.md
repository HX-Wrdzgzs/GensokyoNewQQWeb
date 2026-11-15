# [CQ:markdown]

<script setup>
import TryInPlayground from '../../components/cq/TryInPlayground.vue'
</script>

<TryInPlayground example='[CQ:markdown,data={"content":"hi"}]' />

## 用途

`[CQ:markdown]` 用于发送 Markdown 卡片消息（`msg_type=2`）。`data` 承载整段 JSON 载荷，常见字段是 `content` / `custom_template_id` / `keyboard`。

## 语法

```text
[CQ:markdown,data=base64://<b64(JSON)>]
[CQ:markdown,data={"content":"hi"}]
```

## 参数

| 参数名 | 必填 | 说明 |
|--------|------|------|
| `data` | ✅ | 卡片载荷：`base64://` 前缀的 base64(JSON)，或 `{…}` 开头的 JSON 原文 |

## 解析行为

### Go 版

| 路径 | 行为 |
|------|------|
| 字符串（`legacy`） | `data=base64://(.+?)`（`handlers/cqcode.go:36`）；`data=(\{.*\})`（`:37`，贪婪匹配，一条消息里多个码时可能跨码吞内容 —— cqparse 的 C1 才修） |
| 段数组 | `handlers/message_parser.go:1078-1104`，支持 map / string / base64 三种形态 |
| cqparse（`new`） | `resolveMarkdown`（`handlers/cqparse/handlers_content.go:49-87`），分支见下表 |

cqparse 的 `data` 分支：

| `data` 形态 | 段路径 | 字符串路径 |
|-------------|--------|------------|
| 空 | 静默移除（`handlers/cqparse/handlers_content.go:52-55`） | 字面保留（`:56`） |
| `base64://…` | 去掉前缀写入 markdown 载荷（`:58-63`） | 同左 |
| 段内原始 base64 | 需通过 `json.Valid`（`:67-69`） | — |
| `{…}` JSON 原文 | 解实体后 base64 入载荷（`:70-75`） | 原文先 base64 再入载荷（`:79-85`） |
| 其它 | 丢弃不发（`:77`） | 字面保留（`:86`） |

### Rust 重构版

码表 `CodeSpec{name:"markdown", params:["data"], outbound:true}`（`crates/gensokyo-protocol/src/cqcode.rs:763-770`）；`from_segments`（`crates/gensokyo-protocol/src/outbound.rs:633-642`）在 `data` 为空、裸 base64 或非 JSON 时 `push_literal`；参数契约（`data={…}` 先 marshal 再 base64）见 `crates/gensokyo-protocol/src/outbound.rs:896-917`（`markdown_payload`）。

### 分侧差异

`base64://` 与 `{…}` 两形态双端一致；段形态的**缺失 `data` / 裸 base64 / 非 JSON** 三处不同 —— **Go 版**：缺失 `data` 静默丢弃（`handlers/cqparse/handlers_content.go:52-55`）、裸 base64 解出合法 JSON 才发（`:67-69`）、其余丢弃不发（`:77`）；**Rust 重构版**：三种都按字面保留（`crates/gensokyo-protocol/src/outbound.rs:633-642`，契约 `markdown_payload` 只认 `base64://` 与 `{`，`:896-917`），属 P81 的收口方向。

## 入站上报

两侧都不产出 markdown 段：手打的 `[CQ:markdown]` 在入站上报里折回 `text`（Go `handlers/message_parser.go:2253-2334`；Rust `crates/gensokyo-protocol/src/cqcode.rs:764-765`）。

## 使用示例

NoneBot 发送 base64 形态（最稳：不依赖 `data={…}` 的贪婪正则）：

```python
import base64
import json
from nonebot.adapters.onebot.v11 import Message

payload = {"content": "**你好**，这是一条 Markdown 消息"}
encoded = base64.b64encode(json.dumps(payload, ensure_ascii=False).encode()).decode()

await bot.send_group_msg(
    group_id=123456,
    message=Message(f"[CQ:markdown,data=base64://{encoded}]"),
)
```

消息段形式：

```python
from nonebot.adapters.onebot.v11 import Message, MessageSegment

await bot.send_group_msg(
    group_id=123456,
    message=Message([MessageSegment("markdown", {"data": "base64://..."})]),
)
```

## 注意

- `data` 为空的段路径两侧不同（见「分侧差异」），排查「码消失」与「码留在正文」都先确认当前走的是哪一端。
- 字符串路径的 `data={…}` 是贪婪正则，一条消息里写多个 CQ 码时可能吞掉后续内容 —— 优先用 `base64://` 形态或 `cq_parse_mode: new`。
- 与 `[CQ:card]` 同现时 markdown 优先、卡片被丢弃，见 [CQ:card](./扩展cq码-cq-card.md)。
