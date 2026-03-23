import re

with open(r'd:\PycharmProjects\my-frontend\src\views\Login.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Target script block mapping
old_script = """<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()
const loginLoading = ref(false)
const loginForm = ref({ username: '', password: '' })
const showPassword = ref(false)

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://jubilant-yodel-4jr9qx56jv9q3qrxg-8000.app.github.dev/'
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

    // Replace with your actual authentication endpoint if needed
    const response = await axios.post(`${BASE_URL}token`, params)
    localStorage.setItem('access_token', response.data.access_token)

    ElMessage.success('🎉 认证成功，欢迎回来！')
    router.push('/')

  } catch (error) {
    ElMessage.error('💥 认证失败，请检查账号或密码。')
  } finally {
    loginLoading.value = false
  }
}"""

new_script = """<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import api from '../utils/axios.js'
import { useUserStore } from '../store/user.js'

const router = useRouter()
const userStore = useUserStore()
const loginLoading = ref(false)
const loginForm = ref({ username: '', password: '' })
const showPassword = ref(false)

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

    const response = await api.post('/token', params)
    
    userStore.handleLoginSuccess(response.data.access_token)
    ElMessage.success('🎉 认证成功，欢迎回来！')

    if (userStore.role === 'admin') {
      router.push('/seller/dashboard')
    } else {
      router.push('/buyer/home')
    }
  } catch (error) {
    ElMessage.error('💥 认证失败，请检查账号或密码。')
  } finally {
    loginLoading.value = false
  }
}"""

# A more robust regex replacement in case of spacing mismatches
if 'userStore' not in content:
    content = re.sub(r'<script setup>.*?async function handleLogin\(\) \{.*?\}\n\}', new_script, content, flags=re.DOTALL)
    
    with open(r'd:\PycharmProjects\my-frontend\src\views\Login.vue', 'w', encoding='utf-8') as f:
        f.write(content)
        print("Login.vue successfully updated.")
