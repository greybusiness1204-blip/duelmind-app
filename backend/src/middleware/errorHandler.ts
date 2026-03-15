import rateLimit from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express'

export const rateLimiter = (max: number, windowMinutes: number) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
  })

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message)
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { message: err.message }),
  })
}
