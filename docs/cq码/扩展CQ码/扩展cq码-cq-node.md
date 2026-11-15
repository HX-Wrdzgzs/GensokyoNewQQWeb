# [CQ:node]

<script setup>
import TryInPlayground from '../../components/cq/TryInPlayground.vue'
</script>

<TryInPlayground example="[CQ:node,id=123456]" />

## 用途

`[CQ:node]` 是 OneBot 里合并转发的**节点**形态。Gensokyo 两端都不解析它：出站按字面保留，入站也不产出 `node` 段。真正能落地的只有 action 层 —— **Go 版** `send_group_forward_msg`（`handlers/send_group_forward_msg.go:14` 注册，按 `forward_msg_limit` 逐条拆发）；**Rust 重构版** 同名的 `send_group_forward_msg` / `send_private_forward_msg` 也按 `forward_msg_limit` 逐条重发（`register.rs:229`、`interaction.rs:741-822`、`send.rs:620`，逐条间 500ms 节流）；`get_forward_msg` 只是查询、两仓 CQ 层都没有折叠转发端点（见 [CQ:forward](../标准CQ码/标准cq码-cq-forward.md)）。

## 语法

```text
[CQ:node,id=<forward_id>]
[CQ:node,user_id=<QQ>,nickname=<昵称>,content=<内容>]
```

## 参数

| 参数名 | 必填 | 说明 |
|--------|------|------|
| `id` | 否 | 转发 ID 形态；两端都不读取 |
| `user_id` / `nickname` / `content` | 否 | 自定义节点形态；两端都不读取 |

## 解析行为（双端一致：字面保留）

| 侧 | 行为 |
|----|------|
| **Go 版** | 出站没有 `node` 的消费点：字符串路径无正则命中、cqparse 未注册（`handlers/cqparse/walk.go:61-72`），都按字面发出；入站不产出 `node` 段，转发消息只保留 `node` 媒体（`reports/refactor/17-go-rust-parity.md:62`） |
| **Rust 重构版** | 码表 `CodeSpec{name:"node", params:["id","user_id","nickname","content"], outbound:false}`（`crates/gensokyo-protocol/src/cqcode.rs:825-831`）；`from_segments` 落字面臂（`crates/gensokyo-protocol/src/outbound.rs:713-716`）；parity B4 记「已对齐」（`reports/refactor/17-go-rust-parity.md:76`） |

## 使用示例

```python
await bot.send_group_msg(
    group_id=123456,
    message="[CQ:node,id=123456]",
)
# 群里看到的是这串文本本身，不会折叠成转发消息
```

## 注意

- 发合并转发不要指望 CQ 码：两仓 CQ 层都没有合并转发解析；Go 版用 `send_group_forward_msg`（逐条拆发，受 `forward_msg_limit` 限制），Rust 重构版的 `send_group_forward_msg` / `send_private_forward_msg` 同样逐条重发（同受 `forward_msg_limit` 限制），`get_forward_msg` 只是查询 —— `[CQ:forward]` 页说明该码为何不可用，`[CQ:node]` 自身则完全没有发送能力。
- 入站收到转发消息时，`node` 媒体会保留在转发结构里，但不会转成 CQ 文本节点（`reports/refactor/17-go-rust-parity.md:62`）。
