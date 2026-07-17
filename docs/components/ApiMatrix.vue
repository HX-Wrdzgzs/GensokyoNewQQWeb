<script setup>
import { computed, ref } from 'vue'

const searchFilter = ref('')
const currentTab = ref('all')

const matrixItems = [
  { id: 'api-send-private-msg', name: '/send_private_msg', type: 'api', status: 'supported', desc: '发送 C2C 私聊消息' },
  { id: 'api-send-group-msg', name: '/send_group_msg', type: 'api', status: 'supported', desc: '发送 QQ 群消息' },
  { id: 'api-send-guild-channel-msg', name: '/send_guild_channel_msg', type: 'api', status: 'supported', desc: '发送 QQ 频道子频道消息' },
  { id: 'api-send-msg', name: '/send_msg', type: 'api', status: 'adapted', desc: '按消息类型路由发送；具体行为受 QQ 官方场景限制' },
  { id: 'api-delete-msg', name: '/delete_msg', type: 'api', status: 'adapted', desc: '撤回消息；可撤回范围取决于官方接口权限' },
  { id: 'api-delete-group-msg', name: '/delete_group_msg', type: 'api', status: 'adapted', desc: '撤回 QQ 群用户或机器人消息' },
  { id: 'api-set-group-kick', name: '/set_group_kick', type: 'api', status: 'adapted', desc: '移除群成员，受机器人权限约束' },
  { id: 'api-set-group-ban', name: '/set_group_ban', type: 'api', status: 'adapted', desc: '设置群成员禁言' },
  { id: 'api-set-group-whole-ban', name: '/set_group_whole_ban', type: 'api', status: 'adapted', desc: '设置群全员禁言' },
  { id: 'api-set-group-admin', name: '/set_group_admin', type: 'api', status: 'adapted', desc: '设置群管理员' },
  { id: 'api-set-group-card', name: '/set_group_card', type: 'api', status: 'adapted', desc: '设置群名片' },
  { id: 'api-set-group-name', name: '/set_group_name', type: 'api', status: 'adapted', desc: '设置群名称' },
  { id: 'api-set-group-leave', name: '/set_group_leave', type: 'api', status: 'adapted', desc: '退出群聊' },
  { id: 'api-set-group-special-title', name: '/set_group_special_title', type: 'api', status: 'adapted', desc: '设置群专属头衔' },
  { id: 'api-set-friend-add-request', name: '/set_friend_add_request', type: 'api', status: 'adapted', desc: '处理好友请求' },
  { id: 'api-set-group-add-request', name: '/set_group_add_request', type: 'api', status: 'adapted', desc: '处理加群请求或邀请' },
  { id: 'api-get-login-info', name: '/get_login_info', type: 'api', status: 'supported', desc: '获取当前机器人信息' },
  { id: 'api-get-stranger-info', name: '/get_stranger_info', type: 'api', status: 'adapted', desc: '获取用户信息；字段取决于可获得的官方数据' },
  { id: 'api-get-friend-list', name: '/get_friend_list', type: 'api', status: 'adapted', desc: '获取好友或 C2C 相关列表' },
  { id: 'api-get-group-info', name: '/get_group_info', type: 'api', status: 'adapted', desc: '获取群聊或频道信息' },
  { id: 'api-get-group-list', name: '/get_group_list', type: 'api', status: 'adapted', desc: '获取群聊列表' },
  { id: 'api-get-group-member-info', name: '/get_group_member_info', type: 'api', status: 'adapted', desc: '获取群成员信息' },
  { id: 'api-get-group-member-list', name: '/get_group_member_list', type: 'api', status: 'adapted', desc: '获取群成员列表' },
  { id: 'api-get-group-honor-info', name: '/get_group_honor_info', type: 'api', status: 'adapted', desc: '获取群荣誉信息' },
  { id: 'api-can-send-image', name: '/can_send_image', type: 'api', status: 'supported', desc: '检查图片发送能力' },
  { id: 'api-can-send-record', name: '/can_send_record', type: 'api', status: 'supported', desc: '检查语音发送能力' },
  { id: 'api-get-version-info', name: '/get_version_info', type: 'api', status: 'supported', desc: '获取实现与版本信息' },
  { id: 'api-set-restart', name: '/set_restart', type: 'api', status: 'supported', desc: '请求重启 Gensokyo' },
  { id: 'api-handle-quick-operation', name: '/.handle_quick_operation', type: 'api', status: 'adapted', desc: '对事件执行快速操作' },

  { id: 'ext-get-avatar', name: 'get_avatar', type: 'ext', status: 'extended', desc: '获取头像直链' },
  { id: 'ext-get-robot-share-link', name: 'get_robot_share_link', type: 'ext', status: 'extended', desc: '获取机器人分享链接' },
  { id: 'ext-send-private-msg-wakeup', name: 'send_private_msg_wakeup', type: 'ext', status: 'extended', desc: '发送 C2C 召回或唤醒消息' },
  { id: 'ext-send-private-msg-sse', name: 'send_private_msg_sse', type: 'ext', status: 'extended', desc: '通过 SSE 发送私聊消息' },
  { id: 'ext-put-interaction', name: 'put_interaction', type: 'ext', status: 'extended', desc: '处理按钮交互回调' },
  { id: 'ext-get-group-ban', name: 'get_group_ban', type: 'ext', status: 'extended', desc: '查询群成员禁言状态' },
  { id: 'ext-get-group-whole-ban', name: 'get_group_whole_ban', type: 'ext', status: 'extended', desc: '查询群全员禁言状态' },
  { id: 'ext-send-to-group', name: 'send_to_group', type: 'ext', status: 'extended', desc: 'send_group_msg 的项目别名' },
  { id: 'ext-send-group-msg-raw', name: 'send_group_msg_raw', type: 'ext', status: 'extended', desc: '发送原始群消息数据' },

  { id: 'cq-face', name: '[CQ:face]', type: 'cq', status: 'supported', desc: 'QQ 表情' },
  { id: 'cq-record', name: '[CQ:record]', type: 'cq', status: 'adapted', desc: '语音消息，包含格式转换处理' },
  { id: 'cq-video', name: '[CQ:video]', type: 'cq', status: 'adapted', desc: '短视频消息' },
  { id: 'cq-at', name: '[CQ:at]', type: 'cq', status: 'adapted', desc: '@ 用户，并处理虚拟 ID 与 OpenID 映射' },
  { id: 'cq-share', name: '[CQ:share]', type: 'cq', status: 'adapted', desc: '链接分享消息' },
  { id: 'cq-music', name: '[CQ:music]', type: 'cq', status: 'adapted', desc: '音乐分享与自定义音乐分享' },
  { id: 'cq-reply', name: '[CQ:reply]', type: 'cq', status: 'adapted', desc: '回复消息' },
  { id: 'cq-forward', name: '[CQ:forward]', type: 'cq', status: 'adapted', desc: '合并转发消息' },
  { id: 'cq-node', name: '[CQ:node]', type: 'cq', status: 'adapted', desc: '合并转发节点' },
  { id: 'cq-xml', name: '[CQ:xml]', type: 'cq', status: 'adapted', desc: 'XML 消息；可用性受官方接口限制' },
  { id: 'cq-json', name: '[CQ:json]', type: 'cq', status: 'adapted', desc: 'JSON 消息；可用性受官方接口限制' },
  { id: 'cq-image', name: '[CQ:image]', type: 'cq', status: 'adapted', desc: '图片消息，并处理压缩、上传或图床逻辑' },
  { id: 'cq-poke', name: '[CQ:poke]', type: 'cq', status: 'adapted', desc: '戳一戳相关转换' },
  { id: 'cq-markdown', name: '[CQ:markdown]', type: 'cq', status: 'extended', desc: '项目扩展 Markdown 卡片消息' },
  { id: 'cq-avatar', name: '[CQ:avatar]', type: 'cq', status: 'extended', desc: '项目扩展头像获取' },
  { id: 'cq-member', name: '[CQ:member]', type: 'cq', status: 'extended', desc: '项目扩展群成员变动表示' },
  { id: 'cq-active', name: '[CQ:active]', type: 'cq', status: 'extended', desc: '项目扩展 active 标记' },
  { id: 'cq-tts', name: '[CQ:tts]', type: 'cq', status: 'adapted', desc: '文本转语音' },
  { id: 'cq-file', name: '[CQ:file]', type: 'cq', status: 'extended', desc: '项目扩展文件上传' }
]

const tabLabels = {
  all: '全部',
  api: '标准 API',
  ext: '项目扩展',
  cq: 'CQ 码'
}

const statusLabels = {
  supported: '已映射',
  adapted: '适配实现',
  extended: '项目扩展'
}

const filteredMatrix = computed(() => {
  const keyword = searchFilter.value.trim().toLowerCase()

  return matrixItems.filter((item) => {
    const matchesTab = currentTab.value === 'all' || item.type === currentTab.value
    const matchesSearch = !keyword || item.name.toLowerCase().includes(keyword) || item.desc.toLowerCase().includes(keyword)
    return matchesTab && matchesSearch
  })
})

const tabCounts = computed(() => ({
  all: matrixItems.length,
  api: matrixItems.filter((item) => item.type === 'api').length,
  ext: matrixItems.filter((item) => item.type === 'ext').length,
  cq: matrixItems.filter((item) => item.type === 'cq').length
}))
</script>

<template>
  <div class="matrix-container">
    <div class="matrix-note">
      本表用于快速检索主仓库文档中列出的能力，不代表所有字段与 OneBot 原始实现完全一致。标记为“适配实现”的项目会受到 QQ 官方权限、事件模型或接口限制。
    </div>

    <div class="matrix-controls">
      <div class="matrix-tabs" role="tablist" aria-label="能力类型">
        <button
          v-for="(label, tab) in tabLabels"
          :key="tab"
          :class="{ active: currentTab === tab }"
          :aria-pressed="currentTab === tab"
          type="button"
          @click="currentTab = tab"
        >
          {{ label }} <span>{{ tabCounts[tab] }}</span>
        </button>
      </div>
      <input
        v-model="searchFilter"
        type="search"
        class="search-input"
        placeholder="搜索 API、CQ 码或功能说明"
        aria-label="搜索能力矩阵"
      />
    </div>

    <div class="matrix-summary">
      当前显示 {{ filteredMatrix.length }} 项
    </div>

    <div class="matrix-table">
      <div class="table-header">
        <div class="col-name">名称</div>
        <div class="col-type">类别</div>
        <div class="col-desc">说明</div>
        <div class="col-status">状态</div>
      </div>
      <div class="table-body">
        <div v-for="item in filteredMatrix" :key="item.id" class="table-row">
          <div class="col-name font-mono">{{ item.name }}</div>
          <div class="col-type">
            <span :class="['type-tag', item.type]">{{ tabLabels[item.type] }}</span>
          </div>
          <div class="col-desc">{{ item.desc }}</div>
          <div class="col-status">
            <span :class="['status-tag', item.status]">{{ statusLabels[item.status] }}</span>
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

.matrix-note {
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.7;
}

.matrix-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
}

.matrix-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.matrix-tabs button {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  padding: 7px 12px;
  border-radius: 18px;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, color 0.2s;
  font-weight: 500;
}

.matrix-tabs button span {
  margin-left: 4px;
  color: var(--vp-c-text-3);
}

.matrix-tabs button.active {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.matrix-tabs button.active span {
  color: inherit;
}

.search-input {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 18px;
  padding: 7px 14px;
  width: min(320px, 100%);
  color: var(--vp-c-text-1);
  outline: none;
  font-size: 13px;
}

.search-input:focus {
  border-color: var(--vp-c-brand-1);
}

.matrix-summary {
  margin: 0 0 10px;
  color: var(--vp-c-text-3);
  font-size: 13px;
}

.matrix-table {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: minmax(170px, 2fr) minmax(90px, 1fr) minmax(240px, 3fr) minmax(90px, 1fr);
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
}

.table-header {
  background: var(--vp-c-bg-mute);
  font-weight: 600;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 14px;
}

.table-row {
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 14px;
}

.table-row:last-child {
  border-bottom: none;
}

.type-tag,
.status-tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.type-tag.api { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.type-tag.cq { background: rgba(147, 51, 234, 0.1); color: #a855f7; }
.type-tag.ext { background: rgba(236, 72, 153, 0.1); color: #ec4899; }

.status-tag.supported { background: rgba(16, 185, 129, 0.1); color: #059669; }
.status-tag.adapted { background: rgba(245, 158, 11, 0.12); color: #b45309; }
.status-tag.extended { background: rgba(6, 182, 212, 0.12); color: #0891b2; }

.font-mono {
  font-family: var(--vp-font-family-mono);
  overflow-wrap: anywhere;
}

.no-results {
  padding: 32px;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 14px;
}

@media (max-width: 860px) {
  .matrix-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .search-input {
    width: auto;
  }

  .table-header {
    display: none;
  }

  .table-row {
    grid-template-columns: 1fr auto;
    gap: 8px 12px;
  }

  .col-desc {
    grid-column: 1 / -1;
    color: var(--vp-c-text-2);
  }

  .col-status {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>
