<template>
  <div class="login-wrapper">
    <div class="login-split">
      <!-- 动态装饰 -->
      <div class="login-illustration" ref="illustrationPanel">
        <canvas ref="canvas" class="illustration-canvas" aria-hidden="true"></canvas>
        <div class="illustration-content" aria-hidden="true">
          <h2 class="illustration-title">✦ JOIN US</h2>
          <p class="illustration-subtitle">加入二手交易平台，开启闲置变现之旅，或者成为尊贵的买家。</p>
          <span class="sr-only">装饰性粒子动画，仅作为视觉效果。</span>
        </div>
      </div>

      <!-- 注册表单 -->
      <div class="login-form-container">
        <div class="login-header">
          <h1 class="logo-text">建立新账号</h1>
          <p class="logo-desc">请选择您需要注册的角色</p>
        </div>

        <el-form
          ref="formRef"
          :model="registerForm"
          :rules="rules"
          class="login-form"
          label-width="0"
          @submit.prevent
        >
          <div class="form-group">
            <label class="form-label">身份选择</label>
            <el-radio-group v-model="registerForm.role" size="large" style="margin-bottom: 20px; width: 100%;">
              <el-radio-button value="user" style="flex:1; text-align: center;">🛍️ 普通买家</el-radio-button>
              <el-radio-button value="admin" style="flex:1; text-align: center;">👔 卖家(Admin)</el-radio-button>
            </el-radio-group>
          </div>

          <el-form-item prop="username" class="form-group">
            <label class="form-label">名称 (Username)</label>
            <el-input
              v-model="registerForm.username"
              placeholder="请输入您的名称（将作为用户名）"
              size="large"
              aria-label="用户名"
            />
          </el-form-item>

          <el-form-item prop="email" class="form-group">
            <label class="form-label">登录邮箱 (Email)</label>
            <el-input
              v-model="registerForm.email"
              placeholder="请输入您的邮箱"
              size="large"
              aria-label="邮箱"
            />
          </el-form-item>

          <el-form-item prop="password" class="form-group">
            <label class="form-label">登录密码</label>
            <el-input
              v-model="registerForm.password"
              type="password"
              placeholder="请输入复杂的密码"
              size="large"
              show-password
              aria-label="密码"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              class="submit-btn"
              :loading="registerLoading"
              @click="handleRegister"
              style="width:100%"
            >
              马上注册
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          <p>已有账号？ <a href="#" @click.prevent="router.push('/login')" class="link">直接穿梭回登录页</a></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../utils/axios.js'

// --- 表单逻辑 ---
const router = useRouter()
const registerLoading = ref(false)
const registerForm = ref({
  username: '',
  email: '',
  password: '',
  role: 'user'
})
const formRef = ref(null)

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少 3 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效邮箱', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { pattern: /^(?=.*[A-Z])(?=.*\d).{8,}$/, message: '密码至少 8 位，包含大写字母和数字', trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (registerLoading.value) return
  registerLoading.value = true

  try {
    if (!formRef.value) throw new Error('表单未就绪')
    await formRef.value.validate()
  } catch (e) {
    registerLoading.value = false
    return
  }

  try {
    const payload = {
      username: registerForm.value.username,
      email: registerForm.value.email,
      password: registerForm.value.password,
      role: registerForm.value.role
    }
    await api.post('/register', payload)
    ElMessage.success('注册成功，正在跳转登录页')
    router.push('/login')
  } catch (err) {
    ElMessage.error(err?.response?.data?.message || '注册失败，请稍后重试')
  } finally {
    registerLoading.value = false
  }
}

// --- Canvas 动画 V2 (带景深和鼠标交互，针对 desktop 做 DPR 缩放与性能优化) ---
const illustrationPanel = ref(null)
const canvas = ref(null)
let animationFrameId = null

onMounted(() => {
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  let width = 0, height = 0, particles = [], particleColor = '#4F46E5', lineColor = '#e2e8f0'
  const fov = 250 // 视野深度

  const mouse = { x: null, y: null, radius: 180 }

  const getThemeColors = () => {
    const styles = getComputedStyle(document.documentElement)
    particleColor = styles.getPropertyValue('--primary').trim() || '#4F46E5'
    lineColor = styles.getPropertyValue('--border').trim() || '#e2e8f0'
  }

  const init = () => {
    getThemeColors()
    const container = illustrationPanel.value || canvas.value.parentElement
    width = Math.max(400, container.clientWidth)
    height = Math.max(300, container.clientHeight)

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))
    canvas.value.width = Math.floor(width * dpr)
    canvas.value.height = Math.floor(height * dpr)
    canvas.value.style.width = width + 'px'
    canvas.value.style.height = height + 'px'

    // 重置并缩放上下文，使后续以 CSS 像素绘制
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false

    particles = []
    // 针对桌面：根据屏幕面积动态计算粒子数量，适度放大以求视觉密度
    const particleCount = Math.min(2500, Math.round((width * height) / 12000 * Math.min(dpr, 2)))
    for (let i = 0; i < particleCount; i++) particles.push(createParticle())
  }

  const createParticle = (p) => {
    const x = p ? p.x : Math.random() * width * 2 - width
    const y = p ? p.y : Math.random() * height * 2 - height
    const z = p ? p.z : Math.random() * fov
    return {
      x, y, z,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }
  }

  const project = (p) => {
    const scale = fov / (fov + p.z)
    const displayX = p.x * scale + width / 2
    const displayY = p.y * scale + height / 2
    const displayRadius = Math.max(0.6, 1.6 * scale)
    return { displayX, displayY, displayRadius, scale }
  }

  const animate = () => {
    ctx.clearRect(0, 0, width, height)

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      if (mouse.x !== null) {
        const dx = p.x - (mouse.x - width / 2)
        const dy = p.y - (mouse.y - height / 2)
        const dist = Math.hypot(dx, dy)
        if (dist < mouse.radius) {
          const angle = Math.atan2(dy, dx)
          const force = (mouse.radius - dist) / mouse.radius
          p.x += Math.cos(angle) * force * 2.5
          p.y += Math.sin(angle) * force * 2.5
        }
      }

      p.x += p.vx
      p.y += p.vy
      p.z -= 0.25

      if (p.z <= 0) particles[i] = createParticle({ x: Math.random() * width * 2 - width, y: Math.random() * height * 2 - height, z: fov })

      const { displayX, displayY, displayRadius, scale } = project(p)
      if (displayX > 0 && displayX < width && displayY > 0 && displayY < height) {
        ctx.beginPath()
        ctx.arc(displayX, displayY, displayRadius, 0, Math.PI * 2)
        ctx.fillStyle = particleColor
        ctx.globalAlpha = Math.min(1, scale * 0.9)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    animationFrameId = requestAnimationFrame(animate)
  }

  // 确保 DOM 渲染完成并开始动画
  setTimeout(() => {
    init()
    animate()

    const handleMouseMove = (e) => {
      const rect = canvas.value.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const handleMouseLeave = () => { mouse.x = null; mouse.y = null }

    illustrationPanel.value.addEventListener('mousemove', handleMouseMove)
    illustrationPanel.value.addEventListener('mouseleave', handleMouseLeave)

    const resizeObserver = new ResizeObserver(() => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      init()
      animate()
    })
    resizeObserver.observe(illustrationPanel.value)

    onUnmounted(() => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      illustrationPanel.value.removeEventListener('mousemove', handleMouseMove)
      illustrationPanel.value.removeEventListener('mouseleave', handleMouseLeave)
    })
  }, 100)
})

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
  background-color: transparent;
}
.illustration-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
.illustration-content {
  position: relative;
  z-index: 2;
}
.illustration-title {
  font-size: 3.5rem;
  line-height: 1.1;
  font-weight: 700;
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
  color: var(--primary); /* 增强标题颜色 */
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
  z-index: 5; /* 确保表单在插图之上（以防万一） */
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
  position: relative;
  overflow: hidden;
}
.submit-btn:hover {
  filter: brightness(1.1);
}
.submit-btn:active:before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200px;
    height: 200px;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.2s, height 0.2s;
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

/* 加载动画 */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--primary-foreground);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
