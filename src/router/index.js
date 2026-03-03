import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'

// 1. 定义路由规则（网址映射）
const routes = [
  { path: '/login', name: 'Login', component: Login },
  { path: '/', name: 'Home', component: Home }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 🌟 2. 路由守卫：前端的安全检查站
router.beforeEach((to, from, next) => {
  // 看看本地有没有 Token？
  const token = localStorage.getItem('access_token')
  
  // 如果他想去的不是登录页，并且没有 Token
  if (to.name !== 'Login' && !token) {
    next({ name: 'Login' }) // 直接踢回登录页
  } else {
    next() // 绿灯放行
  }
})

export default router