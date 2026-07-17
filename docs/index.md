---
layout: home

hero:
  name: "Gensokyo-NewQQ"
  text: "QQ 官方机器人 API 到 OneBot V11 的协议网关"
  tagline: "连接 QQ 开放平台与 NoneBot2、Koishi 等 OneBot V11 客户端，并集中处理事件转换、ID 映射和消息适配。"
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/start
    - theme: alt
      text: 配置指南
      link: /guide/configuration
    - theme: alt
      text: 查看主仓库
      link: https://github.com/Te-River/Gensokyo-NewQQ

features:
  - title: OneBot V11 协议转换
    details: 将 QQ 官方 WebSocket 事件与 HTTP API 转换为 OneBot V11 事件和调用，降低现有机器人框架的迁移成本。
  - title: 多种连接方式
    details: 支持 HTTP API、反向 HTTP POST、正向 WebSocket 和反向 WebSocket，可按现有部署拓扑选择连接方式。
  - title: 群聊、C2C 与频道事件
    details: 处理 QQ 群、C2C 私聊和 QQ 频道相关事件，并提供面向下游框架的统一事件结构。
  - title: ID 映射与消息适配
    details: 通过 idmap 维护 OpenID 与下游数字 ID 的对应关系，并处理 @、回复、图片、语音、视频和 Markdown 等消息。
  - title: 项目扩展能力
    details: 在 OneBot V11 常用接口之外提供头像、分享链接、按钮交互等扩展 API 与 CQ 码。
  - title: WebUI 管理入口
    details: 提供实例配置与管理入口；实际页面、路径和功能以当前运行版本为准，部署前应修改默认凭据并限制访问范围。
---

<script setup>
import Playground from './components/Playground.vue'
</script>

<div class="custom-home-content" style="max-width: 1152px; margin: 40px auto; padding: 0 24px;">

## Gensokyo 在系统中的位置

```text
QQ 开放平台
    │ 官方事件与 API
    ▼
Gensokyo-NewQQ
    │ OneBot V11 事件、WebSocket 与 HTTP
    ▼
NoneBot2 / Koishi / 其他 OneBot V11 客户端
```

Gensokyo-NewQQ 负责协议转换与连接管理。命令解析、插件加载、业务权限和数据存储通常由下游机器人框架负责。

<div class="tip custom-block" style="margin-top: 24px;">
<p class="custom-block-title">版本说明</p>
<p>本站用于整理主仓库能力和接入路径。QQ 官方平台权限、项目源码和 Release 可能持续变化；涉及具体字段、默认值和行为时，以当前版本自动生成的配置文件、源码和运行日志为准。</p>
</div>

## 推荐阅读顺序

1. 阅读[项目概览](/guide/overview)，确认 Gensokyo 与下游框架的职责边界。
2. 按[快速开始](/guide/start)完成机器人注册、下载和首次连接。
3. 使用[配置指南](/guide/configuration)设置 Intent、WebSocket、HTTP 和 WebUI。
4. 在[能力矩阵](/guide/matrix)中检索 API、CQ 码和项目扩展能力。

## CQ 码转换演练场

在下方输入常见 OneBot CQ 码，查看网页端的解析和预览结果。该演练场用于理解语法，不代表当前 QQ 官方接口一定接受对应消息；实际支持情况请结合能力矩阵和运行版本验证。

<Playground />

</div>
