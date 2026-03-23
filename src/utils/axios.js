import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router/index.js'
import { useUserStore } from '../store/user.js'

// Load base url from vite env or default to 8000
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL,
  timeout: 10000
})

// Request Interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

// Response Interceptor
api.interceptors.response.use(response => {
  return response
}, error => {
  if (error.response) {
    const status = error.response.status
    if (status === 401 || status === 403) {
      ElMessage.error(status === 401 ? '登录已过期，请重新登录' : '权限不足！')
      
      const userStore = useUserStore()
      userStore.logout()
      
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }
  } else {
    ElMessage.error('网络错误或服务器无响应')
  }
  return Promise.reject(error)
})

export default api
