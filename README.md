<div align="center">

<!-- 动态打字机效果 Banner -->
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=30&pause=1000&color=409EFF&center=true&vCenter=true&width=800&lines=🚀+Vue+3+%2B+FastAPI+全栈二手交易平台;🤖+内置全局+AI+智能管家「闲小宝」;🌐+支持无缝+WebSocket+实时交易大厅;💎+基于+Element+Plus+的像素级+UI+体验" alt="Typing SVG" />

<br/>

<!-- 动态状态徽章 -->
[![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-409EFF?style=for-the-badge&logo=element-plus&logoColor=white)](https://element-plus.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

<br/>

<!-- 访客统计徽章与状态 -->
![](https://komarev.com/ghpvc/?username=N1rvana-git-Vue-fastapi&color=blue)
![](https://img.shields.io/github/last-commit/N1rvana-git/Vue-fastapi?style=flat-square&color=orange)

**一个不仅能买卖，还能「陪你聊天」的次世代二手交易平台。**

[✨ 在线演示](#) • [🚀 快速开始](#-快速开始) • [📚 功能特性](#-功能特性) • [🛠 项目结构](#-项目结构)

</div>

---

## 🌟 全新高光特性 (v2.0)

本项目在常规的 CRUD 基础上，深度集成了以下 **突破性功能**：

- **🤖 AI 智能管家「闲小宝」** 
  - 左下角优雅悬浮，基于上下文记忆，随时回答商品问题。
  - 拥有*微信级动态时间戳*与沉浸式聊天气泡 UI。
- **💬 全局 WebSocket 实时大厅** 
  - 右下角实时弹出的极客聊天室。
  - 支持**静默后台监听**，来消息时自动红点提示 + 优雅的全屏推送通知。

## ✨ 核心基础功能

- **🔐 安全认证体系**
  - 集成 JWT (JSON Web Token) 登录流程
  - Axios 请求拦截器自动注入 Token，无感接力
- **🎨 现代化 UI 设计**
  - 采用 Element Plus 构建的响应式卡片网格
  - 顺滑的动画过渡（Vue Transition 魔法）
- **🛠 工程化最佳实践**
  - Vite 极速热更新，模块化的组件拆分

## 💻 界面预览

> 💡 **提示**: 右下角具有悬浮的全局模块：左边是 🤖 `AI管家`，右边是 💬 `实时大厅`。

*(建议将你运行后的美丽截图放在这里，替换本行)*

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/N1rvana-git/Vue-fastapi.git
cd Vue-fastapi
```

### 2. 安装依赖 (极速)

```bash
npm install
```

### 3. 配置后端跨域链接 🔗

打开 `src/views/Login.vue` 和 `src/views/Home.vue`，将其中的 `BASE_URL` 改为你运行的 FastAPI 后端地址：

```javascript
// 示例 (记得末尾带 / )
const BASE_URL = 'https://你的codespaces前缀-8000.app.github.dev/'
```

### 4. 驱动未来 (启动)

```bash
npm run dev
```

打开终端里的 `http://localhost:5173` 即可开启体验之旅。

---

## 📂 优雅的架构

```text
my-frontend/
├── src/
│   ├── components/      # 被精心打磨的公共零件
│   ├── router/          # 路由配置: 守护着没登录的游客
│   ├── views/           
│   │   ├── Login.vue    # 入口大门
│   │   └── Home.vue     # 核心宇宙 (包含所有悬浮AI与大厅)
│   ├── App.vue          # 根节点
│   └── main.js          # Vue3 启动核心，拦截器发源地
```

## 🤝 参与共建

想让「闲小宝」变得更聪明吗？欢迎提交 PR！

1. Fork 本仓库
2. 新建你的 Feature 分支
3. 提交你的 Magic 代码
4. 发起 Pull Request

## 📄 开源许可证

本项目基于 [MIT](LICENSE) 协议开源。欢迎随意魔改！
