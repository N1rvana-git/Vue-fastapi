<template>
  <div class="seller-wrapper">
    <transition name="startup-fade">
      <div v-if="introVisible" class="startup-overlay">
        <div class="startup-mark">R</div>
        <p class="startup-text">启动商家工作台...</p>
      </div>
    </transition>

    <!-- 左侧导航侧边栏 -->
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-icon">✦</span>
        <h2>工作台</h2>
      </div>
      
      <nav class="nav-menu">
        <a :class="['nav-item', { active: activeTab === 'dashboard' }]" @click="activeTab = 'dashboard'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          数据看板
        </a>
        <a :class="['nav-item', { active: activeTab === 'products' }]" @click="activeTab = 'products'">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          商品管理
        </a>
        <a :class="['nav-item', { active: activeTab === 'chat' }]" @click="activeTab = 'chat'">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          交易大厅
          <div v-if="unreadCount > 0" class="badge">{{ unreadCount }}</div>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="avatar">👑</div>
          <div class="user-details">
            <span class="email">{{ userStore.email }}</span>
            <span class="role">商家管理员</span>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          退出系统
        </button>
      </div>
    </aside>

    <!-- 右侧内容动态路由区 -->
    <main class="main-content">
      <!-- DASHBOARD TAB -->
      <div v-if="activeTab === 'dashboard'" class="tab-pane">
        <header class="top-header">
          <h1>概览 / Overview</h1>
        </header>

        <div v-if="dashboardData" class="dashboard-grid">
          <!-- 统计卡片 -->
          <div class="stat-card">
            <div class="stat-icon" style="background: rgba(255, 143, 102, 0.15); color: #FF6B35;">📦</div>
            <div class="stat-info">
              <h3>{{ dashboardData.stats.published_count }}</h3>
              <p>我发布的商品</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🛍️</div>
            <div class="stat-info">
              <h3>{{ dashboardData.stats.orders_count }}</h3>
              <p>产生的订单</p>
            </div>
          </div>

          <!-- 列表容器 -->
          <div class="lists-container">
            <div class="list-card">
              <div class="list-header">
                <h3>📝 最新订单记录</h3>
              </div>
              <div class="list-body">
                <el-timeline v-if="dashboardData.my_orders.length > 0" style="padding-top: 10px;">
                  <el-timeline-item v-for="order in dashboardData.my_orders" :key="order.order_id" :timestamp="formatChatTime(order.time)" type="success">
                    <div class="order-info">
                      <b>{{ order.item_name }}</b> 
                      <span class="order-price">￥{{ order.price }}</span>
                    </div>
                  </el-timeline-item>
                </el-timeline>
                <el-empty v-else description="暂无订单数据" :image-size="60"></el-empty>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="loading-state">
          <el-skeleton :rows="5" animated />
        </div>
      </div>

      <!-- PRODUCTS TAB -->
      <div v-if="activeTab === 'products'" class="tab-pane">
         <header class="top-header">
          <h1>商品管理 / Inventory</h1>
          <button class="primary-btn" @click="dialogVisible = true">+ 发布新商品</button>
        </header>

        <el-table :data="itemsList" v-loading="isLoading" border style="width: 100%; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <el-table-column label="商品图" width="100">
            <template #default="scope">
              <img v-if="scope.row.image_path" :src="getFullImageUrl(scope.row.image_path)" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;" />
              <div v-else style="width: 50px; height: 50px; background: #f1f5f9; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #94a3b8;">图</div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="商品名称" min-width="200" />
          <el-table-column prop="price" label="价格(￥)" width="120">
             <template #default="scope"><span style="color: #10b981; font-weight: 600;">{{ scope.row.price }}</span></template>
          </el-table-column>
          <el-table-column prop="inventory" label="库存" width="100" />
          <el-table-column label="状态" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.is_sold || scope.row.inventory <= 0 ? 'info' : 'warning'" size="small">
                {{ scope.row.is_sold ? '已售罄' : '在售中' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button size="small" type="primary" plain @click="openEditDialog(scope.row)">编辑</el-button>
              <el-button size="small" type="danger" plain @click="deleteItem(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <el-pagination background layout="total, prev, pager, next" :total="totalItems" :page-size="pageSize" v-model:current-page="currentPage" @current-change="fetchItems" />
        </div>
      </div>

      <!-- CHAT TAB -->
      <div v-if="activeTab === 'chat'" class="tab-pane">
        <header class="top-header">
          <h1>交易大厅 / Global Chat</h1>
        </header>

        <div class="chat-container">
           <div id="seller-chat-box" class="chat-messages">
             <div v-for="(msg, index) in chatMessages" :key="index" class="chat-bubble">
               <span class="chat-content">{{ msg }}</span>
             </div>
             <div v-if="chatMessages.length === 0" class="panel-empty">大厅静悄悄的，快来打个招呼吧！</div>
           </div>
           <div class="chat-input-area">
             <input v-model="chatInput" type="text" placeholder="作为商家发送消息..." @keyup.enter="sendChatMessage" />
             <button class="primary-btn" @click="sendChatMessage">发送 (Enter)</button>
           </div>
        </div>
      </div>
    </main>

    <!-- Modals -->
    <el-dialog v-model="dialogVisible" title="📦 发布新商品" width="500px">
      <el-form label-width="80px">
        <el-form-item label="名称"><el-input v-model="itemForm.name"></el-input></el-form-item>
        <el-form-item label="价格(￥)"><el-input-number v-model="itemForm.price" :min="0" :precision="2" :step="10"></el-input-number></el-form-item>
        <el-form-item label="库存"><el-input-number v-model="itemForm.inventory" :min="1" :max="999" :step="1"></el-input-number></el-form-item>
        <el-form-item label="类型">
          <el-switch v-model="itemForm.is_offer" active-text="出售" inactive-text="求购"></el-switch>
        </el-form-item>
        <el-form-item label="图片">
          <el-upload :action="BASE_URL + 'items/upload/'" :headers="getUploadHeaders()" :show-file-list="false" :on-success="handleUploadSuccess" accept="image/*">
            <el-button type="primary" plain>点击上传图片</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="submitItem">提交</el-button></template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="✏️ 修改商品" width="500px">
      <el-form label-width="80px">
        <el-form-item label="名称"><el-input v-model="editForm.name"></el-input></el-form-item>
        <el-form-item label="价格(￥)"><el-input-number v-model="editForm.price" :min="0" :precision="2" :step="10"></el-input-number></el-form-item>
        <el-form-item label="库存"><el-input-number v-model="editForm.inventory" :min="0" :max="999" :step="1"></el-input-number></el-form-item>
        <el-form-item label="类型">
          <el-switch v-model="editForm.is_offer" active-text="出售" inactive-text="求购"></el-switch>
        </el-form-item>
        <el-form-item label="更换图片">
          <el-upload :action="BASE_URL + 'items/upload/'" :headers="getUploadHeaders()" :show-file-list="false" :on-success="handleEditUploadSuccess" accept="image/*">
            <el-button type="primary" plain>上传新图</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="editDialogVisible = false">取消</el-button><el-button type="primary" @click="submitEdit">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import api from '../utils/axios.js'
import { useUserStore } from '../store/user.js'

const router = useRouter()
const userStore = useUserStore()
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://jubilant-yodel-4jr9qx56jv9q3qrxg-8000.app.github.dev/'
const introVisible = ref(false)
let introTimer = null

const activeTab = ref('dashboard')
const dashboardData = ref(null)

const fetchDashboardData = async () => {
  try {
    const response = await api.get('/items/dashboard/me')
    dashboardData.value = response.data
  } catch (err) {
    ElMessage.error('无法加载工作台数据')
  }
}

const itemsList = ref([])
const isLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(8)
const totalItems = ref(0)
const inventoryCache = new Map()

async function fetchItems() {
  try {
    isLoading.value = true
    const response = await api.get('/items/', { params: { skip: (currentPage.value - 1) * pageSize.value, limit: pageSize.value } })
    const rawItems = response.data.items || response.data
    itemsList.value = Array.isArray(rawItems) ? rawItems.map(item => {
      const backendInventory = (item.inventory !== undefined && item.inventory !== null) ? item.inventory : null
      const cachedInventory = inventoryCache.get(item.id)
      const finalInventory = backendInventory ?? cachedInventory ?? 1
      if (backendInventory !== null) inventoryCache.set(item.id, backendInventory)
      return { ...item, inventory: finalInventory }
    }) : []
    totalItems.value = response.data.total || 0
  } catch (error) { ElMessage.error('拉取商品失败') } finally { isLoading.value = false }
}

const dialogVisible = ref(false)
const itemForm = ref({ name: '', price: 0.0, inventory: 1, is_offer: true, image_path: '' })
const editDialogVisible = ref(false)
const editForm = ref({ id: null, name: '', price: '', inventory: 1, is_offer: true, image_path: '' })

const getUploadHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` })
function handleUploadSuccess(response) { itemForm.value.image_path = response.url; ElMessage.success('图片上传成功！') }
function handleEditUploadSuccess(response) { editForm.value.image_path = response.url; ElMessage.success('新图片上传成功！') }
function getFullImageUrl(path) { return path ? (path.startsWith('http') ? path : BASE_URL + path.replace(/^\//, '')) : '' }

async function submitItem() {
  if (!itemForm.value.name || !itemForm.value.price) return ElMessage.warning('不能为空哦！')
  try {
    const createRes = await api.post('/items/', { ...itemForm.value, price: parseFloat(itemForm.value.price) })
    if (createRes.data?.id) inventoryCache.set(createRes.data.id, itemForm.value.inventory)
    ElMessage.success('商品发布成功！')
    dialogVisible.value = false
    itemForm.value = { name: '', price: 0.0, inventory: 1, is_offer: true, image_path: '' }
    fetchItems()
    fetchDashboardData()
  } catch (error) { ElMessage.error('发布失败！') }
}

async function deleteItem(itemId) {
  try { await ElMessageBox.confirm('确定删除该商品吗？', '⚠️ 警告', { type: 'warning' }) } catch { return }
  try {
    await api.delete(`/items/${itemId}`)
    ElMessage.success('删除成功！')
    fetchItems()
    fetchDashboardData()
  } catch (error) { ElMessage.error('删除失败！') }
}

function openEditDialog(item) { 
  editForm.value = { ...item, inventory: item.inventory ?? 1 }
  editDialogVisible.value = true 
}

async function submitEdit() {
  try {
    await api.put(`/items/${editForm.value.id}`, { ...editForm.value, price: parseFloat(editForm.value.price) })
    inventoryCache.set(editForm.value.id, editForm.value.inventory)
    ElMessage.success('修改成功！')
    editDialogVisible.value = false
    fetchItems()
  } catch (error) { ElMessage.error('修改失败！') }
}

const chatMessages = ref([])
const chatInput = ref('')
const unreadCount = ref(0)
let ws = null
let reconnectTimer = null
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

function scrollSellerChatToBottom() {
  nextTick(() => {
    const box = document.getElementById('seller-chat-box')
    if (box) box.scrollTop = box.scrollHeight
  })
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    initWebSocket()
  }, 1500)
}

function initWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

  const token = localStorage.getItem('access_token') || ''
  const baseWsUrl = BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')
  ws = new WebSocket(`${baseWsUrl}/items/ws/hall?token=${token}`)

  ws.onopen = () => console.log('Seller WebSocket 已连接')
  ws.onmessage = (event) => {
    const incoming = String(event.data || '')
    if (!incoming) return
    if (isPendingEcho(incoming)) return

    chatMessages.value.push(incoming)
    if (activeTab.value !== 'chat') {
      unreadCount.value++
      ElNotification({ title: '💬 客户发来新消息', message: incoming, position: 'bottom-right', type: 'info', duration: 4000 })
    } else {
      scrollSellerChatToBottom()
    }
  }
  ws.onclose = () => {
    ws = null
    scheduleReconnect()
  }
  ws.onerror = () => {
    ws?.close()
  }
}

function sendChatMessage() {
  const content = chatInput.value.trim()
  if (!content) return

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ElMessage.warning('聊天连接未就绪，正在重连...')
    initWebSocket()
    return
  }

  const payload = `[商家👑]: ${content}`
  chatMessages.value.push(payload)
  trackPendingEcho(payload)

  try {
    ws.send(payload)
  } catch {
    ElMessage.error('发送失败，请稍后重试')
    scheduleReconnect()
    return
  }

  chatInput.value = ''
  scrollSellerChatToBottom()
}

function formatChatTime(dateString) { return dateString ? new Date(dateString).toLocaleString('zh-CN') : '' }

watch(activeTab, (val) => {
  if (val === 'chat') {
    unreadCount.value = 0
    scrollSellerChatToBottom()
  }
})

const handleLogout = () => {
  userStore.logout()
  ElMessage.success('已退出商家后台')
  router.push('/login')
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

  fetchDashboardData()
  fetchItems()
  initWebSocket()
})

onUnmounted(() => {
  if (introTimer) {
    clearTimeout(introTimer)
    introTimer = null
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) ws.close()
})
</script>

<style scoped>
.seller-wrapper { display: flex; min-height: 100vh; background-color: #FFFDF9; color: #2C1810; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
.sidebar { width: 260px; background: #FFFFFF; border-right: 1px solid #F3E6DA; display: flex; flex-direction: column; padding: 1.5rem; }
.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 2.5rem; }
.brand-icon { font-size: 1.5rem; color: #FF6B35; }
.brand h2 { margin: 0; font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
.nav-menu { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 0.75rem 1rem; border-radius: 8px; color: #8C6A53; font-weight: 500; cursor: pointer; transition: all 0.2s; position: relative; }
.nav-item:hover { background: #FFF8F0; color: #4A2B1D; }
.nav-item.active { background: #FFF0E6; color: #FF6B35; }
.badge { position: absolute; right: 15px; background: #ef4444; color: white; border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; font-weight: bold; }
.sidebar-footer { margin-top: auto; border-top: 1px solid #F3E6DA; padding-top: 1.5rem; }
.user-info { display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem; }
.avatar { font-size: 2rem; background: #FFF8F0; border-radius: 50%; padding: 5px; }
.user-details { display: flex; flex-direction: column; }
.email { font-weight: 600; font-size: 0.875rem; }
.role { font-size: 0.75rem; color: #FF6B35; font-weight: 500; }
.logout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0.75rem; border: 1px solid #F3E6DA; background: transparent; color: #8C6A53; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.logout-btn:hover { background: #fee2e2; color: #ef4444; border-color: #fca5a5; }
.main-content { flex: 1; padding: 2.5rem 3rem; overflow-y: auto; background-color: #FFFDF9; }
.tab-pane { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.top-header h1 { margin: 0; font-size: 1.875rem; font-weight: 700; }
.primary-btn { background: linear-gradient(135deg, #FF8F66, #FF6B35); color: #FFFFFF; border: none; padding: 0.5rem 1.5rem; border-radius: 9999px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 107, 53, 0.3); transition: all 0.2s; }
.primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(255, 107, 53, 0.4); }
.dashboard-grid { display: flex; flex-direction: column; gap: 2rem; }
.stat-card { background: #FFFFFF; border: 1px solid #F3E6DA; border-radius: 12px; padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
.dashboard-grid > div:nth-child(1), .dashboard-grid > div:nth-child(2) { display: inline-flex; width: calc(50% - 1rem); }
.stat-icon { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; }
.stat-info h3 { margin: 0 0 0.25rem 0; font-size: 2rem; font-weight: 700; }
.stat-info p { margin: 0; color: #8C6A53; font-size: 0.875rem; }
.lists-container { display: flex; }
.list-card { background: #FFFFFF; border: 1px solid #F3E6DA; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; flex: 1; }
.list-header { padding: 1.5rem; border-bottom: 1px solid #F3E6DA; }
.list-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; }
.list-body { padding: 1.5rem; max-height: 400px; overflow-y: auto; }
.order-info { display: flex; justify-content: space-between; width: 100%; }
.order-price { font-weight: 600; color: #10b981; }
.chat-container { display: flex; flex-direction: column; height: 600px; background: #FFFFFF; border: 1px solid #F3E6DA; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }
.chat-messages { flex: 1; padding: 1.5rem; overflow-y: auto; background: #FFFDF9; }
.chat-bubble { background: #FFF8F0; padding: 12px 16px; border-radius: 12px; display: inline-block; margin-bottom: 12px; position: relative; word-wrap: break-word; max-width: 80%; color: #2C1810; border-bottom-left-radius: 0; }
.panel-empty { text-align: center; color: #A68B7A; margin-top: 2rem; }
.chat-input-area { display: flex; gap: 12px; padding: 1rem 1.5rem; border-top: 1px solid #F3E6DA; background: #FFFFFF; }
.chat-input-area input { flex: 1; padding: 0 1rem; border-radius: 9999px; border: 1px solid #F3E6DA; outline: none; font-size: 1rem; transition: all 0.2s; background: #FFFDF9; }
.chat-input-area input:focus { border-color: #FF8F66; box-shadow: 0 0 0 2px rgba(255, 143, 102, 0.2); }

.startup-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: rgba(255, 253, 249, 0.86);
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
  color: #ffffff;
  background: linear-gradient(135deg, #ff8f66, #ff6b35);
  box-shadow: 0 14px 30px rgba(255, 107, 53, 0.35);
  animation: startup-pop 0.8s ease;
}

.startup-text {
  margin: 0;
  color: #2c1810;
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
</style>