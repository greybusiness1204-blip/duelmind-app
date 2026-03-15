import axios from 'axios'

const api = axios.create({ baseURL: '/api', withCredentials: true })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing = false
let queue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = []

function processQueue(err: any, token?: string) {
  queue.forEach(p => err ? p.reject(err) : p.resolve(token!))
  queue = []
}

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then(token => {
          orig.headers.Authorization = `Bearer ${token}`
          return api(orig)
        })
      }
      orig._retry = true
      refreshing = true
      const refresh = localStorage.getItem('refreshToken')
      if (!refresh) {
        refreshing = false
        localStorage.clear()
        window.location.href = '/auth'
        return Promise.reject(err)
      }
      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken: refresh })
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        processQueue(null, data.accessToken)
        orig.headers.Authorization = `Bearer ${data.accessToken}`
        return api(orig)
      } catch (e) {
        processQueue(e)
        localStorage.clear()
        window.location.href = '/auth'
        return Promise.reject(e)
      } finally {
        refreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api
