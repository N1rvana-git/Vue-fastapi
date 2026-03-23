<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus' // 🌟 引入了极其优雅的弹窗组件 ElNotification
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user.js'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
// === 🌟 新增：AI 管家状态 ===
const aiVisible = ref(false)
const aiInput = ref('')
const aiLoading = ref(false)
const aiHistory = ref([
  { role: 'assistant', 
  content: '你好！我是二手平台的 AI 管家闲小宝🤖，有什么我可以帮你的吗？（比如问我：平台上有什么电脑卖？）',
  timestamp: new Date().toISOString() }
])

// 格式化时间，只显示 HH:mm (例如 14:30)
function formatChatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 判断是否需要显示全局时间（间隔超过 5 分钟）
function shouldShowTime(index) {
  if (index === 0) return true // 第一条永远显示
  if (!aiHistory.value[index].timestamp) return false
  
  const current = new Date(aiHistory.value[index].timestamp)
  
  // 确保上一条消息存在且有时间戳
  if (index > 0 && aiHistory.value[index - 1] && aiHistory.value[index - 1].timestamp) {
    const prev = new Date(aiHistory.value[index - 1].timestamp)
    // 5 * 60 * 1000 = 5分钟的毫秒数
    return (current - prev) > 5 * 60 * 1000 
  }
  return true
}

async function sendAiMessage() {
  const text = aiInput.value.trim()
  if (!text || aiLoading.value) return
  
  // 1. 把用户的话塞进记忆数组，带上时间戳
  aiHistory.value.push({ 
    role: 'user', 
    content: text, 
    timestamp: new Date().toISOString() 
  })

  // 清空输入框并显示加载状态
  aiInput.value = ''
  aiLoading.value = true
  
  // 自动滚动到底部
  nextTick(() => { const box = document.getElementById('ai-chat-box'); if(box) box.scrollTop = box.scrollHeight })

  try {
    // 2. 🌟 核心：把整个带有记忆的数组发给咱们刚写的后端！
    // 2. 🌟 核心：把整个带有记忆的数组发给后端，并且必须带上 Token 通行证！
    const response = await axios.post(
      `${BASE_URL}items/ai/agent`, 
      { history: aiHistory.value }, // 请求体数据
      { 
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } 
      } // 🌟 新增：请求头门禁卡！
    )
    
    // 3. 把 AI 的回复也塞进记忆数组，带上时间戳
    aiHistory.value.push({ 
      role: 'assistant', 
      content: response.data.reply,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('AI 请求失败:', error)
    aiHistory.value.push({ 
      role: 'assistant', 
      content: '哎呀，我的大脑似乎断线了...',
      timestamp: new Date().toISOString()
    })
  } finally {
    aiLoading.value = false
    nextTick(() => { const box = document.getElementById('ai-chat-box'); if(box) box.scrollTop = box.scrollHeight })
  }
}
// === 🌟 新增：唤醒闲小宝的永久记忆 ===
async function fetchAiHistory() {
  try {
    // 🌟 核心修复：在 history 后面加上斜杠 / ！！！
    const response = await axios.get(`${BASE_URL}items/ai/history/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    
    // 如果数据库里有记忆，就用数据库的记忆替换掉默认的那句打招呼
    if (response.data && response.data.length > 0) {
      aiHistory.value = response.data
      
      // 拉取完记忆后，自动滚动到聊天框最底部
      nextTick(() => { 
        const box = document.getElementById('ai-chat-box'); 
        if(box) box.scrollTop = box.scrollHeight 
      })
    }
  } catch (error) {
    console.error('🧠 拉取 AI 记忆失败:', error)
  }
}
// === 🌟 新增：一键清空 AI 记忆 ===
async function clearAiHistory() {
  try {
    // 1. 弹出极其温柔的防误触确认框
    await ElMessageBox.confirm('确定要清空和闲小宝的所有聊天记录吗？', '⚠️ 警告', {
      confirmButtonText: '物理超度',
      cancelButtonText: '手滑了',
      type: 'warning'
    })
    
    // 2. 告诉后端：立刻执行 DELETE 删库！
    await axios.delete(`${BASE_URL}items/ai/history/`, {
      headers: { 
        Authorization: `Bearer ${localStorage.getItem('access_token')}` 
      }
    })
    
    // 3. 后端删完后，前端立马把本地的聊天记录数组清零！
    // 并且塞入一句全新的、带有时间戳的打招呼，假装它刚刚“失忆重生”
    aiHistory.value = [
      { 
        role: 'assistant', 
        content: '🧹 唰！我的记忆已经被彻底清空啦！我们重新认识一下吧，我是闲小宝~',
        timestamp: new Date().toISOString() 
      }
    ]
    ElMessage.success('记忆已完美清除！')
  } catch (error) {
    // 如果用户点了取消，或者网络报错
    if (error !== 'cancel') {
      ElMessage.error('清理记忆失败，请检查网络！')
    }
  }
}
const router = useRouter()
const userStore = useUserStore()
const isDarkMode = ref(false)
const introVisible = ref(false)
let introTimer = null
const tagsList = ref([])
const tagManageMode = ref(false)
const tagDialogVisible = ref(false)
const tagSubmitLoading = ref(false)
const tagForm = ref({ name: '' })
const itemsList = ref([]) 
const isLoading = ref(false)

const currentFilter = ref('all')
const searchQuery = ref('') 

const currentPage = ref(1) 
const pageSize = ref(8)    
const totalItems = ref(0)  

const dialogVisible = ref(false)
const submitLoading = ref(false)
const itemForm = ref({ name: '', price: '', is_offer: true, image_path: '' })

const editDialogVisible = ref(false)
const editSubmitLoading = ref(false)
const editForm = ref({ id: null, name: '', price: '', is_offer: true, image_path: '' })

// 聊天室状态
const chatVisible = ref(false)
const chatMessages = ref([])
const chatInput = ref('')
const unreadCount = ref(0) // 🌟 新增：记录未读消息数量！
let ws = null
const pendingEchoes = []

function trackPendingEcho(message) {
  pendingEchoes.push({ message, expiresAt: Date.now() + 7000 })
}

function isPendingEcho(message) {
  const now = Date.now()
  for (let i = pendingEchoes.length - 1; i >= 0; i--) {
    if (pendingEchoes[i].expiresAt < now) {
      pendingEchoes.splice(i, 1)
      continue
    }
    if (pendingEchoes[i].message === message) {
      pendingEchoes.splice(i, 1)
      return true
    }
  }
  return false
}

// ⚠️⚠️⚠️ 换成你的 Codespaces 链接 
const BASE_URL = 'https://jubilant-yodel-4jr9qx56jv9q3qrxg-8000.app.github.dev/'

const getUploadHeaders = () => { return { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
function handleUploadSuccess(response) { itemForm.value.image_path = response.url; ElMessage.success('🖼️ 图片上传成功！') }
function handleEditUploadSuccess(response) { editForm.value.image_path = response.url; ElMessage.success('🖼️ 新图片上传成功！') }
function getFullImageUrl(path) { return path ? BASE_URL + path.replace(/^\//, '') : '' }

// === 🌟 升级版：后台静默监听魔法 ===
function initWebSocket() {
  if (ws) return // 防止重复连接
  const token = localStorage.getItem('access_token') || ''
  const wsUrl = BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '') + `/items/ws/hall?token=${token}`
  ws = new WebSocket(wsUrl)
  
  ws.onopen = () => { console.log('🟢 已连接到全局交易大厅后台') }
  
  ws.onmessage = (event) => {
    const incoming = String(event.data || '')
    if (!incoming) return
    if (isPendingEcho(incoming)) return

    chatMessages.value.push(incoming)
    
    // 🌟 核心逻辑：如果聊天面板是关着的，就加红点 + 弹窗！
    if (!chatVisible.value) {
      unreadCount.value++ // 红点数字 +1
      
      // 弹出极其优雅的右下角通知
      ElNotification({
        title: '💬 交易大厅新消息',
        message: event.data,
        position: 'bottom-right',
        type: 'info',
        duration: 4000 // 显示 4 秒后自动消失
      })
    } else {
      // 如果面板开着，就不用弹窗了，直接自动滚动到底部
      nextTick(() => {
        const box = document.getElementById('chat-box')
        if(box) box.scrollTop = box.scrollHeight
      })
    }
  }
  
  ws.onclose = () => { ws = null }
}

function toggleChat() {
  chatVisible.value = !chatVisible.value
  // 🌟 打开面板时，未读消息清零！红点消失！
  if (chatVisible.value) {
    unreadCount.value = 0 
    nextTick(() => {
      const box = document.getElementById('chat-box')
      if(box) box.scrollTop = box.scrollHeight
    })
  }
}

function sendChatMessage() {
  const content = chatInput.value.trim()
  if (!content) return

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ElMessage.warning('聊天室正在重连，请稍后再发消息')
    initWebSocket()
    return
  }

  const payload = `[我]: ${content}`
  chatMessages.value.push(payload)
  trackPendingEcho(payload)
  ws.send(payload)
  chatInput.value = ''

  nextTick(() => {
    const box = document.getElementById('chat-box')
    if (box) box.scrollTop = box.scrollHeight
  })
}
// ======================================

async function fetchTags() {
  try { tagsList.value = (await axios.get(`${BASE_URL}items/tags/`)).data } catch (e) { console.error(e) }
}

async function submitTag() {
  const name = tagForm.value.name.trim()
  if (!name) {
    ElMessage.warning('标签名不能为空')
    return
  }

  try {
    tagSubmitLoading.value = true
    await axios.post(
      `${BASE_URL}items/tags/`,
      { name },
      { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
    )
    ElMessage.success('标签已添加')
    tagDialogVisible.value = false
    tagForm.value.name = ''
    fetchTags()
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '添加标签失败，请检查权限')
  } finally {
    tagSubmitLoading.value = false
  }
}

async function removeTag(tag) {
  try {
    await ElMessageBox.confirm(`确定删除标签 #${tag.name} 吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await axios.delete(`${BASE_URL}items/tags/${tag.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    tagsList.value = tagsList.value.filter(item => item.id !== tag.id)
    ElMessage.success('标签已删除')
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '删除标签失败，请检查权限')
    fetchTags()
  }
}

async function fetchItems() {
  try {
    isLoading.value = true
    const queryParams = { skip: (currentPage.value - 1) * pageSize.value, limit: pageSize.value }
    if (currentFilter.value === 'offer') queryParams.is_offer_filter = true
    else if (currentFilter.value === 'request') queryParams.is_offer_filter = false
    if (searchQuery.value.trim() !== '') queryParams.search = searchQuery.value.trim()

    const response = await axios.get(`${BASE_URL}items/`, { params: queryParams })
    itemsList.value = response.data.items || response.data 
    totalItems.value = response.data.total || 0
  } catch (error) { ElMessage.error('拉取商品失败 💥') } finally { isLoading.value = false }
}

function handleFilterOrSearch() { currentPage.value = 1; fetchItems() }

async function submitItem() {
  if (!itemForm.value.name || !itemForm.value.price) return ElMessage.warning('不能为空哦！')
  try {
    submitLoading.value = true
    await axios.post(`${BASE_URL}items/`, { ...itemForm.value, price: parseFloat(itemForm.value.price) })
    ElMessage.success('🎉 商品发布成功！')
    dialogVisible.value = false
    itemForm.value = { name: '', price: '', is_offer: true, image_path: '' }
    fetchItems()
  } catch (error) { ElMessage.error('💥 发布失败！') } finally { submitLoading.value = false }
}

async function deleteItem(itemId) {
  try { await ElMessageBox.confirm('真的要删除吗？', '⚠️ 警告', { type: 'warning' }) } catch { return }
  try {
    isLoading.value = true; await axios.delete(`${BASE_URL}items/${itemId}`)
    ElMessage.success('🗑️ 删除成功！'); fetchItems() 
  } catch (error) {
    if (error.response?.status === 403) ElMessage.error('🛑 只能删除自己的商品！')
  } finally { isLoading.value = false }
}

function openEditDialog(item) { editForm.value = { ...item }; editDialogVisible.value = true }
// === 🌟 新增：前端下单扣款逻辑 ===
async function buyItem(item) {
  // 1. 拦截求购贴
  if (!item.is_offer) {
    return ElMessage.warning('这是一个求购贴，不能抢购哦！')
  }

  try {
    // 2. 极其残忍的剁手确认框
    await ElMessageBox.confirm(`确定要花 ￥${item.price} 抢购【${item.name}】吗？`, '💰 确认支付', {
      confirmButtonText: '确认剁手',
      cancelButtonText: '再想想',
      type: 'warning'
    })

    // 3. 带着 Token 发起防超卖抢购请求！
    const response = await axios.post(`${BASE_URL}items/${item.id}/buy`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })

    // 4. 抢购成功后的无缝体验
    ElMessage.success(response.data.message || '🎉 抢购成功！')
    fetchItems() // 重新拉取商品列表，刚才被你买走的东西会瞬间从大厅消失！
    
  } catch (error) {
    // 完美展示后端的拦截器错误（比如不能买自己的商品）
    ElMessage.error(error.response?.data?.detail || '抢购失败，服务器开小差了！')
  }
}
async function submitEdit() {
  try {
    editSubmitLoading.value = true
    await axios.put(`${BASE_URL}items/${editForm.value.id}`, { ...editForm.value, price: parseFloat(editForm.value.price) })
    ElMessage.success('✏️ 修改成功！'); editDialogVisible.value = false; fetchItems()
  } catch (error) { if (error.response?.status === 403) ElMessage.error('🛑 只能修改自己商品！') } finally { editSubmitLoading.value = false }
}

function handleLogout() {
  userStore.logout()
  ElMessage.success('已退出登录')
  router.replace('/login')
}

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem('theme', dark ? 'dark' : 'light')
  isDarkMode.value = dark
}

function toggleTheme() {
  applyTheme(!isDarkMode.value)
}

onMounted(() => { 
  const introFlag = sessionStorage.getItem('post_login_intro')
  if (introFlag === '1') {
    introVisible.value = true
    sessionStorage.removeItem('post_login_intro')
    introTimer = setTimeout(() => {
      introVisible.value = false
      introTimer = null
    }, 1200)
  }

  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme === 'dark')
  } else {
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }

  fetchTags()
  fetchItems()
  fetchAiHistory() // 🌟 页面加载时，先把 AI 的记忆拉取过来，准备好聊天记录了！
  initWebSocket() // 🌟 页面一加载完毕，立刻在后台连上电话线！
})

onUnmounted(() => {
  if (introTimer) {
    clearTimeout(introTimer)
    introTimer = null
  }

  if (ws) {
    ws.close()
    ws = null
  }
})
// === 🌟 新增：个人数据看板状态与函数 ===
const dashboardVisible = ref(false)
const dashboardData = ref(null)

async function openDashboard() {
  dashboardVisible.value = true
  try {
    const response = await axios.get(`${BASE_URL}items/dashboard/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    dashboardData.value = response.data
  } catch (error) {
    ElMessage.error('获取个人数据失败！请重试')
  }
}
</script>

<template>
  <div class="home-container">
    <transition name="startup-fade">
      <div v-if="introVisible" class="startup-overlay">
        <div class="startup-mark">R</div>
        <p class="startup-text">启动买家大厅...</p>
      </div>
    </transition>

    <h1>🚀 我的全栈二手平台</h1>
    <div class="hero-meta">
      <p class="hero-subtitle">灵感来自顶级产品官网的编辑式布局，保留简洁效率，同时提升视觉辨识度。</p>
      <div class="hero-pills">
        <span class="pill">在售商品 {{ itemsList.length }}</span>
        <span class="pill">热门标签 {{ tagsList.length }}</span>
        <span class="pill">实时交易大厅已连接</span>
      </div>
    </div>
    
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>🏷️ 平台热门标签</span>
          <div class="header-buttons">
            <el-button circle plain class="theme-switch-btn header-pill-btn" @click="toggleTheme">
              {{ isDarkMode ? '☀️' : '🌙' }}
            </el-button>
            <el-button plain class="header-pill-btn" @click="tagManageMode = !tagManageMode">
              {{ tagManageMode ? '完成管理' : '管理标签' }}
            </el-button>
            <el-button type="primary" plain class="header-pill-btn" @click="tagDialogVisible = true">
              <el-icon><Plus /></el-icon>
              新增标签
            </el-button>
            <el-button type="warning" plain class="header-pill-btn" @click="router.push('/seller')">👤 个人中心</el-button>
            <el-button type="danger" class="header-pill-btn" @click="handleLogout">退出</el-button>
          </div>
        </div>
      </template>
      <div v-if="tagsList.length > 0" class="tags-container">
        <el-tag
          v-for="tag in tagsList"
          :key="tag.id"
          size="large"
          round
          :closable="tagManageMode"
          class="hot-tag"
          @close="removeTag(tag)"
        >
          # {{ tag.name }}
        </el-tag>
      </div>
      <el-empty v-else description="还没有热门标签" :image-size="60" />
    </el-card>

    <div class="control-panel">
      <div class="title-with-refresh">
        <h2 class="section-title">🛍️ 最新发布</h2>
        <el-button type="success" :icon="Refresh" circle plain @click="fetchItems" :loading="isLoading"></el-button>
      </div>
      <div class="filters-wrapper">
        <el-input v-model="searchQuery" placeholder="搜索..." class="search-box" clearable @keyup.enter="handleFilterOrSearch" @clear="handleFilterOrSearch">
          <template #append><el-button :icon="Search" @click="handleFilterOrSearch" /></template>
        </el-input>
        <el-radio-group v-model="currentFilter" @change="handleFilterOrSearch" size="default">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="offer">出售</el-radio-button>
          <el-radio-button value="request">求购</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <el-empty v-if="itemsList.length === 0" description="没有找到对应的商品哦~" />
    
    <div v-else class="product-grid">
      <el-card v-for="item in itemsList" :key="item.id" class="item-card glass-card" shadow="hover" :body-style="{ padding: '0px' }">
        <div class="image-wrapper">
          <el-image v-if="item.image_path" :src="getFullImageUrl(item.image_path)" class="item-image" fit="cover" />
          <div v-else class="no-image">暂无图片</div>
        </div>
        <div class="item-info">
          <h3 class="item-name">{{ item.name }}</h3>
          <p class="item-price">¥ {{ item.price }}</p>
          <div class="card-footer">
            <el-tag :type="item.is_offer ? 'success' : 'danger'" effect="dark" class="status-tag">{{ item.is_offer ? '出售' : '求购' }}</el-tag>
            <div class="action-buttons">
              <el-button v-if="item.is_offer" type="success" size="small" round @click="buyItem(item)">抢购</el-button>
            </div>
          </div>
        </div> 
      </el-card> 
    </div>

    <div class="pagination-wrapper" v-if="totalItems > 0">
      <el-pagination background layout="total, prev, pager, next, jumper" :total="totalItems" :page-size="pageSize" v-model:current-page="currentPage" @current-change="fetchItems" />
    </div>

    <div class="chat-widget">
      <!-- 🌟 原有的聊天室 -->
      <transition name="el-zoom-in-bottom">
        <el-card v-show="chatVisible" class="chat-panel" shadow="always" :body-style="{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%' }">
          <div class="chat-header">
            <span>🌐 全局实时交易大厅</span>
            <el-button link @click="chatVisible = false" style="color: white; font-size: 18px;">❌</el-button>
          </div>
          
          <div id="chat-box" class="chat-body">
            <div v-for="(msg, index) in chatMessages" :key="index" :class="['chat-message', { 'self-message': String(msg).startsWith('[我]:') }]">
              {{ msg }}
            </div>
            <div v-if="chatMessages.length === 0" class="chat-empty">还没有人说话，快来打个招呼吧！</div>
          </div>
          
          <div class="chat-footer">
            <el-input v-model="chatInput" placeholder="说点什么 (按回车发送)..." @keyup.enter="sendChatMessage">
              <template #append><el-button @click="sendChatMessage" type="warning">发送</el-button></template>
            </el-input>
          </div>
        </el-card>
      </transition>

      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="chat-badge-wrapper">
        <el-button type="warning" circle size="large" class="chat-btn" @click="toggleChat">
          💬
        </el-button>
      </el-badge>
    </div>

    
    
    <div class="ai-widget">
      <transition name="el-zoom-in-bottom">
        <el-card v-show="aiVisible" class="ai-panel" shadow="always" :body-style="{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%' }">
          <div class="ai-header">
            <span>🤖 AI 管家：闲小宝</span>
            <div>
              <el-button link @click="clearAiHistory" style="color: white; font-size: 16px; margin-right: 10px;" title="清空记忆">
                🗑️
              </el-button>
              <el-button link @click="aiVisible = false" style="color: white; font-size: 18px;">
                ❌
              </el-button>
            </div>
          </div>
          
          <div id="ai-chat-box" class="chat-body">
            <div v-for="(msg, index) in aiHistory" :key="index" class="message-wrapper">
              
              <div v-if="shouldShowTime(index)" class="chat-time-divider">
                {{ formatChatTime(msg.timestamp) }}
              </div>
              
              <div :class="['chat-bubble-container', msg.role === 'user' ? 'is-user' : 'is-ai']">
                <div :class="['chat-bubble', msg.role === 'user' ? 'user-bubble' : 'ai-bubble']">
                  {{ msg.content }}
                </div>
                <span class="hover-time">{{ formatChatTime(msg.timestamp) }}</span>
              </div>
              
            </div>
            <div v-if="aiLoading" class="ai-bubble typing-indicator">闲小宝正在翻阅数据库... ⏳</div>
          </div>

          <!-- 🌟 这就是你丢失的输入框！ -->
          <div class="ai-input-footer">
            <el-input 
              v-model="aiInput" 
              placeholder="问我点什么..." 
              @keyup.enter="sendAiMessage"
              :disabled="aiLoading"
            >
              <template #append>
                <el-button @click="sendAiMessage" :loading="aiLoading">发送</el-button>
              </template>
            </el-input>
          </div>
        </el-card>
      </transition>
      <el-button type="primary" circle size="large" class="ai-btn" @click="aiVisible = !aiVisible">🤖</el-button>
    </div>

    <el-dialog v-model="tagDialogVisible" title="新增热门标签" width="420px" class="tag-dialog">
      <div class="tag-input-block">
        <el-input v-model="tagForm.name" maxlength="20" show-word-limit placeholder="输入标签名称，例如：数码、校园、闲置" @keyup.enter="submitTag" />
      </div>
      <template #footer>
        <el-button class="header-pill-btn" @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" class="header-pill-btn" :loading="tagSubmitLoading" @click="submitTag">确认新增</el-button>
      </template>
    </el-dialog>
  </div>
  
</template>

<style scoped>
.home-container {
  --ink: var(--foreground);
  --soft-ink: var(--muted-foreground);
  --accent: var(--primary);
  --soft-accent: color-mix(in srgb, var(--primary) 68%, #ffffff 32%);
  --glass: color-mix(in srgb, var(--card) 84%, transparent);
  --glass-border: color-mix(in srgb, var(--border) 88%, transparent);
  width: 100%;
  min-height: 100vh;
  max-width: none;
  margin: 0;
  padding: 30px clamp(14px, 3vw, 44px) 120px;
  color: var(--ink);
  background:
    radial-gradient(1000px 500px at 5% -8%, color-mix(in srgb, var(--primary) 20%, transparent), transparent 58%),
    radial-gradient(900px 450px at 110% 0%, color-mix(in srgb, var(--chart-4) 14%, transparent), transparent 52%),
    linear-gradient(125deg, color-mix(in srgb, var(--background) 92%, #dbeafe 8%) 0%, color-mix(in srgb, var(--background) 96%, #e2e8f0 4%) 100%);
  transition: background 0.35s ease, color 0.3s ease;
  position: relative;
  isolation: isolate;
}

.startup-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: color-mix(in srgb, var(--background) 86%, transparent);
  backdrop-filter: blur(7px);
}

.startup-mark {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-foreground);
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--chart-4) 70%, var(--primary) 30%));
  box-shadow: 0 14px 30px color-mix(in srgb, var(--primary) 28%, transparent);
  animation: startup-pop 0.8s ease;
}

.startup-text {
  margin: 0;
  color: var(--ink);
  letter-spacing: 0.2px;
  font-weight: 600;
}

.startup-fade-enter-active,
.startup-fade-leave-active {
  transition: opacity 0.28s ease;
}

.startup-fade-enter-from,
.startup-fade-leave-to {
  opacity: 0;
}

@keyframes startup-pop {
  0% {
    transform: scale(0.7) translateY(8px);
    opacity: 0;
  }
  60% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.home-container::before,
.home-container::after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: -1;
  border-radius: 50%;
  filter: blur(30px);
}

.home-container::before {
  width: 320px;
  height: 320px;
  left: -120px;
  top: -80px;
  background: color-mix(in srgb, var(--primary) 28%, transparent);
}

.home-container::after {
  width: 360px;
  height: 360px;
  right: -120px;
  top: 160px;
  background: color-mix(in srgb, var(--chart-4) 22%, transparent);
}

.dark .home-container {
  --soft-accent: color-mix(in srgb, var(--primary) 75%, #8ec5ff 25%);
  --glass: color-mix(in srgb, var(--card) 70%, transparent);
  --glass-border: color-mix(in srgb, var(--border) 76%, #5c7cb1 24%);
  background:
    radial-gradient(1050px 540px at 0% -10%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 58%),
    radial-gradient(820px 430px at 100% 0%, color-mix(in srgb, var(--chart-4) 18%, transparent), transparent 55%),
    linear-gradient(130deg, color-mix(in srgb, var(--background) 93%, #081226 7%) 0%, color-mix(in srgb, var(--background) 88%, #101b35 12%) 100%);
}

.home-container h1 {
  margin: 2px 0 22px;
  text-align: center;
  color: var(--ink);
  letter-spacing: 0.6px;
  font-size: clamp(30px, 3.2vw, 52px);
  text-shadow: 0 14px 38px rgba(2, 7, 18, 0.28);
}

.hero-meta {
  margin: 0 auto 24px;
  max-width: 900px;
  text-align: center;
}

.hero-subtitle {
  margin: 0;
  color: var(--soft-ink);
  font-size: clamp(14px, 1.4vw, 17px);
  line-height: 1.7;
}

.hero-pills {
  margin-top: 14px;
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 999px;
  color: color-mix(in srgb, var(--accent) 80%, var(--foreground) 20%);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border) 70%);
  background: color-mix(in srgb, var(--card) 88%, transparent);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

:deep(.tags-container .el-tag) {
  border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border) 76%);
  background: color-mix(in srgb, var(--card) 85%, transparent);
  color: var(--ink);
}

.header-buttons,
.tags-container,
.filters-wrapper,
.action-buttons,
.chat-footer,
.ai-input-footer {
  display: flex;
  gap: 10px;
}

.theme-switch-btn {
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border) 65%);
  color: var(--soft-accent);
  background: color-mix(in srgb, var(--card) 88%, transparent);
}

.header-pill-btn {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, var(--primary) 22%);
  background: color-mix(in srgb, var(--card) 90%, transparent);
  color: var(--ink) !important;
  font-weight: 600;
  backdrop-filter: blur(6px);
  padding-inline: 14px;
  height: 34px;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

:deep(.el-button--primary.header-pill-btn) {
  color: color-mix(in srgb, var(--primary) 88%, var(--foreground) 12%) !important;
  border-color: color-mix(in srgb, var(--primary) 44%, var(--border) 56%) !important;
  background: color-mix(in srgb, var(--primary) 12%, var(--card) 88%) !important;
}

:deep(.el-button--warning.header-pill-btn) {
  color: color-mix(in srgb, var(--color-fd-warning, #f99c00) 72%, var(--foreground) 28%) !important;
  border-color: color-mix(in srgb, var(--color-fd-warning, #f99c00) 40%, var(--border) 60%) !important;
  background: color-mix(in srgb, var(--color-fd-warning, #f99c00) 10%, var(--card) 90%) !important;
}

:deep(.el-button--danger.header-pill-btn) {
  color: color-mix(in srgb, var(--destructive) 86%, var(--foreground) 14%) !important;
  border-color: color-mix(in srgb, var(--destructive) 36%, var(--border) 64%) !important;
  background: color-mix(in srgb, var(--destructive) 10%, var(--card) 90%) !important;
}

.header-pill-btn:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--primary) 44%, var(--border) 56%);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--primary) 14%, transparent);
}

.theme-switch-btn:hover {
  transform: translateY(-1px);
}

.tags-container {
  flex-wrap: wrap;
}

.hot-tag {
  cursor: default;
}

:deep(.hot-tag .el-tag__close) {
  border-radius: 50%;
}

.control-panel {
  margin: 20px 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.title-with-refresh {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title {
  margin: 0;
  color: var(--ink);
  letter-spacing: 0.4px;
}

.search-box {
  width: min(420px, 100%);
}

.filters-wrapper {
  flex-wrap: wrap;
  align-items: center;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.item-card {
  overflow: hidden;
  border-radius: var(--radius-lg);
}

:deep(.glass-card) {
  background: var(--glass) !important;
  border: 1px solid var(--glass-border) !important;
  backdrop-filter: blur(18px) saturate(1.12) !important;
  -webkit-backdrop-filter: blur(18px) saturate(1.12) !important;
  box-shadow: 0 18px 34px rgba(4, 10, 25, 0.2) !important;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

:deep(.glass-card:hover) {
  transform: translateY(-6px);
  box-shadow: 0 22px 44px rgba(4, 10, 25, 0.28) !important;
  border-color: color-mix(in srgb, var(--primary) 36%, var(--border) 64%) !important;
}

:deep(.glass-card .el-card__body) {
  height: 100%;
  padding: 0;
}

.image-wrapper {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.item-image {
  width: 100%;
  height: 100%;
  display: block;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c4d2ea;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 164px;
  padding: 15px 15px 13px;
  background: color-mix(in srgb, var(--card) 90%, transparent);
}

.item-name {
  margin: 0;
  font-size: clamp(22px, 1.6vw, 28px);
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-price {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: color-mix(in srgb, var(--chart-4) 72%, var(--foreground) 28%);
}

.card-footer {
  margin-top: auto;
  padding-top: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-tag {
  font-weight: 700;
}

.pagination-wrapper {
  margin: 26px 0 10px;
  display: flex;
  justify-content: center;
}

:deep(.el-card:not(.glass-card):not(.chat-panel):not(.ai-panel)) {
  background: color-mix(in srgb, var(--card) 84%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--border) 90%, transparent) !important;
  color: var(--ink) !important;
  box-shadow: 0 10px 26px color-mix(in srgb, var(--foreground) 12%, transparent);
}

:deep(.el-input__wrapper) {
  background: color-mix(in srgb, var(--card) 86%, transparent) !important;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--border) 85%, var(--accent) 15%) inset !important;
}

:deep(.el-input__inner) {
  color: var(--ink) !important;
}

:deep(.el-pager li),
:deep(.btn-prev),
:deep(.btn-next) {
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--card) 88%, transparent) !important;
  color: var(--ink) !important;
}

:deep(.el-pager li.is-active) {
  background: var(--accent) !important;
  color: var(--primary-foreground) !important;
  font-weight: 700;
}

.chat-widget,
.ai-widget {
  position: fixed;
  bottom: 26px;
  z-index: 40;
  pointer-events: none;
}

.chat-widget {
  left: 22px;
}

.ai-widget {
  right: 22px;
}

.chat-btn,
.ai-btn,
.chat-panel,
.ai-panel {
  pointer-events: auto;
}

.chat-panel,
.ai-panel {
  width: min(360px, calc(100vw - 30px));
  height: 470px;
  margin-bottom: 12px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent) 32%, var(--border) 68%);
}

.chat-header,
.ai-header {
  min-height: 52px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(90deg, color-mix(in srgb, var(--primary) 88%, #183454 12%) 0%, color-mix(in srgb, var(--chart-4) 68%, var(--primary) 32%) 100%);
  color: var(--primary-foreground);
  font-weight: 700;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: color-mix(in srgb, var(--background) 74%, #0c162a 26%);
}

.chat-message,
.ai-bubble {
  max-width: 88%;
  border-radius: 10px;
  padding: 8px 10px;
  color: var(--ink);
  background: color-mix(in srgb, var(--primary) 16%, var(--card) 84%);
  line-height: 1.45;
}

.chat-message {
  width: fit-content;
}

.self-message {
  align-self: flex-end;
  background: color-mix(in srgb, var(--chart-4) 22%, var(--card) 78%);
}

.chat-empty {
  margin: auto;
  color: var(--soft-ink);
  font-size: 13px;
}

.chat-footer,
.ai-input-footer {
  padding: 12px;
  border-top: 1px solid color-mix(in srgb, var(--border) 72%, var(--accent) 28%);
  background: color-mix(in srgb, var(--card) 90%, transparent);
}

.chat-badge-wrapper {
  display: inline-block;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-time-divider {
  align-self: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--soft-ink);
  background: color-mix(in srgb, var(--card) 74%, transparent);
}

.chat-bubble-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.is-user {
  align-items: flex-end;
}

.is-ai {
  align-items: flex-start;
}

.chat-bubble {
  max-width: 90%;
  padding: 8px 11px;
  border-radius: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.tag-input-block {
  display: flex;
  align-items: center;
  padding: 4px 0 2px;
}

.user-bubble {
  color: var(--primary-foreground);
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 80%, #58c1ff 20%), color-mix(in srgb, var(--chart-4) 82%, var(--primary) 18%));
}

.ai-bubble {
  background: color-mix(in srgb, var(--primary) 22%, var(--card) 78%);
  color: var(--ink);
}

.hover-time {
  font-size: 11px;
  color: var(--soft-ink);
}

.typing-indicator {
  margin-top: 6px;
  align-self: flex-start;
}

@media (max-width: 900px) {
  .home-container {
    padding: 24px 10px 120px;
  }

  .hero-meta {
    margin-bottom: 18px;
  }

  .card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-buttons {
    width: 100%;
  }

  .header-buttons :deep(.el-button) {
    flex: 1;
  }

  .filters-wrapper {
    width: 100%;
  }

  .search-box {
    width: 100%;
  }

  .chat-panel,
  .ai-panel {
    height: 420px;
  }

  .item-name {
    font-size: 22px;
  }
}
</style>