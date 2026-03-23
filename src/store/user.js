import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('access_token') || '',
    isLoggedIn: !!localStorage.getItem('access_token'),
    role: localStorage.getItem('user_role') || '',
    email: localStorage.getItem('user_email') || ''
  }),
  actions: {
    handleLoginSuccess(tokenData) {
      this.token = tokenData
      this.isLoggedIn = true
      localStorage.setItem('access_token', tokenData)
      
      try {
        const decoded = jwtDecode(tokenData)
        this.email = decoded.sub || ''
        this.role = decoded.role || 'user' // default to user if not specified backend
        localStorage.setItem('user_role', this.role)
        localStorage.setItem('user_email', this.email)
      } catch (err) {
        console.error('Failed to decode token', err)
      }
    },
    logout() {
      this.token = ''
      this.isLoggedIn = false
      this.role = ''
      this.email = ''
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_role')
      localStorage.removeItem('user_email')
    }
  }
})