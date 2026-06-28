<script setup>
import { ref, computed } from 'vue'

// --- CQ Code Playground States ---
const cqInput = ref('[CQ:at,qq=10001] [CQ:face,id=14] 你好，世界！')
const simulateOutput = computed(() => {
  const codeList = []
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

const copied = ref(false)
const copyConfig = () => {
  navigator.clipboard.writeText(yamlConfig)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

// --- API and CQ Matrix Data ---
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

const yamlConfig = `version: 1
settings:
  #── 反向 WebSocket ──────────────────────────────────
  ws_address: ["ws://127.0.0.1:8080/onebot/v11/ws"]   # 后端 OneBot 适配器地址
  ws_token: ["your_ws_token_here"]                    # 对应 ws_address 的 token
  reconnect_times: 100                                 # 断线重连次数

  #── 基础设置 ────────────────────────────────────────
  app_id: 123456789                                    # QQ 开放平台应用 ID
  token: "your_app_token"                              # 应用令牌
  client_secret: "your_client_secret"                  # 客户端密钥
  
  #── 消息转换 ────────────────────────────────────────
  global_channel_to_group: true                        # q頻 事件转 q群 事件
  hash_id: true                                        # 使用 hash 生成虚拟 ID
  array: false                                         # 使用 segment 数组格式上报

  #── WebSocket ──────────────────────────────────────
  enable_ws_server: true                               # 启用正向 WebSocket
  ws_server_path: "ws"                                 # 正向 WS 路径
  
  #── WebUI ───────────────────────────────────────────
  disable_webui: false                                 # 禁用 Web 管理面板
  server_user_name: "admin"                            # 面板用户名
  server_user_password: "admin"                        # 面板密码`
</script>

<template>
  <div>
    <!-- Navbar -->
    <header class="navbar-wrapper glass">
      <div class="container navbar-content">
        <div class="logo-container">
          <img src="/head.gif" class="logo-gif" alt="Gensokyo" />
          <span class="logo-text">Gensokyo</span>
        </div>
        <nav class="nav-links">
          <a href="#features">特性</a>
          <a href="#playground">演练场</a>
          <a href="#quickstart">快速开始</a>
          <a href="#matrix">API 矩阵</a>
          <a href="https://github.com/Te-River/Gensokyo-NewQQ" target="_blank" class="github-link">
            <svg class="github-icon" viewBox="0 0 16 16" width="18" height="18">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            GitHub
          </a>
        </nav>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container hero-content">
        <div class="hero-badge">OneBot V11 Gateway</div>
        <h1 class="hero-title">
          <span class="gradient-text">Gensokyo</span>
        </h1>
        <p class="hero-subtitle">
          基于 QQ 官方机器人 API 原生实现的 Golang 网关服务端，将官方事件无缝转换为 OneBot V11 协议。复用成熟插件生态，实现零成本迁移。
        </p>
        <div class="hero-actions">
          <a href="#quickstart" class="glow-btn">
            快速启动
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <a href="https://github.com/Te-River/Gensokyo-NewQQ" target="_blank" class="outline-btn">查看 GitHub 仓库</a>
        </div>
        <div class="hero-preview glass">
          <div class="preview-header">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <span class="preview-title">gensokyo_gateway.log</span>
          </div>
          <div class="preview-body">
            <div class="log-line"><span class="log-time">[22:00:01]</span> <span class="log-tag info">[INFO]</span> Gensokyo v1.2.0 初始化中...</div>
            <div class="log-line"><span class="log-time">[22:00:02]</span> <span class="log-tag success">[SUCCESS]</span> 成功加载 config.yml 配置</div>
            <div class="log-line"><span class="log-time">[22:00:03]</span> <span class="log-tag info">[INFO]</span> 正向 WebSocket 服务启动成功，监听 ws://0.0.0.0:15630/ws</div>
            <div class="log-line"><span class="log-time">[22:00:03]</span> <span class="log-tag success">[SUCCESS]</span> 官方 WebSocket 频道连接就绪，当前内存占用: <span class="log-highlight">9.8 MB</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section">
      <div class="container">
        <h2 class="section-title">核心亮点</h2>
        <div class="features-grid">
          <div class="feature-card glass">
            <div class="feature-icon-wrapper purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            </div>
            <h3>10MB 极低内存占用</h3>
            <p>基于 Golang 原生高并发协程池实现，空载内存仅需 10MB 左右，极度轻量，完美契合低配云服务器多开需求。</p>
          </div>

          <div class="feature-card glass">
            <div class="feature-icon-wrapper cyan">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <h3>OneBot V11 完整兼容</h3>
            <p>支持 HTTP API、反向 HTTP POST、正向 WebSocket 与反向 WebSocket。完美连接 NoneBot2、Koishi 等主流插件框架。</p>
          </div>

          <div class="feature-card glass">
            <div class="feature-icon-wrapper pink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <h3>智能重连与故障转被动</h3>
            <p>当网关遇到不可抗力或连接断开时，内置断线重连算法及主动消息失败自动转被动发送机制，保证服务持久可用。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Playground Section -->
    <section id="playground" class="playground-section">
      <div class="container">
        <h2 class="section-title">CQ 码实时演练场</h2>
        <p class="section-subtitle">输入 OneBot 标准 CQ 码，查看 Gensokyo 如何为官方机器人 API 自动转化和排版渲染</p>
        <div class="playground-grid">
          <div class="playground-input-panel glass">
            <div class="panel-header">CQ 码输入</div>
            <textarea v-model="cqInput" class="playground-textarea" placeholder="在此输入包含 CQ 码的文本..."></textarea>
          </div>
          <div class="playground-output-panel glass">
            <div class="panel-header">转换模拟及渲染预览</div>
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
                      <span v-else-if="part.cqType === 'markdown'" class="render-md">📝 Markdown卡片 </span>
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
    </section>

    <!-- Quick Start Section -->
    <section id="quickstart" class="quickstart-section">
      <div class="container">
        <h2 class="section-title">快速上手</h2>
        <div class="quickstart-steps">
          <div class="step-item glass">
            <div class="step-num">1</div>
            <h3>下载构建包</h3>
            <p>前往 Releases 下载对应系统的二进制运行程序。</p>
          </div>
          <div class="step-item glass">
            <div class="step-num">2</div>
            <h3>配置 config.yml</h3>
            <p>首次启动会自动在同级目录生成配置文件，根据下方模板填入您在官方开放平台申请的 `app_id`、`token` 及 `client_secret`。</p>
          </div>
          <div class="step-item glass">
            <div class="step-num">3</div>
            <h3>直接运行</h3>
            <p>双击运行或在终端中执行 `./gensokyo`，连接 OneBot 客户端即可生效。</p>
          </div>
        </div>

        <div class="config-explorer glass">
          <div class="config-header">
            <span>config.yml 模板参考</span>
            <button @click="copyConfig" class="copy-btn">
              {{ copied ? '已复制' : '复制配置' }}
            </button>
          </div>
          <div class="config-body">
            <pre><code>{{ yamlConfig }}</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- API / CQ Matrix Section -->
    <section id="matrix" class="matrix-section">
      <div class="container">
        <h2 class="section-title">API & CQ 码兼容矩阵</h2>
        <div class="matrix-controls">
          <div class="matrix-tabs">
            <button :class="{ active: currentTab === 'all' }" @click="currentTab = 'all'">全部</button>
            <button :class="{ active: currentTab === 'api' }" @click="currentTab = 'api'">标准 API</button>
            <button :class="{ active: currentTab === 'cq' }" @click="currentTab = 'cq'">CQ 码</button>
            <button :class="{ active: currentTab === 'ext' }" @click="currentTab = 'ext'">本版拓展</button>
          </div>
          <input v-model="searchFilter" type="text" class="search-input" placeholder="输入名称或描述进行搜索..." />
        </div>

        <div class="matrix-table glass">
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
    </section>

    <!-- Footer -->
    <footer class="footer-wrapper">
      <div class="container footer-content">
        <p>© 2026 Gensokyo Project. 本项目及介绍站为开源交流提供。</p>
        <div class="footer-links">
          <a href="https://github.com/Te-River/Gensokyo-NewQQ" target="_blank">GitHub</a>
          <a href="#features">回到顶部</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Scoped overrides and custom responsive grid styling */

.navbar-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border-glow);
}

.navbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-gif {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: var(--transition-smooth);
}

.nav-links a:hover {
  color: var(--secondary);
}

.github-link {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(147, 51, 234, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(147, 51, 234, 0.3);
}

/* Hero Section */
.hero-section {
  padding-top: 140px;
  padding-bottom: 80px;
  text-align: center;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-badge {
  background: rgba(0, 242, 254, 0.1);
  border: 1px solid rgba(0, 242, 254, 0.3);
  color: var(--secondary);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 24px;
  letter-spacing: 1px;
}

.hero-title {
  font-size: 64px;
  font-weight: 800;
  margin: 0 0 24px;
  line-height: 1.1;
  letter-spacing: -1px;
}

.hero-subtitle {
  font-size: 20px;
  color: var(--text-secondary);
  max-width: 800px;
  line-height: 1.6;
  margin-bottom: 40px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 60px;
}

.hero-preview {
  width: 100%;
  max-width: 800px;
  border-radius: 12px;
  overflow: hidden;
  text-align: left;
}

.preview-header {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-glow);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #ff5f56; }
.dot.yellow { background: #ffbd2e; }
.dot.green { background: #27c93f; }

.preview-title {
  color: var(--text-muted);
  font-size: 13px;
  margin-left: 8px;
  font-family: var(--font-mono);
}

.preview-body {
  padding: 20px;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.7;
}

.log-line {
  margin-bottom: 8px;
  color: #a78bfa;
}

.log-time {
  color: var(--text-muted);
}

.log-tag.info { color: #3b82f6; }
.log-tag.success { color: #10b981; }
.log-highlight { color: var(--secondary); font-weight: 600; }

/* Features Section */
.features-section {
  padding: 80px 0;
  border-top: 1px solid var(--border-glow);
}

.section-title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--text-primary) 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 48px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  margin-top: 40px;
}

.feature-card {
  padding: 40px 32px;
  border-radius: 16px;
}

.feature-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.feature-icon-wrapper.purple {
  background: rgba(147, 51, 234, 0.15);
  color: var(--primary);
}

.feature-icon-wrapper.cyan {
  background: rgba(0, 242, 254, 0.15);
  color: var(--secondary);
}

.feature-icon-wrapper.pink {
  background: rgba(255, 0, 127, 0.15);
  color: var(--accent);
}

.feature-card h3 {
  font-size: 22px;
  margin: 0 0 16px;
  font-weight: 600;
}

.feature-card p {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 16px;
}

/* Playground Section */
.playground-section {
  padding: 80px 0;
  border-top: 1px solid var(--border-glow);
}

.playground-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-top: 40px;
}

.playground-input-panel, .playground-output-panel {
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  background: rgba(0, 0, 0, 0.2);
  padding: 16px 20px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-glow);
}

.playground-textarea {
  background: transparent;
  border: none;
  resize: none;
  height: 180px;
  padding: 20px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 16px;
  outline: none;
  line-height: 1.6;
}

.chat-preview {
  padding: 20px;
  background: rgba(0, 0, 0, 0.15);
  border-bottom: 1px solid var(--border-glow);
  flex-grow: 1;
}

.chat-bubble-container {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.chat-avatar {
  width: 40px;
  height: 40px;
  background: var(--primary);
  color: white;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-bubble {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px 16px 16px 16px;
  padding: 12px 16px;
  max-width: 80%;
}

.chat-sender {
  font-size: 12px;
  color: var(--secondary);
  font-weight: 600;
  margin-bottom: 4px;
}

.chat-message-content {
  font-size: 15px;
  line-height: 1.5;
}

.render-at {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  margin-right: 4px;
}

.render-face {
  background: rgba(253, 224, 71, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  color: #fde047;
}

.render-image {
  color: #10b981;
  font-weight: 500;
}

.render-md {
  color: #f472b6;
  font-weight: 500;
}

.json-code-block {
  background: rgba(0, 0, 0, 0.4);
  padding: 16px 20px;
  max-height: 180px;
  overflow-y: auto;
}

.json-code-block pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  color: #818cf8;
}

/* Quickstart Section */
.quickstart-section {
  padding: 80px 0;
  border-top: 1px solid var(--border-glow);
}

.quickstart-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-bottom: 48px;
}

.step-item {
  padding: 32px 24px;
  border-radius: 16px;
  position: relative;
}

.step-num {
  position: absolute;
  top: 24px;
  right: 24px;
  font-size: 48px;
  font-weight: 800;
  opacity: 0.15;
  color: var(--secondary);
}

.step-item h3 {
  font-size: 20px;
  margin: 0 0 12px;
}

.step-item p {
  color: var(--text-secondary);
  line-height: 1.5;
  font-size: 15px;
}

.config-explorer {
  border-radius: 16px;
  overflow: hidden;
}

.config-header {
  background: rgba(0, 0, 0, 0.3);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.copy-btn {
  background: var(--primary);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.copy-btn:hover {
  background: #a78bfa;
}

.config-body {
  padding: 24px;
  max-height: 400px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.2);
}

.config-body pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.6;
  color: #cbd5e1;
  text-align: left;
}

/* Matrix Section */
.matrix-section {
  padding: 80px 0;
  border-top: 1px solid var(--border-glow);
}

.matrix-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  margin-bottom: 24px;
  gap: 20px;
}

.matrix-tabs {
  display: flex;
  gap: 8px;
}

.matrix-tabs button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glow);
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.matrix-tabs button.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.search-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glow);
  border-radius: 20px;
  padding: 8px 20px;
  width: 300px;
  color: var(--text-primary);
  outline: none;
  transition: var(--transition-smooth);
}

.search-input:focus {
  border-color: var(--secondary);
}

.matrix-table {
  border-radius: 16px;
  overflow: hidden;
}

.table-header {
  background: rgba(0, 0, 0, 0.3);
  display: grid;
  grid-template-columns: 2fr 1fr 3fr 1fr;
  padding: 16px 24px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-glow);
  text-align: left;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 3fr 1fr;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
  text-align: left;
}

.table-row:last-child {
  border-bottom: none;
}

.type-tag, .status-tag {
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.type-tag.api { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.type-tag.cq { background: rgba(147, 51, 234, 0.15); color: #c084fc; }
.type-tag.ext { background: rgba(236, 72, 153, 0.15); color: #f472b6; }

.status-tag.implemented { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.status-tag.extended { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }

.font-mono {
  font-family: var(--font-mono);
}

.no-results {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

/* Footer */
.footer-wrapper {
  padding: 40px 0;
  border-top: 1px solid var(--border-glow);
  margin-top: 80px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 14px;
}

.footer-links {
  display: flex;
  gap: 20px;
}

.footer-links a {
  color: var(--text-muted);
  text-decoration: none;
  transition: var(--transition-smooth);
}

.footer-links a:hover {
  color: var(--secondary);
}

/* Responsive Overrides */
@media (max-width: 1024px) {
  .playground-grid {
    grid-template-columns: 1fr;
  }
  .quickstart-steps {
    grid-template-columns: 1fr;
  }
  .matrix-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input {
    width: auto;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 40px;
  }
  .table-header, .table-row {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .col-desc {
    grid-column: span 2;
  }
  .navbar-content {
    flex-direction: column;
    height: auto;
    padding: 16px 0;
    gap: 16px;
  }
}
</style>
