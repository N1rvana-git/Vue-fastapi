<script setup>
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
}

// ==========================================
// 动态暖色气泡与鼠标交互系统
// ==========================================
const leftPanel = ref(null)
const circles = ref([])
const mouse = { x: -1000, y: -1000, rx: -1000, ry: -1000 }

const handleMouseMove = (e) => {
  if (!leftPanel.value) return
  const rect = leftPanel.value.getBoundingClientRect()
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top
}

const handleMouseLeave = () => {
  mouse.x = -1000
  mouse.y = -1000
}

const colors = [
  '#FFBFA3', '#FF8F66', '#FFD6A6', '#FFA488', 
  '#FFD1B3', '#FF9E79', '#FFE5A3', '#FFBBA6'
]
let animationFrameId
const particles = []

onMounted(() => {
  if (!leftPanel.value) return
  const rect = leftPanel.value.getBoundingClientRect()

  // 初始化 8 个气泡
  for (let i = 0; i < 8; i++) {
    const radius = Math.random() * 120 + 80 // 80px 到 200px 的半径
    particles.push({
      el: circles.value[i],
      x: Math.random() * (rect.width - radius * 2) + radius,
      y: Math.random() * (rect.height - radius * 2) + radius,
      vx: (Math.random() - 0.5) * 2.0, // 初始随机速度
      vy: (Math.random() - 0.5) * 2.0,
      radius: radius,
      color: colors[i % colors.length],
    })
    
    // 初始应用样式
    if (circles.value[i]) {
      circles.value[i].style.width = `${radius * 2}px`
      circles.value[i].style.height = `${radius * 2}px`
      circles.value[i].style.background = colors[i % colors.length]
    }
  }

  let lastTime = performance.now()
  const update = (time) => {
    if (!leftPanel.value) return
    const dt = (time - lastTime) / 16.666
    lastTime = time

    const panelRect = leftPanel.value.getBoundingClientRect()
    const width = panelRect.width
    const height = panelRect.height

    // 鼠标坐标的平滑跟随（增加延迟感）
    mouse.rx += (mouse.x - mouse.rx) * 0.08
    mouse.ry += (mouse.y - mouse.ry) * 0.08

    particles.forEach(p => {
      if (!p.el) return

      // --- 1. 鼠标排斥力交互 ---
      const dx = p.x - mouse.rx
      const dy = p.y - mouse.ry
      const dist = Math.sqrt(dx * dx + dy * dy)
      const interactionRadius = 350 // 交互半径

      if (dist < interactionRadius && mouse.x > 0) {
        // 当距离小于交互半径时，产生向外的斥力
        const force = (interactionRadius - dist) / interactionRadius
        p.vx += (dx / dist) * force * 1.5
        p.vy += (dy / dist) * force * 1.5
      }

      // 轻轻的中心引力，防止气泡全部挤在死角
      const cx = width / 2
      const cy = height / 2
      p.vx += (cx - p.x) * 0.0002
      p.vy += (cy - p.y) * 0.0002

      // --- 2. 限制最大速度 ---
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
      const maxSpeed = 3.0
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed
        p.vy = (p.vy / speed) * maxSpeed
      }
      
      // 添加极少的摩擦力，使没有外力时稍微变慢一点点
      p.vx *= 0.999
      p.vy *= 0.999

      // 更新位置
      p.x += p.vx * dt
      p.y += p.vy * dt

      // --- 3. 边界碰撞处理 ---
      if (p.x - p.radius < 0) {
        p.x = p.radius
        p.vx *= -1
      } else if (p.x + p.radius > width) {
        p.x = width - p.radius
        p.vx *= -1
      }

      if (p.y - p.radius < 0) {
        p.y = p.radius
        p.vy *= -1
      } else if (p.y + p.radius > height) {
        p.y = height - p.radius
        p.vy *= -1
      }

      // 将变换应用到 DOM 节点，通过 translate 实现高性能位移
      p.el.style.transform = `translate(${p.x - p.radius}px, ${p.y - p.radius}px)`
    })

    animationFrameId = requestAnimationFrame(update)
  }
  animationFrameId = requestAnimationFrame(update)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
})
</script>

<template>
  <main class="rikas-layout">
    <!-- Left Panel: Added Refs and Mouse Events for Interactive Bubbles -->
    <div class="rikas-left" ref="leftPanel" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
      <div class="left-bg-gradient"></div>
      
      <div class="left-quote">
        <blockquote class="quote-text">
          <p>“人的梦想是永无止境的”</p>
          <footer>~ 🍼</footer>
        </blockquote>
      </div>

      <!-- 动态暖色气泡背景 -->
      <div class="warm-dynamic-bg">
        <div v-for="n in 8" :key="n" class="interactive-circle" :ref="el => { if(el) circles[n-1] = el }"></div>
      </div>
    </div>

    <!-- Right Panel -->
    <div class="rikas-right">
      <div class="right-blobs">
        <div class="blob-1"></div>
        <div class="blob-2"></div>
      </div>
      
      <div class="right-content">
        <div class="header">
          <h1>登录您的店铺</h1>
          <p>登录或创建您的商家账户</p>
        </div>

        <button type="button" class="btn-google" @click="ElMessage.warning('功能开发中...')">
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z"></path></g></svg>
          使用 Google 继续
        </button>

        <div class="divider">
          <div class="divider-line"></div>
          <span>或</span>
          <div class="divider-line"></div>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <p class="form-desc">输入您的邮箱和密码登录</p>
          
          <div class="input-container">
            <div class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"></path></svg>
            </div>
            <input v-model="loginForm.username" type="email" placeholder="your.email@example.com" required>
          </div>

          <div class="input-container">
            <input 
              v-model="loginForm.password" 
              @keyup.enter="handleLogin" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="密码" 
              required 
              style="padding-left: 1rem; padding-right: 2.5rem;"
            >
            <div class="pwd-toggle" @click="showPassword = !showPassword">
              <!-- 闭眼图标 (隐藏密码) -->
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
              <!-- 睁眼图标 (显示密码) -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
          </div>

          <button type="submit" class="btn-submit" :disabled="loginLoading">
            <span v-if="!loginLoading">立即登录</span>
            <span v-else class="loader"></span>
          </button>
        </form>

        <button type="button" class="register-link" @click="ElMessage.warning('注册功能开发中')">没有账号？立即入驻</button>

        <p class="terms-text">
          点击继续即表示您同意我们的 <button type="button">服务条款</button> 和 <button type="button">隐私政策</button>.
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.rikas-layout {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 1fr;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  background-color: #FFFDF9; /* 暖白色背景 */
  color: #2C1810; /* 深暖咖啡色文字 */
}

@media (min-width: 768px) {
  .rikas-layout {
    grid-template-columns: 1fr 1fr;
    overflow: hidden;
    height: 100vh;
  }
}

.rikas-left {
  position: relative;
  display: none;
  flex-direction: column;
  padding: 2.5rem;
  border-right: 1px solid #F3E6DA;
  background-color: #FFF8F0;
}

@media (min-width: 768px) {
  .rikas-left {
    display: flex;
  }
}

.left-bg-gradient {
  position: absolute;
  inset: 0;
  /* 加入 pointer-events: none 防止遮挡容器的 mousemove 检测 */
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, transparent, rgba(255, 248, 240, 0.95));
  z-index: 1;
}

.warm-dynamic-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  background: #FFF0E6; 
}

/* 取代旧版纯 CSS circle */
.interactive-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.65;
  pointer-events: none; /* 让鼠标事件穿透给外层 rikas-left 控制 */
  top: 0;
  left: 0;
  will-change: transform; /* 提升动画性能 */
  transition: opacity 0.5s ease;
}

.left-quote {
  margin-top: auto;
  z-index: 10;
  color: #4A2B1D; /* 深棕色引用文字 */
}

.left-quote blockquote {
  margin: 0;
}

.left-quote .quote-text p {
  font-size: 1.125rem;
  line-height: 1.75rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.left-quote footer {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  font-size: 0.875rem;
  color: #8C6A53;
}

.rikas-right {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1rem;
  min-height: 100vh;
}

/* 右侧可以加一点极淡的呼吸光晕 */
.right-blobs {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.blob-1 {
  position: absolute;
  top: 0;
  right: 0;
  height: 60rem;
  width: 30rem;
  border-radius: 9999px;
  transform: translateY(-20rem);
  background: radial-gradient(50% 50% at 50% 50%, rgba(255, 128, 102, 0.08) 0, transparent 100%);
}
.blob-2 {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 40rem;
  width: 20rem;
  border-radius: 9999px;
  transform: translateY(20rem);
  background: radial-gradient(50% 50% at 50% 50%, rgba(255, 179, 128, 0.1) 0, transparent 100%);
}

.right-content {
  position: relative;
  z-index: 10;
  margin: 0 auto;
  width: 100%;
  max-width: 24rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  margin-bottom: 0.25rem;
}
.header p {
  color: #8C6A53;
  font-size: 1rem;
  margin: 0;
}

.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 3rem;
  width: 100%;
  border-radius: 9999px;
  border: 1px solid #E6D5C9;
  background-color: #FFFFFF;
  color: #4A2B1D;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.btn-google:hover {
  background-color: #FFF6F0;
  border-color: #FFBFA3;
}
.btn-google svg {
  height: 1.1rem;
  width: 1.1rem;
  fill: currentColor;
}

.divider {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 0;
}
.divider-line {
  flex: 1;
  height: 1px;
  background-color: #E6D5C9;
}
.divider span {
  padding: 0 0.5rem;
  color: #A68B7A;
  font-size: 0.75rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.form-desc {
  color: #8C6A53;
  font-size: 0.8rem;
  text-align: left;
  margin-bottom: 0.25rem;
}

.input-container {
  display: flex;
  align-items: center;
  height: 2.75rem;
  border-radius: 0.5rem;
  border: 1px solid #E6D5C9;
  background-color: #FFFFFF;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-container:focus-within {
  border-color: #FF8F66;
  box-shadow: 0 0 0 2px rgba(255, 143, 102, 0.2);
}
.input-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 0.85rem;
  color: #A68B7A;
}
.input-icon svg {
  height: 1.1rem;
  width: 1.1rem;
}
.input-container input {
  flex: 1;
  border: none;
  background: transparent;
  color: #2C1810;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.input-container input::placeholder {
  color: #BCA697;
}

.pwd-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.75rem;
  color: #A68B7A;
  cursor: pointer;
  height: 100%;
  transition: color 0.2s;
}
.pwd-toggle:hover {
  color: #FF8F66;
}

.btn-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2.75rem;
  width: 100%;
  border-radius: 9999px;
  background: linear-gradient(135deg, #FF8F66, #FF6B35);
  color: #FFFFFF;
  border: none;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  margin-top: 0.75rem;
  box-shadow: 0 4px 10px rgba(255, 107, 53, 0.3);
}
.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(255, 107, 53, 0.4);
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.register-link {
  display: block;
  text-align: center;
  color: #FF6B35;
  font-size: 0.875rem;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
  width: 100%;
  margin-top: 0;
}
.register-link:hover {
  opacity: 0.8;
}

.terms-text {
  margin-top: 2rem;
  color: #8C6A53;
  font-size: 0.8rem;
  text-align: left;
}
.terms-text button {
  background: none;
  border: none;
  color: #FF6B35;
  font-size: inherit;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s;
}
.terms-text button:hover {
  opacity: 0.8;
}
.loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-bottom-color: #fff;
  border-radius: 50%;
  animation: rotation 1s linear infinite;
}
@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
