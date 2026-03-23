<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

const isDark = ref(false)
function toggleDark() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// ============ Splash 开机动画状态 ============
const splashDone = ref(false)

// ============ 鼠标引力光标 (Lerp rAF 插值) ============
const cursorX = ref(-100)
const cursorY = ref(-100)
const targetX = ref(-100)
const targetY = ref(-100)
let cursorRaf = null

function onMouseMove(e) {
  targetX.value = e.clientX
  targetY.value = e.clientY
}

function updateCursor() {
  cursorX.value += (targetX.value - cursorX.value) * 0.1
  cursorY.value += (targetY.value - cursorY.value) * 0.1
  cursorRaf = requestAnimationFrame(updateCursor)
}

// === AI 管家状态 ===
const aiVisible = ref(false)
const aiInput = ref('')
const aiLoading = ref(false)
const aiHistory = ref([
  { role: 'assistant',
    content: '你好！我是二手平台的 AI 管家闲小宝🤖，有什么我可以帮你的吗？（比如问我：平台上有什么电脑卖？）',
    timestamp: new Date().toISOString() }
])

function formatChatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function shouldShowTime(index) {
  if (index === 0) return true
  if (!aiHistory.value[index].timestamp) return false
  const current = new Date(aiHistory.value[index].timestamp)
  if (index > 0 && aiHistory.value[index - 1] && aiHistory.value[index - 1].timestamp) {
    const prev = new Date(aiHistory.value[index - 1].timestamp)
    return (current - prev) > 5 * 60 * 1000
  }
  return true
}

async function sendAiMessage() {
  const text = aiInput.value.trim()
  if (!text || aiLoading.value) return

  // 1. 用户消息上屏
  aiHistory.value.push({ role: 'user', content: text, timestamp: new Date().toISOString() })
  aiInput.value = ''
  aiLoading.value = true
  
  // 滚动到底部
  nextTick(() => { const box = document.getElementById('ai-chat-box'); if (box) box.scrollTop = box.scrollHeight })

  try {
    // 2. 预先放入一个空的 AI 回复气泡
    const aiMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() }
    aiHistory.value.push(aiMessage)

    // 3. 使用原生 fetch 发起流式请求
    const response = await fetch(`${BASE_URL}items/ai/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      // 发送历史记录 (去掉刚刚那个新建的空辅助消息)
      body: JSON.stringify({ history: aiHistory.value.slice(0, -1) }) 
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    // 4. 获取流读取器
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    // 5. 循环读取数据流
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '');
          if (dataStr === '[DONE]') {
              console.log("流式输出结束");
              break;
          }
          try {
            const parsed = JSON.parse(dataStr);
            
            // 🌟 拦截特殊卡片类型
            if (parsed.specialType === 'price_card') {
              aiMessage.attachment = {
                type: 'price_card',
                itemName: parsed.itemName,
                summary: parsed.marketPriceSummary
              };
            } else if (parsed.content) {
              aiMessage.content += parsed.content;
            }
            
            // 实时滚动到底部
            nextTick(() => { const box = document.getElementById('ai-chat-box'); if (box) box.scrollTop = box.scrollHeight })
          } catch (e) {
            // 忽略解析错误（分块可能截断 JSON）
          }
        }
      }
    }

  } catch (error) {
    console.error('AI 请求失败:', error)
    // 如果最后一条是空的或者没说完，提示错误
    const lastMsg = aiHistory.value[aiHistory.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
        lastMsg.content += '\n(连接中断...)'
    } else {
        aiHistory.value.push({ role: 'assistant', content: '哎呀，我的大脑似乎断线了...', timestamp: new Date().toISOString() })
    }
  } finally {
    aiLoading.value = false
    nextTick(() => { const box = document.getElementById('ai-chat-box'); if (box) box.scrollTop = box.scrollHeight })
  }
}

async function fetchAiHistory() {
  try {
    const response = await axios.get(`${BASE_URL}items/ai/history/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    if (response.data && response.data.length > 0) {
      aiHistory.value = response.data
      nextTick(() => { const box = document.getElementById('ai-chat-box'); if (box) box.scrollTop = box.scrollHeight })
    }
  } catch (error) { console.error('拉取 AI 记忆失败:', error) }
}

async function clearAiHistory() {
  try {
    await ElMessageBox.confirm('确定要清空和闲小宝的所有聊天记录吗？', '⚠️ 警告', {
      confirmButtonText: '物理超度', cancelButtonText: '手滑了', type: 'warning'
    })
    await axios.delete(`${BASE_URL}items/ai/history/`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    aiHistory.value = [{ role: 'assistant', content: '🧹 记忆已清空！我们重新认识一下吧，我是闲小宝~', timestamp: new Date().toISOString() }]
    ElMessage.success('记忆已完美清除！')
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('清理记忆失败，请检查网络！')
  }
}

const router = useRouter()
const tagsList = ref([])
const itemsList = ref([])
const isLoading = ref(false)
const currentFilter = ref('all')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(8)
const totalItems = ref(0)
const dialogVisible = ref(false)
const submitLoading = ref(false)
const itemForm = ref({
  name: '',
  price: 0.0,
  inventory: 1, // 🌟 默认上架 1 件
  is_offer: true,
  image_path: ''
})
const editDialogVisible = ref(false)
const editSubmitLoading = ref(false)
const editForm = ref({ id: null, name: '', price: '', inventory: 1, is_offer: true, image_path: '' })

// 🌟 本地库存缓存：解决后端暂时不返回 inventory 字段时数据丢失的问题
const inventoryCache = new Map()

const chatVisible = ref(false)
const chatMessages = ref([])
const chatInput = ref('')
const unreadCount = ref(0)
let ws = null

const BASE_URL = 'https://jubilant-yodel-4jr9qx56jv9q3qrxg-8000.app.github.dev/'

const getUploadHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` })
function handleUploadSuccess(response) { itemForm.value.image_path = response.url; ElMessage.success('图片上传成功！') }
function handleEditUploadSuccess(response) { editForm.value.image_path = response.url; ElMessage.success('新图片上传成功！') }
function getFullImageUrl(path) { return path ? BASE_URL + path.replace(/^\//, '') : '' }

function initWebSocket() {
  if (ws) return
  const wsUrl = BASE_URL.replace(/^http/, 'ws') + 'ws/chat'
  ws = new WebSocket(wsUrl)
  ws.onopen = () => console.log('WebSocket 已连接')
  ws.onmessage = (event) => {
    chatMessages.value.push(event.data)
    if (!chatVisible.value) {
      unreadCount.value++
      ElNotification({ title: '💬 新消息', message: event.data, position: 'bottom-right', type: 'info', duration: 4000 })
    } else {
      nextTick(() => { const box = document.getElementById('chat-box'); if (box) box.scrollTop = box.scrollHeight })
    }
  }
  ws.onclose = () => { ws = null }
}

function toggleChat() {
  chatVisible.value = !chatVisible.value
  if (chatVisible.value) {
    unreadCount.value = 0
    nextTick(() => { const box = document.getElementById('chat-box'); if (box) box.scrollTop = box.scrollHeight })
  }
}

function sendChatMessage() {
  if (!chatInput.value.trim() || !ws) return
  const user = '代号' + Math.floor(Math.random() * 900 + 100)
  ws.send(`[${user}]: ${chatInput.value}`)
  chatInput.value = ''
}

const newTagName = ref('')
const addingTag = ref(false)

async function fetchTags() {
  try { tagsList.value = (await axios.get(`${BASE_URL}items/tags/`)).data } catch (e) { console.error(e) }
}

async function addTag() {
  const name = newTagName.value.trim()
  if (!name) return ElMessage.warning('标签名不能为空')
  try {
    addingTag.value = true
    await axios.post(`${BASE_URL}items/tags/`, { name }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    newTagName.value = ''
    ElMessage.success('标签已添加')
    fetchTags()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '添加标签失败')
  } finally { addingTag.value = false }
}

async function deleteTag(tagId) {
  try {
    await ElMessageBox.confirm('确定删除此标签？', '提示', { type: 'warning' })
  } catch { return }
  try {
    await axios.delete(`${BASE_URL}items/tags/${tagId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    ElMessage.success('标签已删除')
    fetchTags()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '删除标签失败')
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
    
    // 🌟 数据清洗：优先用后端数据 → 其次用本地缓存 → 最后默认 1
    const rawItems = response.data.items || response.data
    itemsList.value = Array.isArray(rawItems) ? rawItems.map(item => {
      const backendInventory = (item.inventory !== undefined && item.inventory !== null) ? item.inventory : null
      const cachedInventory = inventoryCache.get(item.id)
      const finalInventory = backendInventory ?? cachedInventory ?? 1
      // 如果后端返回了真实值，同步更新缓存
      if (backendInventory !== null) inventoryCache.set(item.id, backendInventory)
      return { ...item, inventory: finalInventory }
    }) : []

    totalItems.value = response.data.total || 0
  } catch (error) { ElMessage.error('拉取商品失败') } finally { isLoading.value = false }
}

function handleFilterOrSearch() { currentPage.value = 1; fetchItems() }

async function submitItem() {
  if (!itemForm.value.name || !itemForm.value.price) return ElMessage.warning('不能为空哦！')
  try {
    submitLoading.value = true
    const createRes = await axios.post(`${BASE_URL}items/`, { ...itemForm.value, price: parseFloat(itemForm.value.price) })
    // 🌟 缓存新发布商品的库存值
    if (createRes.data?.id) inventoryCache.set(createRes.data.id, itemForm.value.inventory)
    ElMessage.success('商品发布成功！')
    dialogVisible.value = false
    itemForm.value = { name: '', price: 0.0, inventory: 1, is_offer: true, image_path: '' }
    fetchItems()
  } catch (error) { ElMessage.error('发布失败！') } finally { submitLoading.value = false }
}

async function deleteItem(itemId) {
  try { await ElMessageBox.confirm('真的要删除吗？', '⚠️ 警告', { type: 'warning' }) } catch { return }
  try {
    isLoading.value = true
    await axios.delete(`${BASE_URL}items/${itemId}`)
    ElMessage.success('删除成功！')
    fetchItems()
  } catch (error) {
    if (error.response?.status === 403) ElMessage.error('只能删除自己的商品！')
  } finally { isLoading.value = false }
}

function openEditDialog(item) { 
  // 🌟 打开编辑时，确保把真实的 inventory 塞入表单，如果实在缺失才给 1
  editForm.value = { 
    id: item.id,
    name: item.name,
    price: item.price,
    is_offer: item.is_offer,
    image_path: item.image_path,
    inventory: item.inventory !== undefined && item.inventory !== null ? item.inventory : 1
  }
  editDialogVisible.value = true 
}

async function buyItem(item) {
  if (!item.is_offer) return ElMessage.warning('这是一个求购贴，不能抢购哦！')
  try {
    await ElMessageBox.confirm(`确定要花 ￥${item.price} 抢购【${item.name}】吗？`, '💰 确认支付', {
      confirmButtonText: '确认剁手', cancelButtonText: '再想想', type: 'warning'
    })
    const response = await axios.post(`${BASE_URL}items/${item.id}/buy`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    ElMessage.success(response.data.message || '抢购成功！')
    fetchItems()
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '抢购失败')
  }
}

async function submitEdit() {
  try {
    editSubmitLoading.value = true
    await axios.put(`${BASE_URL}items/${editForm.value.id}`, { ...editForm.value, price: parseFloat(editForm.value.price) })
    // 🌟 缓存编辑后的库存值，防止 fetchItems 覆盖
    inventoryCache.set(editForm.value.id, editForm.value.inventory)
    ElMessage.success('修改成功！')
    editDialogVisible.value = false
    fetchItems()
  } catch (error) {
    if (error.response?.status === 403) ElMessage.error('只能修改自己商品！')
  } finally { editSubmitLoading.value = false }
}

import { useUserStore } from '../store/user.js'
function handleLogout() { useUserStore().logout(); router.push('/login'); ElMessage.success('已退出登录') }

// ============ GSAP 入场编排 + Lenis / ScrollTrigger ============
let lenisInstance = null

function playSplash() {
  const tl = gsap.timeline()
  tl.to('.splash-logo', { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out' })
    .to('.splash-tagline', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.4')
    .to('.splash-screen', { opacity: 0, duration: 0.8, ease: 'power2.inOut', delay: 0.5, onComplete: () => { splashDone.value = true } })
}

function playEntrance() {
  nextTick(() => {
    gsap.timeline({ delay: 0.1 })
      .from('.hero-title', { opacity: 0, y: 80, duration: 1, ease: 'power3.out' })
      .from('.hero-subtitle', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      .from('.nav-bar', { opacity: 0, y: -30, duration: 0.6, ease: 'power2.out' }, '-=0.4')
      .from('.tags-ribbon', { opacity: 0, y: 20, duration: 0.5, ease: 'power2.out' }, '-=0.2')
      .from('.toolbar-section', { opacity: 0, y: 30, duration: 0.6, ease: 'power2.out' }, '-=0.2')
      .from('.pagination-wrapper', { opacity: 0, y: 20, duration: 0.5, ease: 'power2.out' }, '-=0.3')
      .fromTo('.fab',
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.15, clearProps: 'transform,opacity' },
        '-=0.3')
  })
}

// Splash 完成后触发入场动画
watch(splashDone, (done) => {
  if (done) playEntrance()
})

// ScrollTrigger 驱动卡片入场
watch(itemsList, () => {
  nextTick(() => {
    gsap.utils.toArray('.glass-card').forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', delay: i * 0.06,
          scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none' }
        }
      )
    })
    ScrollTrigger.refresh()
  })
})

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  cursorRaf = requestAnimationFrame(updateCursor)

  // Lenis 平滑滚动（prevent 配置让聊天面板内的滚动不被 Lenis 劫持）
  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    prevent: (node) => node.closest('.panel-body') !== null
  })
  lenisInstance.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => { lenisInstance.raf(time * 1000) })
  gsap.ticker.lagSmoothing(0)

  playSplash()
  fetchTags()
  fetchItems()
  fetchAiHistory()
  initWebSocket()
  connectWebSocket()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  if (cursorRaf) cancelAnimationFrame(cursorRaf)
  if (lenisInstance) lenisInstance.destroy()
  ScrollTrigger.getAll().forEach(t => t.kill())
})
</script>

<template>
  <!-- ====== Splash 开机动画 ====== -->
  <div v-if="!splashDone" class="splash-screen">
    <div class="splash-logo">✦</div>
    <p class="splash-tagline">全 栈 二 手 交 易 平 台</p>
  </div>

  <!-- ====== 鼠标引力光标 ====== -->
  <div class="cursor-glow" :style="{ transform: `translate3d(${cursorX - 200}px, ${cursorY - 200}px, 0)` }"></div>

  <!-- ====== 主体 ====== -->
  <div class="home-container">

    <!-- 浮动光球粒子 -->
    <div class="ambient-orbs" aria-hidden="true">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="orb orb-4"></div>
      <div class="orb orb-5"></div>
    </div>

    <!-- 顶部导航 -->
    <nav class="nav-bar">
      <div class="nav-brand">✦ ARTEFACT</div>
      <div class="nav-actions">
        <button class="nav-btn icon-btn" @click="toggleDark" title="深色/浅色模式切换">
          <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        </button>
        <button class="nav-btn" @click="openDashboard">个人中心</button>
        <button class="nav-btn nav-btn-accent" @click="dialogVisible = true">+ 发布</button>
        <button class="nav-btn nav-btn-ghost" @click="handleLogout">退出</button>
      </div>
    </nav>

    <!-- Hero -->
    <header class="hero-section">
      <h1 class="hero-title">发现好物，交易无界</h1>
      <p class="hero-subtitle">一个充满高级感的全栈二手交易平台</p>
    </header>

    <!-- 标签 -->
    <div class="tags-ribbon">
      <span v-for="tag in tagsList" :key="tag.id" class="tag-chip">
        {{ tag.name }}
        <button class="tag-delete" @click="deleteTag(tag.id)" title="删除标签">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </span>
      <span class="tag-chip tag-add-chip">
        <input
          v-model="newTagName"
          class="tag-add-input"
          placeholder="+ 新标签"
          maxlength="20"
          @keyup.enter="addTag"
        />
        <button class="tag-add-btn" @click="addTag" :disabled="addingTag">添加</button>
      </span>
    </div>

    <!-- 工具栏 -->
    <section class="toolbar-section">
      <div class="search-wrapper">
        <input v-model="searchQuery" type="text" class="search-input" placeholder="搜索你想要的宝贝..." @keyup.enter="handleFilterOrSearch" />
        <button class="search-go" @click="handleFilterOrSearch">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </button>
      </div>
      <div class="filter-pills">
        <button :class="['pill', currentFilter === 'all' && 'pill-active']" @click="currentFilter = 'all'; handleFilterOrSearch()">全部</button>
        <button :class="['pill', currentFilter === 'offer' && 'pill-active']" @click="currentFilter = 'offer'; handleFilterOrSearch()">出售</button>
        <button :class="['pill', currentFilter === 'request' && 'pill-active']" @click="currentFilter = 'request'; handleFilterOrSearch()">求购</button>
        <button class="pill pill-icon" @click="fetchItems()" :disabled="isLoading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
        </button>
      </div>
    </section>

    <!-- 空状态 -->
    <div v-if="itemsList.length === 0 && !isLoading" class="empty-state">
      <div class="empty-icon">✦</div>
      <p>还没有找到对应的商品</p>
    </div>

    <!-- 商品网格 -->
    <div v-else class="product-grid">
      <div v-for="item in itemsList" :key="item.id" :class="['glass-card', {'is-sold-out': item.is_sold || item.inventory <= 0}]">
        <div class="card-image">
          <img v-if="item.image_path" :src="getFullImageUrl(item.image_path)" :alt="item.name" />
          <div v-else class="card-image-placeholder"><span>✦</span></div>
          <span v-if="item.is_sold || item.inventory <= 0" class="card-badge badge-soldout">已售罄</span>
          <span v-else :class="['card-badge', item.is_offer ? 'badge-sell' : 'badge-buy']">{{ item.is_offer ? '出售' : '求购' }}</span>
        </div>
        <div class="card-body">
          <h3 class="card-title">{{ item.name }}</h3>
          <div class="card-price">
            <span>¥ {{ item.price }}</span>
            <span style="font-size: 0.8em; color: #94a3b8; margin-left: 10px;">剩余: {{ item.inventory }} 件</span>
          </div>
          <div class="card-actions">
            <button v-if="item.is_offer" :class="['btn-buy', (item.is_sold || item.inventory <= 0) ? 'btn-disabled' : '']" :disabled="item.is_sold || item.inventory <= 0" @click="buyItem(item)">
              {{ (item.is_sold || item.inventory <= 0) ? '已售罄' : '抢购' }}
            </button>
            <button class="btn-edit" @click="openEditDialog(item)">编辑</button>
            <button class="btn-delete" @click="deleteItem(item.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrapper" v-if="totalItems > 0">
      <el-pagination background layout="total, prev, pager, next, jumper" :total="totalItems" :page-size="pageSize" v-model:current-page="currentPage" @current-change="fetchItems" />
    </div>

    <!-- 聊天 - 左下 -->
    <div class="chat-widget">
      <transition name="panel-up">
        <div v-show="chatVisible" class="float-panel chat-panel-glass">
          <div class="panel-header"><span>🌐 全局交易大厅</span><button class="panel-close" @click="chatVisible = false">✕</button></div>
          <div id="chat-box" class="panel-body">
            <div v-for="(msg, index) in chatMessages" :key="index" class="chat-msg">{{ msg }}</div>
            <div v-if="chatMessages.length === 0" class="panel-empty">还没有人说话，快来打个招呼吧！</div>
          </div>
          <div class="panel-footer">
            <input v-model="chatInput" class="panel-input" placeholder="说点什么..." @keyup.enter="sendChatMessage" />
            <button class="panel-send" @click="sendChatMessage">发送</button>
          </div>
        </div>
      </transition>
      <button class="fab fab-chat" @click="toggleChat">
        💬
        <span v-if="unreadCount > 0" class="fab-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>
    </div>

    <!-- AI 管家 - 右下 -->
    <div class="ai-widget">
      <transition name="panel-up">
        <div v-show="aiVisible" class="float-panel ai-panel-glass">
          <div class="panel-header">
            <span>🤖 AI 管家 · 闲小宝</span>
            <div style="display:flex;gap:8px"><button class="panel-close" @click="clearAiHistory" title="清空记忆">🗑️</button><button class="panel-close" @click="aiVisible = false">✕</button></div>
          </div>
          <div id="ai-chat-box" class="panel-body">
            <div v-for="(msg, index) in aiHistory" :key="index" class="message-wrapper">
              <div v-if="shouldShowTime(index)" class="chat-time-divider">{{ formatChatTime(msg.timestamp) }}</div>
              <div :class="['bubble-row', msg.role === 'user' ? 'is-user' : 'is-ai']">
                <div :class="['bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-ai']">
                  {{ msg.content }}
                  <!-- 🕸️ 赛博天眼比价卡片 -->
                  <div v-if="msg.attachment && msg.attachment.type === 'price_card'" class="cyber-price-card">
                    <div class="price-card-header">
                      <span class="price-card-icon">◎</span>
                      <span>全网天眼雷达</span>
                      <span class="price-card-live">● LIVE</span>
                    </div>
                    <div class="price-card-body">
                      <div class="price-card-target">⌕ 目标锁定：{{ msg.attachment.itemName }}</div>
                      <div class="price-card-divider"></div>
                      <div class="price-card-summary">{{ msg.attachment.summary }}</div>
                    </div>
                    <div class="price-card-glow"></div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="aiLoading" class="bubble bubble-ai typing-dots">闲小宝思考中<span class="dots">...</span></div>
          </div>
          <div class="panel-footer">
            <input v-model="aiInput" class="panel-input" placeholder="问我点什么..." @keyup.enter="sendAiMessage" :disabled="aiLoading" />
            <button class="panel-send" @click="sendAiMessage" :disabled="aiLoading">发送</button>
          </div>
        </div>
      </transition>
      <button class="fab fab-ai" @click="aiVisible = !aiVisible">🤖</button>
    </div>

    <!-- 弹窗：发布 -->
    <el-dialog v-model="dialogVisible" title="发布新商品" width="450px" top="5vh">
      <el-form label-width="80px">
        <el-form-item label="商品实物图"><el-upload class="avatar-uploader" :action="`${BASE_URL}items/upload-image/`" :headers="getUploadHeaders()" :show-file-list="false" :on-success="handleUploadSuccess" name="file" drag><img v-if="itemForm.image_path" :src="getFullImageUrl(itemForm.image_path)" class="preview-img" /><div v-else class="upload-placeholder"><div class="el-upload__text">点击或拖拽上传</div></div></el-upload></el-form-item>
        <el-form-item label="物品名称"><el-input v-model="itemForm.name" /></el-form-item>
        <el-form-item label="价格"><el-input v-model="itemForm.price" type="number" /></el-form-item>
        <el-form-item label="库存数量"><el-input-number v-model="itemForm.inventory" :min="1" :max="999" /></el-form-item>
        <el-form-item label="交易类型"><el-switch v-model="itemForm.is_offer" active-text="出售" inactive-text="求购" active-color="#13ce66" inactive-color="#ff4949" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="submitLoading" @click="submitItem">确定发布</el-button></template>
    </el-dialog>

    <!-- 弹窗：编辑 -->
    <el-dialog v-model="editDialogVisible" title="修改商品信息" width="450px" top="5vh">
      <el-form label-width="80px">
        <el-form-item label="更换商品图"><el-upload class="avatar-uploader" :action="`${BASE_URL}items/upload-image/`" :headers="getUploadHeaders()" :show-file-list="false" :on-success="handleEditUploadSuccess" name="file" drag><img v-if="editForm.image_path" :src="getFullImageUrl(editForm.image_path)" class="preview-img" /><div v-else class="upload-placeholder"><div class="el-upload__text">点击或拖拽上传新图片</div></div></el-upload></el-form-item>
        <el-form-item label="物品名称"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="价格"><el-input v-model="editForm.price" type="number" /></el-form-item>
        <el-form-item label="库存数量"><el-input-number v-model="editForm.inventory" :min="1" :max="999" /></el-form-item>
        <el-form-item label="交易类型"><el-switch v-model="editForm.is_offer" active-text="出售" inactive-text="求购" active-color="#13ce66" inactive-color="#ff4949" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="editDialogVisible = false">取消</el-button><el-button type="primary" :loading="editSubmitLoading" @click="submitEdit">保存修改</el-button></template>
    </el-dialog>

    <!-- 抽屉：个人看板 -->
    <el-drawer v-model="dashboardVisible" title="📊 我的数据看板" size="400px">
      <div v-if="dashboardData" class="dashboard-content">
        <div class="dashboard-avatar-card">
          <div style="font-size:40px;margin-bottom:10px">👑</div>
          <h3 style="margin:0;color:#1A1A2E">{{ dashboardData.user_email }}</h3>
        </div>
        <div class="dashboard-stats">
          <div class="stat-item"><div class="stat-num" style="color:#60a5fa">{{ dashboardData.stats.published_count }}</div><div class="stat-label">我发布的</div></div>
          <div class="stat-item"><div class="stat-num" style="color:#34d399">{{ dashboardData.stats.orders_count }}</div><div class="stat-label">我买到的</div></div>
        </div>
        <el-divider>🛍️ 我的战利品</el-divider>
        <el-timeline v-if="dashboardData.my_orders.length > 0">
          <el-timeline-item v-for="order in dashboardData.my_orders" :key="order.order_id" :timestamp="formatChatTime(order.time)" type="success">
            <b>{{ order.item_name }}</b> (￥{{ order.price }})
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="还没买过东西呢" :image-size="60" />
        <el-divider>📦 我发布的闲置</el-divider>
        <div v-if="dashboardData.my_items.length > 0">
          <div v-for="item in dashboardData.my_items" :key="item.id" class="dashboard-item-row">
            <span>{{ item.name }}</span>
            <el-tag :type="item.is_sold ? 'info' : 'warning'" size="small">{{ item.is_sold ? '已售出' : '在售中' }}</el-tag>
          </div>
        </div>
        <el-empty v-else description="还没发布过商品哦" :image-size="60" />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
/* ==========================================
   🏗️ 全局字体与变量 — 暖光商业主题
========================================== */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

.home-container {
  --glass-bg: var(--card);
  --glass-border: var(--border);
  --glass-hover: var(--color-fd-background);
  --text-primary: var(--foreground);
  --text-secondary: var(--muted-foreground);
  --accent: var(--primary);
  --accent-hover: var(--ring);
  --accent-green: var(--color-fd-success, #059669);
  --accent-red: var(--destructive);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 20px rgba(0,0,0,0.06);
  --shadow-lg: 0 20px 60px rgba(0,0,0,0.07);

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
  padding: 0;
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  overflow-x: hidden;
  position: relative;
}

/* ==========================================
   ✨ Splash 开机动画
========================================== */
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: #FAFAF8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.splash-logo {
  font-size: 72px;
  color: var(--accent);
  opacity: 0;
  scale: 0.5;
  filter: drop-shadow(0 0 40px rgba(79, 70, 229, 0.25));
}

.splash-tagline {
  font-size: 14px;
  letter-spacing: 12px;
  color: var(--text-secondary);
  opacity: 0;
  transform: translateY(20px);
  font-weight: 300;
}

/* ==========================================
   🖱️ Lerp 引力光标 (GPU: translate3d)
========================================== */
.cursor-glow {
  position: fixed;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
  left: 0;
  top: 0;
  background: radial-gradient(
    circle,
    rgba(79, 70, 229, 0.05) 0%,
    rgba(139, 92, 246, 0.025) 30%,
    transparent 70%
  );
  will-change: transform;
  filter: blur(2px);
}

/* ==========================================
   🌌 浮动光球 — 暖调柔彩
========================================== */
.ambient-orbs {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.25;
  will-change: transform;
}

.orb-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.15), transparent 70%);
  top: -10%; left: -5%;
  animation: orbFloat1 20s ease-in-out infinite;
}
.orb-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.12), transparent 70%);
  top: 50%; right: -8%;
  animation: orbFloat2 25s ease-in-out infinite;
}
.orb-3 {
  width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.1), transparent 70%);
  bottom: -5%; left: 30%;
  animation: orbFloat3 22s ease-in-out infinite;
}
.orb-4 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent 70%);
  top: 20%; right: 25%;
  animation: orbFloat1 18s ease-in-out infinite reverse;
}
.orb-5 {
  width: 250px; height: 250px;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.08), transparent 70%);
  bottom: 20%; left: 10%;
  animation: orbFloat2 30s ease-in-out infinite reverse;
}

@keyframes orbFloat1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(80px, 50px) scale(1.1); }
  66% { transform: translate(-40px, -30px) scale(0.95); }
}
@keyframes orbFloat2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-60px, 40px) scale(1.05); }
}
@keyframes orbFloat3 {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(50px, -30px); }
  75% { transform: translate(-30px, 50px); }
}

/* ==========================================
   🧭 顶部导航条
========================================== */
.nav-bar {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: var(--card);
  opacity: 0.9;
  border-bottom: 1px solid var(--glass-border);
  box-shadow: 0 1px 0 rgba(0,0,0,0.03);
}

.nav-brand {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 6px;
  color: var(--text-primary);
  text-transform: uppercase;
}

.nav-actions {
  display: flex;
  gap: 10px;
}

.nav-btn {
  padding: 8px 20px;
  border-radius: 100px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.7);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  backdrop-filter: blur(10px);
}
.nav-btn:hover {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.nav-btn-accent {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.nav-btn-accent:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.3);
}
.nav-btn-ghost {
  border-color: rgba(220, 38, 38, 0.2);
  color: var(--accent-red);
}
.nav-btn-ghost:hover {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.3);
}

/* ==========================================
   🏔️ Hero 区域
========================================== */
.hero-section {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 80px 20px 40px;
}

.hero-title {
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 900;
  letter-spacing: -1px;
  line-height: 1.1;
  background: linear-gradient(135deg, #1A1A2E 0%, #4F46E5 60%, #7C3AED 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 16px;
}

.hero-subtitle {
  font-size: clamp(14px, 2vw, 16px);
  color: var(--text-secondary);
  font-weight: 300;
  letter-spacing: 4px;
  margin: 0;
}

/* ==========================================
   🏷️ 标签飘带
========================================== */
.tags-ribbon {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 20px 40px;
}

.tag-chip {
  padding: 6px 14px 6px 18px;
  border-radius: 100px;
  background: var(--card);
  opacity: 0.9;
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  transition: all 0.3s ease;
  cursor: default;
  backdrop-filter: blur(8px);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tag-chip:hover {
  background: rgba(79, 70, 229, 0.08);
  border-color: rgba(79, 70, 229, 0.2);
  color: var(--accent);
}

.tag-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #9CA3AF;
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.25s ease;
}
.tag-chip:hover .tag-delete {
  opacity: 1;
  transform: scale(1);
}
.tag-delete:hover {
  background: rgba(220, 38, 38, 0.12);
  color: var(--accent-red);
}

.tag-add-chip {
  padding: 4px 6px 4px 12px;
  gap: 6px;
  border-style: dashed;
  border-color: rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.4);
}
.tag-add-chip:hover {
  border-color: rgba(79, 70, 229, 0.3);
  background: rgba(255, 255, 255, 0.7);
}
.tag-add-input {
  width: 72px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  padding: 0;
}
.tag-add-input::placeholder {
  color: #9CA3AF;
}
.tag-add-btn {
  padding: 3px 10px;
  border-radius: 100px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.tag-add-btn:hover {
  background: var(--accent-hover);
}
.tag-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==========================================
   🔧 工具栏
========================================== */
.toolbar-section {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 40px 30px;
  gap: 20px;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 12px 48px 12px 20px;
  border-radius: 100px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
  backdrop-filter: blur(8px);
}
.search-input::placeholder { color: #9CA3AF; }
.search-input:focus {
  border-color: rgba(79, 70, 229, 0.4);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  background: #fff;
}

.search-go {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.search-go:hover {
  background: var(--accent-hover);
  box-shadow: 0 2px 12px rgba(79, 70, 229, 0.3);
}

.filter-pills {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pill {
  padding: 8px 20px;
  border-radius: 100px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--card);
  opacity: 0.9;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}
.pill:hover { background: #fff; color: var(--text-primary); box-shadow: var(--shadow-sm); }
.pill-active {
  background: rgba(79, 70, 229, 0.1) !important;
  border-color: rgba(79, 70, 229, 0.25) !important;
  color: var(--accent) !important;
  font-weight: 600;
}
.pill-icon {
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ==========================================
   📦 商品网格
========================================== */
.product-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 0 40px;
}

/* ==========================================
   🧊 毛玻璃卡片 — 白底悬浮
========================================== */
.glass-card {
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1),
              box-shadow 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: default;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--shadow-sm);
  will-change: transform;
}
.glass-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
}

.card-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}
.glass-card:hover .card-image img {
  transform: scale(1.06);
}
.card-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.02);
  font-size: 32px;
  color: #D1D5DB;
}

.card-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  backdrop-filter: blur(10px);
}
.badge-sell {
  background: rgba(5, 150, 105, 0.12);
  color: #059669;
  border: 1px solid rgba(5, 150, 105, 0.2);
}
.badge-buy {
  background: rgba(220, 38, 38, 0.1);
  color: #DC2626;
  border: 1px solid rgba(220, 38, 38, 0.2);
}
.badge-soldout {
  background: rgba(107, 114, 128, 0.15);
  color: #6B7280;
  border: 1px solid rgba(107, 114, 128, 0.25);
}

.is-sold-out {
  opacity: 0.85;
}
.is-sold-out .card-image img {
  filter: grayscale(100%);
  opacity: 0.7;
}
.is-sold-out .card-price {
  filter: grayscale(100%);
  opacity: 0.6;
}

.card-body {
  padding: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-price {
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), #7C3AED);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 16px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions button {
  flex: 1;
  padding: 8px 0;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(0, 0, 0, 0.02);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}
.btn-buy {
  background: rgba(5, 150, 105, 0.08) !important;
  border-color: rgba(5, 150, 105, 0.2) !important;
  color: var(--accent-green) !important;
  font-weight: 600;
}
.btn-buy:hover {
  background: rgba(5, 150, 105, 0.15) !important;
  box-shadow: 0 0 16px rgba(5, 150, 105, 0.12);
  transform: translateY(-1px);
}
.btn-buy.btn-disabled {
  background: rgba(107, 114, 128, 0.08) !important;
  border-color: rgba(107, 114, 128, 0.2) !important;
  color: #6B7280 !important;
  cursor: not-allowed;
  box-shadow: none !important;
  transform: none !important;
}
.btn-edit:hover {
  background: rgba(79, 70, 229, 0.08);
  border-color: rgba(79, 70, 229, 0.2);
  color: var(--accent);
}
.btn-delete:hover {
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.2);
  color: var(--accent-red);
}

/* ==========================================
   🕳️ 空状态
========================================== */
.empty-state {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}
.empty-icon {
  font-size: 48px;
  opacity: 0.25;
  margin-bottom: 16px;
}

/* ==========================================
   📟 分页器
========================================== */
.pagination-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  padding: 50px 0 40px;
}
:deep(.el-pager li),
:deep(.btn-prev),
:deep(.btn-next) {
  background: rgba(255, 255, 255, 0.7) !important;
  color: var(--text-secondary) !important;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  margin: 0 3px;
  transition: all 0.3s ease;
}
:deep(.el-pager li:hover),
:deep(.btn-prev:hover),
:deep(.btn-next:hover) {
  background: #fff !important;
  color: var(--text-primary) !important;
  box-shadow: var(--shadow-sm);
}
:deep(.el-pager li.is-active) {
  background: var(--accent) !important;
  color: #fff !important;
  font-weight: 700;
  box-shadow: 0 2px 12px rgba(79, 70, 229, 0.25);
}
:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.8) !important;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08) inset !important;
  border-radius: 10px;
}
:deep(.el-input__inner) { color: var(--text-primary) !important; }
:deep(.el-pagination__total) { color: var(--text-secondary) !important; }

/* ==========================================
   💬 悬浮面板（聊天 & AI）
========================================== */
.chat-widget {
  position: fixed;
  bottom: 32px;
  left: 32px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.ai-widget {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.float-panel {
  width: 380px;
  height: 480px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.panel-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s;
}
.panel-close:hover { background: rgba(0,0,0,0.06); color: var(--text-primary); }

.panel-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
  scroll-behavior: smooth;
}
.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }

.panel-footer {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(0, 0, 0, 0.01);
}
.panel-input {
  flex: 1;
  padding: 10px 16px;
  border-radius: 100px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.3s;
}
.panel-input:focus { border-color: rgba(79, 70, 229, 0.4); }
.panel-input::placeholder { color: #9CA3AF; }
.panel-send {
  padding: 10px 20px;
  border-radius: 100px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}
.panel-send:hover { background: var(--accent-hover); box-shadow: 0 2px 12px rgba(79, 70, 229, 0.25); }
.panel-send:disabled { opacity: 0.5; cursor: not-allowed; }

.panel-empty, .chat-msg {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 4px 0;
  line-height: 1.6;
}
.panel-empty { text-align: center; padding: 40px 0; opacity: 0.5; }

/* 气泡 */
.bubble-row { display: flex; margin-bottom: 10px; }
.bubble-row.is-user { justify-content: flex-end; }
.bubble-row.is-ai { justify-content: flex-start; }

.bubble {
  max-width: 80%;
  padding: 10px 16px;
  border-radius: 18px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}
.bubble-user {
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 6px;
}
.bubble-ai {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-primary);
  border-bottom-left-radius: 6px;
}

.chat-time-divider {
  text-align: center;
  font-size: 11px;
  color: #9CA3AF;
  padding: 8px 0 4px;
}

.typing-dots .dots {
  animation: dotPulse 1.2s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* FAB 悬浮操作按钮 */
.fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1),
              box-shadow 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: var(--shadow-md);
  will-change: transform;
}
.fab:hover {
  transform: scale(1.12);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}
.fab-chat {
  background: linear-gradient(135deg, #F59E0B, #F97316);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35);
}
.fab-chat:hover {
  background: linear-gradient(135deg, #EAB308, #EA580C);
  box-shadow: 0 8px 30px rgba(245, 158, 11, 0.45);
}
.fab-ai {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.35);
}
.fab-ai:hover {
  background: linear-gradient(135deg, #4338CA, #6D28D9);
  box-shadow: 0 8px 30px rgba(79, 70, 229, 0.45);
}

.fab-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--accent-red);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
  animation: badgePop 0.3s ease;
}
@keyframes badgePop {
  0% { transform: scale(0); }
  80% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 面板弹出动画 */
.panel-up-enter-active {
  animation: panelIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.panel-up-leave-active {
  animation: panelIn 0.3s ease reverse;
}
@keyframes panelIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ==========================================
   🎨 Element-Plus 暖光风格覆盖
========================================== */
:deep(.el-dialog) {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(40px);
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.12) !important;
}
:deep(.el-dialog__title) { color: var(--text-primary) !important; font-weight: 700; }
:deep(.el-dialog__headerbtn .el-dialog__close) { color: var(--text-secondary) !important; }
:deep(.el-form-item__label) { color: var(--text-secondary) !important; }
:deep(.el-switch__label span) { color: var(--text-secondary) !important; }

:deep(.el-button) {
  border-radius: var(--radius-sm) !important;
  font-family: inherit;
}

/* Drawer */
:deep(.el-drawer) {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(40px);
}
:deep(.el-drawer__title) { color: var(--text-primary) !important; }
:deep(.el-divider__text) { color: var(--text-secondary) !important; background: rgba(255,255,255,0.95) !important; }

.dashboard-avatar-card {
  background: rgba(79, 70, 229, 0.04);
  padding: 20px;
  border-radius: var(--radius-md);
  text-align: center;
  margin-bottom: 20px;
  border: 1px solid rgba(79, 70, 229, 0.1);
}
.dashboard-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
}
.stat-item { text-align: center; }
.stat-num { font-size: 24px; font-weight: 800; }
.stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.dashboard-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  font-size: 14px;
  color: var(--text-primary);
}

.preview-img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
}
.upload-placeholder {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}

/* ==========================================
   📱 响应式 — clamp() 自适应
========================================== */
@media (max-width: 768px) {
  .nav-bar { padding: 16px 20px; }
  .nav-brand { font-size: 14px; letter-spacing: 3px; }
  .hero-section { padding: 50px 20px 30px; }
  .toolbar-section { padding: 10px 20px 20px; flex-direction: column; }
  .search-wrapper { max-width: 100%; }
  .product-grid { padding: 0 20px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
  .float-panel { width: 320px; height: 420px; }
  .fab { width: 48px; height: 48px; font-size: 20px; }
}

/* ==========================================
   🕸️ 赛博天眼比价卡片
========================================== */
.cyber-price-card {
  margin-top: 10px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.75));
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(56, 189, 248, 0.15);
  backdrop-filter: blur(12px);
}

.price-card-header {
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.18), transparent);
  padding: 7px 12px;
  font-size: 0.78em;
  color: #38bdf8;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(56, 189, 248, 0.12);
}

.price-card-icon {
  font-size: 1.1em;
  animation: radarSpin 3s linear infinite;
}

@keyframes radarSpin {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}

.price-card-live {
  margin-left: auto;
  font-size: 0.75em;
  color: #34d399;
  animation: liveBlink 1.5s ease-in-out infinite;
}

@keyframes liveBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.price-card-body {
  padding: 10px 12px;
}

.price-card-target {
  color: #94a3b8;
  font-size: 0.8em;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.price-card-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.25), transparent);
  margin: 6px 0;
}

.price-card-summary {
  color: #e2e8f0;
  font-size: 0.88em;
  line-height: 1.6;
  font-weight: 500;
  white-space: pre-wrap;
}

/* 底部扫描线流光 */
.price-card-glow {
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent);
  animation: scanline 2.5s linear infinite;
}

@keyframes scanline {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.nav-btn.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: var(--radius-md);
  color: var(--muted-foreground);
  background: transparent;
  width: 40px;
  height: 40px;
}
.nav-btn.icon-btn:hover {
  background: var(--muted);
  color: var(--foreground);
}
</style>
