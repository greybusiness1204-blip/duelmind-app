import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import path from 'path'
import fs from 'fs'

// ── Validate required env vars at startup ──────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const
const missing = REQUIRED_ENV.filter(k => !process.env[k])
if (missing.length > 0) {
  console.error('\n❌ Missing required environment variables:')
  missing.forEach(k => console.error(`   ${k}`))
  console.error('\n👉 Fix: cd backend && cp .env.example .env\n')
  process.exit(1)
}

import { authRouter } from './routes/auth'
import { profileRouter } from './routes/profile'
import { duelRouter } from './routes/duels'
import { questionsRouter } from './routes/questions'
import { gamesRouter } from './routes/games'
import { leaderboardRouter } from './routes/leaderboard'
import { adminQuestionsRouter } from './routes/admin/questions'
import { adminCategoriesRouter } from './routes/admin/categories'
import { adminUsersRouter } from './routes/admin/users'
import { adminGamesRouter } from './routes/admin/games'
import { adminAnalyticsRouter } from './routes/admin/analytics'
import { setupDuelSocket } from './websocket/duelRoom'
import { errorHandler } from './middleware/errorHandler'
import { rateLimiter } from './middleware/rateLimit'

const app = express()
const httpServer = createServer(app)

// ── Socket.IO ──────────────────────────────────────────────────
export const io = new SocketServer(httpServer, {
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
setupDuelSocket(io)

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Ensure uploads dir exists
const uploadDir = process.env.UPLOAD_DIR || './uploads'
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
app.use('/uploads', express.static(path.resolve(uploadDir)))

// ── Rate limiting ──────────────────────────────────────────────
app.use('/api/auth', rateLimiter(30, 15))  // 30 req per 15 min
app.use('/api',      rateLimiter(500, 1))  // 500 req per minute

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',             authRouter)
app.use('/api/profile',          profileRouter)
app.use('/api/duels',            duelRouter)
app.use('/api/questions',        questionsRouter)
app.use('/api/games',            gamesRouter)
app.use('/api/leaderboard',      leaderboardRouter)
app.use('/api/admin/questions',  adminQuestionsRouter)
app.use('/api/admin/categories', adminCategoriesRouter)
app.use('/api/admin/users',      adminUsersRouter)
app.use('/api/admin/games',      adminGamesRouter)
app.use('/api/admin/analytics',  adminAnalyticsRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))
app.use(errorHandler)

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000')
httpServer.listen(PORT, () => {
  console.log(`🚀 DuelMind API  →  http://localhost:${PORT}`)
})
