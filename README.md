# 🛒 Vue 3 + FastAPI 全栈二手交易平台 (前端)

<div align="center">

![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Element Plus](https://img.shields.io/badge/Element%20Plus-409EFF?style=for-the-badge&logo=element-plus&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)

**一个现代化、响应式的二手交易平台前端项目，基于 Vue 3 生态系统构建，无缝对接 FastAPI 后端。**

[在线演示](#) • [功能特性](#-功能特性) • [快速开始](#-快速开始) • [项目结构](#-项目结构)

</div>

---

## 📖 项目简介

这是一个采用 **Vue 3 (Script Setup)** 和 **Vite** 构建的高性能单页应用 (SPA)。项目集成了 **Element Plus** 组件库，实现了用户认证、数据展示、路由拦截等核心功能。设计目标是为 Python FastAPI 后端提供一个美观、易用的管理界面。

## ✨ 核心功能

- **🔐 安全认证体系**
  - 集成 JWT (JSON Web Token) 登录流程
  - Axios 请求拦截器自动注入 Token
  - Vue Router 全局路由守卫，防止未授权访问

- **🎨 现代化 UI 设计**
  - 使用 Element Plus 构建响应式界面
  - 优雅的登录页与数据展示卡片
  - 交互友好的加载状态与错误提示

- **🛠 工程化最佳实践**
  - 基于 Vite 的极速开发体验
  - 模块化的代码结构 (Views, Router, Components)
  - 完善的错误处理与日志输出

## 🧰 技术栈

| 技术 | 说明 | 版本 |
| --- | --- | --- |
| **Vue 3** | 核心框架 (Composition API) | ^3.5.x |
| **Vite** | 下一代前端构建工具 | ^7.x |
| **Element Plus** | 基于 Vue 3 的组件库 | ^2.x |
| **Vue Router 4** | 路由管理 | ^4.x |
| **Axios** | HTTP 客户端 | ^1.x |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/N1rvana-git/Vue-fastapi.git
cd Vue-fastapi
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置后端地址

修改 `src/views/Login.vue` 和 `src/views/Home.vue` 中的 `BASE_URL` 常量：

```javascript
// 修改为你实际的 FastAPI 后端地址
const BASE_URL = 'https://your-backend-service.app.github.dev/'
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173` 即可。

## 📂 项目结构

```
my-frontend/
├── public/              # 静态资源目录
├── src/
│   ├── assets/          # 图片、字体等资源
│   ├── components/      # 公共组件
│   ├── router/          # 路由配置 (Vue Router)
│   ├── views/           # 页面级组件 (Login, Home)
│   ├── App.vue          # 根组件
│   ├── main.js          # 应用入口
│   └── style.css        # 全局样式
├── index.html           # HTML 模板
├── vite.config.js       # Vite 配置文件
└── package.json         # 依赖管理
```

## 🤝 贡献指南

欢迎提交 Pull Request 或 Issue！

1. Fork 本仓库
2. 新建 Feat_xxx 分支
3. 提交代码
4. 新建 Pull Request

## 📄 开源协议

MIT License &copy; 2024 N1rvana-git
