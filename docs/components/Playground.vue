<script setup>
import { ref, computed } from 'vue'

const cqInput = ref('[CQ:at,qq=10001] [CQ:face,id=14] 你好，世界！')
const simulateOutput = computed(() => {
  const cqRegex = /\[CQ:([a-z]+),([^\]]+)\]/gi
  let match
  const parts = []
  let lastIndex = 0

  while ((match = cqRegex.exec(cqInput.value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: cqInput.value.slice(lastIndex, match.index) })
    }
    const type = match[1]
    const paramsStr = match[2]
    const params = {}
    paramsStr.split(',').forEach(p => {
      const [k, v] = p.split('=')
      if (k) params[k] = v || ''
    })
    parts.push({ type: 'cq', cqType: type, params })
    lastIndex = cqRegex.lastIndex
  }
  if (lastIndex < cqInput.value.length) {
    parts.push({ type: 'text', content: cqInput.value.slice(lastIndex) })
  }
  return parts
})
</script>

<template>
  <div class="playground-card">
    <div class="playground-grid">
      <div class="panel">
        <label class="panel-label">OneBot CQ码输入</label>
        <textarea v-model="cqInput" class="playground-textarea" placeholder="在此输入包含 CQ 码的文本..."></textarea>
      </div>
      
      <div class="panel">
        <label class="panel-label">Gensokyo 模拟渲染预览</label>
        <div class="chat-preview">
          <div class="chat-bubble-container">
            <div class="chat-avatar">GS</div>
            <div class="chat-bubble">
              <div class="chat-sender">Gensokyo BOT</div>
              <div class="chat-message-content">
                <span v-for="(part, idx) in simulateOutput" :key="idx">
                  <span v-if="part.type === 'text'">{{ part.content }}</span>
                  <span v-else-if="part.cqType === 'at'" class="render-at">@用户_{{ part.params.qq }}</span>
                  <span v-else-if="part.cqType === 'face'" class="render-face">😊(ID:{{ part.params.id }})</span>
                  <span v-else-if="part.cqType === 'image'" class="render-image">[图片: {{ part.params.file || 'CDN链接' }}]</span>
                  <span v-else-if="part.cqType === 'markdown'" class="render-md">📝 Markdown卡片</span>
                  <span v-else class="render-unknown">[{{ part.cqType }} 标记]</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="json-code-block">
          <pre><code>{{ JSON.stringify(simulateOutput, null, 2) }}</code></pre>
        </div>
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
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 768px) {
  .playground-grid {
    grid-template-columns: 1fr;
  }
}

.panel {
  display: flex;
  flex-direction: column;
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
}

.chat-avatar {
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
  max-width: 80%;
}

.chat-sender {
  font-size: 11px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  margin-bottom: 4px;
}

.chat-message-content {
  font-size: 14px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.render-at {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 600;
  margin-right: 4px;
}

.render-face {
  background: rgba(253, 224, 71, 0.2);
  padding: 1px 4px;
  border-radius: 4px;
  color: #eab308;
}

.render-image {
  color: #10b981;
  font-weight: 500;
}

.render-md {
  color: #ec4899;
  font-weight: 500;
}

.json-code-block {
  background: var(--vp-code-block-bg);
  padding: 12px 16px;
  max-height: 150px;
  overflow-y: auto;
}

.json-code-block pre {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-code-color);
}
</style>
