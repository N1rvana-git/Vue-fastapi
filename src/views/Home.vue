<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus' // 🌟 引入了极其优雅的弹窗组件 ElNotification
import { useRouter } from 'vue-router'
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

// ⚠️⚠️⚠️ 换成你的 Codespaces 链接 
const BASE_URL = 'https://jubilant-yodel-4jr9qx56jv9q3qrxg-8000.app.github.dev/'

const getUploadHeaders = () => { return { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
function handleUploadSuccess(response) { itemForm.value.image_path = response.url; ElMessage.success('🖼️ 图片上传成功！') }
function handleEditUploadSuccess(response) { editForm.value.image_path = response.url; ElMessage.success('🖼️ 新图片上传成功！') }
function getFullImageUrl(path) { return path ? BASE_URL + path.replace(/^\//, '') : '' }

// === 🌟 升级版：后台静默监听魔法 ===
function initWebSocket() {
  if (ws) return // 防止重复连接
  const wsUrl = BASE_URL.replace(/^http/, 'ws') + 'ws/chat'
  ws = new WebSocket(wsUrl)
  
  ws.onopen = () => { console.log('🟢 已连接到全局交易大厅后台') }
  
  ws.onmessage = (event) => {
    chatMessages.value.push(event.data)
    
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
  if (!chatInput.value.trim() || !ws) return
  const user = "代号" + Math.floor(Math.random() * 900 + 100)
  ws.send(`[${user}]: ${chatInput.value}`)
  chatInput.value = '' 
}
// ======================================

async function fetchTags() {
  try { tagsList.value = (await axios.get(`${BASE_URL}items/tags/`)).data } catch (e) { console.error(e) }
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

async function submitEdit() {
  try {
    editSubmitLoading.value = true
    await axios.put(`${BASE_URL}items/${editForm.value.id}`, { ...editForm.value, price: parseFloat(editForm.value.price) })
    ElMessage.success('✏️ 修改成功！'); editDialogVisible.value = false; fetchItems()
  } catch (error) { if (error.response?.status === 403) ElMessage.error('🛑 只能修改自己商品！') } finally { editSubmitLoading.value = false }
}

function handleLogout() { localStorage.removeItem('access_token'); router.push('/login') }

onMounted(() => { 
  fetchTags()
  fetchItems()
  fetchAiHistory() // 🌟 页面加载时，先把 AI 的记忆拉取过来，准备好聊天记录了！
  initWebSocket() // 🌟 页面一加载完毕，立刻在后台连上电话线！
})
</script>

<template>
  <div class="home-container">
    <h1>🚀 我的全栈二手平台</h1>
    
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>🏷️ 平台热门标签</span>
          <div class="header-buttons">
            <el-button type="primary" @click="dialogVisible = true">+ 发布商品</el-button>
            <el-button type="danger" @click="handleLogout">退出</el-button>
          </div>
        </div>
      </template>
      <div v-if="tagsList.length > 0" class="tags-container">
        <el-tag v-for="tag in tagsList" :key="tag.id" size="large" round># {{ tag.name }}</el-tag>
      </div>
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
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="offer">出售</el-radio-button>
          <el-radio-button label="request">求购</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <el-empty v-if="itemsList.length === 0" description="没有找到对应的商品哦~" />
    
    <div v-else class="items-grid">
      <el-card v-for="item in itemsList" :key="item.id" class="item-card" shadow="hover" :body-style="{ padding: '0px' }">
        <div class="image-wrapper">
          <el-image v-if="item.image_path" :src="getFullImageUrl(item.image_path)" class="item-image" fit="cover" />
          <div v-else class="no-image">暂无图片</div>
        </div>
        <div class="item-info">
          <h3 class="item-name">{{ item.name }}</h3>
          <p class="item-price">¥ {{ item.price }}</p>
          <div class="item-footer">
            <el-tag :type="item.is_offer ? 'success' : 'danger'" effect="dark">{{ item.is_offer ? '出售' : '求购' }}</el-tag>
            <div class="action-buttons">
              <el-button type="primary" size="small" plain @click="openEditDialog(item)">编辑</el-button>
              <el-button type="danger" size="small" plain @click="deleteItem(item.id)">删除</el-button>
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
            <div v-for="(msg, index) in chatMessages" :key="index" class="chat-message">
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

    <el-dialog v-model="dialogVisible" title="📦 发布新商品" width="450px"><el-form label-position="top"><el-form-item label="商品实物图"><el-upload class="avatar-uploader" :action="`${BASE_URL}items/upload-image/`" :headers="getUploadHeaders()" :show-file-list="false" :on-success="handleUploadSuccess" name="file" drag><img v-if="itemForm.image_path" :src="getFullImageUrl(itemForm.image_path)" class="preview-img" /><div v-else class="upload-placeholder"><div class="el-upload__text">点击或拖拽上传</div></div></el-upload></el-form-item><el-form-item label="物品名称"><el-input v-model="itemForm.name" /></el-form-item><el-form-item label="价格"><el-input v-model="itemForm.price" type="number" /></el-form-item><el-form-item label="交易类型"><el-switch v-model="itemForm.is_offer" active-text="出售" inactive-text="求购" active-color="#13ce66" inactive-color="#ff4949" /></el-form-item></el-form><template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="submitLoading" @click="submitItem">确定发布</el-button></template></el-dialog>
    <el-dialog v-model="editDialogVisible" title="✏️ 修改商品信息" width="450px"><el-form label-position="top"><el-form-item label="更换商品图 (选填)"><el-upload class="avatar-uploader" :action="`${BASE_URL}items/upload-image/`" :headers="getUploadHeaders()" :show-file-list="false" :on-success="handleEditUploadSuccess" name="file" drag><img v-if="editForm.image_path" :src="getFullImageUrl(editForm.image_path)" class="preview-img" /><div v-else class="upload-placeholder"><div class="el-upload__text">点击或拖拽上传新图片</div></div></el-upload></el-form-item><el-form-item label="物品名称"><el-input v-model="editForm.name" /></el-form-item><el-form-item label="价格"><el-input v-model="editForm.price" type="number" /></el-form-item><el-form-item label="交易类型"><el-switch v-model="editForm.is_offer" active-text="出售" inactive-text="求购" active-color="#13ce66" inactive-color="#ff4949" /></el-form-item></el-form><template #footer><el-button @click="editDialogVisible = false">取消</el-button><el-button type="primary" :loading="editSubmitLoading" @click="submitEdit">保存修改</el-button></template></el-dialog>
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
  </div>
</template>

<style scoped>
/* 原有基础样式保持不变 */
.home-container { max-width: 900px; margin: 50px auto; font-family: sans-serif; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
.tags-container { display: flex; flex-wrap: wrap; gap: 15px; padding: 10px 0; }
.control-panel { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; margin-bottom: 20px; border-bottom: 2px solid #ebeef5; padding-bottom: 10px; }
.title-with-refresh { display: flex; align-items: center; gap: 15px; }
.section-title { margin: 0; color: #303133; border-left: 5px solid #409EFF; padding-left: 10px; }
.filters-wrapper { display: flex; gap: 15px; align-items: center; }
.search-box { width: 250px; }
.items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; margin-bottom: 30px; }
.item-card { border-radius: 12px; transition: all 0.3s; overflow: hidden; }
.item-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
.image-wrapper { height: 200px; width: 100%; background-color: #f5f7fa; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.item-image { width: 100%; height: 100%; }
.item-info { padding: 20px; }
.item-name { margin: 0 0 10px 0; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-price { color: #f56c6c; font-size: 24px; font-weight: bold; margin: 15px 0; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid #ebeef5; padding-top: 15px; }
.action-buttons { display: flex; gap: 8px; }
.pagination-wrapper { display: flex; justify-content: center; margin-top: 40px; margin-bottom: 60px; }
.avatar-uploader .el-upload { border: 1px dashed #dcdfe6; border-radius: 6px; cursor: pointer; width: 100%; overflow: hidden; }
.upload-placeholder { padding: 40px 0; color: #8c939d; text-align: center; }
.preview-img { width: 100%; height: 200px; object-fit: cover; display: block; }

/* === 聊天大厅相关样式 === */
.chat-widget { position: fixed; right: 30px; bottom: 30px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; }
.chat-badge-wrapper { margin-top: 15px; } /* 给红点外壳加间距 */
.chat-btn { font-size: 24px; width: 60px; height: 60px; box-shadow: 0 4px 12px rgba(230,162,60,0.4); transition: transform 0.3s; }
.chat-btn:hover { transform: scale(1.1); }
.chat-panel { width: 350px; height: 500px; border-radius: 12px; margin-bottom: 15px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important; }
.chat-header { padding: 15px; background: linear-gradient(135deg, #f39c12, #e6a23c); color: white; font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; align-items: center; }
.chat-body { flex: 1; padding: 15px; overflow-y: auto; background: #f9f9fa; display: flex; flex-direction: column; gap: 10px; }
.chat-message { background: white; padding: 10px 15px; border-radius: 8px; font-size: 14px; color: #303133; align-self: flex-start; max-width: 85%; word-break: break-word; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #e6a23c; }
.chat-empty { text-align: center; color: #909399; margin-top: 50px; font-size: 14px; }
.chat-footer { padding: 15px; background: white; border-top: 1px solid #ebeef5; }
/* AI 悬浮窗样式 */
.ai-widget { position: fixed; left: 30px; bottom: 30px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-start; }
.ai-btn { font-size: 24px; width: 60px; height: 60px; box-shadow: 0 4px 12px rgba(64,158,255,0.4); transition: transform 0.3s; margin-top: 15px; }
.ai-btn:hover { transform: scale(1.1); }
.ai-panel { width: 350px; height: 500px; border-radius: 12px; margin-bottom: 15px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important; }
.ai-header { padding: 15px; background: linear-gradient(135deg, #409EFF, #3a8ee6); color: white; font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; align-items: center; }
.chat-bubble { padding: 10px 15px; border-radius: 12px; font-size: 14px; max-width: 85%; word-break: break-word; box-shadow: 0 2px 4px rgba(0,0,0,0.05); line-height: 1.5; white-space: pre-wrap; }
.user-bubble { background: #409EFF; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
.ai-bubble { background: white; color: #303133; align-self: flex-start; border-bottom-left-radius: 2px; border: 1px solid #ebeef5; }
.typing-indicator { color: #909399; font-style: italic; font-size: 12px; }
/* 输入框底部样式 */
.ai-input-footer { padding: 12px; background: white; border-top: 1px solid #ebeef5; }
/* === 🌟 微信级时间戳样式 === */
.message-wrapper { display: flex; flex-direction: column; margin-bottom: 10px; width: 100%; }
.chat-time-divider { text-align: center; color: #babbc0; font-size: 12px; margin: 10px 0; font-weight: 500; }
.chat-bubble-container { display: flex; align-items: center; gap: 8px; width: 100%; position: relative; }
.is-user { justify-content: flex-end; flex-direction: row-reverse; } /* 用户靠右 */
.is-ai { justify-content: flex-start; } /* AI 靠左 */

/* 悬浮时间特效 */
.hover-time { font-size: 11px; color: #c0c4cc; opacity: 0; transition: opacity 0.2s ease; }
/* 鼠标移到 container 上时，显示 hover-time */
.chat-bubble-container:hover .hover-time { opacity: 1; }
</style>