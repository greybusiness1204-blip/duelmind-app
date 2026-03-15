import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/prisma'

export interface AuthRequest extends Request {
  user?: { id: string; role: string; username: string }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No token provided' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string; role: string; username: string
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, username: true, isSuspended: true },
    })
    if (!user) return res.status(401).json({ error: 'User not found' })
    if (user.isSuspended) return res.status(403).json({ error: 'Account suspended' })
    req.user = { id: user.id, role: user.role, username: user.username }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
