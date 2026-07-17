import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Gensokyo NewQQ',
  description: 'Gensokyo-NewQQ 的 Web 文档、配置说明与 OneBot V11 接入指南',
  lastUpdated: true,
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', href: '/head.gif' }],
    ['meta', { name: 'theme-color', content: '#3ecf8e' }]
  ],
  themeConfig: {
    logo: '/head.gif',
    search: {
      provider: 'local'
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/start' },
      { text: '配置指南', link: '/guide/configuration' },
      { text: '能力矩阵', link: '/guide/matrix' },
      { text: 'WebUI', link: '/guide/webui' },
      { text: '主仓库', link: 'https://github.com/Te-River/Gensokyo-NewQQ' }
    ],
    sidebar: [
      {
        text: '开始使用',
        items: [
          { text: '项目概览', link: '/guide/overview' },
          { text: '快速上手', link: '/guide/start' },
          { text: '配置指南', link: '/guide/configuration' },
          { text: '编译构建', link: '/guide/build' },
          { text: '能力矩阵', link: '/guide/matrix' },
          { text: '本版新增功能', link: '/本版新增功能' }
        ]
      },
      {
        text: '核心机制',
        items: [
          { text: 'idmap 虚拟 ID 映射', link: '/idmap' },
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
          { text: '界面与安全说明', link: '/guide/webui' },
          { text: '登录与账户管理', link: '/guide/webui-auth' }
        ]
      },
      {
        text: '示例项目',
        items: [
          { text: 'Amia 晓山瑞希', link: '/guide/amia' }
        ]
      }
    ],
    outline: {
      label: '本页目录',
      level: [2, 3]
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    lastUpdated: {
      text: '最后更新'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Te-River/Gensokyo-NewQQ' }
    ],
    footer: {
      message: 'Gensokyo-NewQQ 配套 Web 文档站',
      copyright: 'Copyright © 2026-present Gensokyo Project'
    }
  }
})
