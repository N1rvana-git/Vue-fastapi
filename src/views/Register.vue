<template>
  <div class="register-page" ref="registerRoot">
    <div class="ambient-orb ambient-orb--left" aria-hidden="true"></div>
    <div class="ambient-orb ambient-orb--right" aria-hidden="true"></div>

    <div class="register-shell">
      <section class="hero-pane" ref="illustrationPanel" aria-label="品牌叙事舞台">
        <canvas ref="canvas" class="hero-canvas" aria-hidden="true"></canvas>
        <div class="hero-grid" aria-hidden="true"></div>
        <div class="hero-glow hero-glow--a" aria-hidden="true"></div>
        <div class="hero-glow hero-glow--b" aria-hidden="true"></div>

        <div class="hero-copy">
          <p class="hero-kicker">Trader Universe</p>
          <h2 class="hero-title">Create A Presence That Feels Premium</h2>
          <p class="hero-subtitle">{{ roleNarrative }}</p>

          <div class="hero-badges">
            <span class="hero-badge">{{ currentRoleMeta.label }}</span>
            <span class="hero-badge">Desktop Performance Mode</span>
          </div>

          <div class="hero-story-list">
            <article class="hero-story-card">
              <span class="story-index">01</span>
              <div>
                <h3>Discover Fast</h3>
                <p>按标签和搜索快速定位目标交易场景。</p>
              </div>
            </article>
            <article class="hero-story-card">
              <span class="story-index">02</span>
              <div>
                <h3>Trust The Flow</h3>
                <p>实时大厅与 AI 管家协作，降低沟通成本。</p>
              </div>
            </article>
            <article class="hero-story-card">
              <span class="story-index">03</span>
              <div>
                <h3>Close Smoothly</h3>
                <p>发布、咨询、成交形成顺滑完整的动作闭环。</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="form-pane">
        <div class="form-card">
          <div class="card-glint" aria-hidden="true"></div>

          <div class="login-header">
            <p class="header-kicker">Account Setup</p>
            <h1 class="logo-text">建立新账号</h1>
            <p class="logo-desc">{{ currentRoleMeta.description }}</p>
          </div>

          <el-form
            ref="formRef"
            :model="registerForm"
            :rules="rules"
            class="login-form"
            label-width="0"
            @submit.prevent
          >
            <div class="form-group role-group">
              <label class="form-label">身份选择</label>
              <el-radio-group v-model="registerForm.role" class="role-switch" size="large">
                <el-radio-button value="user">🛍️ 普通买家</el-radio-button>
                <el-radio-button value="admin">👔 卖家(Admin)</el-radio-button>
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

              <div class="password-strength" :data-level="passwordStrength.level">
                <div class="strength-bars">
                  <span v-for="n in 4" :key="n" :class="{ active: n <= passwordStrength.score }"></span>
                </div>
                <span class="strength-text">{{ passwordStrength.label }}</span>
              </div>
            </el-form-item>

            <el-form-item class="submit-row">
              <el-button
                type="primary"
                class="submit-btn"
                :loading="registerLoading"
                @click="handleRegister"
              >
                {{ roleButtonText }}
              </el-button>
            </el-form-item>
          </el-form>

          <p class="terms-text">继续即表示你同意平台的服务条款与隐私政策。</p>

          <div class="login-footer">
            <p>已有账号？ <a href="#" @click.prevent="router.push('/login')" class="link">直接穿梭回登录页</a></p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import gsap from 'gsap'
import api from '../utils/axios.js'

// --- 表单逻辑 ---
const router = useRouter()
const registerLoading = ref(false)
const registerRoot = ref(null)
const registerForm = ref({
  username: '',
  email: '',
  password: '',
  role: 'user'
})
const formRef = ref(null)

const roleMeta = {
  user: {
    label: 'Buyer Identity',
    description: '作为买家身份加入，优先发现高质量闲置并快速完成交易。'
  },
  admin: {
    label: 'Seller Identity',
    description: '作为卖家身份加入，发布商品并进入数据化经营工作台。'
  }
}

const currentRoleMeta = computed(() => roleMeta[registerForm.value.role] || roleMeta.user)

const roleNarrative = computed(() => {
  if (registerForm.value.role === 'admin') {
    return '你将进入卖家工作台，用更专业的方式管理商品、追踪交易并建立信任。'
  }
  return '你将进入买家大厅，通过搜索、标签与实时沟通快速找到理想闲置。'
})

const roleButtonText = computed(() => {
  return registerForm.value.role === 'admin' ? '创建卖家账号' : '创建买家账号'
})

const passwordStrength = computed(() => {
  const password = registerForm.value.password || ''
  if (!password) return { score: 0, level: 'empty', label: '请先设置密码' }

  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^\w\s]/.test(password)) score += 1

  if (score <= 1) return { score, level: 'weak', label: '偏弱，建议增加大小写和符号' }
  if (score === 2) return { score, level: 'medium', label: '中等，还可以更强' }
  if (score === 3) return { score, level: 'good', label: '良好，安全性不错' }
  return { score, level: 'strong', label: '极强，安全性优秀' }
})

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

// --- Canvas 动画 V3 (分层光域+景深粒子，桌面性能优先) ---
const illustrationPanel = ref(null)
const canvas = ref(null)
let animationFrameId = null
let resizeObserver = null
let handleMouseMove = null
let handleMouseLeave = null
let introContext = null

const shouldReduceMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const playIntroTimeline = () => {
  if (!registerRoot.value || window.innerWidth < 900 || shouldReduceMotion()) return

  introContext = gsap.context(() => {
    gsap.set('.hero-kicker, .hero-title, .hero-subtitle, .hero-badge, .hero-story-card', {
      autoAlpha: 0,
      y: 26,
    })

    gsap.set('.form-card, .header-kicker, .logo-text, .logo-desc, .form-group, .submit-row, .terms-text, .login-footer', {
      autoAlpha: 0,
      y: 20,
    })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl
      .fromTo('.register-shell',
        { scale: 0.985, autoAlpha: 0.82, filter: 'blur(6px)' },
        { scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 0.8 }
      )
      .to('.hero-kicker', { autoAlpha: 1, y: 0, duration: 0.35 }, '-=0.5')
      .to('.hero-title', { autoAlpha: 1, y: 0, duration: 0.55 }, '-=0.2')
      .to('.hero-subtitle', { autoAlpha: 1, y: 0, duration: 0.45 }, '-=0.28')
      .to('.hero-badge', { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.08 }, '-=0.2')
      .to('.hero-story-card', {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        stagger: 0.1,
        ease: 'power2.out',
      }, '-=0.15')
      .to('.form-card', { autoAlpha: 1, y: 0, duration: 0.55 }, '-=0.48')
      .to('.header-kicker, .logo-text, .logo-desc', {
        autoAlpha: 1,
        y: 0,
        duration: 0.36,
        stagger: 0.08,
      }, '-=0.28')
      .to('.form-group, .submit-row, .terms-text, .login-footer', {
        autoAlpha: 1,
        y: 0,
        duration: 0.32,
        stagger: 0.06,
      }, '-=0.12')

    gsap.to('.card-glint', {
      x: -34,
      y: 22,
      opacity: 0.92,
      duration: 6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
  }, registerRoot.value)
}

watch(
  () => registerForm.value.role,
  () => {
    if (!registerRoot.value || shouldReduceMotion()) return

    const roleShift = gsap.timeline({ defaults: { duration: 0.28, ease: 'power2.out' } })
    roleShift
      .fromTo('.hero-subtitle', { autoAlpha: 0.62, y: 8 }, { autoAlpha: 1, y: 0 })
      .fromTo('.logo-desc', { autoAlpha: 0.62, y: 8 }, { autoAlpha: 1, y: 0 }, '<')
      .fromTo('.hero-badge:first-child', { autoAlpha: 0.72, scale: 0.95 }, { autoAlpha: 1, scale: 1 }, '<')
  }
)

onMounted(() => {
  if (!canvas.value || !illustrationPanel.value) return
  const ctx = canvas.value.getContext('2d')
  let width = 0
  let height = 0
  let particles = []
  let particleColor = '#4F46E5'
  let lineColor = '#e2e8f0'
  let secondaryColor = '#00b9a2'
  const fov = 250 // 视野深度

  const mouse = { x: null, y: null, radius: 180 }

  const toAlphaColor = (color, alpha) => {
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
    }
    if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
      const hex = color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color
      const bigint = Number.parseInt(hex.slice(1), 16)
      const r = (bigint >> 16) & 255
      const g = (bigint >> 8) & 255
      const b = bigint & 255
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    return color
  }

  const getThemeColors = () => {
    const styles = getComputedStyle(document.documentElement)
    particleColor = styles.getPropertyValue('--primary').trim() || '#4F46E5'
    lineColor = styles.getPropertyValue('--border').trim() || '#e2e8f0'
    secondaryColor = styles.getPropertyValue('--chart-4').trim() || '#00b9a2'
  }

  const init = () => {
    getThemeColors()
    const container = illustrationPanel.value || canvas.value.parentElement
    width = Math.max(400, container.clientWidth)
    height = Math.max(300, container.clientHeight)

    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
    canvas.value.width = Math.floor(width * dpr)
    canvas.value.height = Math.floor(height * dpr)
    canvas.value.style.width = width + 'px'
    canvas.value.style.height = height + 'px'

    // 重置并缩放上下文，使后续以 CSS 像素绘制
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false

    particles = []
    const particleCount = Math.min(1800, Math.round((width * height) / 7400 * Math.min(dpr, 2)))
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

    const wash = ctx.createLinearGradient(0, 0, width, height)
    wash.addColorStop(0, toAlphaColor(particleColor, 0.14))
    wash.addColorStop(0.55, toAlphaColor(secondaryColor, 0.1))
    wash.addColorStop(1, 'rgba(4, 10, 24, 0.34)')
    ctx.fillStyle = wash
    ctx.fillRect(0, 0, width, height)

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
        const trailX = displayX - p.vx * 7
        const trailY = displayY - p.vy * 7

        ctx.beginPath()
        ctx.moveTo(displayX, displayY)
        ctx.lineTo(trailX, trailY)
        ctx.strokeStyle = toAlphaColor(lineColor, Math.min(0.5, scale * 0.38))
        ctx.lineWidth = Math.max(0.45, scale * 0.9)
        ctx.stroke()

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

  handleMouseMove = (e) => {
    const rect = canvas.value.getBoundingClientRect()
    mouse.x = e.clientX - rect.left
    mouse.y = e.clientY - rect.top
  }

  handleMouseLeave = () => {
    mouse.x = null
    mouse.y = null
  }

  illustrationPanel.value.addEventListener('mousemove', handleMouseMove)
  illustrationPanel.value.addEventListener('mouseleave', handleMouseLeave)

  resizeObserver = new ResizeObserver(() => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    init()
    animate()
  })
  resizeObserver.observe(illustrationPanel.value)

  init()
  animate()
  playIntroTimeline()
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (illustrationPanel.value && handleMouseMove) {
    illustrationPanel.value.removeEventListener('mousemove', handleMouseMove)
  }
  if (illustrationPanel.value && handleMouseLeave) {
    illustrationPanel.value.removeEventListener('mouseleave', handleMouseLeave)
  }

  handleMouseMove = null
  handleMouseLeave = null

  if (introContext) {
    introContext.revert()
    introContext = null
  }
})

</script>

<style scoped>
.register-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 22px;
  overflow: hidden;
  color: var(--foreground);
  background:
    radial-gradient(1200px 540px at 2% -6%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 58%),
    radial-gradient(1000px 580px at 96% 108%, color-mix(in srgb, var(--chart-4) 20%, transparent), transparent 56%),
    linear-gradient(136deg, color-mix(in srgb, var(--background) 92%, #0f1b34 8%), color-mix(in srgb, var(--background) 84%, #111e3b 16%));
}

.ambient-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(24px);
  pointer-events: none;
  z-index: 0;
}

.ambient-orb--left {
  width: 320px;
  height: 320px;
  left: -110px;
  top: 90px;
  background: color-mix(in srgb, var(--primary) 30%, transparent);
}

.ambient-orb--right {
  width: 360px;
  height: 360px;
  right: -140px;
  bottom: -30px;
  background: color-mix(in srgb, var(--chart-4) 32%, transparent);
}

.register-shell {
  position: relative;
  z-index: 1;
  width: min(1560px, 100%);
  min-height: calc(100vh - 44px);
  display: grid;
  grid-template-columns: 1.2fr 0.95fr;
  border-radius: 32px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--primary) 28%, var(--border) 72%);
  box-shadow:
    0 42px 70px rgba(5, 10, 24, 0.44),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  perspective: 1200px;
}

.hero-kicker,
.hero-title,
.hero-subtitle,
.hero-badge,
.hero-story-card,
.form-card,
.header-kicker,
.logo-text,
.logo-desc,
.form-group,
.submit-row,
.terms-text,
.login-footer {
  will-change: transform, opacity;
}

.hero-pane {
  position: relative;
  overflow: hidden;
  padding: clamp(28px, 4vw, 66px);
  isolation: isolate;
  background:
    linear-gradient(148deg, color-mix(in srgb, var(--background) 66%, #0a1429 34%), color-mix(in srgb, var(--background) 70%, #081224 30%));
}

.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.hero-grid {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0.42;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at 38% 38%, rgba(0, 0, 0, 0.96), transparent 78%);
}

.hero-glow {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  z-index: 2;
}

.hero-glow--a {
  width: 340px;
  height: 340px;
  left: -110px;
  top: -40px;
  background: radial-gradient(circle at 40% 40%, color-mix(in srgb, var(--primary) 72%, #ffffff 28%), color-mix(in srgb, var(--primary) 24%, transparent) 72%);
  opacity: 0.58;
}

.hero-glow--b {
  width: 400px;
  height: 400px;
  right: -150px;
  bottom: -120px;
  background: radial-gradient(circle at 45% 32%, color-mix(in srgb, var(--chart-4) 76%, #ffffff 24%), color-mix(in srgb, var(--chart-4) 24%, transparent) 70%);
  opacity: 0.52;
}

.hero-copy {
  position: relative;
  z-index: 4;
  max-width: 620px;
}

.hero-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 12px;
  color: color-mix(in srgb, var(--chart-4) 78%, #ffffff 22%);
}

.hero-title {
  margin: 14px 0 0;
  max-width: 14ch;
  font-size: clamp(42px, 5.1vw, 72px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  font-family: var(--font-heading);
  color: #f8fbff;
  text-wrap: balance;
  text-shadow: 0 20px 40px rgba(6, 10, 24, 0.44);
}

.hero-subtitle {
  margin: 18px 0 0;
  max-width: 54ch;
  font-size: clamp(14px, 1.05vw, 17px);
  line-height: 1.68;
  color: color-mix(in srgb, #f5fbff 80%, #9cb2d4 20%);
}

.hero-badges {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-badge {
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #ffffff 38%, transparent);
  background: color-mix(in srgb, #ffffff 12%, transparent);
  padding: 8px 14px;
  font-size: 12px;
  color: #f6fbff;
  backdrop-filter: blur(10px);
}

.hero-story-list {
  margin-top: 24px;
  display: grid;
  gap: 10px;
}

.hero-story-card {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
  align-items: start;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, #ffffff 28%, transparent);
  background: color-mix(in srgb, #0b1731 62%, transparent);
  backdrop-filter: blur(12px);
  padding: 12px;
}

.story-index {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #f8fdff;
  background: linear-gradient(140deg, color-mix(in srgb, var(--primary) 74%, #93d8ff 26%), color-mix(in srgb, var(--chart-4) 78%, var(--primary) 22%));
}

.hero-story-card h3 {
  margin: 1px 0 4px;
  font-size: 19px;
  line-height: 1.2;
  color: #f8fdff;
}

.hero-story-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: color-mix(in srgb, #f5fbff 80%, #9eb2cf 20%);
}

.form-pane {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(24px, 4vw, 60px);
  background: linear-gradient(180deg, color-mix(in srgb, var(--card) 88%, transparent), color-mix(in srgb, var(--card) 95%, transparent));
}

.form-card {
  position: relative;
  width: min(560px, 100%);
  border-radius: 28px;
  border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border) 76%);
  background:
    linear-gradient(155deg, color-mix(in srgb, var(--card) 92%, #f6fbff 8%), color-mix(in srgb, var(--card) 98%, transparent));
  box-shadow:
    0 24px 42px rgba(8, 12, 28, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  padding: clamp(24px, 3vw, 36px);
  overflow: hidden;
}

.card-glint {
  position: absolute;
  top: -140px;
  right: -80px;
  width: 280px;
  height: 280px;
  border-radius: 999px;
  background: radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, #ffffff 80%), transparent 70%);
  pointer-events: none;
}

.login-header {
  position: relative;
  z-index: 1;
}

.header-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 11px;
  color: color-mix(in srgb, var(--primary) 78%, #334155 22%);
}

.logo-text {
  margin: 12px 0 8px;
  font-family: var(--font-heading);
  font-size: clamp(34px, 3vw, 48px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, var(--foreground) 92%, #1f314f 8%);
}

.logo-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted-foreground);
}

.login-form {
  margin-top: 20px;
  position: relative;
  z-index: 1;
}

.form-group {
  margin-bottom: 14px;
}

.role-group {
  margin-bottom: 8px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.01em;
  color: color-mix(in srgb, var(--foreground) 78%, #334155 22%);
}

:deep(.el-form-item__content) {
  display: block;
}

:deep(.el-input__wrapper) {
  border-radius: 13px;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--border) 80%, var(--primary) 20%) inset,
    0 6px 18px color-mix(in srgb, var(--primary) 8%, transparent);
  transition: box-shadow 0.22s ease, transform 0.22s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--primary) 36%, var(--border) 64%) inset,
    0 8px 20px color-mix(in srgb, var(--primary) 10%, transparent);
}

:deep(.el-input__wrapper.is-focus) {
  transform: translateY(-1px);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--primary) 56%, #93c5fd 44%) inset,
    0 10px 24px color-mix(in srgb, var(--primary) 20%, transparent);
}

.role-switch {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

:deep(.role-switch .el-radio-button) {
  width: 100%;
}

:deep(.role-switch .el-radio-button__inner) {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--border) 84%, var(--primary) 16%);
  background: color-mix(in srgb, var(--card) 82%, #eff6ff 18%);
  color: color-mix(in srgb, var(--foreground) 78%, #334155 22%);
  font-weight: 600;
  box-shadow: none;
}

:deep(.role-switch .el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 12px 0 0 12px;
}

:deep(.role-switch .el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 12px 12px 0;
}

:deep(.role-switch .el-radio-button.is-active .el-radio-button__inner) {
  border-color: color-mix(in srgb, var(--primary) 60%, #93c5fd 40%);
  color: #f8fbff;
  background: linear-gradient(120deg, color-mix(in srgb, var(--primary) 80%, #5aa9ff 20%), color-mix(in srgb, var(--chart-4) 86%, var(--primary) 14%));
  box-shadow: 0 14px 26px color-mix(in srgb, var(--primary) 28%, transparent);
}

.password-strength {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.strength-bars {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  flex: 1;
  max-width: 172px;
}

.strength-bars span {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 90%, transparent);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.password-strength[data-level='weak'] .strength-bars span.active {
  background: #fb923c;
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.45);
}

.password-strength[data-level='medium'] .strength-bars span.active {
  background: #facc15;
  box-shadow: 0 0 12px rgba(250, 204, 21, 0.4);
}

.password-strength[data-level='good'] .strength-bars span.active {
  background: #38bdf8;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
}

.password-strength[data-level='strong'] .strength-bars span.active {
  background: #34d399;
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.44);
}

.strength-text {
  font-size: 12px;
  color: var(--muted-foreground);
}

.submit-row {
  margin-top: 20px;
  margin-bottom: 2px;
}

.submit-btn {
  width: 100%;
  height: 50px;
  border-radius: 14px;
  border: none;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: linear-gradient(130deg, color-mix(in srgb, var(--primary) 80%, #64b5ff 20%), color-mix(in srgb, var(--chart-4) 85%, var(--primary) 15%));
  box-shadow: 0 16px 30px color-mix(in srgb, var(--primary) 28%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 34px color-mix(in srgb, var(--primary) 32%, transparent);
}

.terms-text {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.52;
  color: var(--muted-foreground);
}

.login-footer {
  margin-top: 18px;
  text-align: center;
  font-size: 14px;
  color: var(--muted-foreground);
}

.link {
  color: color-mix(in srgb, var(--primary) 82%, #1d4ed8 18%);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.link:hover {
  color: var(--foreground);
}

@media (max-width: 1200px) {
  .register-shell {
    grid-template-columns: 1fr;
  }

  .hero-pane {
    min-height: 440px;
  }

  .hero-story-list {
    max-width: 680px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .hero-story-card {
    grid-template-columns: 1fr;
  }

  .form-pane {
    padding: 24px;
  }
}

@media (max-width: 900px) {
  .register-page {
    padding: 0;
  }

  .register-shell {
    border-radius: 0;
    min-height: 100vh;
  }

  .hero-pane {
    min-height: 380px;
    padding: 22px;
  }

  .hero-story-list {
    grid-template-columns: 1fr;
  }

  .logo-text {
    font-size: clamp(30px, 8vw, 40px);
  }
}
</style>
