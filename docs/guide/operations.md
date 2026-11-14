# 健康检查与运维

Gensokyo-NewQQ 内置了多项运维功能，方便在生产环境中监控和管理服务。

## 鉴权前提：健康端点并非「无需鉴权」

`/healthz`、`/readyz`、`/metrics`、`/updateport`、`/delpic`、`/uploadpic*` 等端点都挂在同一个 `server.UploadAuthMiddleware()` 下（`main.go:516`、`:518-524`）：

- 中间件校验的是配置项 `http_access_token`（`server/uploadpic.go:37-51`）：请求头 `Authorization: Bearer <token>` 或查询参数 `?access_token=<token>` 任选其一，两者都不匹配时回 **`403 {"error":"鉴权失败"}`**。
- **`http_access_token` 为空时中间件直接放行**——这就是「健康端点无需鉴权」这一说法的由来，但它只在没配 token 的部署里成立。
- 因此配了 `http_access_token` 之后，Kubernetes 探针与 Prometheus 抓取都必须带上 token，否则 `livenessProbe` 会因 403 反复重启进程。

## 健康检查端点

服务启动后会自动注册以下端点：

### `/healthz`

基础的存活探针，返回服务运行状态。

```json
{
  "status": "ok",
  "uptime": 3600.5,
  "goroutines": 12,
  "memory_mb": 15.3
}
```

可用于 Kubernetes 的 `livenessProbe` 配置：

```yaml
livenessProbe:
  httpGet:
    path: /healthz?access_token=<你的 http_access_token>   # 未配置 token 时可省略查询参数
    port: 15630
    httpHeaders:
      - name: Authorization
        value: Bearer <你的 http_access_token>
  initialDelaySeconds: 10
  periodSeconds: 30
```

### `/readyz`

就绪探针，返回内容与 `/healthz` 一致（同用 `HealthzHandler`，`main.go:520-521`），可用于 Kubernetes 的 `readinessProbe`。

## Prometheus 监控指标

Gensokyo-NewQQ 提供了原生的 Prometheus 指标端点，无需额外安装 exporter。

访问 `http://你的地址:端口/metrics` 查看指标；配了 `http_access_token` 时同样需要带 token（`main.go:522`）。

### 暴露的指标

| 指标名称 | 类型 | 说明 |
|---|---|---|
| `gensokyo_uptime_seconds` | Gauge | 服务运行时长（秒） |
| `gensokyo_messages_received_total` | Counter | 累计接收消息数 |
| `gensokyo_messages_sent_total` | Counter | 累计发送消息数 |
| `gensokyo_errors_total` | Counter | 累计错误数 |
| `gensokyo_slow_events_total` | Counter | 慢事件累计数 |
| `gensokyo_memory_allocated_bytes` | Gauge | 当前内存分配量 |

### Prometheus 配置示例

```yaml
scrape_configs:
  - job_name: 'gensokyo'
    static_configs:
      - targets: ['你的IP:15630']
    # 配了 http_access_token 时，抓取需要带鉴权：
    # authorization:
    #   credentials: <你的 http_access_token>
```

## 慢事件检测

核心处理入口内置超时拦截机制。单次事件处理超出阈值（默认 500ms，由 `log_slow_event_threshold_ms` 配置）时：

1. 自动递增慢事件指标计数器
2. 输出 `[SLOW]` 级别 Warn 日志
3. 可在 `/metrics` 中通过 `gensokyo_slow_events_total` 查看

## 管理员快捷指令

指令前缀来自配置（`settings.status_prefix` / `settings.broadcast_prefix`），**模板默认值是 `/gskstatus` 与 `/gskbroadcast`**（`template/config_template.go:221-222`），不是早期文档写的 `-status` / `-broadcast`。

| 指令 | 模板默认前缀 | 作用 | 权限 |
|---|---|---|---|
| 运行状态 | `/gskstatus` | 回显状态面板：`Version`、`Recv/Send`（累计收 / 发消息数）、`Slow/Error`（慢事件 / 错误数）、`Mem`（`Alloc` 换算 MB）+ goroutine 数、`Uptime` | **不做 `master_id` 门控**：消息匹配前缀即回状态（`Processor/Processor.go:630-631`） |
| 群广播 | `/gskbroadcast <内容>` | 向 Bot 已知的群聊批量发送通知 | **需 `master_id` 门控**：不在 master 名单内时回「您没有权限执行广播指令，请在 config.yml 的 master_id 中配置当前用户。」（`Processor/Processor.go:635-637`） |

补充口径：

- 前缀设为 `""`、`/disabled` 或 `/disabled...` 可停用对应指令（`template/config_template.go:221-222` 注释）。
- 广播内容为空时会回用法提示（`Processor/Processor.go:640-643`）。
- 状态面板内容由 `buildStatusText()` 组装（`Processor/Processor.go:687`）。由于 `/gskstatus` 不受 master 门控，公网机器人如不希望任意用户查看运行状态，应把 `status_prefix` 置空禁用。
