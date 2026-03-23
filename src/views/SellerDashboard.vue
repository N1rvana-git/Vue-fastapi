<template>
  <div class="login-wrapper">
    <div class="login-split">
      <!-- Left side: Illustration / branding representing Seller Space -->
      <div class="login-illustration" style="background: linear-gradient(135deg, var(--card) 0%, var(--muted) 100%);">
        <div class="illustration-content">
          <h2 class="illustration-title">✦ SELLER DASHBOARD</h2>
          <p class="illustration-subtitle">高效管理您的二手商品库</p>
        </div>
      </div>

      <!-- Right side: Control panel -->
      <div class="login-form-container">
        <div class="login-header">
          <h1 class="logo-text">后台控制台</h1>
          <p class="logo-desc">商家及管理员的专属宇宙</p>
        </div>
        
        <div class="dashboard-content" style="padding: 2rem;">
          <el-card class="box-card">
            <template #header>
              <div class="card-header">
                <span>商家账号：{{ userStore.email }}</span>
                <el-tag type="danger" effect="dark" round>Admin</el-tag>
              </div>
            </template>
            <div style="margin-top: 20px;">
              <el-button type="primary" @click="testAdminApi" :loading="loading">
                测试获取后台机密数据 (GET /admin/secret-base)
              </el-button>
              <div v-if="secretData" style="margin-top: 20px; padding: 15px; background: var(--muted); border-radius: 8px;">
                <pre>{{ secretData }}</pre>
              </div>
            </div>
          </el-card>

          <el-button style="margin-top: 30px; width: 100%" size="large" @click="handleLogout">
            退出登录 (返回公共宇宙)
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../utils/axios.js'
import { useUserStore } from '../store/user.js'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const secretData = ref(null)

const testAdminApi = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/secret-base')
    secretData.value = response.data
    ElMessage.success('成功获取了高度机密的 admin 数据！')
  } catch (err) {
    // 拦截器那边会自动出 error 弹窗
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleLogout = () => {
  userStore.logout()
  ElMessage.success('成功登出管理后台')
  router.push('/login')
}
</script>

<style scoped>
/* Reuse the container styling from Login */
.login-wrapper {
  min-height: 100vh;
  display: flex;
  background-color: var(--background);
  color: var(--foreground);
}

.login-split {
  display: flex;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

.login-illustration {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4rem;
  position: relative;
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.illustration-content {
  position: relative;
  z-index: 10;
}

.illustration-title {
  font-size: 3.5rem;
  line-height: 1.1;
  font-weight: 700;
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
}

.illustration-subtitle {
  font-size: 1.25rem;
  color: var(--muted-foreground);
  max-width: 80%;
  line-height: 1.6;
}

.login-form-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4rem 10%;
  max-width: 600px;
  background: var(--card);
}

.login-header {
  margin-bottom: 3rem;
}

.logo-text {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.logo-desc {
  color: var(--muted-foreground);
  font-size: 1rem;
  margin: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}
</style>