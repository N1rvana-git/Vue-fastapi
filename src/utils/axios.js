import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router/index.js'
import { useUserStore } from '../store/user.js'

// 不要带尾部斜杠，避免出现 //token
const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '')

const api = axios.create({
  baseURL,
  timeout: 10000
})

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const isLoginRequest = typeof config.url === 'string' && config.url.includes('/token')
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')

    // 登录请求不带旧 token，避免后端误判
    if (!isLoginRequest && token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const reqUrl = error?.config?.url || ''
    const isLoginRequest = typeof reqUrl === 'string' && reqUrl.includes('/token')

    // 登录接口的 401 交给 Login.vue 自己提示，不要在这里强制登出跳转
    if (!isLoginRequest && (status === 401 || status === 403)) {
      ElMessage.error(status === 401 ? '登录已过期，请重新登录' : '权限不足！')

      const userStore = useUserStore()
      userStore.logout()

      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    } else if (!error?.response) {
      ElMessage.error('网络错误或服务器无响应')
    }

    return Promise.reject(error)
  }
)

export default api
