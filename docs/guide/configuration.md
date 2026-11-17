# 配置指南

Gensokyo 首次运行时会在工作目录生成 `config.yml`。配置文件包含机器人凭证、事件订阅、OneBot 连接方式、HTTP 服务、图片上传和 WebUI 等设置。

> [!CAUTION]
> `token`、`client_secret`、WebSocket Token、HTTP Access Token、对象存储密钥和第三方 Cookie 都属于敏感信息。不要把真实值提交到 Git、截图或公开日志中。

## 最小配置示例

下面的示例仅保留启动和连接所需的核心字段。字段是否可用以及默认值可能随版本变化，应以当前版本自动生成的 `config.yml` 为准。

```yaml
version: 1
settings:
  # QQ 开放平台机器人凭证
  app_id: 123456789
  token: "your_app_token"
  client_secret: "your_client_secret"

  # 订阅的事件类型
  text_intent:
    - "ATMessageEventHandler"
    - "GroupATMessageEventHandler"
    - "GroupMessageEventHandler"
    - "C2CMessageEventHandler"

  # 反向 WebSocket：Gensokyo 主动连接下游框架
  ws_address:
    - "ws://127.0.0.1:8080/onebot/v11/ws"
  ws_token:
    - "your_ws_token"

  # 正向 WebSocket：下游框架主动连接 Gensokyo
  enable_ws_server: true
  ws_server_path: "ws"
  ws_server_token: "change_me"

  # Gensokyo HTTP / WebUI 服务端口
  port: "15630"
  disable_webui: false
  server_user_name: "admin"
  server_user_password: "change_me_now"
```

## 机器人凭证

| 字段 | 作用 |
|---|---|
| `app_id` | QQ 开放平台应用 ID |
| `token` | 应用令牌 |
| `client_secret` | 应用密钥 |
| `uin` | 可选的机器人 QQ 号配置 |
| `use_uin` | 是否在部分场景使用 QQ 号作为 Bot ID |

凭证填写错误、包含多余空格或与当前应用不匹配时，官方连接通常无法建立。修改凭证后应完整重启进程。

## Intent 与事件订阅

`text_intent` 决定 Gensokyo 注册和处理哪些事件。常见事件包括：

| Intent | 说明 |
|---|---|
| `GroupATMessageEventHandler` | QQ 群中的 @ 消息 |
| `GroupMessageEventHandler` | QQ 群普通消息 |
| `C2CMessageEventHandler` | C2C 私聊消息 |
| `GroupMemberAddEventHandler` | 群成员新增事件 |
| `GroupMemberRemoveEventHandler` | 群成员移除事件 |

仅在 QQ 开放平台已经授予相应权限时启用 Intent。事件没有上报时，先核对开放平台权限与审核状态，再检查 `text_intent` 和运行日志。

## 选择连接方式

### 反向 WebSocket

Gensokyo 根据 `ws_address` 主动连接 NoneBot2、Koishi 等下游客户端。适合下游客户端已经开放 OneBot 反向 WS 地址的部署方式。

多个地址按数组填写，`ws_token` 与地址按顺序对应：

```yaml
ws_address:
  - "ws://127.0.0.1:8080/onebot/v11/ws"
  - "ws://127.0.0.1:6700/onebot/v11/ws"
ws_token:
  - "token_for_first_client"
  - "token_for_second_client"
```

### 正向 WebSocket

开启 `enable_ws_server` 后，下游客户端主动连接 Gensokyo。连接路径由 `ws_server_path` 决定，并建议始终设置 `ws_server_token`。

上游较新的 `main` 已增加浏览器 WebSocket Origin 校验。无 `Origin` 的非浏览器客户端可继续连接；浏览器来源需要满足本地回环地址或配置域名等校验条件。

### HTTP API 与反向 HTTP POST

需要 HTTP 调用时，可配置 `http_address` 与 `http_access_token`；需要把事件推送到 HTTP 服务时，可使用 `post_url` 与 `post_secret`。不要在公网暴露无鉴权的 HTTP API。

较新的上游提交还为 `/metrics`、`/healthz`、`/readyz` 和 `/updateport` 等端点补充了 Access Token 校验。固定版本部署时，应确认所用二进制是否已经包含对应修复。

## 图片上传与 image_hosting

Release008 新增统一的 `imagehosting` 实现，并把 `oss_type` 扩展到 4 至 10。当前配置模板中，各后端配置块直接位于 `settings` 下，而不是再额外嵌套一层 `image_hosting:`。

| `oss_type` | 后端 | 主要字段 |
|---:|---|---|
| 0 | 本机上传 | `server_dir`、`port` 等 |
| 1 | 旧腾讯云 COS | `t_COS_*` |
| 2 | 百度云 BOS | `b_BCE_AK`、`b_BCE_SK` 等 |
| 3 | 阿里云 OSS | `a_OSS_*` |
| 4 | 腾讯云 COS 自签 | `cos.*` |
| 5 | Bilibili | `bilibili.*` |
| 6 | QQ 频道 | `qq_channel.*` |
| 7 | ChatGLM | `chatglm` 空配置块 |
| 8 | Ukaka | `ukaka` 空配置块 |
| 9 | 星野 | `xingye` 空配置块 |
| 10 | Nature | `nature` 空配置块 |

腾讯云 COS 自签示例：

```yaml
settings:
  oss_type: 4
  cos:
    secret_id: "your_secret_id"
    secret_key: "your_secret_key"
    region: "ap-guangzhou"
    bucket: "your-bucket"
    domain: ""
```

Bilibili 与 QQ 频道示例：

```yaml
settings:
  oss_type: 5
  bilibili:
    csrf_token: "your_bili_jct"
    sessdata: "your_sessdata"
    bucket: "openplatform"

  qq_channel:
    channel_id: "your_channel_id"
    token: "QQBot your_token"
```

`oss_type` 同一时间只应选择一个。第三方免费上传后端可能随服务策略变化，生产环境优先使用自己可控的对象存储。Cookie、SecretKey 和授权 Token 不应出现在仓库、前端页面或公开日志中。

## 出站 URL 转换与二维码

出站文本里的链接由 `handlers/message_parser.go` 的 `transformMessageTextUrl()`（`:1749-1793`）统一处理：`transfer_url` 开启时用 xurls 扫描 URL，再按配置改写或剥离。

| 字段 | 模板默认 | 作用 |
|---|---|---|
| `transfer_url` | `true` | 是否处理出站 URL；关闭后按原文自理发送 |
| `visible_ip` | `false` | `server_dir` 是 IP 时，是否以 IP 形式发出 URL |
| `url_to_qrimage` | `false` | 把 URL 转成二维码图片单独发出，需同时 `transfer_url: true` 且 `visible_ip: true` |
| `qr_size` | `200` | 二维码尺寸，单位像素（`handlers/qrcode_real.go:19` 读取） |

> [!CAUTION]
> **升级须知（`transfer_url` 模板默认开启）**
>
> - 沿用自动生成的新版模板升级后，机器人发出的每一条 URL **都会被改写**，不再是原文。
> - 当 `server_dir` 填的是 **IP** 且 `visible_ip: false`（即模板默认组合）时，出站文本里的 URL 会被**整段替换为空字符串**（`message_parser.go:1760-1761`）——链接直接从消息里消失。三种解法：把 `server_dir` 换成自己的域名、显式设 `visible_ip: true`、或显式设 `transfer_url: false`。
> - 非 lotus 模式下改写结果是本机短链 `GetBaseURL() + "/url/" + {code}`（`message_parser.go:1786-1788`），配合 302 跳转。这类域名的 `/url` 与 `/image` 路径**必须先在 QQ 开放平台后台报备并通过校验**（配好 `crt` / `key`），否则消息里的链接会被官方拦截。
> - 不想让机器人动 URL：显式写 `transfer_url: false`（只关闭 URL 改写，图片 / 语音等媒体链不受影响）。
> - `transfer_url` / `visible_ip` / `url_to_qrimage` / `qr_size` 都不在「不支持热重载」清单（`config/config.go:38-48`）中，改完下一个出站请求即生效。

## 分层架构开关 `arch_mode`

结构体字段 `ArchMode`（`structs/structs.go:150-151`，YAML 标签 `arch_mode`），配置模板默认 `new`（`template/config_template.go:183`）。它决定生产主链走新分层实现还是旧链路：

| 取值 | 语义 |
|---|---|
| `new`（默认） | 走 `internal/` + `adapter/` 分层新链 |
| `shadow` | 新旧链并行，差异仅日志上报，行为仍走 legacy |
| `legacy` | 全走旧链，行为零变化，**一键回退** |

- 访问器 `config.GetArchMode()`（`config/config.go:2870`）**逐请求读取**，热重载即时生效；不在重启字段清单中。
- 取值大小写敏感，只接受 `legacy|shadow|new`；空值按默认处理，非法值 warn 一次后回退 `new`（`config/config.go:2881-2884`，警告文案含「已回退 new」）。
- 六个接缝及其桥文件：出站 `handlers/outbound_bridge.go`、入站 `Processor/inbound_bridge.go`、action `callapi/dispatch_bridge.go`、state `handlers/state_bridge.go`、config `internal/infrastructure/config/bootstrap.go`、media `handlers/media_bridge.go`。任一接缝的新链未注入或失败时自动落回 legacy。
- 这个开关**与 Rust 重构无关**：它是 Go 主链内部在 legacy 目录与分层实现之间的切换；Rust 版是另一个独立可执行程序，见 [Rust 重构概览](/rust/overview)。

## Lotus 多进程模式

`lotus` 让一个实例复用另一个「主节点」的图床与 idmap 服务，适合同一机器人在多台服务器运行、或内网需要发 base64 图片的场景（`template/config_template.go:59-64`）：

| 字段 | 默认 | 作用 |
|---|---|---|
| `lotus` | `false` | 为 `true` 时连接另一个 `lotus: false` 的 Gensokyo，使用它的图床与 idmaps 服务 |
| `lotus_password` | `""` | 访问主节点的鉴权密码，两侧必须一致 |
| `lotus_without_idmaps` | `false` | 只走 URL / 图片上传 / 语音，ID 转换仍由本地维护 |
| `lotus_without_uploadpic` | `false` | 只转换 ID，不做图片上传 |
| `lotus_grpc` | `false` | 实验特性：用 gRPC 连接主节点以提高性能 |
| `lotus_grpc_port` | `50051` | gRPC 端口，连接方与被连接方需一致并放通防火墙 |
| `server_dir` | `<YOUR_SERVER_DIR>` | 主节点地址（不带 http 头的域名或 IP；提供图床服务需带端口） |
| `port` | `"15630"` | idmaps 与图床对外开放的端口；连接另一个 Gensokyo 时也是链接端口 |
| `backup_port` | `"5200"` | `lotus: true` 时本机 HTTP 服务改用它（`main.go:489-493`），WebUI 需按该端口访问 |

- 需要发 base64 图片时，`server_dir` 必须是公网可达地址并开放对应 `port`。
- `lotus: true` 且 `transfer_url: true` 时，出站 URL 走主节点侧的短链生成逻辑（`message_parser.go:1779-1783`）。
- 需重启的字段：`lotus`、`lotus_password`、`lotus_without_idmaps`、`server_dir`、`port`、`backup_port` 都在「不支持热重载」清单里（`config/config.go:38-48`），改完需完整重启；`lotus_without_uploadpic`、`lotus_grpc`、`lotus_grpc_port` 不在该清单中。

## 自定义数据库位置 `custom_db_enabled` / `custom_db_path`

默认情况下，idmap 族数据库以**相对工作目录的文件名**打开。开启本功能后，启动时会把它们迁到用户指定的目录，并从该目录打开——适用于把数据放在独立数据盘、NAS 挂载目录或面板（宝塔等）托管的网络存储上。

> [!IMPORTANT] 第一阶段只覆盖 idmap 族
> 注册表固定为五个文件（`dblocation/dblocation.go:26-32`）：`idmap.db`、`idmap-identity.db`、`idmap-msg.db`、`openid-map.db`、`msgid-map.db`。其中后两者来自 `map_idmap` 构建（默认不参与编译），磁盘上可能存在历史文件，因此**只进迁移清单，不参与默认构建的运行时打开**。`botstats.db`、`cookie.db`、`gensokyo.db` 等后续在注册表追加一行即可接入；接入前即使开关打开，也**不迁移、不搬迁**，行为完全不变。

| 字段 | 模板默认 | 作用 |
|---|---|---|
| `custom_db_enabled` | `false` | 是否启用自定义数据库位置；**改后需重启** |
| `custom_db_path` | `""` | 数据库目录；开启后为空会直接拒绝启动 |

```yaml
settings:
  #── 数据库位置 ──────────────────────────────────────
  custom_db_enabled: false            # 变更需重启生效
  custom_db_path: ""                  # 如 "D:\\gsk-data" 或 UNC "\\\\nas\\gsk"；不支持 smb:// 等协议 URL
```

### 路径支持形态

| 写法 | 处理 |
|---|---|
| 相对路径（`data/db`） | 相对**工作目录**解析为绝对路径 |
| 绝对路径（`D:\gsk-data`、`/srv/gsk/data`） | 清理后直接使用 |
| UNC 共享（`\\nas\gsk`，Windows） | 直接使用 |
| 面板/系统已挂载的网络盘或目录 | 与本地路径同路处理；锁语义风险见「网络存储实操」 |
| 协议 URL（`smb://`、`http://` 等含 `://`） | **拒绝启动**，提示先挂载再填本地/挂载点路径 |
| 解析结果与工作目录相同 | 视为未启用，位置不变（仅打印日志） |

### 启动时的四步

`main.go` 在**任何数据库打开之前**调用 `dblocation.Setup()`（`dblocation/dblocation.go:43-61`）：

1. **路径解析**：`normalizeDBLocation` 是唯一入口，也是未来协议客户端的唯一扩展缝（`smb://` 等应在此接入，而不是散落到调用点）。
2. **可达性探测**：`MkdirAll(0755)` → 建/写/删临时文件 `.gensokyo-dbprobe` → 再用一次性 bbolt 库 `gensokyo_db_probe.tmp` 走一遍**真实文件锁路径**（只建临时文件无法发现网络盘锁失效）。失败按 0.5s / 1s 退避重试，共 3 次；仍失败则拒绝启动。
3. **迁移裁决**：见下表。
4. **固定使用新位置**：idmap 族所有打开点与 `Compaction` 的源/目标路径都经 `dblocation.Resolve()` 取解析后的绝对路径（`dblocation/dblocation.go:287-294`）。

### 迁移裁决

对注册表内**每个文件**独立裁决：

| 本地（工作目录） | 目标目录 | 裁决 |
|---|---|---|
| 无 | 有同名文件 | 视为已迁移，**直接用目标** |
| 有 | 无同名文件 | 文件级复制（不解读格式）→ 校验 → 本地原件改名 `.bak.<YYYYMMDD-HHMMSS>` 保留 |
| 有 | 有同名文件 | **拒绝启动**：无法自动裁决保留哪一份，日志给出两侧字节数，人工删一份后重启 |
| 无 | 无 | 全新实例，直接用目标（bbolt 首次打开时自动初始化） |

迁移校验包含两步：复制后**大小一致**，以及（非 0 字节时）**以只读方式打开确认是可用 bbolt 文件**。任一步失败、或复制过程出错（网络盘断连、磁盘满），都会**删除目标残留副本并拒绝启动**，本地原件保持不动——避免把瞬时故障变成下一次启动的「迁移冲突」。

> [!WARNING] 不会静默回退
> 启用失败（路径非法、目录不可达/不可写、锁探针失败、迁移冲突、校验失败）一律拒绝启动，绝不回退到工作目录，以免本地与目标两侧数据分叉。排查问题时不要为了「先跑起来」而临时关闭开关并写入新数据，否则两边会出现互不相同的版本。

### 注意事项

- **两键都需重启生效**：本功能只在启动序列中生效，不在热重载范围内。
- **`.bak.<时间戳>` 不自动清理**：确认新位置数据可正常读写、机器人工作正常后，再手动删除工作目录里的备份副本。
- **协议 URL 直接拒绝**：当前版本只支持文件系统路径与已挂载点，`smb://` 一类写法由未来版本支持。
- **网络文件系统有锁风险**：启用即打印 WARN —— NFS / SMB / 各类挂载盘的 `flock`/`fcntl` 语义没有官方保证（`etcd-io/bbolt#257` 实测多进程锁互不可见），**同一个库文件被多个实例并发访问会损坏数据**。本功能按「单实例运行 + 用户自担风险」设计，请勿多开实例共用同一目录。
- **本页只写配置语义**：以上裁决表为两版共用口径，具体落地进度以所用版本为准。

### 网络存储（宝塔 / 面板）实操

把网络盘交给面板或系统挂载成**本地目录**，再让 Gensokyo 指向该挂载点，是本功能在这类环境下的标准做法：

1. **先挂载，后配置**：在面板的文件管理或系统层面把远程存储挂到目录（如 Linux `/www/gsk-db`，Windows 映射盘或 UNC 路径），`custom_db_path` 只写这个挂载后的目录，**不要**写 `smb://` 或未挂载的共享名——含 `://` 的值会被直接拒绝。
2. **权限与属主**：运行 Gensokyo 的账户必须对目录有读写执行权限。启动探测会尝试 `MkdirAll(0755)` 并创建、写入、删除探针文件；属主不对或只读挂载会在这里失败并拒绝启动。
3. **挂载顺序先于 Gensokyo**：开机时若挂载晚于进程启动，目录不存在或为空挂载点都会导致探测失败、拒绝启动。systemd 下用 `After=remote-fs.target`（或对应 mount 单元）；面板托管则把挂载任务排在开机脚本前面，或把启动脚本配置为依赖挂载完成。
4. **断连行为 = 拒绝启动，需人工处理**：运行中网络盘断连，后续打开库文件或 `Compaction` 会报错；重启时探测失败同样拒绝启动。恢复挂载后重启即可，程序不会静默改用本地库。
5. **单实例**：挂载目录只允许一个 Gensokyo 实例使用，多实例并发会损坏 bbolt 数据。
6. **首次切换后核对**：启动日志应出现 `[dblocation] idmap 族数据库位置: <目录>` 与逐文件的 `已迁移 … -> …`；工作目录里对应的 `*.bak.<时间戳>` 即迁移前的原件。

## WebUI

`disable_webui` 控制是否启用 WebUI，`server_user_name` 与 `server_user_password` 用于登录。默认或弱密码只适合本地首次启动，部署前必须修改。

将 WebUI 暴露到局域网或公网时，建议：

- 使用高强度独立密码。
- 通过反向代理启用 HTTPS。
- 限制来源 IP，或增加额外身份验证。
- 不在网页、日志和问题反馈中展示完整配置文件。

## Release008 配置自动补全

Release008 重构了缺失配置项的补全逻辑：

- 提取完整 YAML 块，而不是只复制单行。
- 已存在父块时跳过重复的子 key。
- 支持多层父级追溯。
- 补全 `bool` 和 `int` 类型字段。
- 忽略注释行中的伪 key。

自动补全仍不能替代人工检查。升级后应确认缩进、数组和后端配置块没有重复或错位。

## 修改配置后的行为

部分字段支持运行期间重新加载，但连接地址、机器人凭证、Intent、服务端口、WebSocket 服务、图片上传后端和 WebUI 登录信息等关键字段通常需要重启才能完全生效。

修改后建议按以下顺序验证：

1. 检查 YAML 缩进和数组格式。
2. 重启 Gensokyo。
3. 确认 QQ 官方连接建立成功。
4. 确认下游 OneBot 客户端连接成功。
5. 分别测试群聊与 C2C 事件。
6. 测试所选图片上传后端和 `[CQ:file]` 文件发送。
7. 检查 Gensokyo 与下游客户端两侧日志。

## 配置维护建议

- 保留一份移除敏感值的示例配置用于版本管理。
- 升级后对照新版本自动生成的模板补充字段。
- 不要直接复制其他用户的完整配置，尤其是 Intent、ID 映射和消息转换设置。
- 记录每次变更和对应版本，便于发生兼容性问题时回滚。
