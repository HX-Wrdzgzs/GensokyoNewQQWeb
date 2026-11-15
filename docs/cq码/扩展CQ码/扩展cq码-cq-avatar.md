# [CQ:avatar]

<script setup>
import TryInPlayground from '../../components/cq/TryInPlayground.vue'
</script>

<TryInPlayground example="[CQ:avatar,qq=10001]" />

## 用途

`[CQ:avatar]` 按 QQ 号取头像图。Go 侧正则 `\[CQ:avatar,qq=(\d+)\]` 只认**纯数字**（`handlers/avatar.go:14`、`:53`）：写成 32 位原生 OpenID 之类非纯数字的值不匹配该码。

同一个码在 Go 侧的几条路径上归宿并不相同 —— 字符串路径拿到的是「裸 CQ 文本」，段路径与 cqparse 才发真图；Rust 重构版没有这一分叉（见下表）。

## 语法

```text
[CQ:avatar,qq=10001]
```

## 参数

| 参数名 | 必填 | 说明 |
|--------|------|------|
| `qq` | ✅ | 纯数字 QQ 号；非纯数字不匹配正则，整码按字面保留 |

## 解析行为

| 路径 | 行为 |
|------|------|
| **Go 版**·字符串 | 媒体步（`handlers/cqcode_pipeline.go:24`）之后，`:50-55` 调 `ProcessCQAvatar` / `ProcessCQAvatarNoGroupID`，把码**替换成 `[CQ:image,file=https://q.qlogo.cn/...]` 的字面文本**（`handlers/avatar.go:44`、`:77`）。替换发生在本轮解析之后，这串 `image` 字面不会再被解析 ⇒ 用户看到的是裸 CQ 文本，而不是头像图。 |
| **Go 版**·段数组 | `case "avatar"` 反查 openid 后写 `url_images` / `url_image`，发真图（`handlers/message_parser.go:991-1016`，URL 提取与分键见 `:1005-1013`）；前缀既非 `https://` 也非 `http://` 时还有 `unknown_image` 兜底（`:1012-1013`）。 |
| **Go 版**·cqparse（`new`） | 同真图（`handlers/cqparse/handlers_media.go:118-138`）；`qq` 为空时字面保留（`:122-124`）；openid 反查失败则移除该码并记录 warn（`:129-132`）。 |
| **Rust 重构版** | 不复刻的是 Go「字符串 → `[CQ:image]` 字面」这一支（`crates/gensokyo-protocol/src/cqcode.rs:877-889` 的码表注释）；Rust 的字符串入参统一 parse 成段（`crates/gensokyo-actions/src/send.rs:204-219` → `crates/gensokyo-protocol/src/segment.rs:572`），故 `auto_escape=false` 下与段路径同归宿：`from_segments` 收集到 `plan.avatars`（`crates/gensokyo-protocol/src/outbound.rs:665-668`），由 runtime 的 `resolve_avatars` 发 qlogo 真图（`crates/gensokyo-runtime/src/deferred.rs:2435-2449`，反查失败时吞段 + warn）。 |

**Rust 重构版取图 URL**：`https://q.qlogo.cn/qqapp/{app_id}/{openid}/640`（`crates/gensokyo-runtime/src/deferred.rs:2455-2462`）；`app_id == 0` 时拼出的 URL 刻意偏离 Go（`:2452-2459`）。

### 残余差异

`docs/rust-handover.md:127`（§6 ⑰）登记了 4 条：`app_id` 异常时拼出的 URL 与 Go 不同、idmap 反查只有一维、头像图追加在 `images` 末尾、`qq` 形态上的差异。前两条的代码锚点即上文的 `crates/gensokyo-runtime/src/deferred.rs:2435-2462`，细节以该节为准。

## 使用示例

消息段形式（推荐：Go 版与 Rust 重构版都发真图）：

```python
from nonebot.adapters.onebot.v11 import Message, MessageSegment

await bot.send_group_msg(
    group_id=123456,
    message=Message([MessageSegment("avatar", {"qq": "10001"})]),
)
```

字符串形式：

```python
await bot.send_group_msg(group_id=123456, message="[CQ:avatar,qq=10001]")
```

> 同样是字符串形式：**Go 版**只会被替换成 `image` 字面、最终以裸 CQ 文本发出；**Rust 重构版**在 `auto_escape=false`（默认）下发真图，`auto_escape=true` 才留字面（`crates/gensokyo-actions/src/send.rs:204-219`）。

## 注意

- Go 版字符串路径的产物是「裸 CQ 文本」而不是头像图 —— 这是 Go 版的历史实现方式；要头像请用消息段。
- `qq` 必须是纯数字：正则 `\[CQ:avatar,qq=(\d+)\]` 是唯一入口（`handlers/avatar.go:14`、`:53`）。
- cqparse 下 `qq` 为空保留字面、openid 反查失败则移除码并记录 warn —— 不会产出空图或坏图。
