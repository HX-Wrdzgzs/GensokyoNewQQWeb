# [CQ:ark]

<script setup>
import TryInPlayground from '../../components/cq/TryInPlayground.vue'
</script>

<TryInPlayground example="[CQ:ark,ark_type=1,ark_name=测试,prompt=示例]" />

## 用途

`[CQ:ark]` 是**入站专用**的结构化卡片码：Gensokyo 把收到的 ark 消息上报成这串 CQ 文本，出站时则把该码整段剥掉、不读任何参数。卡片真正的字段只存在于消息段 JSON 的 `data` 里（`handlers/message_parser.go:2432-2444`），不会进 CQ 文本。

## 语法

```text
[CQ:ark,ark_type=…,ark_name=…,prompt=…]
[CQ:ark]
```

- 入站上报的生成点：`handlers/message_parser.go:2496-2498`。
- `message_type=3` 但缺少 `ark_data` 时，上报裸 `[CQ:ark]`（`:2490-2494`）。

## 参数

| 参数名 | 必填 | 说明 |
|--------|------|------|
| `ark_type` | —（仅入站） | 入站上报的卡片类型值，出站不读取 |
| `ark_name` | —（仅入站） | 入站上报的卡片名称，出站不读取 |
| `prompt` | —（仅入站） | 入站上报的提示文本，出站不读取 |

三个参数只是上报信息，修改它们不会改变出站结果 —— 出站只做「整段剥离」。

## 出站行为（双端一致）

| 侧 | 行为 |
|----|------|
| **Go 版** | `ProcessCQInboundOnlyCodes` 用 `arkCQPattern`（`handlers/cqcode.go:198`）整段剥离、不读参数（`handlers/cqcode.go:198-206`；调用点 `handlers/cqcode_pipeline.go:59`） |
| **Go 版**·cqparse | 注册 `inboundOnlyHandler{}`，直接返回 `Outcome{Replacement: ""}`（`handlers/cqparse/handlers_control.go:26`，实现 `:18-20`） |
| **Rust 重构版** | 码表 `CodeSpec{name:"ark", params:["ark_type","ark_name","prompt"], inbound:false, outbound:false}`（`crates/gensokyo-protocol/src/cqcode.rs:897-910`）；`from_segments` 的 `"ark" => {}` 静默丢弃（`crates/gensokyo-protocol/src/outbound.rs:704-707`） |

> [!NOTE] 与媒体族的裸码行为相反
> 媒体族裸码（`[CQ:image]` 等）会保留字面，而 `arkCQPattern` 是 `\[CQ:ark[^\]]*\]` —— 裸 `[CQ:ark]` 同样命中、同样被剥掉，不留任何文本（`handlers/cqcode.go:198`）。

## 入站上报

两侧都产出 `ark` 段，`data` 里的 `fields` 是真实 JSON 对象（`reports/refactor/17-go-rust-parity.md:17`，P52 已对齐）。字符串模式下用户手打的 `[CQ:ark]` 不会被入站解析，按普通文本上报（`handlers/message_parser.go:2253-2334`）。

## 使用示例

入站事件的 CQ 文本长这样（只读示例；把它写出站不会得到卡片）：

```text
[CQ:ark,ark_type=1,ark_name=测试,prompt=点击查看]
```

## 注意

- 出站写 `[CQ:ark]` 不会发出卡片，只会被**删除** —— 正文里连这串文本都看不到。
- `ark_type` / `ark_name` / `prompt` 只是入站上报字段，出站不读取；需要构造卡片请改用 [CQ:card](./扩展cq码-cq-card.md)（群聊图文卡片）或 [CQ:markdown](./扩展cq码-cq-markdown.md)。
- 参数元数据的校准历史记于 P69（`reports/refactor/17-go-rust-parity.md:77`）。
