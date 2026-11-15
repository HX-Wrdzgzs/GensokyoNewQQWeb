# [CQ:poke]

<script setup>
import TryInPlayground from '../../components/cq/TryInPlayground.vue'
</script>

<TryInPlayground example="[CQ:poke,qq=10001]" />

## 用途

`[CQ:poke]`（戳一戳）**在 Go 版没有实现**：主仓码表已标注「未实现，仅码表占位」（`readme.md:153`），`.go` 生产代码对该码零命中，只有测试把它当作「应留 text」的样例（`handlers/inbound_handtyped_cq_test.go:23`、`:46`）；事件侧也没有 `POKED` / `GROUP_POKED` 的消费（`reports/refactor/17-go-rust-parity.md:79`，2026-11-14 复扫确证）。

Rust 重构版同样不执行戳一戳：码表里有占位条目，但出站行为是**字面保留**。两侧行为等价 —— 都只是把这段文本留在消息里，都**不支持**戳一戳。

## 语法

```text
[CQ:poke,qq=10001]
```

## 参数

| 参数名 | 必填 | 说明 |
|--------|------|------|
| `qq` | — | 目标 QQ 号；两侧都不读取该参数 |

## 解析行为

| 侧 | 行为 |
|----|------|
| **Go 版** | 出站未注册该码 ⇒ `Outcome{Replacement: tok.Raw}` 字面保留（`handlers/cqparse/walk.go:61-72`）；字符串路径同样无正则命中，原样发出 |
| **Rust 重构版** | 码表 `CodeSpec{name:"poke", params:["qq"], inbound:false, outbound:true}`（`crates/gensokyo-protocol/src/cqcode.rs:858-864`），但 `from_segments` 里 `poke` 落在 `_ => push_literal` 组（`crates/gensokyo-protocol/src/outbound.rs:713-716`，注释明确点名 `poke`） |

> [!NOTE] Rust 码表的 `outbound: true` 与行为不符
> `CodeSpec` 的 `outbound` 位是**纯描述性**字段（`crates/gensokyo-protocol/src/cqcode.rs:661-663`、`:686-689`）：`poke` 虽标 `outbound: true`，却没有对应的读点，实际行为仍是字面保留。按 P69 `ark` 的先例，这类元数据偏差只做登记校准，不改变运行行为。

## 使用示例

```python
await bot.send_private_msg(
    user_id=123456,
    message="[CQ:poke,qq=123456]",
)
# 实际发出的是这串文本，不会触发戳一戳
```

## 注意

- 不要按「已支持」使用：Go 版无实现，Rust 重构版是码表占位、行为等价为字面保留。
- 入站方向同样没有 `poke` 事件或 CQ 段；用户手打的 `[CQ:poke]` 在字符串上报里原样保留（`handlers/inbound_handtyped_cq_test.go:23`、`:46`）。
