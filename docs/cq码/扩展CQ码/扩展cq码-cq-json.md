# [CQ:json]

<script setup>
import TryInPlayground from '../../components/cq/TryInPlayground.vue'
</script>

<TryInPlayground example='[CQ:json,data={"app":"com.tencent.miniapp"}]' />

## 用途

`[CQ:json]` 是 OneBot 标准里的 JSON 卡片形态。**Gensokyo 的两端都没有实现它**：出站按字面文本发出 —— 不会变成卡片，也不会报错。

## 语法

```text
[CQ:json,data=<卡片 JSON>]
```

## 参数

| 参数名 | 必填 | 说明 |
|--------|------|------|
| `data` | ✅（按 OneBot 约定） | 卡片 JSON；Gensokyo 不解析该值 |

## 解析行为（双端一致：字面保留）

| 侧 | 行为 |
|----|------|
| **Go 版**·字符串 | 没有任何正则命中该码，原样留在正文发出（出站断言 `handlers/cq_legacy_semantics_test.go:173-174`） |
| **Go 版**·cqparse | 未注册 ⇒ `Outcome{Replacement: tok.Raw}`，字面保留（`handlers/cqparse/walk.go:61-72`） |
| **Go 版**·入站 | 不产出 `json` 段，手打留 `text`（`handlers/inbound_handtyped_cq_test.go:24`、`:47`） |
| **Rust 重构版** | 码表 `CodeSpec{name:"json", params:["data"], outbound:false}`（`crates/gensokyo-protocol/src/cqcode.rs:911-918`）；`from_segments` 落 `_ => push_literal`（`crates/gensokyo-protocol/src/outbound.rs:713-716`） |

## 使用示例

这段代码能发出去，但群里看到的就是这串文本本身：

```python
import json

card = {"app": "com.tencent.miniapp"}
await bot.send_group_msg(
    group_id=123456,
    message=f"[CQ:json,data={json.dumps(card, ensure_ascii=False)}]",
)
```

## 注意

- 「不报错」也是行为的一部分：两端都不会拒绝该码，只是不产出卡片 —— 以为发送失败而反复重试只会重复刷屏同一串文本。
- 需要真卡片请用 [CQ:card](./扩展cq码-cq-card.md)（群聊图文卡片，`msg_type=8`）或 [CQ:markdown](./扩展cq码-cq-markdown.md)（Markdown 卡片，`msg_type=2`）。
