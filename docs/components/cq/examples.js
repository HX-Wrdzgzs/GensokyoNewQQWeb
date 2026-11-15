/**
 * CQ 码演练场样例库 —— 分组 + 可点标签 + 原始输入串。
 *
 * 只放「点一下就能回填输入框」的完整文本，文案集中在这里，Playground 只负责渲染与回填。
 * 覆盖两层：docs/cq码/** 里最常用的形态，以及边界形态（未知码 / 空值 / 多段混合）。
 * 每个 value 都能被 parser.js 独立解析，不依赖运行状态。
 */
export const CQ_EXAMPLES = Object.freeze([
  {
    group: '文本 / 提及 / 表情 / 引用',
    items: [
      { label: '纯文本', value: '你好' },
      { label: '@ 成员', value: '[CQ:at,qq=10001] 早上好' },
      { label: 'QQ 表情', value: '[CQ:face,id=14]' },
      { label: '引用回复', value: '[CQ:reply,id=123] 收到' }
    ]
  },
  {
    group: '媒体族',
    items: [
      { label: '图片（http 链接）', value: '[CQ:image,file=https://example.com/a.png]' },
      { label: '图片（无参裸码）', value: '[CQ:image]' },
      { label: '语音（base64 载荷）', value: '[CQ:record,file=base64://QUJD]' }
    ]
  },
  {
    group: '内容 / 控制',
    items: [
      { label: 'Markdown 消息', value: '[CQ:markdown,data={"content":"hi"}]' },
      {
        label: '图文卡片',
        value: '[CQ:card,title=t,desc=d,pic=https://example.com/p.png,url=https://example.com]'
      },
      { label: 'QQ 音乐', value: '[CQ:music,type=qq,id=123]' }
    ]
  },
  {
    group: '边界形态',
    items: [
      { label: '未知码名', value: '[CQ:cardboard,x=1]' },
      { label: '空参数值', value: '[CQ:at,qq=]' },
      {
        label: '多段混合',
        value: '看 [CQ:image,file=https://example.com/a.png] 和 [CQ:face,id=1]'
      }
    ]
  }
])
