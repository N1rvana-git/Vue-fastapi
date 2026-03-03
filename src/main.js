import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
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

const app = createApp(App)
app.use(ElementPlus)
app.use(router) // 🌟 告诉 Vue 使用路由功能
app.mount('#app')