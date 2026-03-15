import { Router } from 'express'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { prisma } from '../config/prisma'

export const profileRouter = Router()
profileRouter.use(authenticate)

profileRouter.get('/me', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { profile: true },
  })
  if (!user) return res.status(404).json({ error: 'Not found' })
  const { passwordHash: _pw, ...safe } = user
  res.json(safe)
})

profileRouter.get('/:username', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    include: { profile: true },
  })
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json({ id: user.id, username: user.username, profile: user.profile })
})

profileRouter.patch('/me', async (req: AuthRequest, res) => {
  const schema = z.object({
    displayName: z.string().min(1).max(30).optional(),
    bio: z.string().max(200).optional(),
    language: z.enum(['en', 'az', 'ru']).optional(),
  })
  try {
    const data = schema.parse(req.body)
    const profile = await prisma.profile.update({
      where: { userId: req.user!.id },
      data,
    })
    res.json(profile)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: 'Update failed' })
  }
})
