# Rust 与 Go 的差异清单

本页逐条登记 **Go 主链（`main` 分支）与 Rust 重构树（`Refactor` 分支）在 action 与端点层面的实际差异**，口径全部取自主仓库源码与 parity 审计（`reports/refactor/17-go-rust-parity.md`），每条给出锚点。总体结论是 **action 全集 53/53 覆盖、缺失 0**（parity `:60`），下面的差异属于「额外扩展」「占位回执」「端点语义不同」三类，不代表功能缺失。

> [!IMPORTANT]
> **错误码口径**（`crates/gensokyo-runtime/src/dispatcher.rs:3-7`）：`1400` 请求 JSON / 参数非法；**`1404` 未知 action**（含 `Error::Unsupported`）；`1500` 内部错误（配置缺失、存储 / 上游 / IO 失败、handler panic）。所以「Rust 未注册的 action」回的是 `1404`；而**已注册但官方无端点**的 action 回 `1500` + 一句说明——两者都不是静默丢弃，也不会伪造成功数据。

## 素材管理三 action：仅 Rust 已注册

| action | Rust | Go |
|--------|------|-----|
| `upload_media_image` | 已注册（`register.rs:315`），链路 `POST /v2/media-images/prepare` → 预签名 `PUT` → `POST /v2/media-images/complete`（`media_image.rs:7`） | **未注册 OneBot action** |
| `get_media_image_list` | 已注册（`register.rs:166`），`GET /v2/media-images?cursor=`（`media_image.rs:8`） | **未注册 OneBot action** |
| `delete_media_image` | 已注册（`register.rs:94`），`DELETE /v2/media-images/{image_id}/delete`（`media_image.rs:9`） | **未注册 OneBot action** |

Go 侧的实现位于 `handlers/media_asset.go`，该文件**开头注释明确「本文件不注册 OneBot action」**（`:18-19`）：当前只有 Markdown / keyboard 图片消费点（`message_parser.go`、`shortlived_image.go`）内部调用素材链，「将来若要暴露 `upload_media_image`，复用 `mediaImageUploadFlow` 即可」。因此这三个名字在 Go 上是「未知 action」（`retcode` 走 Go 的 callapi 回退），在 Rust 上是可以直接调用的正式 action；parity `:60` 把它记为 **Rust 侧扩展（Medium，登记）**，同时它们也被写进 Rust 的 `KNOWN_ACTIONS` 56 项清单（`crates/gensokyo-protocol/src/registry.rs:150-207`，其中 Go 的 53 个唯一注册名 + 这 3 个扩展）。

## `get_friend_list`：Go 恒可用，Rust 读侧对齐、写侧仍在移植

- **Go**：`handlers/get_friend_list.go:14` 注册；实现直读 idmap（`idmap.ListAllUsers`，`:28`），仅过滤空 `UserID`（`:33-38`），`output.RetCode = 0` / `Status = "ok"` **恒成立**、错误只进日志（`:43-45`），空表时 `data` 为 `null`（`append(nil, …)` 得 nil 切片）。
- **Rust**：`get_friend_list` 已注册（`crates/gensokyo-actions/src/register.rs:121`），读侧照 Go 口径直读本地 `user_info` 表、按 key 字节序升序、无去重、空态同样回 `data: null`（`users.rs:13-19`）。**但写侧（Go 的 `StoreUserInfo`，入站 C2C 时落表，`Processor/ProcessC2CMessage.go:231-241`）尚未移植（登记为 P64b）**：`users.rs:20-21` 明确「本表当前只有 M1e 导入器的数据，全新 Rust 部署在导入前恒回 `data: null`」。

结论：action **存在**、返回形状与错误码与 Go 一致；差异在**数据新鲜度**——Go 边收私聊边写表，Rust 只有导入数据。不迁移 idmap 就调用它，Rust 会拿到空列表而不是报错。

## `/getid` 的挂载条件不同

- **Rust**：`/getid` **按 lotus 实际状态隐藏**——只有 idmap gRPC 服务端真起、或远程客户端真挂上时才挂载；启动期建连失败只 warn 并降级本地，此时**保留挂载**（parity `:36`，`docs/rust-build.md:239-240`）。
- **Go**：`main.go:508` 无条件注册 `r.GET("/getid", server.IDMapAuthMiddleware(), server.GetIDHandler)`，与 lotus 状态无关。

## `backup_port`：同一个键，两端指向不同的 socket

| 侧 | `lotus = true` 时 `backup_port` 的作用 | 锚点 |
|----|--------------------------------------|------|
| Go | 替换**主 HTTP 服务**的监听端口（`port` 值不再用于本地 WebUI，改用 backup_port；`port` 的模板注释是「idmaps 和图床对外开放的端口」） | `main.go:489-493`、`template/config_template.go:57-58` |
| Rust | 替换**主 listener**——正向 WS 优先，正向 WS 缺席时才是 HTTP API 端口 | `docs/rust-build.md:243-244` |

> [!WARNING]
> 从 Go 迁到 Rust 且开了 `lotus=true`：如果同时启用正向 WS 服务端，Rust 会把**正向 WS 的监听端口**换成 `backup_port`，而 Go 换的是 HTTP 服务端口。迁移前按 `docs/rust-m0.md` R4l 条目核对端口，必要时调整防火墙与下游连接地址。

## 25 个标准 OneBot / go-cqhttp action：存在性与实现口径

Rust 额外实现了 **25 个 Go 从未注册**的 action，登记在 `crates/gensokyo-actions/src/lib.rs:264-290`（`EXTENSION_ACTIONS`）。逐项核实结果（**15 个是 `1500` 占位、10 个有真实本地行为**）：

| action | 状态 | 具体口径 | 锚点 |
|--------|------|----------|------|
| `get_msg` | `1500` 占位 | 官方无按 `message_id` 查询端点 | `messages.rs:8` |
| `get_forward_msg` | `1500` 占位 | 官方无合并转发查询端点 | `messages.rs:9` |
| `get_stranger_info` | `1500` 占位 | 官方无陌生人资料端点 | `users.rs:8` |
| `send_like` | `1500` 占位 | 官方无点赞端点（`times` 默认 1、上限 10 仍校验） | `users.rs:9`、`users.rs:49-53` |
| `set_group_name` | `1500` 占位 | 官方无修改群名称接口 | `unsupported.rs:8` |
| `set_group_admin` | `1500` 占位 | 官方无设置 / 取消群管理员接口（`enable` 类型仍校验） | `unsupported.rs:9` |
| `set_group_special_title` | `1500` 占位 | 官方无群头衔接口（`duration` 类型仍校验） | `unsupported.rs:10` |
| `set_group_remark` | `1500` 占位 | 官方无设置群备注接口 | `unsupported.rs:11` |
| `set_qq_profile` | `1500` 占位 | 官方无修改机器人资料接口 | `unsupported.rs:12` |
| `get_qq_profile` | `1500` 占位 | `gensokyo-qq` 尚未暴露机器人资料端点 | `unsupported.rs:13` |
| `get_group_system_msg` | `1500` 占位 | 官方无群系统消息接口 | `unsupported.rs:14` |
| `get_group_at_all_remain` | `1500` 占位 | 官方无 @全体成员剩余次数接口 | `unsupported.rs:7` |
| `set_group_leave` | `1500` 占位 | 官方无机器人退群端点 | `group_admin.rs:11` |
| `get_group_honor_info` | `1500` 占位 | go-cqhttp 扩展名，官方无端点 | `interaction.rs:23` |
| `set_group_anonymous_ban` | `1500` 占位 | go-cqhttp 扩展名，官方无端点 | `interaction.rs:24` |
| `can_send_image` | 本地实现 | 纯本地判断，固定 `{"yes": true}`（官方 v2 媒体走 `POST /v2/groups/{gid}/files`，无「是否允许」查询接口） | `capability.rs:1-6,35-59` |
| `can_send_record` | 本地实现 | 同上，固定 `{"yes": true}` | `capability.rs:61-85` |
| `get_image` | 本地实现 | `file://` 归一成本地路径、其余原样回填 `{"file": …}`；缺 `file` 回 `1400` | `media.rs:7`、`lib.rs:13` |
| `get_record` | 本地实现 | 同 `get_image`（语音口径） | `media.rs:8`、`lib.rs:13` |
| `send_private_forward_msg` | 真实实现 | 群侧同款逐条重发，端点为 C2C 消息；产出 deferred 计划交 runtime 发送链执行 | `interaction.rs:22` |
| `get_cookies` | 本地实现 | 回空凭证（官方无 Cookie 体系） | `lib.rs:14` |
| `get_csrf_token` | 本地实现 | 回空凭证 | `lib.rs:14` |
| `get_credentials` | 本地实现 | 回空凭证 | `lib.rs:14` |
| `clean_cache` | 本地实现 | 只记审计日志并回 `{"code": 0}`，**不清缓存** | `lib.rs:14` |
| `set_restart` | 本地实现 | 只记审计日志并回 `{"code": 0}`，**不重启进程** | `system.rs:8` |

`1500` 占位组的共同点：**参数仍按 OneBot 契约先校验**——`group_id` / `user_id` / 必填文本缺失或非法先回 `1400`，之后才是 `1500` + 一句说明，客户端因此能区分「参数写错」和「功能没有」（`unsupported.rs:17-28`）。另有两项固定回 `retcode = 100` 的写操作（`set_group_whole_ban` / `set_group_card`）不在上表：它们在 Go 里也明确回 100，属对齐而非差异（`group_admin.rs:8-9`）。`get_online_clients` 则是逐字段照抄 Go 的本地空回执 `{"clients": [], "tiny_id": 0}`（`unsupported.rs:15,30-34`）。

## 其余登记项（parity 在册，非缺陷）

| 项 | 差异 | 锚点 |
|----|------|------|
| 短链数据 | Go `gensokyo.db` 的 `shortURLs` bucket **不导入** Rust 的 `short-urls.redb`，旧短链在 Rust 上直接 404，需重新生成（idmap / echo 有 JSONL 导入器，短链没有） | `docs/rust-build.md:232-234` |
| `/getid` type 5/12 | Rust 已是真实实现（重绑定 / 解绑），会直接改 `openid-map.redb` 且**不可回滚**；gRPC 错误码从 `Unimplemented` 的 `Unknown` 变为 `NotFound` / `AlreadyExists` | `docs/rust-build.md:235-238` |
| `KNOWN_ACTIONS` 清单漂移 | Rust 56 项 = Go 53 个唯一注册名 + 素材管理 3 项 | `registry.rs:150-207`、parity `:60` |
| `--no-webui` 产物 | Rust 侧 feature 未落地，精简版内容与完整版一致（产物名仍带 `-noWebui`） | [构建与验证](/rust/build)的 `--no-webui` 一节 |
| 生产 panic 行为 | Rust release 是 `panic = "abort"`，任何 panic 直接终止进程；Go 主链无此口径 | [构建与验证](/rust/build)的「release 的 panic 语义」 |

## 继续阅读

- [Rust 重构概览](/rust/overview)：双树现状、里程碑与 parity 结论。
- [构建与验证](/rust/build)：`panic = "abort"` 的运维必读与交叉工具链引导。
- [性能对比](/rust/perf)：当前口径的实测数字与优化手段可用性。
- [能力矩阵](/guide/matrix)：**Go 版本**的 action 映射口径（勿套用到 Rust）。

数据出处：主仓库 `Refactor` 分支的 [17-go-rust-parity.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/reports/refactor/17-go-rust-parity.md)、[docs/rust-m0.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/Refactor/docs/rust-m0.md) 与 `crates/` 源码。
