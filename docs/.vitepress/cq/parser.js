/**
 * CQ 码解析引擎 —— 与 Gensokyo 后端真实解析语义逐条对齐的独立模块。
 *
 * 纯 ESM / 零依赖 / SSR 安全（不触碰 window、document，构建期 Node 侧可直接 import）。
 *
 * 对齐时间戳：2026-11-14 实读两份后端仓源码。下列 file:line 即本文件每条规则的出处，
 * 后端解析口径若再变动，请顺带回查这些位置（站点文档口径见 docs/cq码/CQ码汇总.md:77-87）。
 *
 * 一、前缀与段名
 *   - 只识别大写 `[CQ:`；小写 `[cq:` 整码按字面文本透传：
 *       主仓 handlers/cqparse/tokenize.go:5-6（cqPrefix 与「小写维持字面泄漏」注释）
 *       Refactor handlers/cqcode.go:114-115（cqCodeOpen「前缀字面区分大小写」）
 *       Refactor crates/gensokyo-protocol/src/cqcode.rs:243-252（find_code_start 字面比对）
 *       主仓 handlers/cq_parse_regression_test.go:286-299（`[cq:at,qq=123]` 原样保留）
 *   - 段名字符集为 `[A-Za-z0-9_]`；`[CQ:` 之后、段名之后允许任意空白；段名统一小写归一；
 *     段名整词匹配（不做前缀匹配，`[CQ:cardigan,..]` 不被 `card` 误吞）：
 *       Refactor handlers/cqparse/tokenize.go:15-16、:85-122（ScanCode 词法步，含 :97「Raw 保留原文」）
 *       Refactor crates/gensokyo-protocol/src/cqcode.rs:400-409（字符集校验 + to_ascii_lowercase）
 *   - 段名后必须紧跟 `,` 或 `]`；直接以 `]` 收尾者为「无参裸码」（本模块 bare=true），
 *     裸码一律保留原文字面、不产参数：
 *       主仓 handlers/cqparse/tokenize.go:63-75 / Refactor 同名文件 :110-121
 *       主仓 handlers/cq_parse_regression_test.go:750-769（裸媒体码/裸动作码字面保留）
 *   - 段名含 `!`、`(`、全角空格等非法字符 → 整码按文本透传：
 *       Refactor handlers/cqparse/tokenize.go:94（字符集白名单）
 *
 * 二、空白口径（两层，互不通用）
 *   - 词法切分空白集 = ASCII 五元集 {空格, \t, \n, \f, \r}，不含 \v、不含 U+3000：
 *       Refactor handlers/cqparse/tokenize.go:9-11（cqSpaceBytes，同 Go 正则 \s / Rust is_cq_space）
 *       Refactor crates/gensokyo-protocol/src/cqcode.rs:457（is_cq_space）
 *   - 键、值两侧的 trim 为 Unicode 语义（\v、U+3000、NBSP 都参与 trim），且值只 trim 首尾、
 *   内部空格保留：
 *       Refactor crates/gensokyo-protocol/src/cqcode.rs:466-469（push_param 的 trim + unescape）
 *       主仓 handlers/cqparse/tokenize.go:155-159（TrimSpace 键与值）
 *       主仓 handlers/cqcode.go:402-419（cqParseParams 同款 TrimSpace）
 *   - 空白不重置「JSON 值起点」判定，故 `data = {"k":1}` 与 `data={"k":1}` 同口径：
 *       Refactor handlers/cqparse/tokenize.go:176-178（scanSegments 空白分支）
 *
 * 三、参数区切分（`,` 切段 + 花括号配平）
 *   - 值在段首或 `=` 之后以 `{` 开头时做花括号配平整段吞掉，JSON 内的 `,` `]` 既不切段
 *     也不收码；配平失败或无闭合 `]` → 整码按文本透传：
 *       主仓 handlers/cqparse/tokenize.go:85-143（scanSegments 状态机，:98-107 字符串内转义）
 *       Refactor crates/gensokyo-protocol/src/cqcode.rs:443-448（scan_params 复用同口径）
 *       主仓 handlers/cq_parse_regression_test.go:184-194（`data={"a":[1,2]}`）、
 *       :196-205（未闭合整段留正文）、:447-457（md 载荷内嵌 CQ 串不被误提取）
 *   - 键值以段内首个 `=` 切分（值内的 `=` 如 base64 padding 不受影响）：
 *       主仓 handlers/cqparse/tokenize.go:172-183（splitKV）
 *   - `:` 分隔只对 stream 段生效（冒号/等号双语法可混用），其余段不认冒号：
 *       主仓 handlers/cqparse/tokenize.go:176-181、Refactor crates/.../cqcode.rs:425-437
 *       主仓 handlers/cq_parse_regression_test.go:260-283（N-A6/N-A7）
 *   - 无 `=` 的尾随片段并入前一 key 的值、以 `,` 连接（`user_ids=1,2,3` 三路径等价）；
 *     键为空的片段丢弃、片段 trim 后为空亦丢弃：
 *       主仓 handlers/cqparse/tokenize.go:150-170（buildParams，C3 修复）
 *       Refactor handlers/cqcode.go:89-112（cqUnionParamsSegments 同口径）
 *       主仓 handlers/cq_parse_regression_test.go:237-247、:89（cq_threepath_matrix_test.go）
 *   - 重复键后者覆盖；参数键 trim 后统一小写（`File=` → `file`、`subType` → `subtype`）：
 *       Refactor handlers/cqparse/tokenize.go:187-192、crates/.../cqcode.rs:468-469
 *
 * 四、实体解码（唯一四字符集，与生成侧互为逆操作）
 *   - 解码集 = `&#93;`→`]`、`&#44;`→`,`、`&#91;`→`[`、`&amp;`→`&`，四实体等长、互不为前缀；
 *     Go 按上述顺序四次 ReplaceAll（`&amp;` 必须最后），故结果等价于「单趟从左到右扫描」，
 *     `&amp;#91;` 只还原成字面 `&#91;` 而不会被二次还原为 `[`：
 *       主仓 handlers/cqparse/escape.go:5-28（EncodeValue/DecodeValue 与顺序正确性注释）
 *       Refactor crates/gensokyo-protocol/src/cqcode.rs:132-164（unescape 单趟 ≡ 四次 ReplaceAll）
 *       主仓 handlers/cq_parse_regression_test.go:207-235（O-C1/O-C2 四实体解码）
 *   - 解码只作用于 params 的值；`raw` 字段始终是原文切片，识别成功的段透传时逐字节不改写：
 *       Refactor handlers/cqcode.go:122-124（键小写归一、值仅 trim）与 crates/.../segment.rs:156
 *       （raw_or_cq：命中码段优先输出整段原文）
 *   - 解析失败的畸形段不跳过整段，游标只前进一个字符继续重扫，故失败片段后方的合法码
 *     仍被识别（`[CQ:x,data={ [CQ:at,qq=1]` 里的 at 段仍是码）：
 *       主仓 handlers/cqparse/tokenize.go:26-29、Refactor crates/.../cqcode.rs:228-234
 *
 * 五、码名白名单（known 字段来源）
 *   - Refactor crates/gensokyo-protocol/src/cqcode.rs:675-855 `CODES` 码表 26 个码名；
 *     表外码名（如 `cardboard`）按未知码处理：仍成段、known=false、后端原样透传，
 *     主仓 handlers/cq_parse_regression_test.go:249-258（N-A5）为证。
 *   - kind 分类沿用后端码表分发类别映射：
 *       主仓 handlers/cqparse/tokenize.go:185-204（kindForAction）+ token.go:8-21（Kind 常量）
 *
 * 六、与后端两版本差异（本模块取「最大兼容并集」，即站点文档 :77-87 的口径）
 *   - 主仓 handlers/cqparse/tokenize.go:54/:155 的 new 模式段名只收 `[a-z_]+`、键不转小写、
 *     段名前不允许空白；Refactor 统一契约（cqcode.go:75-112 + cqparse/tokenize.go:85-192）
 *     与 Rust 端口放宽为并集。本站演示按并集口径实现，等价于 cq_parse_mode 三模式
 *     （legacy/shadow/new，主仓 config/config.go:2840-2856）合起来的识别上限。
 *   - stream 段内空键冒号片段（如 `[CQ:stream,:x]`）：Go 两路径丢弃该片段
 *     （cqcode.go:104-107 / tokenize.go:198-201），Rust push_param 会并入前一键值
 *     （cqcode.rs:432-436）。本模块跟 Go 后端（丢弃）——此处两份后端仓不一致，已登记。
 */

// 码体起始字面（区分大小写，见文件头「一」）。
const CQ_PREFIX = '[CQ:'

// ASCII 五元空白集（词法层）：空格 \t \n \f \r —— 不含 \v、不含 U+3000。
function isCqSpace(code) {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0c || code === 0x0d
}

// 段名字符集 [A-Za-z0-9_]（Refactor cqparse/tokenize.go:94）。
function isNameChar(code) {
  return (
    (code >= 0x61 && code <= 0x7a) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x30 && code <= 0x39) ||
    code === 0x5f
  )
}

// CQ 码表（Rust CODES 码名，顺序与 cqcode.rs:676-855 一致）。
export const CQ_CODE_NAMES = Object.freeze([
  'text',
  'at',
  'reply',
  'image',
  'record',
  'video',
  'file',
  'face',
  'markdown',
  'card',
  'keyboard',
  'stream',
  'input_notify',
  'music',
  'active',
  'wakeup',
  'node',
  'set_group',
  'remove',
  'poke',
  'member',
  'group_info',
  'avatar',
  'voice',
  'ark',
  'json'
])

// 分发类别（主仓 cqparse/tokenize.go:185-204 kindForAction）：
// 表外码名一律 passthrough（at/face/未知码原样保留在正文）。
const CODE_KIND = Object.freeze({
  image: 'media',
  record: 'media',
  voice: 'media',
  video: 'media',
  file: 'media',
  markdown: 'content',
  keyboard: 'content',
  card: 'content',
  input_notify: 'content',
  stream: 'content',
  music: 'content',
  avatar: 'content',
  group_info: 'content',
  ark: 'content',
  reply: 'control',
  active: 'control',
  wakeup: 'control',
  member: 'action',
  remove: 'action',
  set_group: 'action'
})

const KNOWN_SET = new Set(CQ_CODE_NAMES)

// 四实体（等长、互不为前缀）；单趟扫描与 Go DecodeValue 的四次 ReplaceAll 等价（见文件头「四」）。
const ENTITIES = {
  '&#93;': ']',
  '&#44;': ',',
  '&#91;': '[',
  '&amp;': '&'
}

/**
 * 还原 CQ 码参数值中的实体（`&#93;`/`&#44;`/`&#91;`/`&amp;`）。
 * 未知 `&` 序列按字面保留，与后端宽容解码口径一致（escape.go:22-28、cqcode.rs:134-136）。
 */
export function decodeValue(value) {
  let out = ''
  let i = 0
  while (i < value.length) {
    if (value[i] === '&') {
      const seq = value.slice(i, i + 5)
      const rep = Object.prototype.hasOwnProperty.call(ENTITIES, seq) ? ENTITIES[seq] : undefined
      if (rep !== undefined) {
        out += rep
        i += 5
        continue
      }
    }
    out += value[i]
    i += 1
  }
  return out
}

/**
 * 参数区扫描：从 `from` 起按 `,` 切段，值起点处的 `{` 做花括号配平（JSON 内的 `,` `]`
 * 不切段、不收码），直到配对的 `]`。
 * @returns {{ segments: string[], end: number } | null} null = 配平失败或无闭合 `]`
 */
function scanSegments(s, from) {
  const segments = []
  let segStart = from
  let q = from
  let depth = 0
  let inStr = false
  let esc = false
  let segHasEq = false // 当前段是否已出现首个 `=`（其后为值区）
  let atValueStart = true // 段首 / `=` 之后：下一个 `{` 视为 JSON 值起点
  while (q < s.length) {
    const c = s.charCodeAt(q)
    if (depth > 0) {
      if (inStr) {
        if (esc) esc = false
        else if (c === 0x5c) esc = true // \
        else if (c === 0x22) inStr = false // "
      } else if (c === 0x22) {
        inStr = true
      } else if (c === 0x7b) {
        depth += 1 // {
      } else if (c === 0x7d) {
        depth -= 1 // }
      }
      q += 1
      continue
    }
    if (c === 0x5d) {
      segments.push(s.slice(segStart, q))
      return { segments, end: q + 1 }
    } else if (c === 0x7b && atValueStart) {
      depth = 1
      inStr = false
      esc = false
      atValueStart = false
    } else if (c === 0x3d && !segHasEq) {
      segHasEq = true
      atValueStart = true
    } else if (c === 0x2c) {
      segments.push(s.slice(segStart, q))
      segStart = q + 1
      segHasEq = false
      atValueStart = true
    } else if (!isCqSpace(c)) {
      atValueStart = false
    }
    q += 1
  }
  return null // 无闭合 ]
}

/**
 * 从 start（必须指向 `[CQ:` 字面起点）扫描一个完整 CQ 码。
 * @returns {{ name, nameRaw, segments, end, bare } | null} null = 该位置不是码
 */
function scanCode(s, start) {
  let p = start + CQ_PREFIX.length
  while (p < s.length && isCqSpace(s.charCodeAt(p))) p += 1 // 段名前空白
  const nameStart = p
  while (p < s.length && isNameChar(s.charCodeAt(p))) p += 1
  const nameRaw = s.slice(nameStart, p)
  if (nameRaw === '' || p >= s.length) return null
  while (p < s.length && isCqSpace(s.charCodeAt(p))) p += 1 // 段名后空白
  if (p >= s.length) return null
  const c = s.charCodeAt(p)
  if (c === 0x5d) {
    // 无参裸码：`]` 直接收尾，参数区不存在
    return { name: nameRaw.toLowerCase(), nameRaw, segments: [], end: p + 1, bare: true }
  }
  if (c !== 0x2c) return null
  const scanned = scanSegments(s, p + 1)
  if (!scanned) return null
  return { name: nameRaw.toLowerCase(), nameRaw, segments: scanned.segments, end: scanned.end, bare: false }
}

/** 段内首个 `=` 切键值；仅 stream 段在无 `=` 时兼容首个 `:`（空键冒号片段按 Go 口径丢弃）。 */
function splitKV(seg, allowColon) {
  const eq = seg.indexOf('=')
  if (eq >= 0) return [seg.slice(0, eq), seg.slice(eq + 1)]
  if (allowColon) {
    const colon = seg.indexOf(':')
    if (colon > 0) return [seg.slice(0, colon), seg.slice(colon + 1)]
  }
  return null
}

/**
 * 参数段 → 参数 map（键 trim + 小写、值 trim + 实体解码、重复键后者覆盖、无 `=` 尾段并前键）。
 */
function buildParams(name, segments) {
  const params = {}
  const allowColon = name === 'stream'
  let lastKey = ''
  for (const seg of segments) {
    const kv = splitKV(seg, allowColon)
    if (kv) {
      const key = kv[0].trim().toLowerCase()
      if (key === '') continue
      params[key] = decodeValue(kv[1].trim())
      lastKey = key
      continue
    }
    const tail = seg.trim()
    if (lastKey !== '' && tail !== '') {
      // 并入值同样解码实体，与前段解码语义一致（主仓 tokenize.go:164-166）
      params[lastKey] = params[lastKey] + ',' + decodeValue(tail)
    }
  }
  return params
}

/** UTF-8 字节偏移前缀表：offsets[k] = 前 k 个 UTF-16 码元的 UTF-8 字节数。 */
function buildByteOffsets(s) {
  const offsets = new Int32Array(s.length + 1)
  let acc = 0
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i)
    if (c < 0x80) {
      acc += 1
    } else if (c < 0x800) {
      acc += 2
    } else if (
      c >= 0xd800 &&
      c <= 0xdbff &&
      i + 1 < s.length &&
      s.charCodeAt(i + 1) >= 0xdc00 &&
      s.charCodeAt(i + 1) <= 0xdfff
    ) {
      // 代理对：整字符 4 字节，低代理位的偏移记为整字符之后
      acc += 4
      offsets[i + 1] = acc
      offsets[i + 2] = acc
      i += 1
      continue
    } else {
      acc += 3
    }
    offsets[i + 1] = acc
  }
  return offsets
}

function textToken(s, from, to, offsets) {
  return {
    type: 'text',
    raw: s.slice(from, to),
    start: from,
    end: to,
    byteStart: offsets[from],
    byteEnd: offsets[to]
  }
}

function cqToken(s, start, scanned, offsets) {
  const params = buildParams(scanned.name, scanned.segments)
  return {
    type: 'cq',
    name: scanned.name,
    nameRaw: scanned.nameRaw,
    params,
    rawSegments: scanned.segments,
    bare: scanned.bare,
    known: KNOWN_SET.has(scanned.name),
    kind: CODE_KIND[scanned.name] || 'passthrough',
    raw: s.slice(start, scanned.end),
    start,
    end: scanned.end,
    byteStart: offsets[start],
    byteEnd: offsets[scanned.end]
  }
}

/**
 * 把消息文本扫描为段序列：文本段 + CQ 码段，按 start 升序、互不重叠、raw 拼接可还原原文。
 *
 * @param {string} text 消息文本（OneBot CQ 码字符串）
 * @returns {Array<object>} 段序列
 *   文本段：{ type:'text', raw, start, end, byteStart, byteEnd }
 *   码段：  { type:'cq', name, nameRaw, params, rawSegments, bare, known, kind,
 *             raw, start, end, byteStart, byteEnd }
 *   其中 start/end 为 UTF-16 码元下标（JS slice 口径），byteStart/byteEnd 为 UTF-8 字节
 *   偏移（后端 Go 的 Span 口径，主仓 cqparse/token.go:23-26），name 为小写归一段名，
 *   params 值已 trim + 实体解码，raw 为逐字节原文（含 `[CQ:` 与收尾 `]`），
 *   bare=true 表示 `[CQ:face]` 这类无参裸码（后端保留字面），known=false 表示码名不在
 *   CODES 白名单（后端按未知码原样透传）。
 */
export function tokenize(text) {
  const s = text == null ? '' : String(text)
  const offsets = buildByteOffsets(s)
  const tokens = []
  let textStart = 0
  let i = 0
  while (i < s.length) {
    const j = s.indexOf(CQ_PREFIX, i)
    if (j < 0) break
    const scanned = scanCode(s, j)
    if (!scanned) {
      // 非法码起点：游标只前进一个字符重扫，原文保持不动（主仓 tokenize.go:26-29）
      i = j + 1
      continue
    }
    if (j > textStart) tokens.push(textToken(s, textStart, j, offsets))
    tokens.push(cqToken(s, j, scanned, offsets))
    i = scanned.end
    textStart = scanned.end
  }
  if (textStart < s.length) tokens.push(textToken(s, textStart, s.length, offsets))
  return tokens
}

/**
 * 解析入口：返回 { source, tokens }，tokens 即 tokenize 的段序列。
 * @param {string} text
 */
export function parseCq(text) {
  const source = text == null ? '' : String(text)
  return { source, tokens: tokenize(source) }
}
