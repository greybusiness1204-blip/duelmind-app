import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../config/prisma'

export const authRouter = Router()

// ── Validation schemas ─────────────────────────────────────────────
const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username: only letters, numbers, underscores'),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  language: z.enum(['en', 'az', 'ru']).optional().default('en'),
})

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ── JWT helpers ────────────────────────────────────────────────────
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. ' +
      'Copy backend/.env.example to backend/.env and set your secrets.'
    )
  }
  return secret
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) {
    throw new Error(
      'JWT_REFRESH_SECRET is not set. ' +
      'Copy backend/.env.example to backend/.env and set your secrets.'
    )
  }
  return secret
}

function signTokens(id: string, role: string, username: string) {
  const accessToken = jwt.sign(
    { id, role, username },
    getJwtSecret(),
    { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
  )
  const refreshToken = jwt.sign(
    { id },
    getJwtRefreshSecret(),
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
  )
  return { accessToken, refreshToken }
}

// ── POST /api/auth/register ────────────────────────────────────────
authRouter.post('/register', async (req, res) => {
  try {
    // Validate input
    const parseResult = registerSchema.safeParse(req.body)
    if (!parseResult.success) {
      const msg = parseResult.error.errors[0]?.message || 'Validation failed'
      return res.status(400).json({ error: msg })
    }
    const data = parseResult.data

    // Check duplicate email/username
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    })
    if (existing) {
      const field = existing.email === data.email ? 'Email' : 'Username'
      return res.status(409).json({ error: `${field} already taken` })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10)

    // Create user + profile
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email:    data.email,
        passwordHash,
        profile: {
          create: { displayName: data.username, language: data.language as any },
        },
      },
      include: { profile: true },
    })

    // Init leaderboard rows
    await Promise.all(
      ['GLOBAL', 'TRIVIA', 'REACTION'].map(boardType =>
        prisma.leaderboard.create({ data: { userId: user.id, boardType, score: 0, rank: 0 } })
      )
    )

    const tokens = signTokens(user.id, user.role, user.username)
    const { passwordHash: _pw, ...safeUser } = user
    return res.status(201).json({ user: safeUser, ...tokens })

  } catch (err: any) {
    console.error('[register] error:', err?.message || err)
    if (err?.message?.includes('JWT_SECRET')) {
      return res.status(500).json({ error: err.message })
    }
    return res.status(500).json({ error: 'Registration failed. Check server logs.' })
  }
})

// ── POST /api/auth/login ───────────────────────────────────────────
authRouter.post('/login', async (req, res) => {
  try {
    // 1. Validate request body
    const parseResult = loginSchema.safeParse(req.body)
    if (!parseResult.success) {
      const msg = parseResult.error.errors[0]?.message || 'Invalid request'
      return res.status(400).json({ error: msg })
    }
    const { email, password } = parseResult.data

    // 2. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    })

    // 3. User not found — return 401 (don't reveal which field is wrong)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // 4. Check passwordHash exists (defensive: seed might have failed)
    if (!user.passwordHash) {
      console.error(`[login] user ${email} has no passwordHash — re-run seed`)
      return res.status(401).json({ error: 'Account not properly set up. Contact support.' })
    }

    // 5. Compare password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // 6. Check suspension
    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended' })
    }

    // 7. Sign tokens (may throw if JWT_SECRET not set)
    const tokens = signTokens(user.id, user.role, user.username)

    // 8. Return safe user (no passwordHash)
    const { passwordHash: _pw, ...safeUser } = user
    return res.json({ user: safeUser, ...tokens })

  } catch (err: any) {
    console.error('[login] error:', err?.message || err)
    // Surface actionable errors to the client
    if (err?.message?.includes('JWT_SECRET') || err?.message?.includes('JWT_REFRESH_SECRET')) {
      return res.status(500).json({
        error: 'Server misconfiguration: ' + err.message,
      })
    }
    if (err?.message?.includes('DATABASE_URL') || err?.code === 'P1001' || err?.code === 'P1003') {
      return res.status(500).json({
        error: 'Database connection failed. Is PostgreSQL running? Check DATABASE_URL in .env',
      })
    }
    return res.status(500).json({ error: 'Login failed. Check server logs.' })
  }
})

// ── POST /api/auth/refresh ─────────────────────────────────────────
authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided' })
  }
  try {
    const decoded = jwt.verify(refreshToken, getJwtRefreshSecret()) as { id: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user || user.isSuspended) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }
    return res.json(signTokens(user.id, user.role, user.username))
  } catch (err: any) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' })
    }
    console.error('[refresh] error:', err?.message)
    return res.status(401).json({ error: 'Could not refresh token' })
  }
})
