<script setup>
import { ref, computed } from 'vue'

const searchFilter = ref('')
const currentTab = ref('all') // 'all', 'api', 'cq', 'ext'

const matrixItems = [
  { name: '/send_private_msg', type: 'api', status: 'implemented', desc: '发送私聊 (C2C) 消息' },
  { name: '/send_group_msg', type: 'api', status: 'implemented', desc: '发送 q群 (Group Chat) 消息' },
  { name: '/send_guild_channel_msg', type: 'api', status: 'implemented', desc: '发送 q頻 (QQ Guild) 消息' },
  { name: '/delete_msg', type: 'api', status: 'implemented', desc: '撤回信息' },
  { name: '/get_login_info', type: 'api', status: 'implemented', desc: '获取登录号信息' },
  { name: '/get_friend_list', type: 'api', status: 'implemented', desc: '获取好友列表' },
  { name: '/get_group_list', type: 'api', status: 'implemented', desc: '获取群列表' },
  { name: '/get_group_member_list', type: 'api', status: 'implemented', desc: '获取群成员列表' },
  { name: 'get_avatar', type: 'ext', status: 'extended', desc: '获取头像直链 (本版拓展)' },
  { name: 'send_private_msg_wakeup', type: 'ext', status: 'extended', desc: 'C2C 召回/唤醒消息 (本版拓展)' },
  { name: 'put_interaction', type: 'ext', status: 'extended', desc: '处理按钮回调 (本版拓展)' },
  { name: '[CQ:face]', type: 'cq', status: 'implemented', desc: 'QQ 表情' },
  { name: '[CQ:image]', type: 'cq', status: 'implemented', desc: '图片收发（自动处理压缩与图床）' },
  { name: '[CQ:record]', type: 'cq', status: 'implemented', desc: '语音消息（支持 Silk 格式）' },
  { name: '[CQ:video]', type: 'cq', status: 'implemented', desc: '短视频' },
  { name: '[CQ:at]', type: 'cq', status: 'implemented', desc: '@某人（支持虚拟ID到官方OpenID转换）' },
  { name: '[CQ:reply]', type: 'cq', status: 'implemented', desc: '消息回复' },
  { name: '[CQ:markdown]', type: 'cq', status: 'extended', desc: 'Markdown 卡片收发 (本版拓展)' },
  { name: '[CQ:avatar]', type: 'cq', status: 'extended', desc: '头像获取 (本版拓展)' }
]

const filteredMatrix = computed(() => {
  return matrixItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchFilter.value.toLowerCase()) || 
                          item.desc.toLowerCase().includes(searchFilter.value.toLowerCase())
    if (!matchesSearch) return false
    if (currentTab.value === 'all') return true
    return item.type === currentTab.value
  })
})
</script>

<template>
  <div class="matrix-container">
    <div class="matrix-controls">
      <div class="matrix-tabs">
        <button :class="{ active: currentTab === 'all' }" @click="currentTab = 'all'">全部</button>
        <button :class="{ active: currentTab === 'api' }" @click="currentTab = 'api'">标准 API</button>
        <button :class="{ active: currentTab === 'cq' }" @click="currentTab = 'cq'">CQ 码</button>
        <button :class="{ active: currentTab === 'ext' }" @click="currentTab = 'ext'">本版拓展</button>
      </div>
      <input v-model="searchFilter" type="text" class="search-input" placeholder="搜索 API 或 CQ 码..." />
    </div>

    <div class="matrix-table">
      <div class="table-header">
        <div class="col-name">名称</div>
        <div class="col-type">类别</div>
        <div class="col-desc">说明</div>
        <div class="col-status">状态</div>
      </div>
      <div class="table-body">
        <div v-for="item in filteredMatrix" :key="item.name" class="table-row">
          <div class="col-name font-mono">{{ item.name }}</div>
          <div class="col-type">
            <span :class="['type-tag', item.type]">{{ item.type === 'api' ? '标准API' : item.type === 'cq' ? 'CQ码' : '官方拓展' }}</span>
          </div>
          <div class="col-desc">{{ item.desc }}</div>
          <div class="col-status">
            <span :class="['status-tag', item.status]">{{ item.status === 'implemented' ? '已实现' : '已拓展' }}</span>
          </div>
        </div>
        <div v-if="filteredMatrix.length === 0" class="no-results">
          没有找到匹配的 API 或 CQ 码
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.matrix-container {
  margin: 24px 0;
}

.matrix-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

@media (max-width: 768px) {
  .matrix-controls {
    flex-direction: column;
    align-items: stretch;
  }
}

.matrix-tabs {
  display: flex;
  gap: 6px;
}

.matrix-tabs button {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.matrix-tabs button.active {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.search-input {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 6px 16px;
  width: 250px;
  color: var(--vp-c-text-1);
  outline: none;
  font-size: 13px;
  transition: all 0.2s;
}

@media (max-width: 768px) {
  .search-input {
    width: auto;
  }
}

.search-input:focus {
  border-color: var(--vp-c-brand-1);
}

.matrix-table {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.table-header {
  background: var(--vp-c-bg-mute);
  display: grid;
  grid-template-columns: 2fr 1fr 3fr 1fr;
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 14px;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 3fr 1fr;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  align-items: center;
  font-size: 14px;
}

.table-row:last-child {
  border-bottom: none;
}

.type-tag, .status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  display: inline-block;
}

.type-tag.api { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.type-tag.cq { background: rgba(147, 51, 234, 0.1); color: #a855f7; }
.type-tag.ext { background: rgba(236, 72, 153, 0.1); color: #ec4899; }

.status-tag.implemented { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.status-tag.extended { background: rgba(6, 182, 212, 0.1); color: #0891b2; }

.font-mono {
  font-family: var(--vp-font-family-mono);
}

.no-results {
  padding: 30px;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 14px;
}

@media (max-width: 600px) {
  .table-header, .table-row {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .col-desc {
    grid-column: span 2;
    color: var(--vp-c-text-2);
    font-size: 13px;
  }
}
</style>
