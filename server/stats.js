// Visitor statistics without cookies.
//   POST /api/track  — the public site reports each page it shows
//   GET  /api/stats  — numbers for the dashboard (admin only)
//
// Privacy: no IP address and no cookie is stored. A visitor is identified by
// sha256(daily random salt + IP + browser), and the salt is deleted after a day,
// so each person counts once per day and can't be recognised on later days.
import crypto from 'node:crypto'
import { Prisma } from '@prisma/client'

export const PAGES = { '/': 'Home', '/careers': 'Careers', '/contact': 'Contact' }
const TZ = process.env.STATS_TZ || 'Africa/Tripoli'
const KEEP_DAYS = Number(process.env.STATS_KEEP_DAYS) || 730 // older visits are removed

const BOT = /bot|crawl|spider|slurp|archiver|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|python|curl|wget|httpclient|java\/|go-http|axios|node-fetch|okhttp|scrapy|phantom|selenium|puppeteer|playwright/i
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
export const dayOf = (d = new Date()) => dayFmt.format(d)
const addDays = (day, n) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function deviceOf(ua) {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|iPod|Android|Opera Mini|IEMobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

const SOURCES = [
  [/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/(^|\.)yahoo\./, 'Yahoo'], [/duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'], [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'], [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X (Twitter)'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp'], [/(^|\.)(t\.me|telegram\.org)$/, 'Telegram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'], [/(^|\.)tiktok\.com$/, 'TikTok'], [/(^|\.)snapchat\.com$/, 'Snapchat'],
]

/** "Direct", a known network name, or the referring site's host name. */
function sourceOf(ref, ownHost) {
  if (typeof ref !== 'string' || !ref.trim()) return 'Direct'
  ref = ref.trim().slice(0, 300)
  if (ref.startsWith('utm:')) { // ?utm_source=… on the link people clicked
    const v = ref.slice(4).replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 40).toLowerCase()
    if (!v) return 'Direct'
    for (const [re, name] of SOURCES) if (re.test(v) || re.test(`${v}.com`)) return name
    return v.charAt(0).toUpperCase() + v.slice(1)
  }
  let host
  try { host = new URL(ref).hostname.toLowerCase().replace(/^www\.|^m\.|^l\.|^lm\./, '') } catch { return 'Direct' }
  if (!host || host === ownHost?.replace(/^www\./, '')) return 'Direct'
  for (const [re, name] of SOURCES) if (re.test(host)) return name
  return host.slice(0, 60)
}

export function registerStats(app, { prisma, requireAuth, wrap, isAdmin }) {
  // ---- daily salt ----
  let salt = { day: '', value: '' }
  async function saltFor(day) {
    if (salt.day === day) return salt.value
    const value = crypto.randomBytes(32).toString('hex')
    // createMany + skipDuplicates: if another request created it first, use the stored one.
    await prisma.statSalt.createMany({ data: [{ day, salt: value }], skipDuplicates: true })
    const row = await prisma.statSalt.findUnique({ where: { day } })
    salt = { day, value: row.salt }
    await prisma.statSalt.deleteMany({ where: { day: { lt: day } } }) // yesterday's salt is gone for good
    return salt.value
  }

  // ---- keep the table from growing forever ----
  const cleanup = () => prisma.pageView.deleteMany({ where: { day: { lt: addDays(dayOf(), -KEEP_DAYS) } } }).catch(() => {})
  setTimeout(cleanup, 30 * 1000).unref()
  setInterval(cleanup, 24 * 3600 * 1000).unref()

  // ---- max 300 page views per IP per hour (stops someone inflating the numbers) ----
  const hits = new Map()
  setInterval(() => hits.clear(), 3600 * 1000).unref()

  app.post('/api/track', (req, res) => {
    res.status(204).end() // the visitor never waits for this
    record(req).catch((e) => console.error('[stats]', e.message))
  })

  async function record(req) {
    const b = req.body || {}
    const ua = String(req.get('user-agent') || '')
    const page = typeof b.path === 'string' ? b.path.replace(/\/+$/, '') || '/' : ''
    if (!PAGES[page] || !ua || BOT.test(ua) || isAdmin(req)) return // dashboard users aren't counted
    const n = (hits.get(req.ip) || 0) + 1
    hits.set(req.ip, n)
    if (n > 300) return

    const day = dayOf()
    const visitor = crypto.createHash('sha256').update(`${await saltFor(day)}|${req.ip}|${ua}`).digest('hex').slice(0, 32)
    await prisma.pageView.create({
      data: {
        day, path: page, visitor,
        device: deviceOf(ua),
        lang: b.lang === 'en' ? 'en' : 'ar',
        source: sourceOf(b.ref, req.hostname),
      },
    })
  }

  app.get('/api/stats', requireAuth, wrap(async (req, res) => {
    const q = req.query
    const today = dayOf()
    let to = DAY_RE.test(q.to) ? q.to : today
    let from = DAY_RE.test(q.from) ? q.from : addDays(to, -29)
    if (from > to) [from, to] = [to, from]
    if (addDays(from, 3 * 366) < to) from = addDays(to, -3 * 366)

    const one = (v) => (typeof v === 'string' && v && v !== 'all' ? v.slice(0, 80) : null)
    const range = [Prisma.sql`"day" >= ${from}`, Prisma.sql`"day" <= ${to}`]
    const conds = [...range]
    for (const [col, v] of [['path', one(q.page)], ['device', one(q.device)], ['lang', one(q.lang)], ['source', one(q.source)]]) {
      if (v) conds.push(Prisma.sql`${Prisma.raw(`"${col}"`)} = ${v}`)
    }
    const where = Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`
    // `visitor` already changes every day, so COUNT(DISTINCT visitor) = people, once per day.
    const by = (col) => prisma.$queryRaw`
      SELECT ${Prisma.raw(`"${col}"`)} AS key, COUNT(DISTINCT "visitor")::int AS visitors, COUNT(*)::int AS views
      FROM "PageView" ${where} GROUP BY 1 ORDER BY visitors DESC, views DESC`

    const [days, pages, sources, devices, langs, totals, allSources] = await Promise.all([
      by('day'), by('path'), by('source'), by('device'), by('lang'),
      prisma.$queryRaw`SELECT COUNT(DISTINCT "visitor")::int AS visitors, COUNT(*)::int AS views FROM "PageView" ${where}`,
      prisma.$queryRaw`SELECT DISTINCT "source" AS s FROM "PageView" WHERE ${Prisma.join(range, ' AND ')} ORDER BY 1`,
    ])

    // every day in the range, including days with no visits
    const byDay = new Map(days.map((d) => [d.key, d]))
    const daily = []
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const r = byDay.get(d)
      daily.push({ day: d, visitors: r?.visitors || 0, views: r?.views || 0 })
    }
    const busiest = daily.reduce((m, d) => (d.visitors > (m?.visitors || 0) ? d : m), null)
    const t = totals[0] || { visitors: 0, views: 0 }

    res.json({
      from, to, today, timeZone: TZ,
      totals: {
        visitors: t.visitors,
        views: t.views,
        perDay: daily.length ? t.visitors / daily.length : 0,
        pagesPerVisitor: t.visitors ? t.views / t.visitors : 0,
        busiest,
      },
      daily,
      pages: pages.map((p) => ({ ...p, name: PAGES[p.key] || p.key })),
      sources, devices, langs,
      options: { pages: PAGES, sources: allSources.map((r) => r.s) },
    })
  }))
}
