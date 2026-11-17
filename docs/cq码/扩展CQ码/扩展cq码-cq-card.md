# [CQ:card]

<script setup>
import TryInPlayground from '../../components/cq/TryInPlayground.vue'
</script>

<TryInPlayground example='[CQ:card,title=t,desc=d,pic=https://example.com/p.png,url=https://example.com]' />

> 🧪 **测试插件**：[CQ-card](https://github.com/Te-River/Gensokyo-NewQQ-Test-plugins/tree/main/CQ-card) — 发送「card」体验

## 用途

`[CQ:card]` 用于发送图文卡片消息（`msg_type=8`）。卡片消息会展示标题、描述、图片和跳转链接。

范围（**两侧不同**）：

- **Go 版**：仅 `q群 (Group Chat)`。`msg_type=8` 的组装点只在 `handlers/send_group_msg.go` 的卡片分支与 `handlers/outbound_bridge.go` 的 `applyGroupCard` / `buildGroupCard`，`send_private_msg*.go` 里没有任何 card 组装路径 —— 单聊消息里写 `[CQ:card]` 不会得到卡片。
- **Rust 重构版**：`q群 (Group Chat)` / `私聊 (C2C)`。群聊与单聊同构（`crates/gensokyo-runtime/src/deferred.rs` 的 `compose_card` 不按 target 分支），官方 2026-10-28 起单聊同样支持。

## 语法

```text
[CQ:card,title=<标题>,desc=<描述>,pic=<图片URL>,url=<跳转链接>]
```

参数顺序无关。官方要求 `title` / `desc` / `pic` / `url` **四项必填**，但**校验落在哪一侧、缺项怎么处置，两侧不同**：

- **Go 版**：`pic` / `url` 缺失时卡片在本地丢弃、正文照常发送（`handlers/send_group_msg.go` 的卡片分支 `:637-639`；新链 `handlers/outbound_bridge.go:1009-1011`，纯卡片时 `buildGroupCard` 返回 nil）；`title` / `desc` 不做本地预校验，缺失或超长由平台回 `1400`。
- **Rust 重构版**：四字段全部必填且**本地**校验，任一缺失或非法时整条消息回 `1400`、整条不发（`crates/gensokyo-runtime/src/deferred.rs` 的 card 校验，与 `crates/gensokyo-qq/src/dto/message.rs` 的 https + ≤1024 字节本地校验）。

| 参数 | 别名（**仅 Rust 重构版**识别） | 必填 | 说明 |
|------|------|------|------|
| `title` | — | 是 | 卡片标题，1~50 字符（按 Unicode 字符计，首尾空白会被去除）。 |
| `desc` | `description` | 是 | 卡片描述，1~200 字符（按 Unicode 字符计，首尾空白会被去除）。 |
| `pic` | `pic_url` | 是 | 卡片图片，最终应为 `https://` 链接且 ≤1024 字节，也不接受 `qqbot-media://`。**本地路径两侧都会先自动走图床/上传链转公网外链**（见「校验与失败行为」）；外链格式与长度的本地拦截只有 **Rust 重构版**执行，**Go 版**交平台裁决。 |
| `url` | — | 是 | 点击卡片跳转的链接，必须是 `https://` 且 ≤1024 字节。 |

## 解析行为

- 从消息文本中提取 `[CQ:card,...]` 并移除，最终用户不会看到该 CQ 码。
- 参数顺序无关，内部自动解析为 `key=value` 键值对；**别名兼容只在 Rust 重构版**（`description` / `pic_url` 等价于 `desc` / `pic`，且 `desc` / `pic` 优先），**Go 版**只认 `title` / `desc` / `pic` / `url` 四个键，不识别别名 —— 写成 `description=` / `pic_url=` 时 Go 侧取不到对应字段。
- 数组消息段格式（`{"type":"card","data":{"title":"...","desc":"..."}}`）同样支持。
- 同一消息携带多份卡片时只发送第一份，其余记录日志后丢弃。

## 校验与失败行为

卡片载荷在解析阶段只做「参数收集 → JSON 编码」，三条解析链各有一个构造点（字符串 legacy 管道 `handlers/cqcode_pipeline.go:115` 的 `processCQCardPipeline`、cqparse 新解析器 `handlers/cqparse/handlers_content.go:115` 的 `resolveCard`、数组消息段 `handlers/message_parser.go:1023-1032`），最终统一由 `handlers/outbound_bridge.go:1000-1025` 的 `applyGroupCard`（新链）与 `handlers/send_group_msg.go:644`、`:756`（legacy 链）组装成 `card{type:"tuwen"}`。必填四项任一为空或格式非法时，**结果两侧不同**：**Rust 重构版**在本地校验阶段就拒绝、整条消息不发送；**Go 版**不做四字段本地预校验，交给官方接口以 `retcode=1400`（参数不合法）拒绝，`pic` / `url` 缺失时还会先在本地丢弃卡片、正文照常发送：

| 失败场景 | 结果（分侧） |
|----------|------|
| `title` 缺失或去空白后为空 | **Rust 重构版**：本地回 `1400`、整条不发。**Go 版**：不做本地预校验，平台回 `1400` |
| `title` 超过 50 字符 | **Rust 重构版**：本地回 `1400`、整条不发。**Go 版**：平台回 `1400` |
| `desc` 缺失或去空白后为空 | **Rust 重构版**：本地回 `1400`、整条不发。**Go 版**：不做本地预校验，平台回 `1400` |
| `desc` 超过 200 字符 | **Rust 重构版**：本地回 `1400`、整条不发。**Go 版**：平台回 `1400` |
| `pic` / `url` 缺失 | **Rust 重构版**：本地回 `1400`、整条不发。**Go 版**：卡片本地丢弃、正文照常发送（`handlers/send_group_msg.go:637-639`；新链 `handlers/outbound_bridge.go:1009-1011`，纯卡片时 `buildGroupCard` 返回 nil） |
| `pic` / `url` 为 `http://` 等非 https 外链 | **Rust 重构版**：本地回 `1400`。**Go 版**：不拦截，交平台裁决 |
| `pic` / `url` 超过 1024 **字节** | **Rust 重构版**：本地回 `1400`。**Go 版**：不拦截，交平台裁决 |
| `[CQ:card]` 的 JSON 参数解析失败 | 卡片载荷无法反序列化时该卡片被丢弃、正文照常发送（`handlers/outbound_bridge.go:1006-1008`） |

> 卡片与 @全员 同现（markdown 未优先）同样回 `1400`：卡片会清空正文，@全员 标签无法承载。markdown 与卡片同现时 markdown 优先，卡片被丢弃且不参与校验。

> **`pic` 为本地路径时**：**两侧都会**先自动经图床 / 上传链转成公网外链（**Go 版** `resolveCardPic`：`handlers/send_group_msg.go:3136-3154`，新链 `handlers/outbound_bridge.go:1020`；**Rust 重构版** `crates/gensokyo-runtime/src/deferred.rs` 的 resolve_url 上传链）。差别在转换后的最终值：**Rust 重构版**要求最终为 `https://`，若仍是 `http://` 或上传失败保留原值，会在**本地**回 `1400`；**Go 版**不本地拦截，交平台裁决。

## 发送行为

当 `[CQ:card]` 出现在 `send_group_msg` / `send_to_group` 的出站消息中时（**Go 版**只有这两个群聊 Action 有卡片路径；`send_private_msg` 的卡片路径**仅 Rust 重构版**具备）：

1. CQ 码从消息文本中移除。
2. 消息类型切换为 `msg_type=8`，发送图文卡片（`card{type:"tuwen",content{title,description,pic_url,url}}`）。
3. 群聊展示带标题、描述、图片和跳转链接的卡片；单聊同样发送该卡片这一行为**只有 Rust 重构版**具备。
4. 消息正文（`content`）会被清空，卡片不会与文本拼接。
5. 如果同一消息同时包含 `[CQ:markdown]`，markdown 优先级更高：卡片直接丢弃且不参与校验（避免一张坏卡片拦住合法的 markdown）。

## 使用示例

NoneBot 插件发送群聊卡片（使用 URL）：

```python
from nonebot.adapters.onebot.v11 import Message

card_msg = Message(
    "[CQ:card,title=今日推荐,desc=点击查看详情,pic=https://example.com/cover.png,url=https://example.com]"
)
await bot.send_group_msg(
    group_id=821404315,
    message=card_msg,
)
```

发送单聊卡片（同一 CQ 码，**仅 Rust 重构版**生效，Go 版单聊不产出卡片）：

```python
await bot.send_private_msg(
    user_id=123456789,
    message=Message(
        "[CQ:card,title=今日推荐,desc=点击查看详情,pic=https://example.com/cover.png,url=https://example.com]"
    ),
)
```

消息段格式（适合 NoneBot 的 MessageSegment 构造方式）：

```python
from nonebot.adapters.onebot.v11 import Message, MessageSegment

card_msg = Message([
    MessageSegment("card", {
        "title": "今日推荐",
        "desc": "点击查看详情",
        "pic": "https://example.com/cover.png",
        "url": "https://example.com",
    })
])
await bot.send_group_msg(group_id=821404315, message=card_msg)
```

## 注意

- `pic` / `url` 的最终值应为 `https://` 且 ≤1024 字节；**本地路径两侧都会先自动走图床 / 上传链转外链**，转换失败或仍是 `http://` 时 **Rust 重构版**本地回 `1400`、**Go 版**交平台裁决（卡片 `pic` 不接受 `qqbot-media://`）。
- 四字段必填是官方要求：`title` 1~50 字符、`desc` 1~200 字符、`pic` / `url` 均为 https 链接。**执行本地预校验的只有 Rust 重构版**，Go 版不预校验。
- 与 @全员 同现（markdown 未优先）回 `1400`；需要同时 @全员 时请改用 markdown 消息。
- `[CQ:card]` 不会与文本内容拼接，发送卡片时文本内容会被清空。
- 消息中同时携带 `[CQ:markdown]` 时，markdown 优先生效，卡片被丢弃。
- 频道场景不支持卡片消息。
