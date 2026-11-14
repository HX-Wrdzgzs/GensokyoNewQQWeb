<script setup>
import { computed } from 'vue'
import { metaOf } from './meta.js'
import './tone.css'

const props = defineProps({
  token: { type: Object, required: true }
})

const meta = computed(() => metaOf(props.token.name) || {})

// 键按元数据里的顺序展示；缺的参数直接不占位（参数表里有全量）
const chips = computed(() =>
  (meta.value.highlight || [])
    .filter((key) => Object.prototype.hasOwnProperty.call(props.token.params, key))
    .map((key) => {
      const value = props.token.params[key]
      return { key, value: value === '' ? '（空值）' : value }
    })
)

const payload = computed(() => {
  const key = meta.value.payloadKey
  if (!key) return null
  const value = props.token.params[key]
  if (value === undefined) return null
  if (/^base64:\/\//i.test(value)) {
    return { label: 'base64:// 载荷', text: value.length + ' 字符，网页端不解码' }
  }
  return {
    label: '载荷原文（前 200 字符）',
    text: value.length > 200 ? value.slice(0, 200) + '…' : value
  }
})
</script>

<template>
  <div class="generic-preview">
    <span class="generic-badge" :class="'cq-tone-' + token.kind" aria-hidden="true">{{
      meta.badge || '?'
    }}</span>
    <div class="generic-body">
      <div class="generic-title">{{ meta.label || token.name }}</div>
      <div v-if="chips.length" class="generic-chips">
        <span v-for="chip in chips" :key="chip.key" class="generic-chip">
          <b>{{ chip.key }}</b>=<span>{{ chip.value }}</span>
        </span>
      </div>
      <div v-if="payload" class="generic-payload">
        <span class="generic-payload-label">{{ payload.label }}</span>
        <code class="generic-payload-text">{{ payload.text }}</code>
      </div>
    </div>
  </div>
</template>

<style scoped>
.generic-preview {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}

.generic-badge {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--cq-tone, var(--vp-c-text-2));
  background: var(--cq-tone-bg, var(--vp-c-bg-mute));
  border: 1px solid var(--cq-tone-border, var(--vp-c-divider));
}

.generic-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.generic-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  overflow-wrap: anywhere;
}

.generic-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.generic-chip {
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 1px 6px;
  overflow-wrap: anywhere;
}

.generic-chip b {
  color: var(--vp-c-text-2);
  font-weight: 600;
}

.generic-payload {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.generic-payload-label {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.generic-payload-text {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-mute);
  border-radius: 6px;
  padding: 4px 6px;
  overflow-wrap: anywhere;
  max-height: 6em;
  overflow: auto;
}
</style>
