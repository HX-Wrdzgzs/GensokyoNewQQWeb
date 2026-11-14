<script setup>
import { computed } from 'vue'
import { metaOf } from './meta.js'

const props = defineProps({
  token: { type: Object, required: true }
})

const id = computed(() => (props.token.params.id || '').trim())
const name = computed(() => (props.token.params.name || '').trim())
const label = computed(() => metaOf(props.token.name)?.label || props.token.name)
</script>

<template>
  <div class="face-preview">
    <span class="face-tile" aria-hidden="true"
      ><span class="face-tile-text">{{ id || '?' }}</span></span
    >
    <span class="face-body">
      <span class="face-title">{{ label }}{{ name ? ' · ' + name : '' }}</span>
      <span class="face-detail">
        id={{ id || '未提供' }}，本站不加载真实表情图片，只展示参数。
      </span>
    </span>
  </div>
</template>

<style scoped>
.face-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.face-tile {
  /* 超长 id 不撑开卡片：可收缩 + 40% 上限，窄视口不产生横向滚动 */
  flex: 0 1 auto;
  min-width: 40px;
  max-width: 40%;
  height: 40px;
  padding: 0 6px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 700;
  color: #a16207;
  background: rgba(253, 224, 71, 0.22);
  border: 1px solid rgba(202, 138, 4, 0.35);
}

/* 省略号要落在块级容器上：flex 容器自身的 text-overflow 在部分浏览器只裁剪不显示 … */
.face-tile-text {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .face-tile {
  color: #fde68a;
  background: rgba(253, 224, 71, 0.12);
  border-color: rgba(253, 224, 71, 0.3);
}

.face-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.face-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  overflow-wrap: anywhere;
}

.face-detail {
  font-size: 12px;
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}
</style>
