/**
 * CQ 码预览元数据 —— Playground 与各码族预览组件的唯一文案来源。
 *
 * 语义出处：docs/cq码/**（标准 / 扩展码分页）与 docs/cq码/CQ码汇总.md:90-104（无参裸码行为）。
 * 字段口径（name / kind / known / bare）见 docs/.vitepress/cq/parser.js:107-160、:352-384；
 * 码名或处置口径变动时先改文档，再改这里，避免演示与文档分叉。
 *
 * 字段说明：
 *   label      中文名（卡片标题）
 *   badge      语义卡片上的短标签，仅 GenericPreview 消费
 *   desc       一句「这是什么 / 后端如何处置」
 *   highlight  值得直接摆到卡片上的关键参数键（值仍可在参数表里看全）
 *   payloadKey 载荷型参数键（data 等），GenericPreview 会原样展示其前 200 字符
 *   bareNote   无参裸码的专属说明；缺省时用 DEFAULT_BARE_NOTE
 */

export const KIND_LABELS = Object.freeze({
  media: '媒体',
  content: '内容',
  control: '控制',
  action: '动作',
  passthrough: '透传'
})

/** 没有专属裸码说明的码统一走这条：裸码本身不携带任何参数。 */
export const DEFAULT_BARE_NOTE = '无参裸码：没有参数，本站仅展示段结构；后端行为以运行版本为准。'

export const CQ_META = Object.freeze({
  text: {
    label: '纯文本',
    badge: 'TX',
    desc: 'OneBot 标准文本段；解析器把它归为透传类，后端按正文原样发送。',
    highlight: ['text']
  },
  at: {
    label: '@ 提及',
    desc: '@ 群成员或机器人：纯文本出站转成「@用户名 」，Markdown 出站转成 qqbot-at-user 标签。'
  },
  reply: {
    label: '引用回复',
    badge: 'RP',
    desc: '引用一条已有消息：出站用 id 设置消息引用，入站上报为 msg_idx（REFIDX 索引），出站解析会剥离 msg_idx 形态。',
    highlight: ['id', 'msg_idx'],
    bareNote: '无参裸码：没有 id / msg_idx，预览不关联任何消息。'
  },
  image: {
    label: '图片',
    desc: '图片消息：url / file 支持 http(s) 链接、base64:// 与本地路径。',
    bareNote: '无参裸码：file 与 url 均为空时整码原样保留为正文文本，不产出媒体项（后端口径）。'
  },
  record: {
    label: '语音',
    desc: '语音消息：url / file 支持 http(s) 链接、base64:// 与本地路径，后端自动转码 silk。',
    bareNote: '无参裸码：file 与 url 均为空时整码原样保留为正文文本，不产出媒体项（后端口径）。'
  },
  voice: {
    label: '语音（record 别名）',
    desc: 'record 的同义别名，参数键归一为 *_record 系列。',
    bareNote: '无参裸码：file 与 url 均为空时整码原样保留为正文文本，不产出媒体项（后端口径）。'
  },
  video: {
    label: '视频',
    desc: '视频消息：支持 http(s) 链接与本地路径。',
    bareNote: '无参裸码：file 与 url 均为空时整码原样保留为正文文本，不产出媒体项（后端口径）。'
  },
  file: {
    label: '文件',
    desc: '文件消息：以 file 参数为准；file 为空时即使带 url 也保留原文字面，不产出媒体项。',
    bareNote: '无参裸码：file 为空时整码原样保留为正文文本，不产出媒体项（后端口径）。'
  },
  face: {
    label: 'QQ 表情',
    desc: 'QQ 表情段；文档标注暂不可用——Go 入站不产出该段、出站按文本透传。'
  },
  markdown: {
    label: 'Markdown 消息',
    badge: 'MD',
    desc: 'Markdown 消息（msg_type=2）：data 携带 Markdown JSON，也接受 base64:// 编码形态。',
    payloadKey: 'data',
    bareNote: '无参裸码：缺少 data，本站仅展示段结构；后端行为以运行版本为准。'
  },
  card: {
    label: '图文卡片',
    badge: 'CD',
    desc: '图文卡片（msg_type=8，群聊）：title / description / url / pic_url 四字段必填，缺任一项整条消息返回 1400。',
    highlight: ['title', 'description', 'url', 'pic_url'],
    bareNote: '无参裸码：码被移除且无产物（后端口径）。'
  },
  keyboard: {
    label: '内嵌键盘',
    badge: 'KB',
    desc: '内嵌键盘（按钮）消息：data 携带键盘 JSON 或 base64://；按钮仅在 Markdown 消息下渲染。',
    payloadKey: 'data',
    bareNote: '无参裸码：缺少 data，本站仅展示段结构；后端行为以运行版本为准。'
  },
  stream: {
    label: '流式消息',
    badge: 'ST',
    desc: '单聊流式消息：type 取 start / mid / finish 逐片展示，qq 指定接收者以关联同一流。',
    highlight: ['type', 'qq']
  },
  input_notify: {
    label: '输入状态',
    badge: 'IN',
    desc: '单聊输入状态通知（msg_type=6）：正文发送前先展示「正在输入」，type 固定为 1、second 最长 60。',
    highlight: ['type', 'second'],
    bareNote: '裸码也是有效形态：type 默认 1、second 默认 60。'
  },
  music: {
    label: '音乐分享',
    badge: 'MS',
    desc: '音乐分享：当前仅支持 QQ 音乐（type=qq），id 为 QQ 音乐数字 ID。',
    highlight: ['type', 'id']
  },
  active: {
    label: '主动推送标记',
    badge: 'AC',
    desc: '主动推送标记：识别后从正文移除并写入控制字段，清空 msg_id / event_id 强制走主动通道。',
    highlight: ['type', 'sub_type'],
    bareNote: '裸标记也是有效形态：识别后从正文移除，强制走主动推送通道。'
  },
  wakeup: {
    label: '互动召回',
    badge: 'WK',
    desc: 'C2C 互动召回标记：userid 指定目标用户（OpenID 或虚拟 ID），发送时 IsWakeup=true。',
    highlight: ['userid'],
    bareNote: '无参裸码：没有 userid，预览无法关联目标用户。'
  },
  node: {
    label: '合并转发节点',
    badge: 'ND',
    desc: 'OneBot 合并转发节点段；解析器归为透传类，本站只还原段结构，发送能力以运行版本为准。',
    highlight: ['id', 'user_id', 'nickname']
  },
  set_group: {
    label: '群管理动作',
    badge: 'SG',
    desc: '出站群管理动作统一码：action 取 ban / whole_ban / add_request / strategy_execute / strategy_delete / kick / blacklist_add / blacklist_del。',
    highlight: ['action', 'group_id', 'user_id', 'msg_id']
  },
  remove: {
    label: '撤回消息',
    badge: 'RM',
    desc: '撤回指定群消息（出站单向），需要 user_id 与 msg_id。',
    highlight: ['user_id', 'msg_id']
  },
  poke: {
    label: '戳一戳',
    badge: 'PK',
    desc: 'OneBot 扩展动作码；解析器归为透传类（整段保留在正文），实际处置以运行版本为准。',
    highlight: ['qq', 'user_id']
  },
  member: {
    label: '群成员事件',
    badge: 'MB',
    desc: '群成员入群 / 退群通知与回复路由码。',
    highlight: ['user_id', 'group_id', 'sub_type']
  },
  group_info: {
    label: '群信息展开',
    badge: 'GI',
    desc: '群信息展开码：把群名 / 群简报 / 成员数展开进正文；需 cq_parse_mode: new，legacy / shadow 下按原文发出。',
    highlight: ['group_id', 'fields'],
    bareNote: '裸码未指定群：预览按当前会话群理解；实际取数口径以运行版本为准。'
  },
  avatar: {
    label: '头像',
    badge: 'AV',
    desc: '头像扩展码：按 qq 参数取用户头像并以图片发送；支持范围以能力矩阵为准。',
    highlight: ['qq', 'user_id']
  },
  ark: {
    label: '结构化卡片',
    badge: 'AR',
    desc: '结构化卡片（入站 message_type=3 / ark_data）；出站解析会剥离该段。',
    highlight: ['ark_type', 'ark_name', 'prompt']
  },
  json: {
    label: 'JSON 卡片',
    badge: 'JN',
    desc: 'JSON 卡片消息段：data 携带卡片 JSON 载荷；解析器归为透传类，渲染由客户端决定。',
    payloadKey: 'data',
    bareNote: '无参裸码：缺少 data，本站仅展示段结构；后端行为以运行版本为准。'
  }
})

/** 未知码名（known=false）时返回 null，由 UnknownPreview 接管展示。 */
export function metaOf(name) {
  return CQ_META[name] || null
}
