// CQ 码解析引擎自检（零依赖：Node 原生 assert + Buffer）。
//
// 夹具来源（期望值全部由后端仓实测行为推出，不是「看起来对就行」）：
//   - 主仓 handlers/cq_parse_regression_test.go（O/N 系回归网，逐条给 :行号）
//   - 主仓 handlers/cq_threepath_matrix_test.go（三路径对拍）
//   - 主仓 handlers/cqparse/{tokenize.go,escape.go,token.go}（词法与四实体口径）
//   - Refactor handlers/cqparse/tokenize.go + handlers/cqcode.go（最大兼容并集统一契约 §1~§4）
//   - Refactor crates/gensokyo-protocol/src/cqcode.rs（parse/parse_body/push_param/CODES）
//   - 站点文档 docs/cq码/CQ码汇总.md:77-87（空白容错与最大兼容口径）
//   - 主仓 internal/domain/message/parse_string_test.go（字符串→段结构金样）
//
// 运行：node scripts/cq-selfcheck.mjs   （npm run selfcheck）

import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { parseCq, tokenize, CQ_CODE_NAMES } from '../docs/.vitepress/cq/parser.js'

// ---------- 期望值构造器 ----------

const text = (raw, extra = {}) => ({ t: 'text', raw, ...extra })

// params 一律给全量（期望段结构 = 精确断言，不设子集匹配）
const cq = (name, params, extra = {}) => ({ t: 'cq', name, params, ...extra })

const cases = [
  // ===== 一、C1 贪婪 JSON / 花括号配平（主仓 cq_parse_regression_test.go:171-205、:447-457）=====
  c('C1 相邻 markdown/keyboard 不互相吞噬',
    '主仓 cq_parse_regression_test.go:173',
    '[CQ:markdown,data={"content":"hi"}]普通文本[CQ:keyboard,data={"id":"k1"}]',
    cq('markdown', { data: '{"content":"hi"}' }, { kind: 'content', raw: '[CQ:markdown,data={"content":"hi"}]' }),
    text('普通文本'),
    cq('keyboard', { data: '{"id":"k1"}' }, { kind: 'content' })),

  c('C1 JSON 数组内的 ] 不收码',
    '主仓 cq_parse_regression_test.go:186',
    '[CQ:markdown,data={"a":[1,2]}]',
    cq('markdown', { data: '{"a":[1,2]}' }, { kind: 'content' })),

  c('C1 JSON 字符串内的 ] 不收码（转义引号感知）',
    '主仓 cqparse/tokenize.go:98-107',
    '[CQ:keyboard,data={"id":"a\\"]b"}]',
    cq('keyboard', { data: '{"id":"a\\"]b"}' })),

  c('N-A16b markdown 载荷内嵌 CQ 串不被二次提取',
    '主仓 cq_parse_regression_test.go:448',
    '[CQ:markdown,data={"content":"[CQ:image,file=https://x.com/a.png]"}]正文',
    cq('markdown', { data: '{"content":"[CQ:image,file=https://x.com/a.png]"}' }),
    text('正文')),

  c('嵌套多层花括号整段吞掉',
    '主仓 cqparse/tokenize.go:111-115',
    '[CQ:keyboard,data={"rows":[{"buttons":[{"action":{"permission":"1"}}]}]}]尾',
    cq('keyboard', { data: '{"rows":[{"buttons":[{"action":{"permission":"1"}}]}]}' }),
    text('尾')),

  c('N-A3 花括号未闭合 → 整段留作文本',
    '主仓 cq_parse_regression_test.go:198-204',
    '[CQ:markdown,data={"a":',
    text('[CQ:markdown,data={"a":')),

  // ===== 二、四实体解码（主仓 cqparse/escape.go:5-28、cq_parse_regression_test.go:207-235）=====
  c('O-C1 &#44; / &amp; / &#93; 解码',
    '主仓 cq_parse_regression_test.go:210-214',
    '[CQ:set_group,action=add_request,group_id=1,user_id=2,flag=f,reason=a&#44;b&amp;c&#93;d]',
    cq('set_group', {
      action: 'add_request',
      group_id: '1',
      user_id: '2',
      flag: 'f',
      reason: 'a,b&c]d'
    }, { kind: 'action' })),

  c('O-C2 &#91; 解码（m1 修复）',
    '主仓 cq_parse_regression_test.go:219-223',
    '[CQ:set_group,action=add_request,group_id=1,user_id=2,flag=f,reason=x&#91;y]',
    cq('set_group', { action: 'add_request', group_id: '1', user_id: '2', flag: 'f', reason: 'x[y' })),

  c('&amp; 最后还原：&amp;#91; 只得字面 &#91;（顺序不可颠倒）',
    '主仓 cqparse/escape.go:9-10 / Refactor cqcode.rs:146-148',
    '[CQ:file,file_name=x&amp;#91;y]',
    cq('file', { file_name: 'x&#91;y' })),

  c('未知 & 序列按字面保留（宽容解码）',
    'Refactor cqcode.rs:134-136',
    '[CQ:file,file_name=a&b;c&#38;]',
    cq('file', { file_name: 'a&b;c&#38;' })),

  c('N-G8 fallback 含转义逗号',
    '主仓 cq_parse_regression_test.go:670-677',
    '[CQ:group_info,field=name,fallback=暂无&#44;群名]',
    cq('group_info', { field: 'name', fallback: '暂无,群名' })),

  // ===== 三、C3 尾随无 = 段并入前键（主仓 cqparse/tokenize.go:163-167、cqcode.go:97-102）=====
  c('N-A4 user_ids=1,2,3 尾段并入',
    '主仓 cq_parse_regression_test.go:239-246',
    '[CQ:set_group,action=kick,group_id=1,user_ids=1,2,3]',
    cq('set_group', { action: 'kick', group_id: '1', user_ids: '1,2,3' })),

  c('三路径对拍 user_ids 实体形态解码后等价',
    '主仓 cq_threepath_matrix_test.go:89 + :110',
    '[CQ:set_group,action=kick,group_id=100,user_ids=111&#44;222&#44;333,add_blacklist=true]',
    cq('set_group', {
      action: 'kick',
      group_id: '100',
      user_ids: '111,222,333',
      add_blacklist: 'true'
    })),

  c('N-A11 file 值内裸逗号不截断',
    '主仓 cq_parse_regression_test.go:325-331',
    '[CQ:file,file=https://x.com/a,b.txt]',
    cq('file', { file: 'https://x.com/a,b.txt' }, { kind: 'media' })),

  c('card 尾键吞入值（并集口径同 Go：无 = 片段并入前键）',
    '主仓 cq_parse_regression_test.go:239 同口径 / Refactor cqcode.go:97-102',
    '[CQ:card,title=标题,desc=描述,pic=u,url=https://x.com/a,b]',
    cq('card', { title: '标题', desc: '描述', pic: 'u', url: 'https://x.com/a,b' })),

  c('尾随空片段与尾随逗号丢弃',
    '主仓 cqparse/tokenize.go:164（t != "" 守卫）',
    '[CQ:image,file=x.png,]',
    cq('image', { file: 'x.png' })),

  // ===== 四、参数键/值 trim 与键小写归一（Refactor tokenize.go:187-199、cqcode.rs:466-469）=====
  c('Q2 媒体码参数 TrimSpace',
    '主仓 cq_parse_regression_test.go:944-950',
    '[CQ:image, file=https://x.com/a.png ]',
    cq('image', { file: 'https://x.com/a.png' }, { bare: false })),

  c('并集 §4 段名后、= 两侧空白全容忍',
    '站点 docs/cq码/CQ码汇总.md:81 + Refactor tokenize.go:102-106',
    '[CQ:image , file = https://example.com/a.png]',
    cq('image', { file: 'https://example.com/a.png' }, { nameRaw: 'image' })),

  c('并集 §4 值只 trim 首尾、内部空格保留',
    '站点 docs/cq码/CQ码汇总.md:81',
    '[CQ:record,file = my voice.amr]',
    cq('record', { file: 'my voice.amr' })),

  c('并集 §1 段名与参数键大小写不敏感、归一小写',
    'Refactor tokenize.go:15-18 / cqcode.rs:468-469',
    '[CQ:Image,File=x.png,SubType=0]',
    cq('image', { file: 'x.png', subtype: '0' }, { nameRaw: 'Image' })),

  c('N-A9 附加参数不污染 file（键小写归一后 file/subtype/url 各自成键）',
    '主仓 cq_parse_regression_test.go:303-311',
    '[CQ:image,file=https://x.com/a.png,subType=0,url=https://y.com/b.png]',
    cq('image', { file: 'https://x.com/a.png', subtype: '0', url: 'https://y.com/b.png' })),

  c('并集 §4 段名前空白容忍',
    'Refactor tokenize.go:87-90 / cqcode.rs:277',
    '[CQ: at,qq=all]',
    cq('at', { qq: 'all' }, { kind: 'passthrough' })),

  c('并集 制表/换行参与词法空白',
    'Refactor tokenize.go:9-11（cqSpaceBytes）',
    '[CQ:image\t,\tfile\t=\tx.png\r\n]',
    cq('image', { file: 'x.png' })),

  c('键值 trim 为 Unicode 语义：\\v 与全角空格被吞',
    'Refactor cqcode.rs:466-469 / 站点 :85',
    '[CQ:image,file=\u000bX.png\u000b] [CQ:file,file=\u3000y.txt\u3000]',
    cq('image', { file: 'X.png' }),
    text(' '),
    cq('file', { file: 'y.txt' })),

  c('全角空格不算词法空白 → 段名非法，整码留正文',
    'Refactor tokenize.go:9-11 / 站点 docs/cq码/CQ码汇总.md:83、:85',
    '[CQ:\u3000image,file=x]',
    text('[CQ:\u3000image,file=x]')),

  c('O-C3 重复键后者覆盖',
    '主仓 cq_parse_regression_test.go:227-234',
    '[CQ:set_group,action=ban,group_id=1,user_id=1,user_id=2]',
    cq('set_group', { action: 'ban', group_id: '1', user_id: '2' })),

  // ===== 五、冒号语法仅 stream（主仓 tokenize.go:176-181、cqcode.rs:425-436）=====
  c('N-A6 stream 等号语法',
    '主仓 cq_parse_regression_test.go:263-272',
    '[CQ:stream,type=start,qq=123]',
    cq('stream', { type: 'start', qq: '123' }, { kind: 'content' })),

  c('N-A7 stream 冒号语法（状态保持）',
    '主仓 cq_parse_regression_test.go:275-282',
    '[CQ:stream,type:start,qq:123]',
    cq('stream', { type: 'start', qq: '123' })),

  c('并集 §stream 冒号与等号混写',
    '站点 docs/cq码/CQ码汇总.md:84 + Refactor cqcode_pipeline.go:167-173',
    '[CQ:stream,type:start,qq=1]',
    cq('stream', { type: 'start', qq: '1' })),

  c('非 stream 段不认冒号语法（无 = 且无前键 → 片段丢弃）',
    '主仓 tokenize.go:176-181 / 站点 docs/cq码/CQ码汇总.md:84',
    '[CQ:image,file:https://x.com/a.png]',
    cq('image', {}, { bare: false })),

  // ===== 六、裸码与非法段名（主仓 cq_parse_regression_test.go:750-769、:286-299）=====
  c('[CQ:face] 无参裸码保留原文（旧内联正则漏掉的正是这类）',
    '主仓 cqparse/tokenize.go:64-65 + cq_parse_regression_test.go:750-769',
    '[CQ:face]你好',
    cq('face', {}, { bare: true, kind: 'passthrough', raw: '[CQ:face]' }),
    text('你好')),

  c('裸媒体码五连：均 bare 且无参数',
    '主仓 cq_parse_regression_test.go:752',
    '[CQ:image][CQ:record][CQ:voice][CQ:video][CQ:file]',
    cq('image', {}, { bare: true }),
    cq('record', {}, { bare: true }),
    cq('voice', {}, { bare: true }),
    cq('video', {}, { bare: true }),
    cq('file', {}, { bare: true })),

  c('[CQ:image,file=] 非裸码：参数区存在但值为空',
    '主仓 cq_parse_regression_test.go:752（同批裸码，结构上仍有参数区）',
    '[CQ:image,file=]正文',
    cq('image', { file: '' }, { bare: false }),
    text('正文')),

  c('[CQ:at] / [CQ:at,qq=] 变体原样保留（后端透传语义）',
    '主仓 cq_parse_regression_test.go:286-299',
    '[CQ:at][CQ:at,qq=]正文',
    cq('at', {}, { bare: true, known: true }),
    cq('at', { qq: '' }, { bare: false }),
    text('正文')),

  c('[CQ:member] 裸动作码', '主仓 cq_parse_regression_test.go:753',
    '[CQ:member]正文',
    cq('member', {}, { bare: true, kind: 'action' }),
    text('正文')),

  c('小写 [cq: 前缀整码透传（区分大小写）',
    '主仓 cq_parse_regression_test.go:287 + Refactor cqcode.go:114-115',
    '[cq:at,qq=123]正文',
    text('[cq:at,qq=123]正文')),

  c('N-A5 未知码 cardboard 原样保留、known=false',
    '主仓 cq_parse_regression_test.go:249-258',
    '[CQ:cardboard,xx=1]正文',
    cq('cardboard', { xx: '1' }, { known: false, kind: 'passthrough' }),
    text('正文')),

  c('F2 CARDIGAN 不被 card 前缀吞掉',
    'Refactor cqcode_pipeline.go:112-114 / tokenize.go:80-81',
    '[CQ:CARDIGAN,x=1]',
    cq('cardigan', { x: '1' }, { known: false, nameRaw: 'CARDIGAN' })),

  c('并集 §1 段名含数字合法、表外 → 未知段',
    '站点 docs/cq码/CQ码汇总.md:83 + Refactor tokenize.go:92-94',
    '[CQ:3d,x=1]',
    cq('3d', { x: '1' }, { known: false })),

  c('段名含 ! 非法 → 整码按文本透传',
    '站点 docs/cq码/CQ码汇总.md:83',
    '[CQ:at!,qq=1]正文',
    text('[CQ:at!,qq=1]正文')),

  c('段名含 ( 非法 → 整码按文本透传',
    '站点 docs/cq码/CQ码汇总.md:83',
    '[CQ:ar(x=1]正文',
    text('[CQ:ar(x=1]正文')),

  c('空段名 [CQ:] → 文本', '主仓 tokenize.go:58（action == ""）',
    '[CQ:]正文', text('[CQ:]正文')),

  c('无闭合 ] → 文本', '主仓 tokenize.go:142 / parse_string_test.go:45-48',
    '[CQ:at,qq=1正文', text('[CQ:at,qq=1正文')),

  c('畸形码不吞后随合法码：游标单字符重扫',
    '主仓 tokenize.go:26-29 + Refactor cqcode.rs:228-234',
    '[CQ:x,data={ [CQ:at,qq=1]',
    text('[CQ:x,data={ '),
    cq('at', { qq: '1' }, { raw: '[CQ:at,qq=1]' })),

  // ===== 七、scheme / base64 / 值内等号（主仓 cqcode.go:27-45、parse_string_test.go:15-43）=====
  c('N-A15 markdown base64 载荷（值内 = padding 不截断）',
    '主仓 cq_parse_regression_test.go:422-432',
    '[CQ:markdown,data=base64://eyJjb250ZW50IjoiaGkifQ==]正文',
    cq('markdown', { data: 'base64://eyJjb250ZW50IjoiaGkifQ==' }),
    text('正文')),

  c('语音 base64 + 尾随 size/asr 各自成键',
    '主仓 cqcode.go:30（base64RecordPattern 的同族参数）',
    '[CQ:record,file=base64://AAAA,size=100,asr=true]',
    cq('record', { file: 'base64://AAAA', size: '100', asr: 'true' })),

  c('金样 image url 含转义逗号',
    '主仓 internal/domain/message/parse_string_test.go:41',
    '[CQ:image,file=http://x.com/a&#44;b.png]',
    cq('image', { file: 'http://x.com/a,b.png' })),

  c('N-A12 未知 scheme 原样成值（foundItems 归属是后端的事）',
    '主仓 cq_parse_regression_test.go:334-341',
    '[CQ:file,file=weird://x]',
    cq('file', { file: 'weird://x' })),

  c('金样 file 码 name 参数',
    '主仓 internal/domain/message/parse_string_test.go:23',
    '[CQ:file,file=https://x.com/f.zip,name=doc.zip]',
    cq('file', { file: 'https://x.com/f.zip', name: 'doc.zip' })),

  c('金样 text 码（参数键与码名同名）',
    '主仓 internal/domain/message/parse_string_test.go:43',
    '[CQ:text,text=hello&#44;world]',
    cq('text', { text: 'hello,world' }, { known: true, kind: 'passthrough' })),

  c('本地路径 file:/// 值不被结构字符切坏',
    '主仓 cqcode.go:55（localImagePattern）',
    '[CQ:image,file=file:///D:/a b.png]',
    cq('image', { file: 'file:///D:/a b.png' })),

  // ===== 八、各码位识别（CODES 白名单覆盖，Refactor cqcode.rs:675-855）=====
  c('N-A16a active 带参', '主仓 cq_parse_regression_test.go:437-444',
    '[CQ:active,type=push,sub_type=1]主动',
    cq('active', { type: 'push', sub_type: '1' }, { kind: 'control' }),
    text('主动')),

  c('N-A13 remove 双参', '主仓 cq_parse_regression_test.go:396-405',
    '[CQ:remove,user_id=42,msg_id=7]',
    cq('remove', { user_id: '42', msg_id: '7' }, { kind: 'action' })),

  c('N-A14 缺 msg_id 时不产生该键', '主仓 cq_parse_regression_test.go:408-419',
    '[CQ:remove,user_id=42]',
    cq('remove', { user_id: '42' })),

  c('O-M4 enable 非法值完整上交', '主仓 cq_parse_regression_test.go:370-379',
    '[CQ:set_group,action=whole_ban,group_id=1,enable=abc]',
    cq('set_group', { action: 'whole_ban', group_id: '1', enable: 'abc' })),

  c('O-I 字母数字 reply id', '主仓 cq_parse_regression_test.go:383-391',
    '[CQ:reply,id=BAC3N5VPRKPRQ1GJ]正文',
    cq('reply', { id: 'BAC3N5VPRKPRQ1GJ' }, { kind: 'control' }),
    text('正文')),

  c('入站专用 reply,msg_idx 形态', '站点 docs/cq码/CQ码汇总.md:57 + 主仓 cqcode.go:199',
    '[CQ:reply,msg_idx=5]',
    cq('reply', { msg_idx: '5' })),

  c('wakeup 码（OpenID 值含字母）', '主仓 cqcode.go:45（wakeupPattern）',
    '[CQ:wakeup,userid=BAC3N5VPRKPRQ1GJ]',
    cq('wakeup', { userid: 'BAC3N5VPRKPRQ1GJ' }, { kind: 'control' })),

  c('O-G 两个 avatar 码相邻', '主仓 cq_parse_regression_test.go:542-557',
    '[CQ:avatar,qq=111]和[CQ:avatar,qq=222]',
    cq('avatar', { qq: '111' }, { kind: 'content' }),
    text('和'),
    cq('avatar', { qq: '222' }, { kind: 'content' })),

  c('N-G1 group_info 夹在中文之间', '主仓 cq_parse_regression_test.go:569-581',
    '前[CQ:group_info,field=name]后',
    text('前'),
    cq('group_info', { field: 'name' }, { kind: 'content' }),
    text('后')),

  c('N-G4 field 非法值仍是可识别码（原文保留由后端决定）',
    '主仓 cq_parse_regression_test.go:609-616',
    '[CQ:group_info,field=bogus]',
    cq('group_info', { field: 'bogus' })),

  c('N-G7 同群三码连排（无空文本段）', '主仓 cq_parse_regression_test.go:657-664',
    '[CQ:group_info,field=name][CQ:group_info,field=member_count][CQ:group_info,field=all]',
    cq('group_info', { field: 'name' }),
    cq('group_info', { field: 'member_count' }),
    cq('group_info', { field: 'all' })),

  c('M-fix 两条 member 连排', '主仓 cq_parse_regression_test.go:725',
    '[CQ:member,type=add,group_id=111,user_id=42][CQ:member,type=add,group_id=222,user_id=42]',
    cq('member', { type: 'add', group_id: '111', user_id: '42' }, { kind: 'action' }),
    cq('member', { type: 'add', group_id: '222', user_id: '42' }, { kind: 'action' })),

  c('music 码', '主仓 cqcode.go:38 + parse_string_test.go:33',
    '[CQ:music,type=qq,id=123]',
    cq('music', { type: 'qq', id: '123' }, { kind: 'content' })),

  c('input_notify 码', '主仓 cqcode.go:40',
    '[CQ:input_notify,type=1,second=5]',
    cq('input_notify', { type: '1', second: '5' }, { kind: 'content' })),

  c('voice 与 record 同义码（C-fix 键归一属后端，本层只识别码名）',
    '主仓 cq_parse_regression_test.go:688-695',
    '[CQ:voice,file=https://x.com/a.mp3]语音',
    cq('voice', { file: 'https://x.com/a.mp3' }, { kind: 'media' }),
    text('语音')),

  c('ark 入站卡片码（值含 &#44; 亦整码成段）',
    '站点 docs/cq码/CQ码汇总.md:55 + 主仓 cqcode.go:198',
    '[CQ:ark,ark_type=3,ark_name=x,prompt=a&#44;b]',
    cq('ark', { ark_type: '3', ark_name: 'x', prompt: 'a,b' }, { kind: 'content' })),

  c('poke / node / json 白名单码',
    'Refactor cqcode.rs:675-855（node/poke/json 条目）',
    '[CQ:poke,qq=1][CQ:node,id=123][CQ:json,data={"a":1}]',
    cq('poke', { qq: '1' }, { known: true, kind: 'passthrough' }),
    cq('node', { id: '123' }, { known: true, kind: 'passthrough' }),
    cq('json', { data: '{"a":1}' }, { known: true, kind: 'passthrough' })),

  // ===== 九、混排 / 邻接 / 位置口径 =====
  c('演练场默认输入（中文邻接 + 码间空格）',
    '站点 docs/components/Playground.vue 默认值',
    '[CQ:at,qq=10001] [CQ:face,id=14] 你好，世界！',
    cq('at', { qq: '10001' }, { raw: '[CQ:at,qq=10001]' }),
    text(' '),
    cq('face', { id: '14' }, { bare: false }),
    text(' 你好，世界！')),

  c('图片两枚相邻：不产空文本段',
    '主仓 tokenize.go:31-33（start > textStart 才 flush）',
    '[CQ:image,file=a.png][CQ:image,file=b.png]',
    cq('image', { file: 'a.png' }),
    cq('image', { file: 'b.png' })),

  c('纯文本输入 → 单个文本段',
    '主仓 tokenize.go:38-40',
    '没有 CQ 码的一行字',
    text('没有 CQ 码的一行字')),

  c('空输入 → 零段', '主仓 tokenize.go:14-15（空串无 Token）', '', text_removed()),

  c('码后残留未闭合码 → 尾部整段文本',
    '主仓 tokenize.go:38-40',
    '[CQ:face,id=1][CQ:image,file=x',
    cq('face', { id: '1' }),
    text('[CQ:image,file=x')),

  c('字节偏移 = 后端 Go Span 口径（UTF-8）',
    '主仓 cqparse/token.go:23-26（Span 为字节偏移）',
    '你好[CQ:image,file=x]👋',
    text('你好'),
    cq('image', { file: 'x' }, { start: 2, end: 19, byteStart: 6, byteEnd: 23 }),
    text('👋')),

  c('多码混排：base64 / JSON / 裸码 / 未知码 / 大小写 / 空白',
    '综合：主仓 cq_parse_regression_test.go:173、:425、:752、:251 + Refactor tokenize.go:85-122',
    '[CQ:Markdown,DATA=base64://e30=][CQ:image , file = a.png][CQ:face][CQ:unknown,x=1]尾',
    cq('markdown', { data: 'base64://e30=' }, { nameRaw: 'Markdown', kind: 'content' }),
    cq('image', { file: 'a.png' }),
    cq('face', {}, { bare: true }),
    cq('unknown', { x: '1' }, { known: false, kind: 'passthrough' }),
    text('尾')),

  // ===== 十、后端自有测试逐条对拍（Refactor crates/gensokyo-protocol/src/cqcode.rs 的 #[test]）=====
  c('段名后空白 + ] 收尾 → 无参裸段',
    'Refactor cqcode.rs:1121（parse("[CQ:at ]")）',
    '[CQ:at ]正文',
    cq('at', {}, { bare: true, raw: '[CQ:at ]' }),
    text('正文')),

  c('段名后空白 + 空参数区 → 非裸码但零键',
    'Refactor cqcode.rs:1122（parse("[CQ:active , ]")）',
    '[CQ:active , ]',
    cq('active', {}, { bare: false, kind: 'control' })),

  c('放宽后仍要求闭合 ]',
    'Refactor cqcode.rs:1133-1136',
    '[CQ:image , file = x',
    text('[CQ:image , file = x')),

  c('键序 + 空白 + 值内空格三者共存',
    'Refactor cqcode.rs:1139-1140（parse_one "[CQ:file , file_name = my report.txt ]"）',
    '[CQ:file , file_name = my report.txt ]',
    cq('file', { file_name: 'my report.txt' })),

  c('大小写 + 空白 + 任意键序组合',
    'Refactor cqcode.rs:1174-1180（"[CQ: IMAGE , FILE = x , NAME = y ]"）',
    '[CQ: IMAGE , FILE = x , NAME = y ]',
    cq('image', { file: 'x', name: 'y' }, { nameRaw: 'IMAGE' })),

  c('未知段名同样归一小写、raw 逐字节不改写',
    'Refactor cqcode.rs:1182-1184（unknown[0].raw_or_cq() 仍为原文）',
    '[CQ:Cardboard,XX=1]',
    cq('cardboard', { xx: '1' }, { known: false, nameRaw: 'Cardboard', raw: '[CQ:Cardboard,XX=1]' })),

  c('Face/ID 归一（值不参与大小写处理）',
    'Refactor cqcode.rs:1186-1192（"[CQ:Face,ID=1]"、"[CQ:image,File=A B]"）',
    '[CQ:Face,ID=1][CQ:image,File=A B]',
    cq('face', { id: '1' }),
    cq('image', { file: 'A B' })),

  c('小写 [cq: 前缀整段留文本（Rust 侧同口径）',
    'Refactor cqcode.rs:1195-1198',
    '[cq:image,file=x]',
    text('[cq:image,file=x]')),

  c('\\v 不属于词法 ASCII 五元集 → 按文本',
    'Refactor cqcode.rs:1200-1203',
    '[CQ:\u000bimage,file=x]',
    text('[CQ:\u000bimage,file=x]')),

  c('record 契约形态：大写段名 + 键大写 + asr 在 file 前 + 值内空格',
    'Refactor cqcode.rs:1211-1222（record_contract_shape_case_space_order_and_asr）',
    '[CQ:RECORD , ASR = ab , file = my voice.amr]',
    cq('record', { asr: 'ab', file: 'my voice.amr' }, { nameRaw: 'RECORD' })),

  c('JSON 值前带空白的配平（data = {"a":1,2}）',
    'Refactor cqcode.rs:1248-1251 + 主仓 Refactor tokenize.go:176-178',
    '[CQ:keyboard , data = {"a":1,2}]',
    cq('keyboard', { data: '{"a":1,2}' }, { raw: '[CQ:keyboard , data = {"a":1,2}]' })),

  c('JSON 字符串内 ] 与嵌套对象内的 , 都不截码',
    'Refactor cqcode.rs:1264-1271（brace_balanced_end_skips_bracket_inside_json）',
    '[CQ:markdown,data={"content":"a]b , c","x":{"y":1,2}}]',
    cq('markdown', { data: '{"content":"a]b , c","x":{"y":1,2}}' })),

  c('配平失败整码按文本（不再产出被截断参数的码段）',
    'Refactor cqcode.rs:1278-1280',
    '[CQ:keyboard,data={"a":1]',
    text('[CQ:keyboard,data={"a":1]')),

  c('段名非法不吞内嵌码：Bad 归一为未知段，后码照常',
    'Refactor cqcode.rs:1301-1304',
    '[CQ:Bad,x=1][CQ:at,qq=2]',
    cq('bad', { x: '1' }, { known: false }),
    cq('at', { qq: '2' })),

  c('实体与并值交互：&amp; 与 &#91; 之间隔一个裸逗号',
    'Refactor cqcode.rs:905（unescape("&amp;,&#91;,…")）+ 主仓 tokenize.go:163-167 并值',
    '[CQ:file,file_name=&amp;,&#91;]',
    cq('file', { file_name: '&,[' }))
]

// ---------- 断言辅助 ----------

// text_removed() 专用于「期望零段」的空输入用例（避免与 text('') 混淆）。
function text_removed() {
  return { t: '__none__' }
}

function c(name, source, input, ...expect) {
  return { name, source, input, expect }
}

const KNOWN_LIST = new Set(CQ_CODE_NAMES)

// 全量不变式：与期望值互补，任何用例都必查。
function checkInvariants(tc, tokens) {
  const problems = []
  let cursor = 0
  let byteCursor = 0
  const joined = tokens.map((t) => t.raw).join('')
  if (joined !== tc.input) problems.push('raw 拼接不等于输入原文')
  for (const t of tokens) {
    if (t.start !== cursor) problems.push(`段起点不连续：期望 ${cursor}，实际 ${t.start}`)
    if (t.end - t.start !== t.raw.length) problems.push('end-start 与 raw 长度不一致')
    const bytes = Buffer.byteLength(t.raw, 'utf8')
    if (t.byteEnd - t.byteStart !== bytes) {
      problems.push(`字节跨度 ${t.byteEnd - t.byteStart} ≠ UTF-8 实际 ${bytes} 字节`)
    }
    if (t.byteStart !== byteCursor) problems.push(`byteStart ${t.byteStart} ≠ 累计 ${byteCursor}`)
    cursor = t.end
    byteCursor = t.byteEnd
    if (t.type === 'text' && t.raw === '') problems.push('出现空文本段')
    if (t.type === 'cq') {
      if (t.name !== t.name.toLowerCase()) problems.push('段名未归一小写')
      if (t.known !== KNOWN_LIST.has(t.name)) problems.push('known 标记与 CODES 白名单不一致')
      if (t.bare && Object.keys(t.params).length > 0) problems.push('裸码不应有参数')
      for (const key of Object.keys(t.params)) {
        if (key !== key.toLowerCase()) problems.push(`参数键未归一小写：${key}`)
        if (key !== key.trim()) problems.push(`参数键未 trim：[${key}]`)
      }
    }
  }
  if (byteCursor !== Buffer.byteLength(tc.input, 'utf8')) problems.push('末字节偏移 ≠ 输入字节长度')
  return problems
}

function diffTokens(expect, actual) {
  const lines = []
  if (expect.length !== actual.length) {
    lines.push(`  段数：期望 ${expect.length}，实际 ${actual.length}`)
  }
  const n = Math.max(expect.length, actual.length)
  for (let i = 0; i < n; i++) {
    const e = expect[i]
    const a = actual[i]
    if (!e) {
      lines.push(`  #${i} 多余实际段：${brief(a)}`)
      continue
    }
    if (!a) {
      lines.push(`  #${i} 缺少期望段：${JSON.stringify(e)}`)
      continue
    }
    if (e.t === '__none__') continue
    if (e.t !== a.type) {
      lines.push(`  #${i} type：期望 ${e.t}，实际 ${a.type}`)
      continue
    }
    if (e.raw !== undefined && e.raw !== a.raw) lines.push(`  #${i} raw：期望 ${q(e.raw)}，实际 ${q(a.raw)}`)
    if (e.t === 'cq') {
      if (e.name !== a.name) lines.push(`  #${i} name：期望 ${e.name}，实际 ${a.name}`)
      for (const field of ['bare', 'known', 'kind', 'nameRaw', 'start', 'end', 'byteStart', 'byteEnd']) {
        if (e[field] !== undefined && e[field] !== a[field]) {
          lines.push(`  #${i} ${field}：期望 ${q(e[field])}，实际 ${q(a[field])}`)
        }
      }
      try {
        assert.deepEqual(a.params, e.params)
      } catch {
        lines.push(`  #${i} params：期望 ${JSON.stringify(e.params)}，实际 ${JSON.stringify(a.params)}`)
      }
    }
  }
  return lines
}

function q(v) {
  return typeof v === 'string' ? JSON.stringify(v) : String(v)
}

function brief(tok) {
  if (!tok) return 'undefined'
  if (tok.type === 'text') return `text ${JSON.stringify(tok.raw)}`
  return `cq ${tok.name} params=${JSON.stringify(tok.params)} bare=${tok.bare} known=${tok.known}`
}

// ---------- 主流程 ----------

let tokenTotal = 0
const failures = []

for (const tc of cases) {
  const tokens = tokenize(tc.input)
  const parsed = parseCq(tc.input)
  tokenTotal += tokens.length
  try {
    assert.deepEqual(parsed.source, tc.input, 'parseCq 应回传原文')
    assert.deepEqual(parsed.tokens, tokens, 'parseCq 与 tokenize 结果应一致')
    const problems = checkInvariants(tc, tokens)
    if (problems.length) throw new Error(`不变式违例：${problems.join('；')}`)
    const expect = tc.expect[0] && tc.expect[0].t === '__none__' ? [] : tc.expect
    const lines = diffTokens(expect, tokens)
    if (lines.length) throw new Error(`段结构不符：\n${lines.join('\n')}`)
  } catch (err) {
    failures.push({ tc, err })
  }
}

const sourceTotal = cases.length
if (failures.length) {
  console.error(`FAIL ${failures.length}/${sourceTotal} 用例（共 ${tokenTotal} 段被校验）`)
  for (const { tc, err } of failures) {
    console.error(`\n- ${tc.name}\n  依据：${tc.source}\n  输入：${JSON.stringify(tc.input)}\n  ${err.message}`)
  }
  process.exitCode = 1
} else {
  console.log(`PASS ${sourceTotal} 用例 / ${tokenTotal} 段（码表白名单 ${CQ_CODE_NAMES.length} 个码名）`)
  console.log('夹具来源：主仓 cq_parse_regression_test.go + cq_threepath_matrix_test.go + ' +
    'internal/domain/message/parse_string_test.go + Refactor 统一契约与 cqcode.rs CODES')
}
