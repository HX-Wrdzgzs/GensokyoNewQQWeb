<script setup>
defineProps({
  example: { type: String, required: true }
})
</script>

<template>
  <p class="try-playground-row">
    <a :href="'/?cq=' + encodeURIComponent(example)" class="try-playground">在演练场打开</a>
  </p>
</template>

<style scoped>
.try-playground-row {
  margin: 16px 0;
}

.try-playground {
  display: inline-block;
  padding: 4px 14px;
  border: 1px solid var(--vp-c-brand-1, #3ecf8e);
  border-radius: 999px;
  color: var(--vp-c-brand-1, #3ecf8e);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
}

.try-playground:hover {
  background-color: var(--vp-c-brand-1, #3ecf8e);
  color: var(--vp-c-bg, #fff);
}
</style>
