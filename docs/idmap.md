# idmap 数据库

## 目标

新的 idmap 设计把「外部身份」和「下游看到的 ID」分开：

- QQ 平台的 OpenID、可反查到的 rUIN，以及其他外部平台 ID 都是外部身份。
- Gensokyo 内部维护稳定的 vUIN，默认下游 OneBot 字段仍使用 vUIN。
- 多个 OpenID 可以绑定到同一个 vUIN，多个 rUIN 也可以绑定到同一个 vUIN。
- 反查不再返回某个 vUIN 的全部身份，只按当前消息上下文或最近一次上下文选择本次要使用的身份。

这解决了旧版 `idmap.db` 的核心缺陷：旧库是 `OpenID -> 数字 ID` 与 `row-数字 ID -> OpenID` 的单值双向表，无法表达「同一个真实用户在多个 AppID / 多个平台下的多个身份」。

## 数据库文件（v2 变体：`openid-map.db` / `msgid-map.db`）

> **本节描述的是 `-tags map_idmap` 的 v2 变体**（构建标签见 `idmap/map_service.go:1`，库名常量见 `:23-24`）。默认构建不使用这些文件，实际运行形态见下方「默认链」小节。

| 文件 | 桶 | 用途 |
|------|-----|------|
| `openid-map.db` | `meta` | schema version、迁移标记、vUIN 计数器 |
| `openid-map.db` | `identity_to_vuin` | 外部身份 -> vUIN |
| `openid-map.db` | `vuin_to_identity` | vUIN -> 外部身份集合 |
| `openid-map.db` | `last_seen` | vUIN 在不同场景下最近一次使用的外部身份 |
| `openid-map.db` | `config` | 运行时配置 |
| `openid-map.db` | `UserInfo` | 用户信息缓存 |
| `msgid-map.db` | `msg_to_virtual` | 真实 message_id -> 虚拟 message_id |
| `msgid-map.db` | `virtual_to_msg` | 虚拟 message_id -> 真实 message_id |
| `msgid-map.db` | `expires_at` | message_id 过期时间 |
| `idmap.db`（旧） | `ids`/`config`/`UserInfo`/`cache` | 旧版单库，只作为一次性迁移源 |

> `idmap_pro` 在新结构中不再有意义：MultiMap 身份图已经原生支持「多个真实身份绑定到同一个 vUIN」。配置项会被移除，旧的 Pro API 仅作为兼容 wrapper 保留。

> **实际运行**：当前使用的数据库文件为 `idmap-identity.db`（桶: `ids`/`config`/`UserInfo`）和 `idmap-msg.db`（桶: `cache`）。上表描述的 `openid-map.db` / `msgid-map.db` 多桶架构是 v2 重构方案，可通过 `go build -tags map_idmap` 启用。两者的对外行为完全一致。

### 默认链（当前运行形态）

默认构建（无 `map_idmap` 标签）由 `idmap/new_service.go` 提供，恒为双库：

| 文件 | 桶 | 用途 |
|------|-----|------|
| `idmap-identity.db` | `ids` | 正向 `uin:<OpenID>` ↔ 虚拟 ID、逆向 `uin:row-<N>` ↔ OpenID |
| `idmap-identity.db` | `config` / `UserInfo` | 运行时配置 / 用户名缓存 |
| `idmap-msg.db` | `cache` | 真实 message_id ↔ 虚拟 message_id |

- 库名与桶名常量：`idmap/new_service.go:25-29`（`IdentityDBName = "idmap-identity.db"`、`MsgDBName = "idmap-msg.db"`、`IdentityBucketName = "ids"`、`MsgBucketName = "cache"`）。
- 身份键只有 `uin:<OpenID>`（正向）与 `uin:row-<N>`（逆向）两种，没有 `openid:QQ:` 这类带平台类型的前缀；迁移去重同样按这两个前缀判断（`idmap/new_service.go:530-542`）。
- 旧库 `idmap.db` 的库名与桶名常量见 `idmap/service.go:145-150`。

## 身份键格式（v2 变体）

> **仅 `-tags map_idmap` 的 v2 变体**：默认链不写 `openid:QQ:` / `ruin:` 规范化键，也不做 Base32 编解码（`decodeBase32ID` 只定义在 v2 文件 `idmap/map_service.go:594-595`），只维护 `uin:<OpenID>` / `uin:row-<N>`（见上一节）。

所有写入数据库的身份都必须带类型，不能只靠长度猜测：

| 类型 | 规范化键 |
|------|----------|
| QQ OpenID | `openid:QQ:<appid>:<openid>` |
| QQ rUIN | `ruin:QQ:<index>:<qq>` |
| OAuth/GitHub rUIN | `ruin:OAuth_Github:<index>:<id>` |
| 旧版或未分类原始值 | `raw:<value>` |

QQ OpenID 的身份键只包含 `QQ`、`AppID` 和 OpenID 本体，不再按群聊、私聊或群成员事件拆分。QQ 平台下同一个 QQ 号在同一个 AppID 内应复用同一个 OpenID，因此群聊、C2C、好友事件、群成员事件都会落到同一个 vUIN。

对外传递 rUIN 时使用（**仅 `-tags map_idmap` 的 v2 变体**）：

```text
rUIN-<PLATFORM_NAME>-<ID_CNT>-<ID>
```

- `PLATFORM_NAME` 示例：`QQ`、`OAuth_Github`
- `ID_CNT` 从 `0` 开始递增
- `ID` 对下游输出时使用 Base32；接收客户端输入时允许 raw 或 Base32
- `rUIN-QQ-0-2870338968` 与 `rUIN-QQ-0-GI4DOMBTGM4DSNRY` 等价

## 下游 ID 来源

默认配置继续向下游发送内部 vUIN：

```yaml
op_userid_type: vuin
```

可选值：

| 值 | 含义 |
|----|------|
| `vuin` | 默认值，`user_id`/`group_id` 使用内部 vUIN |
| `raw` | 发送当前消息的原始平台 ID |
| `ruin` | 优先发送当前上下文中的 rUIN；没有 rUIN 时回退 vUIN |

接收客户端操作时：

- vUIN 和 OpenID 都是默认行为，不需要额外前缀。
- rUIN 使用 `rUIN-<PLATFORM>-<index>-<id>`。
- 当客户端传入纯数字时，默认按 vUIN 处理；如需阻止推测，使用 `op_userid_type` 指定策略。

## 写入路径（v2 变体：`identity_to_vuin` / `vuin_to_identity` / `last_seen`）

> 下面的多身份图仅 v2 变体实现。默认链只有单值正/逆映射（`uin:<OpenID>` ↔ `uin:row-<N>`），一个 OpenID 对应一个虚拟 ID。

收到腾讯侧事件时：

1. 将 OpenID 规范化为 `openid:QQ:<appid>:<openid>`。
2. 如果事件或历史信息能提供 rUIN，则规范化为 `ruin:QQ:<index>:<qq>`。
3. 查询 `identity_to_vuin`：
   - 任一身份已存在，复用对应 vUIN。
   - 都不存在，分配新的 vUIN。
4. 将本次消息实际出现的身份写入 `vuin_to_identity`。
5. 写入 `last_seen`，记录当前消息上下文用于后续反查。

绑定操作不再移动 row，也不覆盖旧反向键，而是把一个身份追加到目标 vUIN：

```text
BindIdentityToVuin(openid:QQ:<appid>:<openid>, 10001)
BindIdentityToVuin(ruin:QQ:0:2870338968, 10001)
```

## 反查路径（v2 变体：`last_seen` 上下文选择）

> 本节的多身份择优逻辑仅 v2 变体实现；默认链的反查就是查询 `uin:row-<N>` 取回 OpenID。

当下游用 vUIN 发起操作时：

1. 优先使用请求中携带的显式 OpenID 或 rUIN。
2. 其次读取当前消息上下文中的 `last_seen`。
3. 再从 `vuin_to_identity` 中选择一个可用于目标 API 的身份。

如果一个 vUIN 下有多个 OpenID/rUIN，反查只附加本次发送需要的身份，不全量附加所有身份。

## 旧库迁移

启动时如果检测到旧版单库 `idmap.db`，会阻塞执行一次性转换到默认链（`idmap-identity.db` + `idmap-msg.db`）：

1. `main.go:371` 调用 `idmap.StartMigration()`，`initNewDBs()` 先打开 `idmap-identity.db` / `idmap-msg.db`（`idmap/new_service.go:96-97`）。
2. 检测到旧库后先做阻塞的 `syncMigrationCounters()`：把旧 `ids` / `cache` 桶的 `currentRow` 计数器复制到新库，避免分配的虚拟 ID 与迁移条目撞号（`idmap/new_service.go:104`、`:111-122`）。
3. 随后调用 `backgroundMigration()`——函数名带 background，但自 2026-08 起已是阻塞调用，迁移完成才返回（`idmap/new_service.go:105-107`）。
4. 读取旧 `ids` 桶，保留既有 `OpenID/raw -> vUIN` 关系；读取旧 `row-<vUIN>` 反向键，补齐缺失的身份关系；按 `uin:` 前缀去重（`idmap/new_service.go:530-542`）。
5. 复制 `config` 与 `UserInfo`；不全量迁移旧 `cache` 桶，仅同步 message_id 计数器以避免虚拟 message_id 撞号。
6. 迁移完成后热路径只访问新库，不再惰性复制旧库内容。旧 `idmap.db` 不会被自动删除，确认稳定后可手动备份或删除。

> `openid-map.db/meta` 里的 schema version 与迁移完成标记只属于 **v2 变体**；默认链不写 meta 桶。

> **2026-08-01 修复：** `StartMigration` 已改为**阻塞式迁移**（此前为 `go backgroundMigration()` 非阻塞）。迁移完成才返回，确保 `main.go` 调用点之后才连 WS / 启动 HTTP，避免迁移期间 `storeIdentity` 双写与 `backgroundMigration` 迁入并发产生 2 row → 1 OpenID 重复映射。同时 `writeBatchToNewDB` 追加按 value 委重（逆向条目 `uin:row-*` 迁入前查正向 `uin:<OpenID>` 是否已存在，若已有则跳过）。

## /getid 端点（type 1–19）

`/getid` 是 idmap 的 HTTP 调试/跨进程入口（`server/getIDHandler.go:104`），仅注册在 `r` 路由上：

```go
r.GET("/getid", server.IDMapAuthMiddleware(), server.GetIDHandler)
```

> 启用 gRPC（`lotus_grpc=true`）时**不注册** HTTP 路由，`/getid` 由 gRPC `IDMapService` 取代（`main.go:507-509`）。

| type | 必需参数 | Go 侧调用 | 返回 |
|------|----------|-----------|------|
| 1 | `id` | `StoreID` | `{"row":n}`（真实 ID → 虚拟 ID） |
| 2 | `id` | `RetrieveRowByID` | `{"id":"..."}`；未命中 404 |
| 3 | `id`(section)、`subtype`、`value` | `WriteConfig` | `{"status":"success"}` |
| 4 | `id`(section)、`subtype` | `ReadConfig` | `{"value":"..."}` |
| 5 | `oldRowValue`、`newRowValue` | `UpdateVirtualValue` | `{"status":"success"}`；`newRowValue=0` 即解绑 |
| 6 | `virtualValue` | `RetrieveRealValue` | `{"virtual":n,"real":"..."}` |
| 7 | `id`（真实 ID） | `RetrieveVirtualValue` | `{"virtual":n}` |
| 8 | `id`、`subid` | `StoreIDv2Pro` | `{"row":n,"subRow":n}` |
| 9 | `id`、`subid` | `RetrieveRowByIDv2Pro` | `{"id":"...","subid":"..."}` |
| 10 | `id`、`subid` | `RetrieveVirtualValuev2Pro` | `{"firstValue":n,"secondValue":n}` |
| 11 | `id`、`subid` | `RetrieveRealValuesv2Pro` | `{"firstRealValue":"...","secondRealValue":"..."}` |
| 12 | `oldVirtualValue1`、`newVirtualValue1`、`oldVirtualValue2`、`newVirtualValue2` | `UpdateVirtualValuev2Pro` | `{"message":"Virtual values updated successfully"}` |
| 13 | `id` | `SimplifiedStoreIDv2` | `{"row":n}`（lotus 远程路径使用） |
| 14 | `id` | `FindSubKeysByIdPro` | `{"keys":[...]}` |
| 15 | `id`(section)、`subtype` | `DeleteConfigv2` | `{"status":"success"}` |
| 16 | `id`（真实 message_id） | `StoreCachev2` | `{"row":n}`（虚拟 message_id） |
| 17 | `id`（虚拟 message_id） | `RetrieveRowByCachev2` | `{"id":"<GroupID> <MessageID>"}`；未命中 404 |
| 18 | `id`（OpenID 或虚拟 ID） | `ForceUnbindID` | `{"status":"success","unbound_count":N}` |
| 19 | 无 | `ListAllIdentities` | 全量身份快照 JSON（`mappings` / `count` / `timestamp`） |

`type` 1–7、13–17 是单值接口，8–12 是带 `subid` 的多子键接口（`*Pro`），18/19 是维护接口。

**认证**：`IDMapAuthMiddleware` 统一保护（`server/getIDHandler.go:22-102`）：

- 配置了 `lotus_password`：必须带 `token`（或 `X-Token` 头）+ `timestamp`，签名算法为 `HMAC-SHA256(password, path + "?" + 键排序后的 query + "&timestamp=" + ts)`，时间窗口 ±5 分钟防重放。
- 未配置密码：仅允许 `127.0.0.1` / `::1` / `localhost` 访问，其余返回 403。

## lotus / gRPC 角色与方向

`lotus` 与 `lotus_grpc` 是两个独立开关，组合决定本进程是客户端还是服务端：

| 配置组合 | 本进程角色 | 行为 |
|----------|-----------|------|
| `lotus=true` + `lotus_grpc=true` | **gRPC 客户端**（子进程） | 连 `server_dir`:`lotus_grpc_port` 的父进程，所有 idmap 调用走 gRPC（`main_grpc.go:24-35`） |
| `lotus=false` + `lotus_grpc=true` | **gRPC 服务端**（主进程） | 在 `:<lotus_grpc_port>` 监听并注册 `IDMapService`，本进程不再注册 HTTP `/getid`（`main_grpc.go:36-50`、`main.go:507-509`） |
| `lotus=true` + `lotus_grpc=false` | HTTP 客户端（子进程） | 请求 `http(s)://<server_dir>:<port>/getid?type=...`，如 type=13（`idmap/service.go:577-590`） |
| `lotus=false` + `lotus_grpc=false` | 主进程（本地库） | 注册 `/getid`，直接读写本地 `idmap-identity.db` / `idmap-msg.db` |

要点：

- `server_dir` 是**远端主机的地址**，被直接拼进 URL / gRPC 目标，不是数据目录（`structs/structs.go:41`、`idmap/service.go:579-589`）。
- `lotus=true` 时本进程自己的 listener 端口换成 `backup_port`：`main.go:490-494` 实测 `serverPort = conf.Settings.BackupPort`；父进程仍用 `port`，子进程拼远端 URL 也用 `config.GetPortValue()`（即 `Settings.Port`，`config/config.go:1088-1096`）。两侧对 `port` / `backup_port` 的语义一致。
- 走远程分支的前置条件是 `GrpcClient != nil && config.GetLotusGrpc() && config.GetLotusValue()`（`idmap/service.go:569`）。
- `lotus=true` 且 `lotus_without_idmaps=true` 时不走远程 idmap 调用，直接在本地处理（`idmap/service.go:577` 的 `!config.GetLotusWithoutIdmaps()` 判定）。

## 强制解绑工具

迁移异常或历史数据残留导致 2 个虚拟 ID 指向同一 OpenID 时，可用强制解绑工具按 OpenID 直接清理全部映射：

| 工具 | 调用方式 | 行为 |
|------|---------|------|
| `ForceUnbindID(id)` | Go 内部 | 入参支持**OpenID 字符串**或**虚拟 ID**两种形式。OpenID 时直接删正向 `uin:<OpenID>` + 扫删所有指向同一 OpenID 的逆向条目 `uin:row-*`（新库+旧库）；虚拟 ID 时先通过逆向条目 `uin:row-<N>` 反查 OpenID（新库+旧库回退），再按 OpenID 清理。返回清理条数 |
| `getid type=18` | HTTP API | `GET /getid?type=18&id=<OpenID或虚拟ID>`，返回 `{"status":"success","unbound_count":N}` |
| `UpdateVirtualValue(old, 0)` | `getid type=5` | `newRowValue=0` 解绑时已同步彻底清理：删正向 + 扫删所有指向同一 OpenID 的重复逆向条目（2026-08-01 修复，此前只删单条逆向不删正向，导致解绑失效） |

解绑后该 OpenID 彻底无映射，下次 `storeIdentity` 会重新分配唯一虚拟 ID。

> **2026-08-01 修复：** `ForceUnbindID` 原仅接受 OpenID 入参，但用户实际常传虚拟 ID（row 值），导致查正向 `uin:<虚拟ID>` 找不到直接返回，`unboundCount=0`（表现为 `getid type=18` 返回 false）。现已支持双形式入参：纯数字视为虚拟 ID，先反查 OpenID 再清理；非纯数字视为 OpenID 直接清理。同时去掉“正向条目存在检查”的提前返回，即便正向已被其他路径删除，也要扫删残留逆向条目，确保彻底清理。

## 批量导出接口

迁移调试或数据核查时，可一次性导出所有身份映射：

| 工具 | 调用方式 | 行为 |
|------|---------|------|
| `ListAllIdentities()` | Go 内部 | 返回 `*IdentitySnapshot`，包含所有 OpenID <-> 虚拟 ID 映射及用户名缓存 |
| `getid type=19` | HTTP API | `GET /getid?type=19`，返回所有身份映射的 JSON 快照 |

**调用示例：**

```bash
# 本地访问（无 lotus_password 时）
curl http://127.0.0.1:15630/getid?type=19

# 带认证（有 lotus_password 时，需计算 HMAC 签名）
curl "http://<server>:<port>/getid?type=19&timestamp=<ts>&token=<hmac>"
```

**响应示例：**

```json
{
  "mappings": [
    {"real_id": "ABC123DEF456...", "virtual_id": 10001, "username": "张三"},
    {"real_id": "789GHI012JKL...", "virtual_id": 10002, "username": "李四"},
    {"real_id": "MNO345PQR678...", "virtual_id": 10003, "username": ""}
  ],
  "count": 3,
  "timestamp": 1723190400
}
```

**字段说明：**
- `real_id`：QQ 官方 OpenID（已去除内部 UIN 前缀）
- `virtual_id`：Gensokyo 分配的虚拟数字 ID（下游 OneBot 使用）
- `username`：用户名缓存（入站时自动缓存，10 分钟 TTL，可能为空）
- `count`：映射总数
- `timestamp`：快照生成时间（Unix 时间戳，秒）

**快照机制：**
- 接口使用 bbolt MVCC 事务，在请求到达时生成一致性快照
- 即使遍历期间有其他消息触发新的映射写入，也不影响本次导出结果
- `timestamp` 字段可用于判断数据新鲜度

**注意事项：**
- type=19 不走 lotus/gRPC 远程调用，始终查询本地 identityDB
- 受 `IDMapAuthMiddleware` 保护：有 `lotus_password` 时需 HMAC 认证，无密码时仅允许本地访问
- 数据量较大时响应可能较慢，建议仅在调试时使用

## msgid-map（v2 变体）

> 本节的多桶结构（`msg_to_virtual` / `virtual_to_msg` / `expires_at`）属于 **v2 变体**；默认链用 `idmap-msg.db` 的 `cache` 桶做同样的「真实 ↔ 虚拟 message_id」映射，TTL 语义一致。

`msgid-map.db` 专门保存 message_id 映射，默认 TTL 为 1 小时：

```yaml
msgid_ttl_seconds: 3600
```

每次写入：

- `msg_to_virtual[real_message_id] = virtual_message_id`
- `virtual_to_msg[virtual_message_id] = real_message_id`
- `expires_at[virtual_message_id] = now + ttl`

后台清理每分钟扫描 `expires_at`，删除过期的三条记录。旧库 `cache` 不再全量迁移，避免把大量历史临时数据搬进新库。

## 运行日志

新 idmap 热路径默认输出状态日志，便于把平台原始事件和内部映射结果对齐：

> 下列 `identity create/hit` / `bind moved/skipped/failed` / `msg_id create/hit/lookup` 三组日志由 **v2 变体**输出；默认链输出同前缀的迁移进度日志（`idmap/new_service.go`）。

- `[idmap] identity create/hit`：OpenID/rUIN/raw 身份新建或命中，并显示对应 vUIN。
- `[idmap] bind moved/skipped/failed`：手动或自动绑定时移动身份集合的结果。
- `[idmap] msg_id create/hit/lookup`：真实 message_id 与虚拟 message_id 的写入、刷新 TTL、反查结果。
- `[message] group/c2c/friend/group_member ... mapped`：Processor 层事件最终映射出的 vUIN 与虚拟 message_id。

## 兼容性

保留旧公开函数名，内部路由到新结构：

| 旧函数 | 新行为 |
|--------|--------|
| `StoreIDv2(id)` | 规范化身份并返回 vUIN |
| `RetrieveRowByIDv2(vuin)` | 按上下文解析 vUIN 对应的当前可用外部身份 |
| `UpdateVirtualValuev2(old, new)` | 将 old 对应身份绑定到 new vUIN |
| `StoreCachev2(id)` | 写入当前消息库（默认 `idmap-msg.db`，v2 变体为 `msgid-map.db`），默认 1 小时 TTL |
| `RetrieveRowByCachev2(id)` | 从当前消息库读取真实 message_id |
| `StoreIDv2Pro` / `RetrieveRowByIDv2Pro` | 兼容 wrapper，不再依赖 `idmap_pro` 配置 |

## 故障恢复

| 故障 | 影响 | 恢复 |
|------|------|------|
| `idmap-identity.db` 损坏且旧 `idmap.db` 仍在 | 身份映射暂不可用 | 停止程序，删除 `idmap-identity.db` 后重启重新迁移 |
| `idmap-identity.db` 损坏且旧库已删除 | 身份映射丢失 | 从备份恢复 |
| `idmap-msg.db` 损坏 | message_id 回执可能丢失 | 停止程序，删除 `idmap-msg.db` 后重启 |
| `openid-map.db` / `msgid-map.db`（v2 变体）损坏 | 同默认链对应文件 | 停止程序，删除对应文件后重启 |
| 迁移校验失败 | 新库不写迁移完成标记 | 保留旧库，修复后重启重新迁移 |

建议定期备份 `idmap-identity.db`（v2 变体为 `openid-map.db`）。`idmap-msg.db` / `msgid-map.db` 是临时缓存，不需要长期备份。
