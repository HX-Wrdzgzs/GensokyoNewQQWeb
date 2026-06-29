# Prometheus 监控指标

Gensokyo-NewQQ 内置了完整的 Prometheus 指标暴露能力，方便你对接 Grafana 等可视化工具。

## 指标端点

- **路径**: `/metrics`
- **格式**: Prometheus 文本格式
- **端口**: 与主服务端口一致（默认 15630）

## 完整指标列表

### 基础信息

| 指标 | 类型 | 说明 |
|---|---|---|
| `gensokyo_uptime_seconds` | Gauge | 自启动以来的运行秒数 |
| `gensokyo_memory_allocated_bytes` | Gauge | 当前 Go 运行时分配的堆内存字节数 |

### 消息统计

| 指标 | 类型 | 说明 |
|---|---|---|
| `gensokyo_messages_received_total` | Counter | 启动以来收到的消息总数 |
| `gensokyo_messages_sent_total` | Counter | 启动以来发送的消息总数 |

### 错误与性能

| 指标 | 类型 | 说明 |
|---|---|---|
| `gensokyo_errors_total` | Counter | 日志中记录的错误总数 |
| `gensokyo_slow_events_total` | Counter | 超过阈值的慢事件处理总数 |

## Grafana 面板建议

推荐使用以下 PromQL 查询构建 Grafana 面板：

### 消息速率（每分钟）

```
rate(gensokyo_messages_received_total[1m])
```

### 内存趋势

```
gensokyo_memory_allocated_bytes / 1024 / 1024
```

### 错误率

```
rate(gensokyo_errors_total[5m])
```

### 慢事件占比

```
rate(gensokyo_slow_events_total[5m]) / rate(gensokyo_messages_received_total[5m]) * 100
```
