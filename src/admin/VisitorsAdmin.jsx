import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from './api'

const PERIODS = [
  ['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'],
  ['365', 'Last 12 months'], ['custom', 'Custom'],
]
const DEVICES = { desktop: 'Computer', mobile: 'Phone', tablet: 'Tablet' }
const LANGS = { ar: 'Arabic', en: 'English' }

const ymd = (d) => d.toLocaleDateString('en-CA') // YYYY-MM-DD, browser's own time zone
const shift = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d) }
const asDate = (day) => new Date(`${day}T12:00:00`)
const fmtDay = (day, opts = { day: 'numeric', month: 'short' }) => asDate(day).toLocaleDateString('en-GB', opts)
const num = (n) => Math.round(n).toLocaleString('en-US')
const dec = (n) => (n >= 10 ? num(n) : n.toFixed(1))

function rangeFor(period) {
  if (period === 'today') return { from: shift(0), to: shift(0) }
  return { from: shift(-(Number(period) - 1)), to: shift(0) }
}

export default function VisitorsAdmin() {
  const [f, setF] = useState(() => {
    const saved = JSON.parse(sessionStorage.getItem('adm-visitors') || 'null')
    return saved?.period && saved.period !== 'custom'
      ? { ...saved, ...rangeFor(saved.period) } // keep "last 30 days" moving with today
      : saved || { period: '30', ...rangeFor('30'), page: 'all', device: 'all', lang: 'all', source: 'all' }
  })
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [asTable, setAsTable] = useState(false)

  useEffect(() => { sessionStorage.setItem('adm-visitors', JSON.stringify(f)) }, [f])
  const set = (patch) => setF((cur) => ({ ...cur, ...patch }))
  const setPeriod = (period) => set(period === 'custom' ? { period } : { period, ...rangeFor(period) })

  const load = useCallback(() => {
    const { period: _p, ...params } = f
    return api.stats(params).then((d) => { setData(d); setErr('') }).catch((e) => setErr(e.message))
  }, [f])
  useEffect(() => {
    load()
    const id = setInterval(load, 120000) // keep the numbers fresh while the page is open
    return () => clearInterval(id)
  }, [load])

  const downloadCsv = () => {
    if (!data) return
    const rows = [['Date', 'Visitors', 'Page views'], ...data.daily.map((d) => [d.day, d.visitors, d.views])]
    const blob = new Blob(['﻿' + rows.map((r) => r.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `jadeer-visitors-${data.from}-to-${data.to}.csv` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const t = data?.totals
  const filtered = f.page !== 'all' || f.device !== 'all' || f.lang !== 'all' || f.source !== 'all'

  return (
    <div className="vs">
      <p className="adm-help vs-help">
        Counted without cookies: each person counts once per day, and no personal data (like IP addresses) is stored.
        Bots and search-engine crawlers are not counted, and neither are you while signed in to this dashboard.
      </p>

      <div className="vs-card vs-filters">
        <label><span>Period</span>
          <select className="adm-input" value={f.period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label><span>From</span>
          <input className="adm-input" type="date" value={f.from} max={f.to} onChange={(e) => e.target.value && set({ period: 'custom', from: e.target.value })} />
        </label>
        <label><span>To</span>
          <input className="adm-input" type="date" value={f.to} min={f.from} onChange={(e) => e.target.value && set({ period: 'custom', to: e.target.value })} />
        </label>
        <label><span>Page</span>
          <select className="adm-input" value={f.page} onChange={(e) => set({ page: e.target.value })}>
            <option value="all">All pages</option>
            {Object.entries(data?.options.pages || {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label><span>Device</span>
          <select className="adm-input" value={f.device} onChange={(e) => set({ device: e.target.value })}>
            <option value="all">All devices</option>
            {Object.entries(DEVICES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label><span>Language</span>
          <select className="adm-input" value={f.lang} onChange={(e) => set({ lang: e.target.value })}>
            <option value="all">Both</option>
            {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label><span>Came from</span>
          <select className="adm-input" value={f.source} onChange={(e) => set({ source: e.target.value })}>
            <option value="all">All sources</option>
            {[...new Set([...(data?.options.sources || []), ...(f.source !== 'all' ? [f.source] : [])])].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div className="vs-filter-btns">
          {filtered && <button type="button" className="adm-btn ghost small" onClick={() => set({ page: 'all', device: 'all', lang: 'all', source: 'all' })}>Clear filters</button>}
          <button type="button" className="adm-btn ghost small" onClick={downloadCsv} disabled={!data}>↓ CSV</button>
        </div>
      </div>

      {err && <p className="adm-err">{err}</p>}
      {!data ? <p className="adm-empty">Loading statistics…</p> : (
        <>
          <div className="vs-kpis">
            <Kpi value={num(t.visitors)} label="Visitors" />
            <Kpi value={num(t.views)} label="Page views" />
            <Kpi value={dec(t.perDay)} label="Average visitors per day" />
            <Kpi value={t.pagesPerVisitor ? t.pagesPerVisitor.toFixed(1) : '0'} label="Pages per visitor" />
            <Kpi value={t.busiest ? num(t.busiest.visitors) : '—'} label={t.busiest ? `Busiest day · ${fmtDay(t.busiest.day)}` : 'Busiest day'} />
          </div>

          <section className="vs-card">
            <div className="vs-card-head">
              <h3>Visitors per day <small>{fmtDay(data.from, { day: 'numeric', month: 'short', year: 'numeric' })} – {fmtDay(data.to, { day: 'numeric', month: 'short', year: 'numeric' })}</small></h3>
              <button type="button" className="adm-btn ghost small" onClick={() => setAsTable((v) => !v)}>{asTable ? 'Show as chart' : 'Show as table'}</button>
            </div>
            {asTable ? <DayTable daily={data.daily} /> : <DayChart daily={data.daily} />}
            {t.views === 0 && <p className="adm-empty vs-none">No visits in this period{filtered ? ' with these filters' : ''} yet.</p>}
          </section>

          <div className="vs-grid">
            <Breakdown title="Most visited pages" rows={data.pages.map((p) => ({ ...p, key: p.name }))} views onPick={(r) => set({ page: Object.keys(data.options.pages).find((k) => data.options.pages[k] === r.key) || 'all' })} />
            <Breakdown title="Where visitors came from" rows={data.sources} onPick={(r) => set({ source: r.key })} />
            <Breakdown title="Devices" rows={data.devices.map((d) => ({ ...d, label: DEVICES[d.key] || d.key }))} onPick={(r) => set({ device: r.key })} />
            <Breakdown title="Language" rows={data.langs.map((d) => ({ ...d, label: LANGS[d.key] || d.key }))} onPick={(r) => set({ lang: r.key })} />
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ value, label }) {
  return <div className="vs-card vs-kpi"><b>{value}</b><span>{label}</span></div>
}

/** Rounds the top of the axis to a friendly number (10, 20, 50, 100, 200 …). */
function niceMax(v) {
  if (v <= 5) return 5
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p
  return 10 * p
}

function DayChart({ daily }) {
  const box = useRef(null)
  const [w, setW] = useState(800)
  const [hover, setHover] = useState(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const H = 260, L = 40, R = 8, T = 12, B = 28
  const max = niceMax(Math.max(...daily.map((d) => d.visitors), 0))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * max)
  const plotW = Math.max(w - L - R, 50)
  const step = plotW / daily.length
  const gap = Math.min(2, step * 0.3)
  const barW = Math.max(step - gap, 1)
  const y = (v) => T + (H - T - B) * (1 - v / max)
  const base = y(0)
  const every = Math.max(1, Math.ceil(daily.length / Math.max(2, Math.floor(plotW / 70))))
  const h = hover != null ? daily[hover] : null

  // bar with rounded top corners only, sitting on the baseline
  const bar = (x, top) => {
    const r = Math.min(4, barW / 2, base - top)
    if (base - top <= 0) return ''
    return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${base}Z`
  }

  return (
    <div className="vs-chart" ref={box} onMouseLeave={() => setHover(null)}>
      <svg width={w} height={H} role="img" aria-label="Visitors per day">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} className={v === 0 ? 'vs-base' : 'vs-grid-line'} />
            <text x={L - 8} y={y(v)} dy="0.32em" textAnchor="end" className="vs-tick">{num(v)}</text>
          </g>
        ))}
        {daily.map((d, i) => {
          const x = L + i * step + gap / 2
          return (
            <g key={d.day}>
              <path d={bar(x, y(d.visitors))} className={`vs-bar${hover === i ? ' on' : ''}${hover != null && hover !== i ? ' dim' : ''}`} />
              {i % every === 0 && <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="vs-tick">{fmtDay(d.day)}</text>}
              {/* hit area: the whole column, easier to hover than a thin bar */}
              <rect x={L + i * step} y={T} width={step} height={base - T} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
            </g>
          )
        })}
      </svg>
      {h && (
        <div className="vs-tip" style={{ left: Math.min(Math.max(L + hover * step + step / 2, 90), w - 90), top: Math.max(y(h.visitors) - 10, 30) }}>
          <b>{fmtDay(h.day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b>
          <span>{num(h.visitors)} visitors · {num(h.views)} page views</span>
        </div>
      )}
    </div>
  )
}

function DayTable({ daily }) {
  return (
    <div className="vs-table-wrap">
      <table className="vs-table">
        <thead><tr><th>Date</th><th>Visitors</th><th>Page views</th></tr></thead>
        <tbody>
          {[...daily].reverse().map((d) => (
            <tr key={d.day}><td>{fmtDay(d.day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{num(d.visitors)}</td><td>{num(d.views)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A ranked list where each row's shaded background shows its share of the top row. */
function Breakdown({ title, rows, views, onPick }) {
  const top = Math.max(...rows.map((r) => r.visitors), 1)
  return (
    <section className="vs-card">
      <h3>{title}</h3>
      {rows.length === 0 ? <p className="adm-empty">No data yet.</p> : (
        <table className="vs-rank">
          <thead><tr><th /><th>Visitors</th>{views && <th>Views</th>}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>
                  <button type="button" onClick={() => onPick(r)} title="Show only this">
                    <i style={{ width: `${(r.visitors / top) * 100}%` }} />
                    <span>{r.label || r.key}</span>
                  </button>
                </td>
                <td>{num(r.visitors)}</td>
                {views && <td>{num(r.views)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
