<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus' // 🌟 引入了极其优雅的弹窗组件 ElNotification
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user.js'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
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

function scrollToAiBottom() {
  nextTick(() => {
    const box = document.getElementById('ai-chat-box')
    if (box) box.scrollTop = box.scrollHeight
  })
}

// === 🌟 重构：大厂级流式解析 (Streaming) 发送引擎 ===
const sendAiMessage = async () => {
  const content = aiInput.value.trim()
  if (!content || aiLoading.value) return

  // 1. 用户消息瞬间上屏
  aiHistory.value.push({
    role: 'user',
    content,
    timestamp: new Date().toISOString()
  })
  aiInput.value = ''
  aiLoading.value = true
  scrollToAiBottom()

  // 2. 准备一个 AI 回复的“空壳子”，后续流式填充
  const aiResponseIndex = aiHistory.value.length
  aiHistory.value.push({
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString()
  })

  try {
    const response = await fetch(`${apiBase}/items/ai/agent`, {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        messages: aiHistory.value.slice(-6).map((m) => ({ role: m.role, content: m.content || m.marketPriceSummary })),
      }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        ElMessage.error('登录状态已过期，请重新登录！')
        router.push('/login')
        return
      }
      throw new Error('网络请求失败')
    }

    if (!response.body) {
      throw new Error('浏览器不支持流式读取')
    }

    // 逐块解码并按 SSE 事件边界解析，避免分片断包导致 JSON 解析失败
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let done = false
    let buffer = ''

    const applySsePayload = (payload) => {
      if (!payload || payload === '[DONE]') return

      try {
        const dataObj = JSON.parse(payload)

        if (dataObj.specialType) {
          aiHistory.value[aiResponseIndex] = {
            ...aiHistory.value[aiResponseIndex],
            specialType: dataObj.specialType,
            itemName: dataObj.itemName,
            marketPriceSummary: dataObj.marketPriceSummary,
          }
        } else if (dataObj.content) {
          aiHistory.value[aiResponseIndex].content += dataObj.content
        }
      } catch {
        // 忽略 keep-alive 或非 JSON 数据帧
      }
      scrollToAiBottom()
    }

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone

      if (!value) continue
      buffer += decoder.decode(value, { stream: true })

      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const event of events) {
        const lines = event.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            applySsePayload(line.slice(6).trim())
          }
        }
      }
    }

    if (buffer.trim()) {
      const lines = buffer.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          applySsePayload(line.slice(6).trim())
        }
      }
    }
  } catch (error) {
    console.error('AI Stream Error:', error)
    aiHistory.value[aiResponseIndex].content = '网络有点波动，请稍后再试。'
  } finally {
    aiLoading.value = false
    scrollToAiBottom()
  }
}
// === 🌟 新增：唤醒闲小宝的永久记忆 ===
async function fetchAiHistory() {
  try {
    // 🌟 核心修复：在 history 后面加上斜杠 / ！！！
    const response = await axios.get(`${BASE_URL}items/ai/history/`, {
      headers: withAuthHeaders()
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
      headers: withAuthHeaders()
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

// 沉浸式首屏状态（桌面优先）
const cinematicHeroRef = ref(null)
const cinematicCanvasRef = ref(null)
let cinematicFrameId = null
let cinematicResizeObserver = null
let lenisInstance = null
let lenisTicker = null
let heroGsapContext = null
let heroMouseMoveHandler = null
let heroMouseLeaveHandler = null

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

const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '')
const BASE_URL = `${apiBase}/`

const getAccessToken = () => localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
const withAuthHeaders = (headers = {}) => {
  const token = getAccessToken()
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers
}

function setupSmoothScroll() {
  if (lenisInstance) return

  lenisInstance = new Lenis({
    autoRaf: false,
    duration: 1.05,
    lerp: 0.085,
    wheelMultiplier: 1.08,
    smoothWheel: true,
    syncTouch: false,
  })

  lenisInstance.on('scroll', ScrollTrigger.update)
  lenisTicker = (time) => {
    if (lenisInstance) lenisInstance.raf(time * 1000)
  }
  gsap.ticker.add(lenisTicker)
  gsap.ticker.lagSmoothing(0)
}

function setupCinematicCanvas() {
  const hero = cinematicHeroRef.value
  const canvas = cinematicCanvasRef.value
  if (!hero || !canvas) return

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  let width = 0
  let height = 0
  let particles = []
  const pointer = { x: 0, y: 0, active: false }

  const makeParticle = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    z: Math.random() * 1.2 + 0.25,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    radius: Math.random() * 2 + 0.4,
    color: Math.random() > 0.5 ? '110,231,216' : '120,170,255',
  })

  const resize = () => {
    width = Math.max(320, hero.clientWidth)
    height = Math.max(320, hero.clientHeight)
    const dpr = Math.min(2, window.devicePixelRatio || 1)

    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    const count = Math.min(900, Math.max(260, Math.round((width * height) / 6200)))
    particles = Array.from({ length: count }, () => makeParticle())
  }

  const draw = () => {
    ctx.clearRect(0, 0, width, height)

    const wash = ctx.createLinearGradient(0, 0, width, height)
    wash.addColorStop(0, 'rgba(79, 70, 229, 0.18)')
    wash.addColorStop(0.55, 'rgba(0, 185, 162, 0.11)')
    wash.addColorStop(1, 'rgba(7, 15, 34, 0.26)')
    ctx.fillStyle = wash
    ctx.fillRect(0, 0, width, height)

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      if (pointer.active) {
        const dx = pointer.x - p.x
        const dy = pointer.y - p.y
        const dist = Math.max(1, Math.hypot(dx, dy))
        if (dist < 220) {
          const force = (220 - dist) / 220
          p.vx -= (dx / dist) * force * 0.12
          p.vy -= (dy / dist) * force * 0.12
        }
      }

      p.x += p.vx * p.z
      p.y += p.vy * p.z
      p.vx *= 0.992
      p.vy *= 0.992

      if (p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40) {
        particles[i] = makeParticle()
        particles[i].x = Math.random() * width
        particles[i].y = Math.random() * height
        continue
      }

      ctx.beginPath()
      ctx.fillStyle = `rgba(${p.color}, ${0.35 + p.z * 0.25})`
      ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2)
      ctx.fill()
    }

    cinematicFrameId = requestAnimationFrame(draw)
  }

  heroMouseMoveHandler = (e) => {
    const rect = hero.getBoundingClientRect()
    pointer.x = e.clientX - rect.left
    pointer.y = e.clientY - rect.top
    pointer.active = true
  }

  heroMouseLeaveHandler = () => {
    pointer.active = false
  }

  hero.addEventListener('mousemove', heroMouseMoveHandler)
  hero.addEventListener('mouseleave', heroMouseLeaveHandler)

  cinematicResizeObserver = new ResizeObserver(() => {
    resize()
  })
  cinematicResizeObserver.observe(hero)

  resize()
  draw()
}

function setupCinematicTimeline() {
  const hero = cinematicHeroRef.value
  if (!hero) return

  heroGsapContext = gsap.context(() => {
    const cards = gsap.utils.toArray('.story-stage-card')

    gsap.from('.cinematic-eyebrow', {
      y: 24,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
    })

    gsap.from('.cinematic-title', {
      y: 36,
      opacity: 0,
      duration: 0.9,
      delay: 0.08,
      ease: 'power3.out',
    })

    gsap.from('.cinematic-lead', {
      y: 30,
      opacity: 0,
      duration: 0.85,
      delay: 0.15,
      ease: 'power3.out',
    })

    gsap.from('.metric-chip', {
      y: 20,
      opacity: 0,
      duration: 0.5,
      delay: 0.22,
      stagger: 0.08,
      ease: 'power2.out',
    })

    gsap.set(cards, {
      y: 72,
      opacity: 0,
      rotateX: 10,
      transformPerspective: 900,
      transformOrigin: '50% 100%',
    })

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=1700',
        scrub: 1.05,
        pin: true,
        anticipatePin: 1,
      },
    })

    timeline
      .to('.cinematic-orb--left', { x: 160, y: 92, scale: 1.25, rotation: 40 }, 0)
      .to('.cinematic-orb--right', { x: -140, y: -66, scale: 1.2, rotation: -34 }, 0)
      .to('.cinematic-ring', { scale: 1.24, rotation: 20, opacity: 0.84 }, 0)
      .to('.cinematic-title', { y: -34, opacity: 0.82, duration: 0.8 }, 0.22)
      .to('.cinematic-lead', { y: -24, opacity: 0.64, duration: 0.8 }, 0.22)

    cards.forEach((card, idx) => {
      const entry = idx * 0.44
      timeline
        .to(card, { y: 0, opacity: 1, rotateX: 0, duration: 0.3 }, entry)
        .to(card, { y: idx === cards.length - 1 ? 0 : -60, opacity: idx === cards.length - 1 ? 1 : 0.22, duration: 0.28 }, entry + 0.34)
    })
  }, hero)
}

function initDesktopExperience() {
  if (window.innerWidth < 1024) return
  setupSmoothScroll()
  setupCinematicCanvas()
  setupCinematicTimeline()
}

function destroyDesktopExperience() {
  if (heroGsapContext) {
    heroGsapContext.revert()
    heroGsapContext = null
  }

  if (cinematicFrameId) {
    cancelAnimationFrame(cinematicFrameId)
    cinematicFrameId = null
  }

  if (cinematicResizeObserver) {
    cinematicResizeObserver.disconnect()
    cinematicResizeObserver = null
  }

  const hero = cinematicHeroRef.value
  if (hero && heroMouseMoveHandler) hero.removeEventListener('mousemove', heroMouseMoveHandler)
  if (hero && heroMouseLeaveHandler) hero.removeEventListener('mouseleave', heroMouseLeaveHandler)
  heroMouseMoveHandler = null
  heroMouseLeaveHandler = null

  if (lenisInstance) {
    if (typeof lenisInstance.off === 'function') {
      lenisInstance.off('scroll', ScrollTrigger.update)
    }
    lenisInstance.destroy()
    lenisInstance = null
  }

  if (lenisTicker) {
    gsap.ticker.remove(lenisTicker)
    lenisTicker = null
  }
}

const getUploadHeaders = () => withAuthHeaders()
function handleUploadSuccess(response) { itemForm.value.image_path = response.url; ElMessage.success('🖼️ 图片上传成功！') }
function handleEditUploadSuccess(response) { editForm.value.image_path = response.url; ElMessage.success('🖼️ 新图片上传成功！') }
function getFullImageUrl(path) { return path ? BASE_URL + path.replace(/^\//, '') : '' }

// === 🌟 升级版：后台静默监听魔法 ===
function initWebSocket() {
  if (ws) return // 防止重复连接
  const token = getAccessToken() || ''
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
      { headers: withAuthHeaders() }
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
      headers: withAuthHeaders()
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
      headers: withAuthHeaders()
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
  initDesktopExperience()
})

onUnmounted(() => {
  destroyDesktopExperience()

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
      headers: withAuthHeaders()
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

    <section ref="cinematicHeroRef" class="cinematic-hero" aria-label="沉浸式桌面首屏">
      <canvas ref="cinematicCanvasRef" class="cinematic-canvas" aria-hidden="true"></canvas>
      <div class="cinematic-grid-overlay" aria-hidden="true"></div>
      <div class="cinematic-orb cinematic-orb--left" aria-hidden="true"></div>
      <div class="cinematic-orb cinematic-orb--right" aria-hidden="true"></div>
      <div class="cinematic-ring" aria-hidden="true"></div>

      <div class="cinematic-copy">
        <p class="cinematic-eyebrow">Desktop Immersive Exchange</p>
        <h2 class="cinematic-title">让每次闲置交易都像一场流动叙事</h2>
        <p class="cinematic-lead">实时大厅、AI 管家与标签系统同步驱动，打造更有节奏感的交易体验。</p>
        <div class="cinematic-metrics">
          <span class="metric-chip">在售 {{ itemsList.length }}</span>
          <span class="metric-chip">标签 {{ tagsList.length }}</span>
          <span class="metric-chip">WebSocket 在线</span>
        </div>
      </div>

      <div class="story-stage" aria-label="交易故事阶段">
        <article class="story-stage-card">
          <span class="story-index">01</span>
          <h3>发现</h3>
          <p>搜索、过滤与标签协同，快速定位目标商品。</p>
        </article>
        <article class="story-stage-card">
          <span class="story-index">02</span>
          <h3>沟通</h3>
          <p>交易大厅和 AI 管家并行，降低问答与决策成本。</p>
        </article>
        <article class="story-stage-card">
          <span class="story-index">03</span>
          <h3>成交</h3>
          <p>抢购链路实时反馈，让完成时刻更有仪式感。</p>
        </article>
      </div>
    </section>

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
              <div v-if="msg.role === 'user'" class="chat-bubble-container is-user">
                <div class="chat-bubble user-bubble">{{ msg.content }}</div>
                <span class="hover-time">{{ formatChatTime(msg.timestamp) }}</span>
              </div>

              <div v-else class="chat-bubble-container is-ai">
                <span v-if="shouldShowTime(index)" class="chat-time">{{ formatChatTime(msg.timestamp) }}</span>
                <div class="chat-bubble ai-bubble">
                  <span class="chat-content" style="white-space: pre-wrap;">{{ msg.content }}</span>

                  <div v-if="msg.specialType === 'price_card'" class="ai-price-card">
                    <div class="card-header">
                      <div class="card-icon">📊</div>
                      <div class="card-title-box">
                        <span class="card-title">{{ msg.itemName }}</span>
                        <span class="card-subtitle">全网底价情报中心</span>
                      </div>
                    </div>
                    <div class="card-body">
                      <p class="summary-text">{{ msg.marketPriceSummary }}</p>
                    </div>
                    <div class="card-footer">
                      <button class="card-action-btn" @click="aiInput = '好的，那帮我在平台下单吧！'; sendAiMessage()">
                        ⚡ 立即在平台下单
                      </button>
                    </div>
                  </div>
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

.cinematic-hero {
  position: relative;
  min-height: clamp(620px, 88vh, 860px);
  margin: 8px auto 34px;
  border-radius: 30px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--primary) 34%, var(--border) 66%);
  background:
    radial-gradient(900px 520px at 22% 12%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 62%),
    radial-gradient(820px 440px at 85% 80%, color-mix(in srgb, var(--chart-4) 24%, transparent), transparent 65%),
    linear-gradient(130deg, color-mix(in srgb, var(--background) 86%, #111f3b 14%), color-mix(in srgb, var(--background) 78%, #091120 22%));
  box-shadow:
    0 36px 70px rgba(7, 12, 28, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.cinematic-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.cinematic-grid-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  opacity: 0.44;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at 42% 46%, rgba(0, 0, 0, 0.95), transparent 80%);
}

.cinematic-orb,
.cinematic-ring {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  z-index: 2;
}

.cinematic-orb--left {
  width: 380px;
  height: 380px;
  left: -120px;
  top: 90px;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--primary) 74%, #ffffff 26%), color-mix(in srgb, var(--primary) 22%, transparent) 68%);
  filter: blur(10px);
  opacity: 0.6;
}

.cinematic-orb--right {
  width: 420px;
  height: 420px;
  right: -150px;
  bottom: -80px;
  background: radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--chart-4) 82%, #ffffff 18%), color-mix(in srgb, var(--chart-4) 24%, transparent) 72%);
  filter: blur(10px);
  opacity: 0.58;
}

.cinematic-ring {
  width: clamp(260px, 30vw, 420px);
  aspect-ratio: 1;
  right: clamp(120px, 18vw, 290px);
  top: clamp(82px, 13vh, 150px);
  border: 1px solid color-mix(in srgb, #ffffff 68%, transparent);
  box-shadow:
    0 0 0 18px color-mix(in srgb, #ffffff 10%, transparent),
    0 0 0 56px color-mix(in srgb, var(--primary) 8%, transparent);
  opacity: 0.7;
}

.cinematic-copy {
  position: relative;
  z-index: 4;
  max-width: min(640px, 58%);
  padding: clamp(34px, 4vw, 68px) clamp(26px, 4.2vw, 72px);
}

.cinematic-eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--chart-4) 76%, #ffffff 24%);
}

.cinematic-title {
  margin: 14px 0 0;
  max-width: 14ch;
  font-size: clamp(38px, 5.2vw, 68px);
  line-height: 1.04;
  letter-spacing: -0.02em;
  color: #f9fcff;
  text-wrap: balance;
  text-shadow: 0 18px 48px rgba(7, 12, 25, 0.46);
}

.cinematic-lead {
  margin: 18px 0 0;
  max-width: 52ch;
  color: color-mix(in srgb, #f7fbff 82%, #9cb0d3 18%);
  line-height: 1.7;
  font-size: clamp(14px, 1.15vw, 18px);
}

.cinematic-metrics {
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.metric-chip {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #ffffff 44%, transparent);
  background: color-mix(in srgb, #ffffff 14%, transparent);
  backdrop-filter: blur(9px);
  color: #f6fbff;
  font-size: 12px;
  letter-spacing: 0.02em;
  padding: 8px 14px;
}

.story-stage {
  position: absolute;
  right: clamp(20px, 4vw, 54px);
  bottom: clamp(24px, 4vh, 52px);
  width: min(370px, 40%);
  z-index: 4;
  display: grid;
  gap: 12px;
}

.story-stage-card {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, #ffffff 26%, transparent);
  background: color-mix(in srgb, #0f1f3f 58%, transparent);
  backdrop-filter: blur(16px) saturate(1.1);
  padding: 14px 14px 13px;
  box-shadow: 0 14px 30px rgba(5, 12, 27, 0.3);
}

.story-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  font-weight: 700;
  font-size: 12px;
  color: #f7fcff;
  background: linear-gradient(140deg, color-mix(in srgb, var(--primary) 74%, #7fd3ff 26%), color-mix(in srgb, var(--chart-4) 76%, var(--primary) 24%));
}

.story-stage-card h3 {
  margin: 10px 0 6px;
  font-size: 20px;
  line-height: 1.2;
  color: #f4f9ff;
}

.story-stage-card p {
  margin: 0;
  color: color-mix(in srgb, #f4f9ff 78%, #9eb1cf 22%);
  line-height: 1.55;
  font-size: 13px;
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

.chat-time {
  align-self: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--soft-ink);
  background: color-mix(in srgb, var(--card) 74%, transparent);
}

/* 🌟 AI 价格卡片样式 */
.ai-price-card {
  margin-top: 12px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  width: 100%;
  max-width: 320px;
}

.ai-price-card .card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.card-icon {
  font-size: 20px;
}

.card-title-box {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-weight: 700;
  font-size: 14px;
  color: #0f172a;
}

.card-subtitle {
  font-size: 11px;
  color: #64748b;
}

.ai-price-card .card-body {
  padding: 16px;
  font-size: 13px;
  color: #334155;
  line-height: 1.6;
}

.summary-text {
  margin: 0;
}

.ai-price-card .card-footer {
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  text-align: right;
}

.card-action-btn {
  background: transparent;
  color: #0ea5e9;
  border: 1px solid #0ea5e9;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.card-action-btn:hover {
  background: #0ea5e9;
  color: #ffffff;
}

@media (max-width: 900px) {
  .home-container {
    padding: 24px 10px 120px;
  }

  .cinematic-hero {
    display: none;
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