import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Gensokyo",
  description: "OneBot V11 官方 QQ 机器人 Golang 网关服务端",
  ignoreDeadLinks: true, // 忽略原始文档中的死链，防止构建失败
  head: [
    ['link', { rel: 'icon', href: '/head.gif' }]
  ],
  themeConfig: {
    logo: '/head.gif',
    nav: [
      { text: '主页', link: '/' },
      { text: '指南', link: '/guide/start' },
      { text: 'API & CQ码', link: '/api/api介绍' },
      { text: 'WebUI', link: '/guide/webui' },
      { text: '运维', link: '/guide/operations' }
    ],
    sidebar: [
      {
        text: '开始使用',
        items: [
          { text: '快速上手', link: '/guide/start' },
          { text: '编译构建', link: '/guide/build' },
          { text: '兼容性矩阵', link: '/guide/matrix' },
          { text: '本版新增功能', link: '/本版新增功能' }
        ]
      },
      {
        text: '核心机制',
        items: [
          { text: 'idmap 虚拟ID映射', link: '/idmap' },
          { text: 'Markdown 消息发送', link: '/文档-markdown消息' },
          { text: 'Gensokyo 语法参考', link: '/Gensokyo语法参考' }
        ]
      },
      {
        text: '接口与事件',
        items: [
          { text: 'API 介绍', link: '/api/api介绍' },
          { text: '扩展 API 文档', link: '/api/扩展API文档' },
          { text: '扩展 CQ 码汇总', link: '/cq码/扩展CQ码汇总' }
        ]
      },
      {
        text: 'WebUI 管理面板',
        items: [
          { text: '界面概览', link: '/guide/webui' },
          { text: '登录与账户管理', link: '/guide/webui-auth' }
        ]
      },
      {
        text: '运维监控',
        items: [
          { text: '健康检查与监控', link: '/guide/operations' },
          { text: 'Prometheus 指标', link: '/guide/metrics' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/HX-Wrdzgzs/Gensokyo-NewQQ' }
    ],
    footer: {
      message: '基于 MIT 协议开源发行',
      copyright: 'Copyright © 2026-present Gensokyo Project'
    }
  }
})
