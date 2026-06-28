---
layout: home

hero:
  name: "Gensokyo"
  text: "OneBot V11 QQ官方网关"
  tagline: "基于 Go 原生的高性能、轻量级 OneBot V11 协议转换网关"
  actions:
    - theme: brand
      text: 📖 快速上手
      link: /guide/start
    - theme: alt
      text: 🛠️ 兼容性列表
      link: /guide/matrix
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/Te-River/Gensokyo-NewQQ

features:
  - title: 10MB 极低内存占用
    details: Golang 原生高并发协程池实现，空载仅需约 10MB 内存，低配云服务器多开无压力。
    icon: ⚡️
  - title: OneBot V11 完美适配
    details: 兼容 HTTP API、反向 HTTP POST、正向/反向 WebSocket，完美支持 NoneBot2、Koishi 等框架。
    icon: 🔌
  - title: 自动转换与健壮可用
    details: 支持非 @ 消息提取、头像直链获取、虚拟数字 ID 自动转换 OpenID，保障被动消息发送。
    icon: 🛠️
---

<script setup>
import Playground from './components/Playground.vue'
</script>

<div class="custom-home-content" style="max-width: 1152px; margin: 40px auto; padding: 0 24px;">

## 🎨 CQ 码实时转换演练场

在下方输入标准的 OneBot CQ 码，实时查看 Gensokyo 如何将其规整，并模拟渲染为符合 QQ 官方机器人协议的图文内容。

<Playground />

</div>
