<script setup>
import { computed, ref } from 'vue'
import { metaOf } from './meta.js'

const props = defineProps({
  token: { type: Object, required: true }
})

const isImage = computed(() => props.token.name === 'image')
const label = computed(() => metaOf(props.token.name)?.label || '媒体')

const loadFailed = ref(false)

const fileValue = computed(() => (props.token.params.file || '').trim())
const urlValue = computed(() => (props.token.params.url || '').trim())

function httpUrl(value) {
  return /^https?:\/\//i.test(value) ? value : ''
}

// 只认 http(s)：其余形态（本地路径、文件标识）留给占位说明，避免浏览器把任意串当资源加载
const directUrl = computed(() => httpUrl(urlValue.value) || httpUrl(fileValue.value))
const isBase64 = computed(
  () => /^base64:\/\//i.test(fileValue.value) || /^base64:\/\//i.test(urlValue.value)
)
const base64Length = computed(() => {
  const source = /^base64:\/\//i.test(fileValue.value) ? fileValue.value : urlValue.value
  return source.length
})
const host = computed(() => {
  try {
    return new URL(directUrl.value).host
  } catch {
    return ''
  }
})
</script>

<template>
  <div class="media-preview">
    <figure v-if="isImage && directUrl && !loadFailed" class="media-thumb">
      <img
        :src="directUrl"
        alt="图片外链预览"
        referrerpolicy="no-referrer"
        loading="lazy"
        decoding="async"
        @error="loadFailed = true"
      />
      <figcaption class="media-caption">{{ host || '外链图片' }}</figcaption>
    </figure>

    <div v-else-if="isImage && directUrl && loadFailed" class="media-placeholder">
      <span>图片加载失败（外链可能禁止直接引用），本站未做代理。</span>
      <a :href="directUrl" target="_blank" rel="noopener noreferrer nofollow">打开原链接</a>
    </div>

    <div v-else-if="isBase64" class="media-placeholder">
      base64:// 载荷 · {{ base64Length }} 字符 · 网页端不解码
    </div>

    <div v-else-if="directUrl" class="media-link">
      <span class="media-link-type">{{ label }}外链</span>
      <a :href="directUrl" target="_blank" rel="noopener noreferrer nofollow">{{
        host || directUrl
      }}</a>
    </div>

    <div v-else-if="fileValue" class="media-placeholder">
      本地路径或文件标识：<code class="media-code">{{ fileValue }}</code
      >（网页端无法预览）
    </div>

    <div v-else-if="urlValue" class="media-placeholder">
      url 参数存在但不是 http(s) 形态，网页端不加载：<code class="media-code">{{ urlValue }}</code>
    </div>

    <div v-else class="media-placeholder">未提供 url / file 参数</div>
  </div>
</template>

<style scoped>
.media-preview {
  min-width: 0;
}

.media-thumb {
  margin: 0;
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  max-width: 100%;
}

.media-thumb img {
  display: block;
  max-width: 100%;
  max-height: 180px;
  width: auto;
  height: auto;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-mute);
}

.media-caption {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  overflow-wrap: anywhere;
}

.media-placeholder {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-mute);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  padding: 8px 10px;
  overflow-wrap: anywhere;
}

.media-code {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-1);
  overflow-wrap: anywhere;
}

.media-placeholder a,
.media-link a {
  color: var(--vp-c-brand-1);
  overflow-wrap: anywhere;
}

.media-link {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  font-size: 13px;
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}

.media-link-type {
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-mute);
  border-radius: 999px;
  padding: 1px 8px;
}
</style>
