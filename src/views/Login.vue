<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router' // 🌟 引入路由跳转功能

const router = useRouter()
const loginLoading = ref(false)
const loginForm = ref({ username: '', password: '' })

// 🌟 自动修正后的 Codespaces 链接
const BASE_URL = 'https://jubilant-yodel-4jr9qx56jv9q3qrxg-8000.app.github.dev/'

async function handleLogin() {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('账号密码不能为空哦！')
    return
  }
  try {
    loginLoading.value = true
    const params = new URLSearchParams()
    params.append('username', loginForm.value.username)
    params.append('password', loginForm.value.password)
    
    // 请求咱们后端的 token 接口
    const response = await axios.post(`${BASE_URL}token`, params)
    localStorage.setItem('access_token', response.data.access_token)
    
    ElMessage.success('🎉 登录成功！')
    
    // 🌟 魔法时刻：登录成功后，用代码强行把网址切换到主页 '/'
    router.push('/')
    
  } catch (error) {
    ElMessage.error('💥 登录失败，账号或密码错误！')
  } finally {
    loginLoading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <el-card class="login-card" shadow="always">
      <h2>🔐 全栈二手平台</h2>
      <el-form label-position="top">
        <el-form-item label="登录邮箱">
          <el-input v-model="loginForm.username" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-button type="primary" class="login-btn" :loading="loginLoading" @click="handleLogin">
          立即登录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh; /* 满屏高度居中 */
}
.login-card {
  width: 400px;
  text-align: center;
}
.login-btn {
  width: 100%;
  margin-top: 20px;
}
</style>