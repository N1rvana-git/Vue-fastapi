import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../store/user.js'

const routes = [
  { 
    path: '/', 
    redirect: () => {
      const userStore = useUserStore()
      if (!userStore.isLoggedIn) return '/login'
      return userStore.role === 'admin' ? '/seller/dashboard' : '/buyer/home'
    }
  },
  { 
    path: '/login', 
    name: 'Login', 
    component: () => import('../views/Login.vue') 
  },
  { 
    path: '/register', 
    name: 'Register', 
    component: () => import('../views/Register.vue') 
  },
  { 
    path: '/buyer/home', 
    name: 'BuyerHome', 
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true, role: 'user' }
  },
  { 
    path: '/seller/dashboard', 
    name: 'SellerDashboard', 
    component: () => import('../views/SellerDashboard.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  // 1. 如果去登录页/注册页，且已经登录，则根据角色跳回对应主页
  if ((to.path === '/login' || to.path === '/register') && userStore.isLoggedIn) {
    if (userStore.role === 'admin') {
      return next('/seller/dashboard')
    } else {
      return next('/buyer/home')
    }
  }

  // 2. 检查是否需要登录
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return next('/login')
  }

  // 3. 检查角色权限
  if (to.meta.role) {
    // 规定 admin 只能去 seller, user 只能去 buyer
    if (to.meta.role === 'admin' && userStore.role !== 'admin') {
      // 普通买家想去控制台 -> 踢回买家首页
      return next('/buyer/home')
    }
    if (to.meta.role === 'user' && userStore.role === 'admin') {
      // 卖家想去买家页面 -> 踢回卖家后台（这里你可根据实际业务调整是否严格互斥）
      return next('/seller/dashboard')
    }
  }

  next()
})

export default router
