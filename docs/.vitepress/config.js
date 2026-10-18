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
          { text: 'Release 更新', link: '/release/' },
          { text: '本版新增功能', link: '/本版新增功能' }
        ]
      },
      {
        text: '核心机制',
        items: [
          { text: 'idmap 虚拟 ID 映射', link: '/idmap' },
          { text: 'Markdown 消息发送', link: '/文档-markdown消息' },
          { text: 'Gensokyo 语法参考', link: '/Gensokyo语法参考' },
          { text: 'Fork 依赖：botgo', link: '/forks/botgo' },
          { text: 'Fork 依赖：go-silk', link: '/forks/go-silk' }
        ]
      },
      {
        text: '接口与事件',
        items: [
          { text: 'API 介绍', link: '/api/api介绍' },
          { text: '扩展 API 文档', link: '/api/扩展API文档' },
          { text: 'CQ 码汇总', link: '/cq码/CQ码汇总' },
          { text: '扩展 CQ 码汇总', link: '/cq码/扩展CQ码汇总' },
          {
            text: '标准 CQ 码',
            collapsed: true,
            items: [
              { text: '[CQ:text] 文本', link: '/cq码/标准CQ码/标准cq码-cq-text' },
              { text: '[CQ:face] QQ 表情', link: '/cq码/标准CQ码/标准cq码-cq-face' },
              { text: '[CQ:image] 图片', link: '/cq码/标准CQ码/标准cq码-cq-image' },
              { text: '[CQ:record] 语音', link: '/cq码/标准CQ码/标准cq码-cq-record' },
              { text: '[CQ:video] 视频', link: '/cq码/标准CQ码/标准cq码-cq-video' },
              { text: '[CQ:at] @ 标签', link: '/cq码/标准CQ码/标准cq码-cq-at' },
              { text: '[CQ:file] 文件', link: '/cq码/标准CQ码/标准cq码-cq-file' },
              { text: '[CQ:share] 分享链接', link: '/cq码/标准CQ码/标准cq码-cq-share' },
              { text: '[CQ:location] 位置', link: '/cq码/标准CQ码/标准cq码-cq-location' },
              { text: '[CQ:music] 音乐', link: '/cq码/标准CQ码/标准cq码-cq-music' },
              { text: '[CQ:reply] 回复', link: '/cq码/标准CQ码/标准cq码-cq-reply' },
              { text: '[CQ:forward] 合并转发', link: '/cq码/标准CQ码/标准cq码-cq-forward' }
            ]
          },
          {
            text: '扩展 CQ 码',
            collapsed: true,
            items: [
              { text: '[CQ:member] 群成员变动', link: '/cq码/扩展CQ码/扩展cq码-cq-member' },
              { text: '[CQ:active] 主动推送标记', link: '/cq码/扩展CQ码/扩展cq码-cq-active' },
              { text: '[CQ:remove] 撤回群消息', link: '/cq码/扩展CQ码/扩展cq码-cq-remove' },
              { text: '[CQ:at] Markdown 中的 @', link: '/cq码/扩展CQ码/扩展cq码-cq-at' },
              { text: '[CQ:card] 群聊图文卡片', link: '/cq码/扩展CQ码/扩展cq码-cq-card' },
              { text: '[CQ:input_notify] 输入状态', link: '/cq码/扩展CQ码/扩展cq码-cq-input_notify' },
              { text: '[CQ:stream] 流式消息', link: '/cq码/扩展CQ码/扩展cq码-cq-stream' },
              { text: '[CQ:keyboard] 内嵌键盘', link: '/cq码/扩展CQ码/扩展cq码-cq-keyboard' },
              { text: '[CQ:wakeup] C2C 召回标记', link: '/cq码/扩展CQ码/扩展cq码-cq-wakeup' },
              { text: '[CQ:set_group] 群管理动作', link: '/cq码/扩展CQ码/扩展cq码-cq-set_group' },
              { text: '[CQ:group_info] 群信息展开', link: '/cq码/扩展CQ码/扩展cq码-cq-group_info' }
            ]
          },
          {
            text: '扩展 API',
            collapsed: true,
            items: [
              { text: 'get_avatar', link: '/api/扩展api/扩展api-get_avatar' },
              { text: '获取机器人分享链接', link: '/api/扩展api/扩展api-get_robot_share_link' },
              { text: '处理按钮交互回调', link: '/api/扩展api/扩展api-put_interaction' },
              { text: 'send_private_msg_wakeup', link: '/api/扩展api/扩展api-send_private_msg_wakeup' },
              { text: 'delete_group_msg', link: '/api/扩展api/扩展api-delete_group_msg' },
              { text: 'get_group_join_request_list', link: '/api/扩展api/扩展api-get_group_join_request_list' },
              { text: 'get_group_bot_state', link: '/api/扩展api/扩展api-get_group_bot_state' },
              { text: '入群自动审批策略', link: '/api/扩展api/扩展api-join_approval_strategy' }
            ]
          }
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
        text: '运维与监控',
        items: [
          { text: '健康检查与运维', link: '/guide/operations' },
          { text: 'Prometheus 监控指标', link: '/guide/metrics' }
        ]
      },
      {
        text: '示例项目',
        items: [
          { text: 'Amia 晓山瑞希', link: '/guide/amia' }
        ]
      },
      {
        text: '更多资料',
        items: [
          { text: '创建 QQ 机器人并配置', link: '/开始使用' },
          { text: '文档索引', link: '/更多文档' }
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