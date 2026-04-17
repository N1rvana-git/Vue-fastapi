# ARTEFACT — 次世代全栈二手交易平台

简体中文说明版 · Vue 3 + Vite 前端（配合 FastAPI 后端）

项目特点：高审美视觉 + GSAP 动画叙事 + AI 管家（流式 SSE）+ 实时交易大厅

---

## 快速概览

- 前端：Vue 3（`<script setup>`） + Vite + Element Plus
- 动画：GSAP (ScrollTrigger) + Lenis 平滑滚动 + Canvas 粒子
- 通信：Axios（REST）+ Fetch 流式（AI SSE）+ WebSocket（交易大厅）
- 后端：FastAPI（REST + WebSocket + 流式 AI 接口）

---

## 快速启动

1. 克隆仓库

```bash
git clone https://github.com/N1rvana-git/Vue-fastapi.git
cd Vue-fastapi
```

2. 安装依赖

```bash
npm install
```

3. 配置后端地址（非常重要）

编辑根目录 `.env`，设置 `VITE_API_BASE_URL`，**不要带尾部斜杠**：

```env
VITE_API_BASE_URL=https://your-backend.example.com
```

前端会自动把该值标准化为 `apiBase = (VITE_API_BASE_URL).replace(/\/+$/, '')` 并在内部拼接路径，能够避免 `...app.github.devitems...` 这类缺斜杠导致的错误。

如果在 GitHub Codespaces 中运行后端，请确保后端端口（通常是 8000）在 Codespaces 的 Ports 面板中设置为 `Public`，否则代理层可能在到达后端前返回 `401`。

4. 启动开发服务

```bash
npm run dev       # 本地开发 (默认 http://localhost:5173)
npm run build     # 生产构建
npm run preview   # 预览构建结果
```

---

## 重要实现细节（注意阅读）

- AI 流式（打字机效果）：前端在 `src/views/Home.vue` 中使用原生 `fetch` + `ReadableStream` 逐块读取后端 SSE/流式响应，逐步拼接 `msg.content` 并可插入 `specialType === 'price_card'` 的卡片。

- AI 接口示例路径（前端会使用 `apiBase + '/items/ai/agent'`）：请确保后端路由与此匹配，且允许 CORS/流式传输。

- 登录：`Login.vue` 使用 `application/x-www-form-urlencoded` 向 `/token` 发起请求；需要注意登录请求**不带旧的 Bearer token**（本仓库的 `src/utils/axios.js` 已在请求拦截器中处理此逻辑），以避免后端误判。

- Axios 拦截器：
  - 请求拦截器：非 `/token` 请求会自动注入 `Authorization: Bearer <token>`（仅当 token 存在）。
  - 响应拦截器：对非登录请求的 `401/403` 会触发全局登出与跳转；登录接口的 `401` 将由 `Login.vue` 单独处理并显示友好提示。

- 防止伪 401：前端已统一为“仅在 token 存在时注入 Authorization”，避免发送 `Authorization: Bearer null` 或 `undefined` 导致的误判。

---

## 测试 AI 流式（手动验证）

1. 启动后端与前端，登录一个有效账号。若在 Codespaces 中，请确保端口公开。
2. 打开右下角 AI 管家，输入：`我要买索尼相机，帮我全网比价！`
3. 观察：文字应逐字流式弹出，若后端返回 `specialType:'price_card'`，会自动插入一张比价卡片。

---

## 常见问题与排查提示

- 错误域名像 `...app.github.devitems...`：通常是 base URL 拼接出错，请确认 `.env` 的 `VITE_API_BASE_URL` 不带尾斜杠，且前端使用 `apiBase+'/items/...'` 拼接。
- 频繁 401：先确认 token 是否正确（登录成功后 `localStorage`/`sessionStorage` 中应有 `access_token`），并确认 Codespaces 后端端口可见性为 Public。

---

## 贡献

欢迎提交 PR 或 Issue。简单流程：Fork → 新分支 → 提交 → 发起 PR。

---

_更新记录_: 本次 README 同步了关于前端 AI 流式、Axios 登录处理与 Codespaces 调试的要点（也已提交到 `main`）。
<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=32&pause=1000&color=4F46E5&center=true&vCenter=true&width=820&lines=✦+ARTEFACT+—+次世代全栈二手交易平台;Awwwards+级视觉+·+GSAP+动效+·+AI+驱动;Lenis+丝滑滚动+·+ScrollTrigger+叙事+·+毛玻璃" alt="Typing SVG" />

<br/>

[![Vue 3](https://img.shields.io/badge/Vue_3-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)](https://vuejs.org/)
[![Vite 7](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=white)](https://gsap.com/)
[![Lenis](https://img.shields.io/badge/Lenis-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48L3N2Zz4=&logoColor=white)](https://lenis.darkroom.engineering/)
[![Element Plus](https://img.shields.io/badge/Element_Plus-409EFF?style=for-the-badge&logo=element&logoColor=white)](https://element-plus.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

<br/>

![](https://komarev.com/ghpvc/?username=N1rvana-git-Vue-fastapi&color=6366f1)
![](https://img.shields.io/github/last-commit/N1rvana-git/Vue-fastapi?style=flat-square&color=4F46E5)
![](https://img.shields.io/badge/UI_Theme-Warm_Light-F3F1ED?style=flat-square)

**不只是买卖——这是一个拥有 Awwwards 级视觉叙事、AI 管家陪伴的二手交易体验。**

[✦ 功能特性](#-功能矩阵) · [🏗 技术架构](#-技术架构) · [🚀 快速启动](#-快速启动) · [🎨 设计哲学](#-设计哲学)

</div>

---

## ✦ 功能矩阵

<table>
<tr>
<td width="50%">

### 🎭 沉浸式视觉引擎
- **Splash 开机动画** — GSAP Timeline 编排的品牌启动序列
- **Lerp 磁性光标** — `requestAnimationFrame` 驱动的物理插值追踪光效
- **Ambient Orbs** — 5 组浮动渐变光球，营造空间纵深
- **ScrollTrigger 卡片入场** — 滚动驱动式商品渐入动效
- **Lenis 平滑滚动** — 指数缓动曲线，与 GSAP ticker 深度联动

</td>
<td width="50%">

### 🤖 AI 管家「闲小宝」
- **上下文记忆对话** — 完整的对话历史存储与恢复
- **智能时间戳** — 超过 5 分钟自动显示时间分隔线
- **沉浸气泡 UI** — 毛玻璃面板 + 用户/AI 双向气泡
- **记忆管理** — 一键清空对话历史，重建对话

</td>
</tr>
<tr>
<td>

### 💬 实时交易大厅
- **WebSocket 双通道** — 全局聊天 + 交易播报双连接
- **静默后台监听** — 面板关闭时消息计数红点 + 推送通知
- **交易播报** — 每笔真实成交自动全局广播

</td>
<td>

### 🛍 商品交易核心
- **CRUD 全流程** — 发布 / 编辑 / 删除 / 抢购
- **图片上传** — 拖拽上传商品实物图
- **智能筛选** — 全部 / 出售 / 求购 三档 + 搜索
- **标签管理** — 前台实时增加 / 删除标签
- **个人看板** — 发布统计、订单时间线、在售追踪

</td>
</tr>
</table>

---

## 🏗 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    ARTEFACT Frontend                 │
│                                                     │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Vue 3   │  │ Vite 7   │  │ Element Plus       │  │
│  │ SFC     │──│ HMR/Build│──│ Dialog/Drawer/Page │  │
│  └────┬────┘  └──────────┘  └────────────────────┘  │
│       │                                             │
│  ┌────┴──────────────────────────────────────────┐  │
│  │              Animation Layer                   │  │
│  │  GSAP 3  ·  ScrollTrigger  ·  Lenis          │  │
│  │  Timeline Choreography  ·  Lerp rAF Cursor   │  │
│  └───────────────────────────────────────────────┘  │
│       │                                             │
│  ┌────┴──────────────────────────────────────────┐  │
│  │              Visual Layer                      │  │
│  │  Glassmorphism (backdrop-filter: blur)         │  │
│  │  GPU-only anims (transform + opacity)          │  │
│  │  will-change compositing · translate3d layers  │  │
│  │  CSS clamp() responsive typography             │  │
│  └───────────────────────────────────────────────┘  │
│       │                                             │
│  ┌────┴──────────────────────────────────────────┐  │
│  │              Communication Layer               │  │
│  │  Axios (REST)  ·  WebSocket (Chat + Broadcast)│  │
│  │  JWT Auth  ·  AI Agent Context Memory         │  │
│  └───────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS / WSS
               ┌────────┴────────┐
               │   FastAPI 后端   │
               │  REST + WS + AI │
               └─────────────────┘
```

### 核心依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `vue` | 3.5 | 响应式 UI 框架 (Composition API + `<script setup>`) |
| `vite` | 7.3 | 极速构建 + HMR |
| `gsap` | 3.14 | 动画引擎 — Timeline / ScrollTrigger |
| `lenis` | 1.3 | 平滑滚动引擎，与 GSAP ticker 联动 |
| `element-plus` | 2.13 | UI 组件库 (Dialog, Drawer, Pagination, Upload) |
| `axios` | 1.13 | HTTP 客户端 + JWT 拦截器 |
| `vue-router` | 4.6 | 路由守卫 + 认证保护 |

---

## 🎨 设计哲学

> *"底还是不要黑的好一点，毕竟是卖商品的网站。"*

本项目的视觉系统以三大 Awwwards 级站点为灵感基线，经过技术拆解后落地：

### 色彩体系 — 暖光·高定商业

| 层级 | 色值 | 语义 |
|------|------|------|
| 背景 | `#FAFAF8 → #F3F1ED` | 暖象牙渐变，温润不刺眼 |
| 文字 | `#1A1A2E` | 深墨蓝，高对比可读性 |
| 主强调 | `#4F46E5 → #7C3AED` | 靛蓝→紫罗兰渐变，品牌识别 |
| 卡片 | `rgba(255,255,255,0.75)` | 白底毛玻璃悬浮 |

### 动效原则

- **仅 `transform` + `opacity`** — 避免触发 Layout/Paint，保持 60fps
- **`will-change` 合成层提升** — 卡片、光标、FAB 独立 GPU 层
- **Lerp 物理插值** — 光标追踪 `factor: 0.1`，替代 CSS transition
- **ScrollTrigger 叙事** — 商品卡随滚动渐入，而非一次性加载

---

## 🚀 快速启动

### 1. 克隆

```bash
git clone https://github.com/N1rvana-git/Vue-fastapi.git
cd Vue-fastapi
```

### 2. 安装

```bash
npm install
```

### 3. 配置后端地址

编辑 `src/views/Login.vue` 和 `src/views/Home.vue` 中的 `BASE_URL`：

```javascript
const BASE_URL = 'https://your-codespace-8000.app.github.dev/'
```

### 4. 启动

```bash
npm run dev          # 开发模式 → http://localhost:5173
npm run build        # 生产构建
npm run preview      # 预览生产包
```

---

## 📂 项目结构

```text
my-frontend/
├── src/
│   ├── views/
│   │   ├── Home.vue      # 核心页面 — 全部交互、动效、AI、聊天
│   │   └── Login.vue     # JWT 认证入口
│   ├── router/
│   │   └── index.js      # 路由守卫 (未登录重定向)
│   ├── components/       # 公共组件
│   ├── App.vue           # 根节点
│   ├── main.js           # 入口 + Axios 拦截器
│   └── style.css         # 全局基础样式
├── package.json
└── vite.config.js
```

---

## 🤝 参与共建

想让「闲小宝」更聪明？想加入 Three.js 3D 粒子背景？欢迎 PR。

1. Fork → 新建分支 → 提交代码 → 发起 Pull Request

## 📄 License

[MIT](LICENSE) — 随意魔改，注明出处即可。
