// Job applications: public submit from the Careers page, admin inbox in the dashboard.
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import multer from 'multer'

/** Numeric :id from the URL, or -1 (matches nothing) when it is not a positive integer. */
const idParam = (req) => (/^\d{1,9}$/.test(req.params.id) ? Number(req.params.id) : -1)

export const STATUSES = ['new', 'reviewed', 'shortlisted', 'rejected']
const CV_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const CV_EXT = /\.(pdf|doc|docx)$/i

export function registerApplications(app, { prisma, requireAuth, wrap, getContent, root }) {
  const CV_DIR = path.join(root, 'private-uploads', 'cv') // never served publicly
  fs.mkdirSync(CV_DIR, { recursive: true })

  const upload = multer({
    storage: multer.diskStorage({
      destination: CV_DIR,
      filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 12 },
    fileFilter: (req, file, cb) => {
      const ok = CV_TYPES.has(file.mimetype) && CV_EXT.test(file.originalname)
      cb(ok ? null : new Error('CV must be a PDF or Word file (allowed: .pdf .doc .docx)'), ok)
    },
  })

  // Max 5 applications per IP per 30 minutes.
  const hits = new Map()
  const limiter = (req, res, next) => {
    const now = Date.now()
    const h = (hits.get(req.ip) || []).filter((t) => now - t < 30 * 60 * 1000)
    if (h.length >= 5) return res.status(429).json({ error: 'Too many applications. Please try again later.' })
    h.push(now)
    hits.set(req.ip, h)
    next()
  }

  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const removeFile = (f) => f && fs.rm(path.join(CV_DIR, path.basename(f)), { force: true }, () => {})

  app.post('/api/applications', limiter, upload.single('cv'), wrap(async (req, res) => {
    const b = req.body || {}
    const fail = (status, error) => { removeFile(req.file?.filename); res.status(status).json({ error }) }

    if (str(b.website, 200)) return fail(400, 'Rejected') // honeypot field, invisible to people
    const name = str(b.name, 120)
    const email = str(b.email, 200)
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'Please enter your name and a valid email.')

    // A job id must point to an open job that accepts on-site applications. No id = general CV.
    const jobId = str(b.jobId, 64) || null
    let jobTitle = 'General application'
    if (jobId) {
      const { careers } = await getContent()
      const job = (careers?.jobs || []).find((j) => j.id === jobId)
      if (!job || job.open === false || String(job.applyUrl || '').trim()) // jobs with an external link apply there return fail(400, 'This position is not accepting applications here.')
      jobTitle = job.title?.en || job.title?.ar || 'Untitled position'
    }

    const rec = await prisma.application.create({
      data: {
        jobId, jobTitle, name, email,
        phone: str(b.phone, 40),
        message: str(b.message, 4000),
        cvFile: req.file?.filename || null,
        cvName: req.file ? str(req.file.originalname, 200) : null,
      },
    })
    res.json({ ok: true, id: rec.id })
  }))

  app.get('/api/applications', requireAuth, wrap(async (req, res) => {
    res.json(await prisma.application.findMany({ orderBy: { createdAt: 'desc' } }))
  }))

  app.patch('/api/applications/:id', requireAuth, wrap(async (req, res) => {
    const status = req.body?.status
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status' })
    const rec = await prisma.application.update({ where: { id: idParam(req) }, data: { status } }).catch(() => null)
    if (!rec) return res.status(404).json({ error: 'Not found' })
    res.json(rec)
  }))

  app.delete('/api/applications/:id', requireAuth, wrap(async (req, res) => {
    const rec = await prisma.application.delete({ where: { id: idParam(req) } }).catch(() => null)
    if (!rec) return res.status(404).json({ error: 'Not found' })
    removeFile(rec.cvFile)
    res.json({ ok: true })
  }))

  app.get('/api/applications/:id/cv', requireAuth, wrap(async (req, res) => {
    const rec = await prisma.application.findUnique({ where: { id: idParam(req) } })
    if (!rec?.cvFile) return res.status(404).json({ error: 'No CV' })
    const file = path.join(CV_DIR, path.basename(rec.cvFile))
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'File missing' })
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.download(file, rec.cvName || path.basename(file))
  }))
}
