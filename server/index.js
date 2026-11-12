import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import defaultContent from '../src/content.js'
import { registerApplications } from './applications.js'
import { registerStats } from './stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const UPLOAD_DIR = path.join(ROOT, 'uploads')
const DIST_DIR = path.join(ROOT, 'dist')
const PROD = process.env.NODE_ENV === 'production' || process.argv.includes('--prod')
// --port=NNNN on the command line wins (used by npm run dev), then PORT from the environment.
const portArg = process.argv.find((a) => a.startsWith('--port='))
const PORT = Number(portArg?.slice(7)) || Number(process.env.PORT) || 4000
const JWT_SECRET = process.env.JWT_SECRET
const COOKIE = 'jadeer_admin'
const CONTENT_KEY = 'site'

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error('JWT_SECRET is missing or too short. Set it in .env')
  process.exit(1)
}
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const prisma = new PrismaClient()
const app = express()
app.disable('x-powered-by')
// Behind a reverse proxy (Nginx Proxy Manager / Docker): trust its X-Forwarded-* headers so
// rate limits see each visitor's real IP and HTTPS is detected. TRUST_PROXY = number of proxies.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1)
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

// ---------- helpers ----------
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

// Shape used to order list items that have no default example (PostgreSQL JSONB doesn't keep key order).
const ITEM_SHAPES = {
  jobs: { id: '', open: true, applyType: '', applyUrl: '', title: { en: '', ar: '' }, location: { en: '', ar: '' }, type: { en: '', ar: '' }, text: { en: '', ar: '' } },
}
const BI = { en: '', ar: '' }

/**
 * Fill in keys added to the defaults after content was saved (stored values win),
 * and put keys back in the defaults' order so the dashboard shows fields sensibly.
 */
function withDefaults(defaults, stored, key) {
  if (Array.isArray(stored)) {
    const shape = (Array.isArray(defaults) && isObj(defaults[0]) && defaults[0]) || ITEM_SHAPES[key]
    return shape ? stored.map((item) => (isObj(item) ? withDefaults(shape, item) : item)) : stored
  }
  if (!isObj(defaults) || !isObj(stored)) return stored === undefined ? defaults : stored
  // defaults order first (filling missing keys), then any extra stored keys
  const ordered = {}
  for (const k of Object.keys(defaults)) ordered[k] = k in stored ? withDefaults(defaults[k], stored[k], k) : defaults[k]
  for (const [k, v] of Object.entries(stored)) if (!(k in ordered)) ordered[k] = isObj(v) && 'en' in v ? withDefaults(BI, v) : v
  return ordered
}

async function getContent() {
  const row = await prisma.content.findUnique({ where: { key: CONTENT_KEY } })
  return row ? withDefaults(defaultContent, row.data) : defaultContent
}

function requireAuth(req, res, next) {
  try {
    req.admin = jwt.verify(req.cookies[COOKIE] || '', JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Not signed in' })
  }
}

/** True when the request comes from someone signed in to the dashboard. */
function isAdmin(req) {
  try { jwt.verify(req.cookies[COOKIE] || '', JWT_SECRET); return true } catch { return false }
}

// Very small in-memory limiter for login attempts (per IP).
const attempts = new Map()
function loginLimiter(req, res, next) {
  const now = Date.now()
  const a = attempts.get(req.ip) || { n: 0, t: now }
  if (now - a.t > 10 * 60 * 1000) { a.n = 0; a.t = now }
  if (a.n >= 10) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' })
  a.n++
  attempts.set(req.ip, a)
  next()
}

/** Numeric :id from the URL, or -1 (matches nothing) when it is not a positive integer. */
const idParam = (req) => (/^\d{1,9}$/.test(req.params.id) ? Number(req.params.id) : -1)

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// ---------- auth ----------
app.post('/api/auth/login', loginLimiter, wrap(async (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required' })
  const admin = await prisma.admin.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: 'Wrong email or password' })
  }
  attempts.delete(req.ip)
  const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '7d' })
  // Secure cookie only when the visit is over HTTPS (plain http://IP on the office network must still work).
  const https = req.secure || req.get('x-forwarded-proto') === 'https'
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: https, maxAge: 7 * 24 * 3600 * 1000 })
  res.json({ email: admin.email })
}))

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE)
  res.json({ ok: true })
})

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ email: req.admin.email }))

app.post('/api/auth/password', requireAuth, wrap(async (req, res) => {
  const { current, next: newPassword } = req.body || {}
  if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' })
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } })
  if (!admin || !(await bcrypt.compare(String(current || ''), admin.passwordHash))) return res.status(400).json({ error: 'Current password is wrong' })
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } })
  res.json({ ok: true })
}))

// ---------- content ----------
app.get('/api/content', wrap(async (req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.json(await getContent())
}))

app.put('/api/content', requireAuth, wrap(async (req, res) => {
  const data = req.body
  if (!isObj(data)) return res.status(400).json({ error: 'Content must be an object' })
  await prisma.content.upsert({ where: { key: CONTENT_KEY }, create: { key: CONTENT_KEY, data }, update: { data } })
  res.json(await getContent())
}))

app.get('/api/content/defaults', requireAuth, (req, res) => res.json(defaultContent))

// ---------- uploads ----------
// Allowed upload types → the extension the saved file gets (never taken from the user's file name).
const EXT_FOR_TYPE = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
  'image/svg+xml': '.svg', 'image/avif': '.avif', 'video/mp4': '.mp4', 'video/webm': '.webm',
}
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT_FOR_TYPE[file.mimetype]}`),
  }),
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype in EXT_FOR_TYPE
    cb(ok ? null : new Error('Only images (jpg, png, webp, gif, svg, avif) and videos (mp4, webm) are allowed'), ok)
  },
})

app.post('/api/uploads', requireAuth, upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  const rec = await prisma.upload.create({
    data: { filename: req.file.filename, originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size },
  })
  res.json({ ...rec, url: `/uploads/${rec.filename}` })
}))

app.get('/api/uploads', requireAuth, wrap(async (req, res) => {
  const rows = await prisma.upload.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(rows.map((r) => ({ ...r, url: `/uploads/${r.filename}` })))
}))

// Files that ship with the site (public/ in dev, dist/ in production) so they can be re-picked.
const MEDIA_EXT = /\.(jpe?g|png|webp|gif|svg|avif|mp4|webm)$/i
app.get('/api/media/builtin', requireAuth, (req, res) => {
  const dir = fs.existsSync(path.join(ROOT, 'public')) ? path.join(ROOT, 'public') : DIST_DIR
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => MEDIA_EXT.test(f)) : []
  res.json(files.map((f) => ({ url: '/' + f, originalName: f })))
})

app.delete('/api/uploads/:id', requireAuth, wrap(async (req, res) => {
  const rec = await prisma.upload.delete({ where: { id: idParam(req) } }).catch(() => null)
  if (!rec) return res.status(404).json({ error: 'Not found' })
  fs.rm(path.join(UPLOAD_DIR, rec.filename), { force: true }, () => {})
  res.json({ ok: true })
}))

// Uploaded files never run scripts (e.g. an SVG opened directly in the browser).
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '30d',
  setHeaders: (res) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox")
    res.setHeader('X-Content-Type-Options', 'nosniff')
  },
}))

// ---------- job applications ----------
registerApplications(app, { prisma, requireAuth, wrap, getContent, root: ROOT })

// ---------- visitor statistics ----------
registerStats(app, { prisma, requireAuth, wrap, isAdmin })

// ---------- production: serve the built site ----------
if (PROD && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false }))
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')))
}

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || /allowed|CV must be/.test(err.message)) return res.status(400).json({ error: err.message })
  // Client mistakes reported by Express itself (e.g. malformed JSON, body too large).
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.type === 'entity.parse.failed' ? 'Invalid data' : err.message })
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

const server = app.listen(PORT, () => console.log(`Jadeer API on http://localhost:${PORT}`))

// Stop cleanly on `docker stop` / restarts (Node as PID 1 ignores these signals otherwise).
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(() => prisma.$disconnect().finally(() => process.exit(0)))
    setTimeout(() => process.exit(0), 8000).unref()
  })
}
