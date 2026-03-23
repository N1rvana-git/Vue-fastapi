<template>
  <div class="login-wrapper">
    <div class="login-split">
      <!-- 动态装饰 -->
      <div class="login-illustration" ref="leftPanel">
        <div class="illustration-content">
          <h2 class="illustration-title">✦ JOIN US</h2>
          <p class="illustration-subtitle">加入全栈二手交易平台，开启闲置变现之旅，或者成为尊贵的买家。</p>
        </div>
      </div>

      <!-- 注册表单 -->
      <div class="login-form-container">
        <div class="login-header">
          <h1 class="logo-text">建立新账号</h1>
          <p class="logo-desc">请选择您需要注册的宇宙角色</p>
        </div>

        <el-form class="login-form" @submit.prevent>
          <div class="form-group">
            <label class="form-label">宇宙身份选择</label>
            <el-radio-group v-model="registerForm.role" size="large" style="margin-bottom: 20px; width: 100%;">
              <el-radio-button value="user" style="flex:1; text-align: center;">🛍️ 普通买家</el-radio-button>
              <el-radio-button value="admin" style="flex:1; text-align: center;">👔 卖家(Admin)</el-radio-button>
            </el-radio-group>
          </div>

          <div class="form-group">
            <label class="form-label">登录邮箱 (Username)</label>
            <el-input 
              v-model="registerForm.email" 
              placeholder="请输入您的邮箱" 
              size="large"
            />
          </div>

          <div class="form-group">
            <label class="form-label">登录密码</label>
            <el-input 
              v-model="registerForm.password" 
              type="password"
              placeholder="请输入复杂的密码" 
              size="large"
              show-password
            />
          </div>

          <button 
            type="button" 
            class="submit-btn" 
            :class="{ loading: registerLoading }"
            @click="handleRegister"
            :disabled="registerLoading"
          >
            <span v-if="!registerLoading">马上注册</span>
            <span class="spinner" v-else></span>
          </button>
        </el-form>

        <div class="login-footer">
          <p>已有账号？ <a href="#" @click.prevent="router.push('/login')" class="link">直接穿梭回登录页</a></p>
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

const router = useRouter()
const registerLoading = ref(false)
const registerForm = ref({
  email: '',
  password: '',
  role: 'user'
})

const handleRegister = async () => {
  if (!registerForm.value.email || !registerForm.value.password) {
    ElMessage.warning('账号和密码不能为空！')
    return
  }
  
  registerLoading.value = true
  try {
    // 假设后端注册接口为 POST /users/register
    await api.post('/users/register', {
      email: registerForm.value.email,
      password: registerForm.value.password,
      role: registerForm.value.role
    })
    
    ElMessage.success('🎉 注册成功！即将跳转到登录...')
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '注册失败，该邮箱可能已被占用')
  } finally {
    registerLoading.value = false
  }
}
</script>

<style scoped>
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
  background: var(--muted);
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
.form-group {
  margin-bottom: 1.5rem;
}
.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--foreground);
}
.submit-btn {
  width: 100%;
  padding: 0.875rem;
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
}
.submit-btn:hover {
  background-color: var(--ring);
}
.login-footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}
.link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}
.link:hover {
  text-decoration: underline;
}
</style>