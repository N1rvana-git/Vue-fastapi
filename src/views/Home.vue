<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'

const router = useRouter()
const tagsList = ref([])
const itemsList = ref([]) 
const isLoading = ref(false)

// 🌟 新增：当前的过滤状态 ('all' | 'offer' | 'request')
const currentFilter = ref('all')

const dialogVisible = ref(false)
const submitLoading = ref(false)
const itemForm = ref({ name: '', price: '', is_offer: true, image_path: '' })

const editDialogVisible = ref(false)
const editSubmitLoading = ref(false)
const editForm = ref({ id: null, name: '', price: '', is_offer: true, image_path: '' })

// ⚠️⚠️⚠️ 换成你的 Codespaces 链接 (结尾要有斜杠)
const BASE_URL = 'https://jubilant-yodel-4jr9qx56jv9q3qrxg-8000.app.github.dev/'

const getUploadHeaders = () => {
  return { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
}

function handleUploadSuccess(response) {
  itemForm.value.image_path = response.url
  ElMessage.success('🖼️ 图片上传成功！')
}

function handleEditUploadSuccess(response) {
  editForm.value.image_path = response.url
  ElMessage.success('🖼️ 新图片上传成功！')
}

function getFullImageUrl(path) {
  if (!path) return ''
  return BASE_URL + path.replace(/^\//, '')
}

async function fetchTags() {
  try {
    const response = await axios.get(`${BASE_URL}items/tags/`)
    tagsList.value = response.data
  } catch (error) {
    console.error(error)
  }
}

// === 🌟 核心魔改：带上 Query 参数的高级查询！ ===
async function fetchItems() {
  try {
    isLoading.value = true
    
    // 动态组装查询参数
    const queryParams = {}
    if (currentFilter.value === 'offer') {
      queryParams.is_offer_filter = true
    } else if (currentFilter.value === 'request') {
      queryParams.is_offer_filter = false
    }
    // 如果是 'all'，就什么都不带，后端会自动返回全部

    // axios 会自动把 params 变成 URL 里的 ?key=value
    const response = await axios.get(`${BASE_URL}items/`, { params: queryParams })
    itemsList.value = response.data
    
  } catch (error) {
    ElMessage.error('拉取商品失败 💥')
  } finally {
    isLoading.value = false
  }
}

async function submitItem() {
  if (!itemForm.value.name || !itemForm.value.price) {
    ElMessage.warning('商品名称和价格不能为空哦！')
    return
  }
  try {
    submitLoading.value = true
    await axios.post(`${BASE_URL}items/`, {
      name: itemForm.value.name,
      price: parseFloat(itemForm.value.price),
      is_offer: itemForm.value.is_offer,
      image_path: itemForm.value.image_path
    })
    ElMessage.success('🎉 商品发布成功！')
    dialogVisible.value = false
    itemForm.value = { name: '', price: '', is_offer: true, image_path: '' }
    fetchItems()
  } catch (error) {
    ElMessage.error('💥 发布失败！')
  } finally {
    submitLoading.value = false
  }
}

async function deleteItem(itemId) {
  try {
    await ElMessageBox.confirm('真的要删除这件商品吗？', '⚠️ 危险操作', { confirmButtonText: '确定删除', cancelButtonText: '算了吧', type: 'warning' })
  } catch { return }
  try {
    isLoading.value = true
    await axios.delete(`${BASE_URL}items/${itemId}`)
    ElMessage.success('🗑️ 删除成功！')
    fetchItems() 
  } catch (error) {
    if (error.response && error.response.status === 403) {
      ElMessage.error('🛑 删别人的东西？想得美！你只能删除自己发布的商品！')
    } else {
      ElMessage.error('💥 删除失败，请检查网络！')
    }
  } finally {
    isLoading.value = false
  }
}

function openEditDialog(item) {
  editForm.value = { ...item }
  editDialogVisible.value = true
}

async function submitEdit() {
  if (!editForm.value.name || !editForm.value.price) {
    ElMessage.warning('商品名称和价格不能为空哦！')
    return
  }
  try {
    editSubmitLoading.value = true
    await axios.put(`${BASE_URL}items/${editForm.value.id}`, {
      name: editForm.value.name,
      price: parseFloat(editForm.value.price),
      is_offer: editForm.value.is_offer,
      image_path: editForm.value.image_path
    })
    ElMessage.success('✏️ 商品信息修改成功！')
    editDialogVisible.value = false
    fetchItems()
  } catch (error) {
    if (error.response && error.response.status === 403) {
      ElMessage.error('🛑 你只能修改自己发布的商品！')
    } else {
      ElMessage.error('💥 修改失败，请检查网络！')
    }
  } finally {
    editSubmitLoading.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('access_token')
  router.push('/login')
}

onMounted(() => {
  fetchTags()
  fetchItems()
})
</script>

<template>
  <div class="home-container">
    <h1>🚀 我的全栈二手平台</h1>
    
    <el-card class="box-card" shadow="always">
      <template #header>
        <div class="card-header">
          <span>🏷️ 平台热门标签</span>
          <div class="header-buttons">
            <el-button type="primary" size="large" @click="dialogVisible = true">+ 发布二手物品</el-button>
            <el-button type="success" plain :loading="isLoading" @click="fetchItems">刷新数据</el-button>
            <el-button type="danger" @click="handleLogout">退出</el-button>
          </div>
        </div>
      </template>
      <el-empty v-if="tagsList.length === 0" description="数据库里还没有标签哦~" />
      <div v-else class="tags-container">
        <el-tag v-for="tag in tagsList" :key="tag.id" class="custom-tag" size="large" round># {{ tag.name }}</el-tag>
      </div>
    </el-card>

    <div class="list-header">
      <h2 class="section-title">🛍️ 最新发布的二手商品</h2>
      
      <el-radio-group v-model="currentFilter" @change="fetchItems" size="large">
        <el-radio-button label="all">全部商品</el-radio-button>
        <el-radio-button label="offer">✅ 只看出售</el-radio-button>
        <el-radio-button label="request">🎯 只看求购</el-radio-button>
      </el-radio-group>
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
            <el-tag :type="item.is_offer ? 'success' : 'danger'" effect="dark">
              {{ item.is_offer ? '出售' : '求购' }}
            </el-tag>
            
            <div class="action-buttons">
              <el-button type="primary" size="small" plain @click="openEditDialog(item)">编辑</el-button>
              <el-button type="danger" size="small" plain @click="deleteItem(item.id)">删除</el-button>
            </div>
          </div>
        </div> 
      </el-card> 
    </div>

    <el-dialog v-model="dialogVisible" title="📦 发布新的二手物品" width="450px">
      <el-form label-position="top">
        <el-form-item label="商品实物图">
          <el-upload class="avatar-uploader" :action="`${BASE_URL}items/upload-image/`" :headers="getUploadHeaders()" :show-file-list="false" :on-success="handleUploadSuccess" name="file" drag>
            <img v-if="itemForm.image_path" :src="getFullImageUrl(itemForm.image_path)" class="preview-img" />
            <div v-else class="upload-placeholder"><i class="el-icon-plus avatar-uploader-icon"></i><div class="el-upload__text">将图片拖到此处，或 <em>点击上传</em></div></div>
          </el-upload>
        </el-form-item>
        <el-form-item label="物品名称"><el-input v-model="itemForm.name" /></el-form-item>
        <el-form-item label="期望价格 (元)"><el-input v-model="itemForm.price" type="number" /></el-form-item>
        <el-form-item label="交易类型"><el-switch v-model="itemForm.is_offer" active-text="出售" inactive-text="求购" active-color="#13ce66" inactive-color="#ff4949" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取 消</el-button><el-button type="primary" :loading="submitLoading" @click="submitItem">确 定 发 布</el-button></template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="✏️ 修改商品信息" width="450px">
      <el-form label-position="top">
        <el-form-item label="更换商品图 (选填)">
          <el-upload class="avatar-uploader" :action="`${BASE_URL}items/upload-image/`" :headers="getUploadHeaders()" :show-file-list="false" :on-success="handleEditUploadSuccess" name="file" drag>
            <img v-if="editForm.image_path" :src="getFullImageUrl(editForm.image_path)" class="preview-img" />
            <div v-else class="upload-placeholder"><div class="el-upload__text">点击或拖拽上传新图片</div></div>
          </el-upload>
        </el-form-item>
        <el-form-item label="物品名称"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="期望价格 (元)"><el-input v-model="editForm.price" type="number" /></el-form-item>
        <el-form-item label="交易类型"><el-switch v-model="editForm.is_offer" active-text="出售" inactive-text="求购" active-color="#13ce66" inactive-color="#ff4949" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="editDialogVisible = false">取 消</el-button><el-button type="primary" :loading="editSubmitLoading" @click="submitEdit">保 存 修 改</el-button></template>
    </el-dialog>

  </div>
</template>

<style scoped>
.home-container { max-width: 900px; margin: 50px auto; font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', sans-serif; }
h1 { text-align: center; color: #303133; margin-bottom: 30px; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
.header-buttons { display: flex; gap: 10px; }
.tags-container { display: flex; flex-wrap: wrap; gap: 15px; padding: 20px 0; }
.custom-tag { font-size: 16px; padding: 15px 20px; }

/* 🌟 新增：列表头部排版（让标题和筛选器同行展示） */
.list-header { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; margin-bottom: 20px; border-bottom: 2px solid #ebeef5; padding-bottom: 10px; }
.section-title { margin: 0; color: #303133; border-left: 5px solid #409EFF; padding-left: 10px; }

.items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; margin-bottom: 50px; }
.item-card { border-radius: 12px; transition: all 0.3s; overflow: hidden; }
.item-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
.image-wrapper { height: 200px; width: 100%; background-color: #f5f7fa; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.item-image { width: 100%; height: 100%; }
.no-image { color: #909399; font-size: 14px; }
.item-info { padding: 20px; }
.item-name { margin: 0 0 10px 0; color: #303133; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-price { color: #f56c6c; font-size: 24px; font-weight: bold; margin: 15px 0; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid #ebeef5; padding-top: 15px; }
.action-buttons { display: flex; gap: 8px; }

.avatar-uploader .el-upload { border: 1px dashed var(--el-border-color); border-radius: 6px; cursor: pointer; position: relative; overflow: hidden; transition: var(--el-transition-duration-fast); width: 100%; }
.avatar-uploader .el-upload:hover { border-color: var(--el-color-primary); }
.upload-placeholder { padding: 40px 0; color: #8c939d; text-align: center; }
.preview-img { width: 100%; height: 200px; object-fit: cover; display: block; }
</style>