<script setup>
import { computed } from 'vue'

const props = defineProps({
  token: { type: Object, required: true }
})

const qq = computed(() => (props.token.params.qq || '').trim())
const name = computed(() => (props.token.params.name || '').trim())
const isAll = computed(() => qq.value === 'all')

const displayName = computed(() => {
  if (name.value) return '@' + name.value
  if (isAll.value) return '@全体成员'
  if (qq.value) return '@用户 ' + qq.value
  return '@（未指定目标）'
})

const detail = computed(() => {
  if (isAll.value) return 'qq=all（@全体成员）'
  if (qq.value) return name.value ? 'qq=' + qq.value : '参数只有 qq，没有 name'
  return '缺少 qq 参数'
})
</script>

<template>
  <div class="at-preview">
    <span class="at-avatar" aria-hidden="true">@</span>
    <span class="at-body">
      <span class="at-name">{{ displayName }}</span>
      <span class="at-detail">{{ detail }}</span>
    </span>
  </div>
</template>

<style scoped>
.at-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.at-avatar {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  color: #ffffff;
  background: var(--vp-c-brand-2);
}

.at-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.at-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--vp-c-brand-1);
  overflow-wrap: anywhere;
}

.at-detail {
  font-size: 12px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  overflow-wrap: anywhere;
}
</style>
