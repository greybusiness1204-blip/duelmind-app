import { Router } from 'express'
import multer from 'multer'
import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import fs from 'fs'
import { authenticate, requireAdmin, AuthRequest } from '../../middleware/auth'
import { prisma } from '../../config/prisma'

export const adminQuestionsRouter = Router()
adminQuestionsRouter.use(authenticate, requireAdmin)

const upload = multer({
  dest: process.env.UPLOAD_DIR || './uploads',
  limits: { fileSize: 5 * 1024 * 1024 },
})

async function log(adminId: string, action: string, entity: string, entityId?: string | null, payload?: any) {
  await prisma.adminLog.create({
    data: { adminId, action, entity, entityId: entityId ?? undefined, payload: payload || {} },
  })
}

// GET /api/admin/questions
adminQuestionsRouter.get('/', async (req, res) => {
  const { page = '1', limit = '20', categoryId, difficulty, language, search, active } = req.query
  const skip  = (parseInt(page as string) - 1) * parseInt(limit as string)
  const where: any = {}
  if (categoryId) where.categoryId = categoryId
  if (difficulty)  where.difficulty  = difficulty
  if (language)    where.language    = language
  if (active !== undefined) where.isActive = active === 'true'
  if (search) where.questionText = { contains: search as string, mode: 'insensitive' }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.question.count({ where }),
  ])
  res.json({ questions, total, page: parseInt(page as string), pages: Math.ceil(total / parseInt(limit as string)) })
})

const qSchema = z.object({
  categoryId:    z.string().uuid(),
  language:      z.enum(['en', 'az', 'ru']),
  difficulty:    z.enum(['EASY', 'MEDIUM', 'HARD']),
  questionText:  z.string().min(5),
  answerOptions: z.array(z.object({ key: z.string(), text: z.string().min(1) })).length(4),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation:   z.string().optional(),
  imageUrl:      z.string().url().optional().or(z.literal('')),
  familyId:      z.string().optional(),
})

// POST /api/admin/questions
adminQuestionsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const data = qSchema.parse(req.body)
    const question = await prisma.question.create({
      data: {
        categoryId:    data.categoryId,
        language:      data.language as any,
        difficulty:    data.difficulty as any,
        questionText:  data.questionText,
        answerOptions: data.answerOptions,  // flat array stored as-is
        correctAnswer: data.correctAnswer,
        explanation:   data.explanation || null,
        imageUrl:      data.imageUrl || null,
        familyId:      data.familyId || null,
      },
      include: { category: true },
    })
    await log(req.user!.id, 'CREATE_QUESTION', 'question', question.id)
    res.status(201).json(question)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0]?.message })
    res.status(500).json({ error: 'Failed to create question' })
  }
})

// PUT /api/admin/questions/:id
adminQuestionsRouter.put('/:id', async (req: AuthRequest, res) => {
  try {
    const body = { ...req.body }
    // Normalise answerOptions: accept flat array or nested {options:[]} format
    if (body.answerOptions && !Array.isArray(body.answerOptions)) {
      body.answerOptions = body.answerOptions.options ?? []
    }
    const question = await prisma.question.update({
      where: { id: req.params.id },
      data: body,
      include: { category: true },
    })
    await log(req.user!.id, 'UPDATE_QUESTION', 'question', question.id)
    res.json(question)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Update failed' })
  }
})

// DELETE /api/admin/questions/:id
adminQuestionsRouter.delete('/:id', async (req: AuthRequest, res) => {
  await prisma.question.delete({ where: { id: req.params.id } })
  await log(req.user!.id, 'DELETE_QUESTION', 'question', req.params.id)
  res.json({ success: true })
})

// PATCH /api/admin/questions/:id/toggle
adminQuestionsRouter.patch('/:id/toggle', async (req: AuthRequest, res) => {
  const q = await prisma.question.findUnique({ where: { id: req.params.id } })
  if (!q) return res.status(404).json({ error: 'Not found' })
  const updated = await prisma.question.update({
    where: { id: req.params.id },
    data: { isActive: !q.isActive },
  })
  res.json(updated)
})

// GET /api/admin/questions/export
adminQuestionsRouter.get('/export', async (_req, res) => {
  const questions = await prisma.question.findMany({ include: { category: true } })
  const header = 'question_text,option_a,option_b,option_c,option_d,correct_option,category,difficulty,language,explanation,image_url,question_family_id\n'
  const rows = questions.map(q => {
    const opts: any[] = Array.isArray(q.answerOptions) ? (q.answerOptions as any) : ((q.answerOptions as any)?.options ?? [])
    const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    return [
      cell(q.questionText),
      cell(opts.find((o: any) => o.key === 'A')?.text ?? ''),
      cell(opts.find((o: any) => o.key === 'B')?.text ?? ''),
      cell(opts.find((o: any) => o.key === 'C')?.text ?? ''),
      cell(opts.find((o: any) => o.key === 'D')?.text ?? ''),
      cell(q.correctAnswer),
      cell(q.category.slug),
      cell(q.difficulty),
      cell(q.language),
      cell(q.explanation ?? ''),
      cell(q.imageUrl ?? ''),
      cell(q.familyId ?? ''),
    ].join(',')
  })
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="questions.csv"')
  res.send(header + rows.join('\n'))
})

// POST /api/admin/questions/import
adminQuestionsRouter.post('/import', upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  try {
    const csv = fs.readFileSync(req.file.path, 'utf-8')
    const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true })

    let imported = 0, skipped = 0
    const errors: string[] = []

    for (let i = 0; i < records.length; i++) {
      const row = records[i]
      const rowNum = i + 2
      try {
        const cat = await prisma.category.findFirst({ where: { slug: row.category } })
        if (!cat) { errors.push(`Row ${rowNum}: unknown category "${row.category}"`); skipped++; continue }

        const correct = (row.correct_option ?? '').toUpperCase()
        if (!['A', 'B', 'C', 'D'].includes(correct)) {
          errors.push(`Row ${rowNum}: invalid correct_option "${row.correct_option}"`); skipped++; continue
        }
        if (!row.question_text?.trim()) {
          errors.push(`Row ${rowNum}: question_text is empty`); skipped++; continue
        }

        await prisma.question.create({
          data: {
            categoryId:    cat.id,
            language:      (['en','az','ru'].includes(row.language) ? row.language : 'en') as any,
            difficulty:    (['EASY','MEDIUM','HARD'].includes(row.difficulty?.toUpperCase()) ? row.difficulty.toUpperCase() : 'MEDIUM') as any,
            questionText:  row.question_text,
            answerOptions: [
              { key: 'A', text: row.option_a ?? '' },
              { key: 'B', text: row.option_b ?? '' },
              { key: 'C', text: row.option_c ?? '' },
              { key: 'D', text: row.option_d ?? '' },
            ],
            correctAnswer: correct,
            explanation:   row.explanation || null,
            imageUrl:      row.image_url || null,
            familyId:      row.question_family_id || null,
          },
        })
        imported++
      } catch (e) {
        errors.push(`Row ${rowNum}: ${(e as Error).message}`)
        skipped++
      }
    }

    fs.unlinkSync(req.file.path)
    await log(req.user!.id, 'CSV_IMPORT', 'question', null, { imported, skipped })
    res.json({ imported, skipped, errors: errors.slice(0, 20) })
  } catch (e) {
    res.status(500).json({ error: 'CSV import failed' })
  }
})
