<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
// 解析引擎唯一入口：站内不再自带第二套 CQ 码解析实现（语义与后端对齐，见模块头 file:line 依据）
import { parseCq } from '../.vitepress/cq/parser.js'
import {
  CQ_REQUIRED,
  DEFAULT_BARE_NOTE,
  KIND_LABELS,
  MISSING_PARAM_NOTE,
  metaOf
} from './cq/meta.js'
import { CQ_EXAMPLES } from './cq/examples.js'
import './cq/tone.css'
import AtPreview from './cq/AtPreview.vue'
import FacePreview from './cq/FacePreview.vue'
import MediaPreview from './cq/MediaPreview.vue'
import GenericPreview from './cq/GenericPreview.vue'
import UnknownPreview from './cq/UnknownPreview.vue'

const MEDIA_CODES = new Set(['image', 'record', 'voice', 'video', 'file'])
// 链接类参数只做「形态」提示，不断言后端校验结论（本地路径对后端仍是合法输入）
const LINK_KEYS = new Set(['url', 'file', 'pic_url', 'src', 'image', 'audio', 'cover'])

const cqInput = ref('[CQ:at,qq=10001] [CQ:face,id=14] 你好，世界！')
const tokens = computed(() => parseCq(cqInput.value).tokens)
const parsedJson = computed(() => JSON.stringify(tokens.value, null, 2))

const copyState = ref({ key: '', ok: false })
const liveMessage = ref('')
let copyTimer = null

// 分享态：链接只在点过「复制分享链接」后展示，复制失败时它就是手动复制的落点
const shareUrl = ref('')
const shareLabel = ref('复制分享链接')
const shareUrlEl = ref(null)
let shareTimer = null

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
  if (shareTimer) clearTimeout(shareTimer)
})

// 地址栏 ?cq= 回填：查询参数只在挂载后读一次，SSR 期没有 window
onMounted(() => {
  const shared = new URLSearchParams(window.location.search).get('cq')
  if (shared) cqInput.value = shared
})

function previewFor(token) {
  if (!token.known) return UnknownPreview
  if (token.name === 'at') return AtPreview
  if (token.name === 'face') return FacePreview
  if (MEDIA_CODES.has(token.name)) return MediaPreview
  return GenericPreview
}

function kindLabel(token) {
  if (!token.known) return '未知码'
  return KIND_LABELS[token.kind] || token.kind
}

function bareNote(token) {
  const meta = metaOf(token.name)
  return (meta && meta.bareNote) || DEFAULT_BARE_NOTE
}

// 码级校验：裸码已有专属说明、未知码交给带外提示，两者都不再叠加这条
function missingHint(token) {
  if (!token.known || token.bare) return ''
  const groups = CQ_REQUIRED[token.name]
  if (!groups) return ''
  const missing = groups.some((group) =>
    group.every((key) => token.params[key] === undefined || token.params[key] === '')
  )
  return missing ? MISSING_PARAM_NOTE : ''
}

function paramHint(key, value) {
  if (value === '') return '空值'
  if (/^base64:\/\//i.test(value)) return 'base64:// 载荷形态，网页端不解码'
  if (LINK_KEYS.has(key) && !/^https?:\/\//i.test(value)) {
    return '不是 http(s) 链接，也不是 base64:// 形态'
  }
  return ''
}

async function writeClipboard(text) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 非安全上下文或权限被拒：落到选中原文，由用户手动复制
  }
  return false
}

// 选中兜底：把目标节点内容整段框进选区，剪贴板不可用时用户按 Ctrl+C 即可
function selectElement(target) {
  if (!target || typeof window === 'undefined' || !window.getSelection) return
  const range = document.createRange()
  range.selectNodeContents(target)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

// 复制失败兜底：原文按钮选本段的 .cq-tag，JSON 按钮选 JSON 代码块（该块在 .cq-card 之外，故按按钮就近取 .panel）
function selectFallback(button, field) {
  if (!button) return
  if (field === 'json') {
    const scope = button.closest('.panel')
    if (!scope) return
    const block = scope.querySelector('.json-code-block')
    // 折叠的 <details> 内容无法被选中，先展开
    if (block && !block.open) block.open = true
    selectElement(block ? block.querySelector('pre code') : null)
    return
  }
  const card = button.closest('.cq-card')
  if (card) selectElement(card.querySelector('.cq-tag'))
}

function markCopy(key, ok, field) {
  copyState.value = { key, ok }
  const part = field === 'json' ? '解析 JSON' : '原文'
  liveMessage.value = ok ? '已复制到剪贴板' : `复制失败，已选中${part}，请按 Ctrl+C`
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copyState.value = { key: '', ok: false }
  }, 2000)
}

async function copyToken(token, field, event) {
  // event.currentTarget 在 await 之后会被置空，先把按钮引用取下来
  const button = event?.currentTarget || null
  const text = field === 'json' ? JSON.stringify(token, null, 2) : token.raw
  const ok = await writeClipboard(text)
  if (!ok) selectFallback(button, field)
  markCopy(token.start + ':' + field, ok, field)
}

function copyLabel(token, field) {
  if (copyState.value.key !== token.start + ':' + field) {
    return field === 'json' ? '复制解析 JSON' : '复制原文'
  }
  return copyState.value.ok ? '已复制' : '已选中'
}

// 样例回填：覆盖输入即触发解析；已处于分享态时顺带刷新链接，避免复制到过期内容
function applyExample(event) {
  const select = event?.target
  const value = select?.value || ''
  if (!value) return
  cqInput.value = value
  select.value = '' // 复位下拉，让同一样例可重复点击
  if (new URLSearchParams(window.location.search).has('cq')) shareUrl.value = syncShareParam()
}

// 把当前输入写进 ?cq=（encodeURIComponent 口径），hash 与其它查询参数原样保留
function syncShareParam() {
  const url = new URL(window.location.href)
  if (cqInput.value) url.searchParams.set('cq', cqInput.value)
  else url.searchParams.delete('cq')
  window.history.replaceState(window.history.state, '', url)
  return url.href
}

async function shareLink() {
  shareUrl.value = syncShareParam()
  const ok = await writeClipboard(shareUrl.value)
  if (!ok) {
    await nextTick()
    selectElement(shareUrlEl.value)
  }
  liveMessage.value = ok ? '分享链接已复制' : '分享链接复制失败，已选中链接，请按 Ctrl+C'
  shareLabel.value = ok ? '链接已复制' : '复制失败，请手动复制'
  if (shareTimer) clearTimeout(shareTimer)
  shareTimer = setTimeout(() => {
    shareLabel.value = '复制分享链接'
  }, 2000)
}
</script>

<template>
  <div class="playground-card">
    <div class="playground-grid">
      <div class="panel">
        <div class="panel-label panel-label-row">
          <label for="cq-playground-input">OneBot CQ码输入</label>
          <span class="panel-tools">
            <select class="cq-select" aria-label="CQ 码样例库" @change="applyExample">
              <option value="">样例库…</option>
              <optgroup v-for="group in CQ_EXAMPLES" :key="group.group" :label="group.group">
                <option v-for="item in group.items" :key="item.label" :value="item.value">
                  {{ item.label }}
                </option>
              </optgroup>
            </select>
            <button type="button" class="cq-btn" @click="shareLink">{{ shareLabel }}</button>
          </span>
        </div>
        <textarea
          id="cq-playground-input"
          v-model="cqInput"
          class="playground-textarea"
          placeholder="在此输入包含 CQ 码的文本..."
        ></textarea>
        <p v-if="shareUrl" class="share-row">
          <span class="share-hint">分享链接（写入地址栏 ?cq=，复制失败时可直接选中）</span>
          <code ref="shareUrlEl" class="share-url">{{ shareUrl }}</code>
        </p>
      </div>

      <div class="panel">
        <div class="panel-label panel-label-row">
          <span>Gensokyo 模拟渲染预览</span>
          <span class="panel-count">{{ tokens.length }} 段</span>
        </div>
        <div class="chat-preview">
          <div class="chat-bubble-container">
            <div class="chat-avatar" aria-hidden="true">GS</div>
            <div class="chat-bubble">
              <div class="chat-sender">Gensokyo BOT</div>
              <div class="chat-message-content">
                <p v-if="tokens.length === 0" class="cq-empty">输入 CQ 码后，这里会逐段给出预览。</p>
                <template v-for="(token, idx) in tokens" :key="idx">
                  <span v-if="token.type === 'text'" class="cq-text">{{ token.raw }}</span>
                  <article v-else class="cq-card" :aria-label="'CQ 码段：' + token.name">
                    <header class="cq-card-head">
                      <code class="cq-tag">{{ token.raw }}</code>
                      <span class="cq-label">{{ metaOf(token.name)?.label || token.nameRaw || token.name }}</span>
                      <span
                        class="cq-kind"
                        :class="token.known ? 'cq-tone-' + token.kind : 'cq-tone-unknown'"
                        >{{ kindLabel(token) }}</span
                      >
                      <span class="cq-actions">
                        <button
                          type="button"
                          class="cq-btn"
                          :aria-label="'复制 ' + token.name + ' 段的原文'"
                          @click="copyToken(token, 'raw', $event)"
                        >
                          {{ copyLabel(token, 'raw') }}
                        </button>
                        <button
                          type="button"
                          class="cq-btn"
                          :aria-label="'复制 ' + token.name + ' 段的解析 JSON'"
                          @click="copyToken(token, 'json', $event)"
                        >
                          {{ copyLabel(token, 'json') }}
                        </button>
                      </span>
                    </header>

                    <component :is="previewFor(token)" :key="token.start + token.raw" :token="token" />

                    <p v-if="metaOf(token.name)?.desc" class="cq-desc">
                      {{ metaOf(token.name).desc }}
                    </p>
                    <p v-if="token.bare" class="cq-note">{{ bareNote(token) }}</p>
                    <p v-if="missingHint(token)" class="cq-warn">{{ missingHint(token) }}</p>

                    <div v-if="token.bare" class="cq-params-line">无参裸码（没有参数表）</div>
                    <div v-else-if="Object.keys(token.params).length === 0" class="cq-params-line">
                      参数区为空
                    </div>
                    <div v-else class="cq-param-wrap">
                      <table class="cq-param-table">
                        <thead>
                          <tr>
                            <th scope="col">参数</th>
                            <th scope="col">值</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="[key, value] in Object.entries(token.params)" :key="key">
                            <th scope="row" class="cq-param-key">{{ key }}</th>
                            <td class="cq-param-value">
                              <code v-if="value !== ''" class="cq-param-text">{{ value }}</code>
                              <span v-if="paramHint(key, value)" class="cq-param-hint">{{
                                paramHint(key, value)
                              }}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </article>
                </template>
              </div>
            </div>
          </div>
          <span class="sr-only" aria-live="polite">{{ liveMessage }}</span>
        </div>
        <details class="json-code-block">
          <summary class="json-summary">解析 JSON（全部 {{ tokens.length }} 段）</summary>
          <pre><code>{{ parsedJson }}</code></pre>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground-card {
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}

.playground-grid {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
}

@media (max-width: 1024px) {
  .playground-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    border-right: none;
    border-bottom: 1px solid var(--vp-c-divider);
  }

  .panel:last-child {
    border-bottom: none;
  }
}

.panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--vp-c-divider);
}

.panel:last-child {
  border-right: none;
}

.panel-label {
  font-size: 13px;
  font-weight: 600;
  padding: 10px 16px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
}

.panel-label-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  justify-content: space-between;
}

.panel-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-weight: 400;
}

.cq-select {
  max-width: 220px;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.cq-select:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.panel-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.playground-textarea {
  background: transparent;
  border: none;
  resize: vertical;
  min-height: 150px;
  padding: 16px;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  outline: none;
  line-height: 1.6;
}

.share-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0 16px 14px;
}

.share-hint {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.share-url {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  line-height: 1.6;
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}

.chat-preview {
  padding: 16px;
  background: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid var(--vp-c-divider);
}

.dark .chat-preview {
  background: rgba(0, 0, 0, 0.2);
}

.chat-bubble-container {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
}

.chat-avatar {
  flex: none;
  width: 36px;
  height: 36px;
  background: var(--vp-c-brand-1);
  color: white;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.chat-bubble {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px 16px 16px 16px;
  padding: 10px 14px;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}

.chat-sender {
  font-size: 11px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  margin-bottom: 4px;
}

.chat-message-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
}

.cq-text {
  white-space: pre-wrap;
}

.cq-empty {
  margin: 4px 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
  white-space: normal;
}

.cq-card {
  margin: 10px 0;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  white-space: normal;
  min-width: 0;
}

.cq-card:first-child {
  margin-top: 4px;
}

.cq-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.cq-tag {
  flex: 1 1 200px;
  min-width: 0;
  display: block;
  max-height: 4.5em;
  overflow: auto;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.cq-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  overflow-wrap: anywhere;
}

.cq-kind {
  font-size: 11px;
  line-height: 1.6;
  border-radius: 999px;
  padding: 0 8px;
  border: 1px solid var(--cq-tone-border, var(--vp-c-divider));
  color: var(--cq-tone, var(--vp-c-text-2));
  background: var(--cq-tone-bg, var(--vp-c-bg-mute));
}

.cq-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
}

.cq-btn {
  font-size: 12px;
  line-height: 1.6;
  padding: 2px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

@media (prefers-reduced-motion: no-preference) {
  .cq-btn {
    transition: border-color 0.15s, color 0.15s;
  }
}

.cq-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.cq-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.cq-desc {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  white-space: normal;
  overflow-wrap: anywhere;
}

.cq-note {
  margin: 6px 0 0;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px dashed var(--vp-c-divider);
  background: var(--vp-c-bg-mute);
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  white-space: normal;
  overflow-wrap: anywhere;
}

.cq-warn {
  margin: 6px 0 0;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px dashed var(--vp-c-warning-1, var(--vp-c-text-3));
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  white-space: normal;
  overflow-wrap: anywhere;
}

.cq-params-line {
  margin-top: 8px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  white-space: normal;
}

.cq-param-wrap {
  margin-top: 8px;
  overflow-x: auto;
}

.cq-param-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 12px;
  line-height: 1.6;
}

.cq-param-table th,
.cq-param-table td {
  border: 1px solid var(--vp-c-divider);
  padding: 4px 8px;
  text-align: left;
  vertical-align: top;
}

.cq-param-table thead th {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  font-weight: 600;
}

.cq-param-table thead th:first-child,
.cq-param-table tbody th {
  width: 32%;
}

.cq-param-key {
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}

.cq-param-value {
  min-width: 0;
}

.cq-param-text {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.cq-param-hint {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--vp-c-text-3);
  overflow-wrap: anywhere;
}

.json-code-block {
  background: var(--vp-code-block-bg);
  padding: 12px 16px;
  max-height: 260px;
  overflow-y: auto;
}

.json-summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.json-summary:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.json-code-block pre {
  margin: 8px 0 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-code-color);
  white-space: pre-wrap;
  word-break: break-all;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .chat-preview {
    padding: 12px;
  }

  .cq-card {
    padding: 8px 10px;
  }

  .cq-tag {
    flex-basis: 100%;
  }

  .cq-actions {
    margin-left: 0;
  }

  .cq-param-table {
    font-size: 11px;
  }
}
</style>
