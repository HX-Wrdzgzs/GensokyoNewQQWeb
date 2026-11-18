# Release 更新

本页按版本倒序汇总 Gensokyo-NewQQ 的发布内容。摘要提炼自主仓库的 `release_log/CHANGELOG_vNNN.md`，完整变更、文件清单与提交记录以上游 changelog 为准。

> [!NOTE]
> **Rust 重构版尚未发布**：它在主仓库 `Refactor` 分支上推进，发布名为 `Release 016 Rust`，目前既无 `Release016Rust` tag 也无对应 GitHub Release，因此不与下表的 Go 主线版本序列混排。构建入口与源码见 [Rust 重构概览](/rust/overview)。

| 版本 | 主题 |
|------|------|
| [Release016](#release016) | **未封版 · 在飞**——分层架构接入主链 · 素材管理 / @全员 / 单聊卡片 · CQ 最大兼容 |
| [Release015](#release015) | 富媒体上传重试 · 群成员管理与指令面板 |
| [Release014](#release014) | `[CQ:wakeup]` C2C 互动召回 · 路径与去重修复 |
| [Release013](#release013) | `[CQ:reply]` REFIDX · `set_group` 系列统一 |
| [Release012](#release012) | 群聊 API 全量补齐 · CQ 码解析统一管道 |
| [Release011](#release011) | 移除 QQ 频道（Breaking） · handler/Processor 精简 |
| [Release010](#release010) | 卡片 / 输入状态 / 流式消息 · 错误码中文提示 |
| [Release009](#release009) | CQ 码处理逻辑修复与 API 规范对齐 |
| [Release008](/release/v008) | 图床 `oss_type` 扩展、频道事件 · 见独立页面 |

---

## Release016

> [!WARNING]
> **v016 尚未封版、当前在飞**：主仓库 `release_log/CHANGELOG_v016.md` 顶部**没有** `> 🚀 **已封版**` 那一行（对比 `CHANGELOG_v015.md:3` 有），仓库 tag 也只打到 `Release015`、无 `Release016`；同时下一版 `CHANGELOG_v017.md` 尚未创建。因此下面列的是**自 Release015 以来累积到当前 `main` 的在飞变更**，仍在按请求继续追加，发布说明以封版当天的 changelog 全文为准。
>
> 本仓封版惯例：changelog 定稿 → 顶部加 `> 🚀 **已封版**：ReleaseNNN 已封版，后续变更请记录到 CHANGELOG_vNNN+1.md` → 新建下一版 stub → 打轻量 tag `ReleaseNNN` 并推送 → 跑 `.\build.ps1`。

- 生产主链接入 `internal/` + `adapter/` 分层架构，按 `arch_mode` 逐请求切换（`new` 默认，`legacy` 可一键回退）。
- 群管理三接口（`get_group_join_request_list` / `get_group_bot_state` / 审批策略）按官方现文档对齐字段（`cursor` / `list` 等）。
- 入站事件按官方 2026-09-16 新增字段富化：新增 `message_type` / `ark_data` / `msg_elements` / 附件 `voice_wav_url`、`asr_refer_text`，上报为 `[CQ:ark,ark_type=..,ark_name=..,prompt=..]`、`[CQ:record,file=..,asr=..]`、`[CQ:reply,msg_idx=..]` 三种入站形态（出站解析会剥离，`[CQ:record]` 的 `,asr=` 不污染 URL）。
- 素材管理三接口（官方 2026-10-21）：`upload_media_image` / `get_media_image_list` / `delete_media_image`，链路 `prepare` → 预签名 PUT → `complete`，返回 `qqbot-media://image/v1/<token>` 并在 Markdown 图片与 keyboard 按钮图片字段原样透传；单图 ≤10MB（10,000,000 字节）、单机器人 100 张、自最后引用起 90 天滑动过期（`ttl=7776000`）。
- 群聊 @全员（官方 2026-10-26）：`[CQ:at,qq=all]`（别名 `qq=everyone`）与字面 `<qqbot-at-everyone />` 归一为官方标签；每群每自然日 1 次本地限流（`enable_at_everyone_limit` 默认 `true`，固定按 `+08:00` 切日，计数落 idmap config 表 `at_everyone`），同日第 2 次与单聊带 @全员 均回 `1400`。
- 图文卡片支持单聊（官方 2026-10-28）：`[CQ:card]` 群聊 / 单聊同构（`msg_type=8`），`title` 1~50 字符、`description` 1~200 字符、`url` / `pic_url` 必须 `https://` 且 ≤1024 字节；缺字段、本地路径或 `http` 一律整条 `1400`（旧的「本地路径自动图床上传」「非法卡片跳过」口径移除）。
- CQ 码解析最大兼容（2026-11）：空白容错全量适配（段名前、参数间、`=` 两侧允许空白，值内部空格保留）+ 全路径统一并集口径（段名与参数键大小写不敏感、任意键序、尾部附加键不再污染值、stream 冒号/等号双语法、段名字符集统一 `[A-Za-z0-9_]`）。
- 富媒体上传阈值对齐官方：`file_data` 直传上限 5MB（保守取 5,000,000 字节），超限自动改走分片上传。
- 修复：`[CQ:keyboard]` 按钮权限 `permission.type=0` 原样发出、`auto_approved` 由对象误判为 bool、错误码表补 16 项（`10000`/`850018`/`850019`/`850026`/`850027`/`850031`/`40093001`/`40093002`/`40061001`/`40062003`/`40064004`/`50065001`/`100001`/`100007`/`100016` 等）、禁言时长超过 30 天按 30 天截断。
- 官方口径再对齐：模板载荷废弃——`custom_template_id` / `template_id` 自动注入移除，`native_md` 不再改变载荷形态；`[CQ:music]` 改普通文本（`msg_type=0`）+ 键盘按钮，不再发送空 `msg_type=2` 载荷。

上游变更：[CHANGELOG_v016.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/main/release_log/CHANGELOG_v016.md)

## Release015

- 新增 QQ CDN 富媒体与统一图床上传重试机制；Markdown 消息新增 `force_verify_image_resource` 配置。
- 新增群成员管理（QQ 官方 v2 接口）、C2C 自定义菜单与指令面板，`[CQ:set_group]` 扩展 3 个子动作。
- 兼容性：全局域名统一 `api.sgroup.qq.com` → `api.bot.qq.com`；CQ 码统一解析架构（cqparse）落位。
- 修复：纯 markdown / keyboard 段消息不再被静默丢弃、入站 @ 转换前移或丢失、`generate_url_link` 请求字段对齐官方。

上游变更：[CHANGELOG_v015.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/main/release_log/CHANGELOG_v015.md)

## Release014

- 新增 `[CQ:wakeup,userid=xxx]` C2C 互动召回消息标记。
- 修复：`get_friend_list` 不再过滤虚拟数字 ID、Windows 下 `file:///` 本地图片路径解析、私聊图文混合消息图片发送超时。
- 修复：`c2cMessageHandler` 按消息 ID 去重（私聊偶发收到两遍）、入群通知回复被误判为群私聊（`11255`）。
- 修复：`safeLocalPath` 先拒绝 `..` 再 Clean，收敛 Linux 下的路径穿越校验绕过。

上游变更：[CHANGELOG_v014.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/main/release_log/CHANGELOG_v014.md)

## Release013

- 变更：`[CQ:reply]` 支持 REFIDX 引用（引用非机器人消息）；独立 `[CQ:keyboard]` 可与 markdown 消息共存；`set_group` 系列 CQ 码统一为 `[CQ:set_group,action=...]`。
- 事件增强：入群申请上报申请者昵称，`verify_info` 兼容对象格式。
- 修复：QQ WebSocket 鉴权失败无限重连、剔除频道 handler 后消息类型递归枚举越界 panic。

上游变更：[CHANGELOG_v013.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/main/release_log/CHANGELOG_v013.md)

## Release012

- 群聊 API 全量补齐（11 个接口、12 个方法）并暴露为 OneBot action；新增 `GROUP_JOIN_REQUEST` 入群申请事件，`set_group_add_request` 真实化。
- CQ 码处理重构：独立文件 + 单次扫描、统一管道架构；新增 `[CQ:keyboard]` 与动作型群聊管理 CQ 码。
- 分阶段重构基础设施落地（P2～P13）：配置快照、Identity 类型化、消息解析类型化、Processor 分层、Adapter 边界隔离等。

上游变更：[CHANGELOG_v012.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/main/release_log/CHANGELOG_v012.md)

## Release011

- 移除功能：QQ 频道（guild / channel / forum / DM）相关出站 handler（6 个文件）与入站 processor（5 个文件）全部删除，botgo SDK Fork 同步精简为群聊 / C2C 部分。
- 兼容性（Breaking）：频道相关转换配置随频道移除（如 `GlobalPrivateToChannel` 私聊转频道私信），新版本生成的配置文件仅包含实际有效的配置项。
- handler 与 Processor 的频道分支同步剔除，保留群聊路径；验证旧链与新文档一致。

上游变更：[CHANGELOG_v011.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/main/release_log/CHANGELOG_v011.md)

## Release010

- 新增 `[CQ:card]` 群聊图文卡片消息、`[CQ:input_notify]` 单聊输入状态通知、`[CQ:stream]` 单聊流式消息。
- 新增智能分片上传、QQ API 错误码中文提示、idmap 强制解绑工具。
- 修复：`lazy_message_id` 多段回复偶发 `40054005`（Issue #19）、图文混合消息 `[CQ:at]` 原文显示（Issue #15 / PR #16）。
- 改进：默认启用 `FriendAdd` / `FriendDel` 事件转发。

上游变更：[CHANGELOG_v010.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/main/release_log/CHANGELOG_v010.md)

## Release009

- 修复：CQ 码处理逻辑修复并与 API 规范对齐；`GROUP_MESSAGE_CREATE` 全量群消息中 `bot:true` 的提及也注册到 `selfAtIDs`。
- 修复：仅含 `@bot` 的群消息被误判为黑白名单拦截；`Keyboard` 按钮中的本地图片路径未上传图床。
- 修复：Markdown 本地图片的基础目录限制移除、HTTP API 端口绑定失败不再终止进程。

上游变更：[CHANGELOG_v009.md](https://github.com/Te-River/Gensokyo-NewQQ/blob/main/release_log/CHANGELOG_v009.md)
