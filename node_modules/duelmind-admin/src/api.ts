import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('adminToken')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  e => {
    if (e.response?.status === 401) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminRefresh')
      window.location.href = '/login'
    }
    return Promise.reject(e)
  }
)

export default api
