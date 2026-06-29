---
layout: home

hero:
  name: "Gensokyo"
  text: "OneBot V11 QQ官方网关"
  tagline: "基于 Go 原生的高性能、轻量级 OneBot V11 协议转换网关"
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/start
    - theme: alt
      text: 兼容性列表
      link: /guide/matrix
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/HX-Wrdzgzs/Gensokyo-NewQQ

features:
  - title: 10MB 极低内存占用
    details: Golang 原生高并发协程池实现，空载仅需约 10MB 内存，低配云服务器多开无压力。
  - title: OneBot V11 完美适配
    details: 兼容 HTTP API、反向 HTTP POST、正向/反向 WebSocket，完美支持 NoneBot2、Koishi 等框架。
  - title: 现代化 WebUI
    details: 采用 Vercel + Linear 设计语言的暗色优先管理面板，实时仪表盘、日志流、在线配置编辑器一应俱全。
  - title: 原生 Prometheus 监控
    details: 内置 /metrics 端点暴露 6+ 指标，支持慢事件检测，轻松对接 Grafana。
  - title: 健康检查端点
    details: 提供 /healthz 和 /readyz 端点，原生支持 Kubernetes 探活和负载均衡。
  - title: 自动转换与健壮可用
    details: 支持非 @ 消息提取、头像直链获取、虚拟数字 ID 自动转换 OpenID，保障被动消息发送。
---

<script setup>
import Playground from './components/Playground.vue'
</script>

<div class="custom-home-content" style="max-width: 1152px; margin: 40px auto; padding: 0 24px;">

## CQ 码实时转换演练场

在下方输入标准的 OneBot CQ 码，实时查看 Gensokyo 如何将其规整，并模拟渲染为符合 QQ 官方机器人协议的图文内容。

<Playground />

</div>
