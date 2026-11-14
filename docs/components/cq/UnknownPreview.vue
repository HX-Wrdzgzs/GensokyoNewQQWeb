<script setup>
import { computed } from 'vue'
import { CQ_CODE_NAMES } from '../../.vitepress/cq/parser.js'
import './tone.css'

const props = defineProps({
  token: { type: Object, required: true }
})

const nameRaw = computed(() => props.token.nameRaw || props.token.name)
</script>

<template>
  <div class="unknown-preview">
    <span class="unknown-tag cq-tone-unknown">未知码，按原样保留</span>
    <pre class="unknown-raw" tabindex="0" :aria-label="'未知码原文：' + nameRaw">{{
      token.raw
    }}</pre>
    <p class="unknown-hint">
      码名 <code>{{ nameRaw }}</code> 不在 {{ CQ_CODE_NAMES.length }}
      个已知码名内：解析器仍把它切成独立段（known=false）， 后端按未知码透传给正文，本站不做改写。
    </p>
  </div>
</template>

<style scoped>
.unknown-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.unknown-tag {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  padding: 1px 8px;
  color: var(--cq-tone, #c2410c);
  background: var(--cq-tone-bg, rgba(249, 115, 22, 0.14));
  border: 1px solid var(--cq-tone-border, rgba(249, 115, 22, 0.32));
}

.unknown-raw {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  padding: 8px 10px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 8em;
  overflow: auto;
}

.unknown-raw:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.unknown-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}

.unknown-hint code {
  color: var(--vp-c-text-1);
  overflow-wrap: anywhere;
}
</style>
