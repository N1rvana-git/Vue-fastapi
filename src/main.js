import { createApp } from 'vue'
import ElementPlus, { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import axios from 'axios'
import App from './App.vue'
import router from './router' // 🌟 引入咱们刚写的路由

// 🌟 全局拦截器：每次用 axios 发请求，自动塞入 Token
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})


axios.interceptors.response.use(response => {
  return response
}, error => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('access_token')
    ElMessage.error('登录状态已过期，请重新登录')
    router.push('/login')
  }
  return Promise.reject(error)
})

const app = createApp(App)
app.use(ElementPlus)
app.use(router) // 🌟 告诉 Vue 使用路由功能
app.mount('#app')