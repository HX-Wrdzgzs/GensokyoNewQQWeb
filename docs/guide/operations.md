# 健康检查与运维

Gensokyo-NewQQ 内置了多项运维功能，方便在生产环境中监控和管理服务。

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
    path: /healthz
    port: 15630
  initialDelaySeconds: 10
  periodSeconds: 30
```

### `/readyz`

就绪探针，返回内容与 `/healthz` 一致，可用于 Kubernetes 的 `readinessProbe`。

## Prometheus 监控指标

Gensokyo-NewQQ 提供了原生的 Prometheus 指标端点，无需额外安装 exporter。

访问 `http://你的地址:端口/metrics` 查看指标。

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
```

## 慢事件检测

核心处理入口内置超时拦截机制。单次事件处理超出阈值（默认 500ms，由 `log_slow_event_threshold_ms` 配置）时：

1. 自动递增慢事件指标计数器
2. 输出 `[SLOW]` 级别 Warn 日志
3. 可在 `/metrics` 中通过 `gensokyo_slow_events_total` 查看

## 管理员快捷指令

Master 权限用户向 Bot 发送私聊消息时可触发：

- **`-status`** — 回显系统运行状态面板（Uptime、内存、协程数、慢事件数、消息 IO 统计）
- **`-broadcast <内容>`** — 向 Bot 加入的所有频道和已知群聊批量发送通知
