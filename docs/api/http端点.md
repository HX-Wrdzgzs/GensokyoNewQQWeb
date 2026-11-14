# Gensokyo HTTP 端点

本文列出 Gensokyo 除 OneBot 动作（WS / HTTP API 的 `action` 请求）之外，直接暴露在 HTTP 监听上的**路由端点**：图片/语音上传、idmap 查询（`/getid`）、健康检查与指标、短链服务等。

> **锚点写法**：`文件:行号`。Go 生产版锚点相对主仓 `Gensokyo-NewQQ`（如 `main.go`、`server/getIDHandler.go`）；Rust 重构版锚点相对重构仓 `Gensokyo-NewQQ-Refactor`（如 `crates/gensokyo-runtime/src/upload_http.rs`）。
>
> **「适用版本」列**：`两侧` = Go 与 Rust 重构版均注册该端点；`Go` / `Rust` = 仅该侧提供；行为或口径有差异时在说明中标注。

## 监听结构

Gensokyo 有两个独立 HTTP 监听：

| 监听 | 端口来源 | 承载内容 | 锚点 |
|------|----------|----------|------|
| 主 listener | `port`（`lotus=true` 时改用 `backup_port`） | 上传 / `/getid` / 健康检查 / 短链 / WebUI / 正向 WS / 反向 webhook | Go `main.go:489-494`；Rust `crates/gensokyo-runtime/src/boot.rs:1264-1273` |
| 正向 HTTP API listener | `http_address`（为空不启动） | OneBot action 专用路由 + `/metrics` | Go `main.go:547-552`、`template/config_template.go:234`；Rust `crates/gensokyo-runtime/src/http_api.rs:1` |

## 主 listener 路由总表

| 路径 | 方法 | 用途 | 鉴权 | 适用版本 |
|------|------|------|------|----------|
| `/getid` | GET | idmap 查询与管理（type 1–19，见下文全表） | `lotus_password` HMAC 签名；无密码时仅本地 | 两侧（Go `main.go:508`、`server/getIDHandler.go:104`；Rust `upload_http.rs:94,377`） |
| `/uploadpic` | POST | base64 图片上传，返回外链 URL | `http_access_token`（下文） | 两侧（Go `main.go:523`；Rust `upload_http.rs:90`） |
| `/uploadpicv2` | POST | v2 图片上传（走媒体上传接口） | `http_access_token` | 两侧（Go `main.go:524`；Rust `upload_http.rs:91`） |
| `/uploadrecord` | POST | base64 silk 语音上传，返回外链 URL | `http_access_token` | 两侧（Go `main.go:525`；Rust `upload_http.rs:92`） |
| `/updateport` | GET | Lotus 场景 IP/端口更新通知 | `http_access_token` | 仅 Go（`main.go:518`） |
| `/delpic` | POST | 删除已上传图片 | `http_access_token` | 仅 Go（`main.go:519`） |
| `/healthz`、`/readyz` | GET | 探活 | `http_access_token` | 仅 Go（`main.go:520-521`） |
| `/health` | GET | 探活（`text/plain`，**不鉴权**） | 无 | 仅 Rust（`http_api.rs:60-70`） |
| `/metrics` | GET | Prometheus 指标 | `http_access_token` | 仅 Go 主 listener（`main.go:522`）；Rust 只在 HTTP API 端口提供（`http_api.rs:72-82`，主 listener 缺 uploadAuth 等价中间件，暂不挂） |
| `/url` | POST | 创建短链（表单 `url` / `token`） | 按 `lotus_password` 的 token 规则 | 两侧（Go `main.go:566`；Rust `http_api.rs:95`） |
| `/url/:shortURL` | GET | 短链 301 跳转 | 无 | 两侧（Go `main.go:567`；Rust `http_api.rs:96`） |

补充说明：

- **`/getid` 的条件挂载**：Go 在 `lotus_grpc` 成功接管 idmap 后不再注册本地 `/getid`（`main.go:507-509`）；Rust 同口径（`mount_getid=false`，`upload_http.rs:82-97`），但任一 gRPC 环节失败降级时仍挂本地路由。
- **Go 主 listener 上的其余路由**（本包只核实 Go 侧）：反向 HTTP webhook `POST /{webhook_path}`（`main.go:530`）、`/channel_temp` 静态目录（`main.go:532`，上传产物外链前缀）、`/webui/*`（`main.go:533-542`，`frp_port=0` 且未禁用时）、正向 WS `GET /{ws_server_path}`（`main.go:554-563`）、身份文件 `GET /{appid}.json`（`main.go:568-575`）。
- **Rust WebUI 挂载后的优先级**：`POST` 且路径不在 `/api` 前缀下才进 action 分派，其余归 WebUI（`http_api.rs:19-29`）。

## 鉴权口径

### `http_access_token`（上传 / 删除 / 探活 / Go 主 listener 指标）

配置 `http_access_token` 非空时，`Authorization` 头去掉 `Bearer ` 前缀、或查询参数 `access_token`，两者任一与配置值相等即放行；否则 **403** `{"error":"鉴权失败"}`。配置为空时完全不鉴权。

- Go：`server/uploadpic.go:36-51`（`UploadAuthMiddleware`），挂载点 `main.go:516-525`。
- Rust：`upload_http.rs:107-108,833`（鉴权先于频控，失败不消耗额度）；`http_api.rs:11-12`（同口径，从不回 401）。

### `lotus_password`（`/getid` 与短链）

- **设置了 `lotus_password`**：HMAC-SHA256 签名。签名串为 `path + "?" + 按 key 排序的 query 参数 + "&timestamp=" + timestamp`（`token`、`timestamp` 两个参数本身不参与签名）；hex 小写结果经查询参数 `token` 或请求头 `X-Token` 提交。时间窗 **±300 秒**，超窗回 401 `timestamp expired`。
  - Go：`server/getIDHandler.go:20-90`（时间窗在 `:51`）。
  - Rust：`upload_http.rs:79-80`（`TIMESTAMP_WINDOW: i64 = 300`）、`:787`（`sign_payload`）。
- **未设置 `lotus_password`**：仅允许本地访问。
  - Go：放行 `127.0.0.1`、`::1` 以及**字面字符串 `localhost`**（`getIDHandler.go:92-98`）。
  - Rust：**只认 TCP 对端地址** `127.0.0.1` / `::1`，不放行字面 `localhost`（`upload_http.rs:19-20,745-746`），口径比 Go 更严。

> [!WARNING]
> **公网暴露时，Go 的「仅允许本地访问」可被 `X-Forwarded-For` 伪装绕过。**
> Go 版基于 gin，`c.ClientIP()` 优先采信 `X-Forwarded-For` / `X-Real-IP`；主仓从未调用过 `SetTrustedProxies` 收紧代理信任（全仓检索零命中），gin 默认**信任所有来源**的转发头。因此若把服务**直接暴露到公网**（没有一个会清洗转发头的可信反向代理在前面），任何远端客户端都可以伪造 `X-Forwarded-For: localhost`（或 `127.0.0.1`）命中 `getIDHandler.go:94` 的本地口径——包括那条字面 `localhost` 放行——在未设置 `lotus_password` 时直接读写 `/getid` 的全部 idmap 数据。
> 部署守则：**要么设置 `lotus_password` 强制走 HMAC 签名，要么绝不把主 listener 直接暴露公网**；置于 Nginx 等反代之后时必须自行保证转发头只来自可信代理（gin 侧默认行为帮不了你）。
> Rust 重构版取真实 TCP 对端、不看转发头，不受此绕过路径影响（`upload_http.rs:19-20`）。

## 正向 HTTP API listener（`http_address`）

Go 在该 listener 上提供 **11 条按路径分派的专用路由**（`httpapi/httpapi.go:34-88`，均支持 POST JSON 与 GET 查询参数），外加免鉴权的 `GET /metrics`（`main.go:550`）；`http_access_token` 非空时其余路径全部先过同一 token 检查（`httpapi/httpapi.go:23-31`）：

| 路径 | 对应 action | 锚点（`httpapi/httpapi.go`） | 适用版本 |
|------|-------------|------------------------------|----------|
| `/send_group_msg` | `send_group_msg` | `:34-41` | 两侧（Rust 见下方统一入口） |
| `/send_group_msg_raw` | `send_group_msg_raw` | `:42-45` | 两侧 |
| `/send_private_msg` | `send_private_msg` | `:46-53` | 两侧 |
| `/send_private_msg_sse` | `send_private_msg_sse` | `:54-61` | 两侧 |
| `/get_group_list` | `get_group_list` | `:62-65` | 两侧 |
| `/get_friend_list` | `get_friend_list` | `:66-69` | 两侧（Rust 重构版该 action 仍在实现中，返回 `1500`，见 [API 介绍](./api介绍.md)） |
| `/put_interaction` | `put_interaction` | `:70-73` | 两侧 |
| `/delete_msg` | `delete_msg` | `:74-77` | 两侧 |
| `/delete_group_msg` | `delete_group_msg` | `:78-81` | 两侧 |
| `/get_avatar` | `get_avatar` | `:82-85` | 两侧 |
| `/get_login_info` | `get_login_info` | `:86-89` | 两侧 |

**Rust 重构版差异**：上述「按路径分派专用 handler」尚未落地，Rust 的正向 HTTP API 是统一入口——**向任意路径 `POST` 一个 OneBot action 请求 JSON**，响应即 `ActionResponse`；非 `POST` 回 405；另有免鉴权的 `GET /health` 与 `GET /metrics`（`crates/gensokyo-runtime/src/http_api.rs:1-17`）。也就是说 Rust 侧 `POST /send_group_msg`（或任意路径）带合法 action JSON 都能工作，但 **GET 查询参数形态只有 Go 支持**。

## `/getid` type 全表（1–19）

Go 侧服务端实现：`server/getIDHandler.go:113-374`；Rust 侧服务端：`crates/gensokyo-runtime/src/upload_http.rs:387-696`（两侧均覆盖 1–19；未知 type 两侧都无 `default` 分支——写完 200 头即返回，响应体为空，Go 同文件 switch / Rust `:694-695`）。

| type | 功能 | 关键参数（查询串） | 成功响应 | Rust 侧备注 |
|------|------|--------------------|----------|-------------|
| 1 | 存储 OpenID，分配/返回虚拟 ID | `id` | `{"row": 虚拟ID}` | 同实现（`upload_http.rs:388,699-708`） |
| 2 | 虚拟 ID 反查 OpenID | `id` | `{"id": OpenID}`；查不到 404 | 同实现（`:389,710-723`） |
| 3 | 写 idmap 配置段 | `id` `subtype` `value` | `{"status":"success"}` | 同实现（`:390-400`） |
| 4 | 读 idmap 配置段 | `id` `subtype` | `{"value": …}` | 同实现（`:401-410`） |
| 5 | 重绑定虚拟 ID | `oldRowValue` `newRowValue` | `{"status":"success"}` | 同实现；`new=0` 彻底解绑（`:411-441`） |
| 6 | 虚拟 ID → (虚拟, 真实) 对 | `virtualValue` | `{"virtual":…,"real":…}` | 同实现（`:442-457`） |
| 7 | OpenID → 虚拟 ID | `id` | `{"virtual": …}` | 同实现（`:458-471`） |
| 8 | Pro 双键存储 | `id` `subid` | `{"row":…,"subRow":…}` | Rust 用两次独立查询，非复合键新建（`:472-493`） |
| 9 | Pro 双键反查 | `id` `subid` | `{"id":…,"subid":…}` | 同实现（`:494-514`） |
| 10 | Pro 虚拟值查询（只查不分配） | `id` `subid` | `{"firstValue":…,"secondValue":…}` | 同实现（`:516-541`） |
| 11 | Pro 双虚拟值 → 双真实值 | `id` `subid` | `{"firstRealValue":…,"secondRealValue":…}` | 同实现（`:542-573`） |
| 12 | Pro 双重绑定更新 | `oldVirtualValue1` `newVirtualValue1` `oldVirtualValue2` `newVirtualValue2` | `{"message":…}` | Rust 两次顺序重绑定，非原子（`:574-599`） |
| 13 | 简化存储（v2） | `id` | `{"row": …}` | 与 type 1 共用实现（`:388`） |
| 14 | 列出 Pro 复合键子键 | `id` | `{"keys": […]}` | Rust 现代 schema 下恒为 `null`（`:600-610`） |
| 15 | 删除配置段 | `id` `subtype` | `{"status":"success"}` | 同实现（`:612-621`） |
| 16 | 消息 ID 缓存分配（echo） | `id` | `{"row": …}` | 同实现（`:622-630`） |
| 17 | 消息 ID 缓存反查 | `id` | `{"id": "GroupID MessageID"}`；查不到 404 | 同实现（`:631-643`） |
| 18 | **强制解绑**：删除某 OpenID 的全部映射（迁移期双写脏数据清理） | `id`（OpenID） | `{"status":"success","unbound_count":n}` | 同实现；两侧均无 404，任何错误回 500（Go `:351-364`；Rust `:644-663`） |
| 19 | **全量导出**身份映射快照（迁移调试/数据核查） | 无 | `{"mappings":[…],"count":n,"timestamp":…}` | 同实现；空库 Go 回 `null`、Rust 回 `[]`（Go `:365-373`；Rust `:665-692`） |

**关于 `/getrealvalues`**：这是 lotus **远程调用客户端**侧的独立路径（不是 `/getid` 的某个 type）。Go 的 idmap 远程桥在 type=11 请求时拼接 `{scheme}://{server_dir}:{port}/getrealvalues?type=11&id=…&subid=…`（`idmap/service.go:1956`）；Rust 远程桥逐条对齐同一行为（`crates/gensokyo-storage/src/idmap/http_remote.rs:8-10,366-373`，共 17 个 v2 函数的 HTTP 分支）。注意：**两个仓的对外路由表都未注册 `/getrealvalues` 的服务端**（Go 全仓检索仅 `service.go:1956` 一处拼 URL 的引用；Rust 侧同为客户端），对端若按此路径请求将得到 404——此为两侧一致的存量缺陷，Rust 桥注释已注明「修复另立任务」（`http_remote.rs:12-14`）。

## 端口与配置

| 配置项 | Go 默认值 | Rust 默认值 | 语义 | 适用版本 |
|--------|-----------|-------------|------|----------|
| `port` | `"15630"`（`template/config_template.go:57`） | `"15630"`（`crates/gensokyo-config/templates/config.yml:54`） | 主 listener 端口：idmaps / 图床 / 上传 / `/getid` / WebUI / 正向 WS 对外端口；`lotus=true` 时被 `backup_port` 替代 | 两侧 |
| `backup_port` | `"5200"`（`template/config_template.go:58`） | `"5200"`（`crates/gensokyo-config/templates/config.yml:55`） | **主 listener 语义两侧一致**：`lotus=true` 时主 listener 用它替代 `port`（Go `main.go:489-494`；Rust `boot.rs:1264-1273`、`tests/lotus.rs:82-99`）。Go 侧它**还**参与 `ComposeWebUIURL` 系对外 URL 组装（`config/config.go:1223-1265`，图床/idmap/WebUI 对外地址口径）；Rust 模板注释额外标明仅 `enable_ws_server=true` 时生效，`false` 时主路由落 `http_address`（`config.yml:55`） | 两侧（Go 多一层 URL 组装用途） |
| `http_address` | `""`，空则不启正向 HTTP API listener（`template/config_template.go:233-234`） | 同字段同用途（`crates/gensokyo-config/templates/config.yml:232`） | 正向 HTTP API 监听地址（如 `0.0.0.0:5700`） | 两侧 |
| `http_access_token` | `""`（`template/config_template.go:235`） | 鉴权口径同 Go（`http_api.rs:11-12`） | `http_access_token` 上传/删除/探活与正向 HTTP API 共用令牌，见上文鉴权口径 | 两侧 |
| `lotus_password` | `""`（`template/config_template.go:60`） | 同字段（`upload_http.rs:737-746` 读取） | `/getid` 与短链的 HMAC 签名密钥 | 两侧 |
| `ws_server_path` | `"ws"` 等（`template` 正向 WS 段；Go `main.go:556-562`） | 同字段（`crates/gensokyo-config/templates/config.yml:83`） | 正向 WS 挂载路径（`nil` 特殊值监听根路径） | 两侧 |

## 相关页面

- [API 介绍](./api介绍.md) —— OneBot action 与「适用版本」列说明
- [get_avatar](./扩展api/扩展api-get_avatar.md) —— `/get_avatar` 专用路由对应的 action
- [素材管理](./扩展api/扩展api-media_images.md) —— 与 `/uploadpic*` 外链上传相对的官方素材链（Rust 重构版才有 action 入口）
