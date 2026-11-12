import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { SECTIONS } from './schema'
import { Field } from './Editor'
import CareersAdmin from './CareersAdmin'
import { useContentContext } from '../content-context'
import './admin.css'

export default function Admin() {
  const [user, setUser] = useState(undefined) // undefined = checking, null = signed out

  useEffect(() => {
    // The public site hides scrolling while its loader runs; the dashboard has no loader.
    document.documentElement.classList.remove('loading')
    api.me().then(setUser).catch(() => setUser(null))
  }, [])

  if (user === undefined) return <div className="adm adm-center"><p className="adm-empty">Loading…</p></div>
  if (!user) return <Login onDone={setUser} />
  return <Dashboard user={user} onLogout={() => api.logout().finally(() => setUser(null))} />
}

function Login({ onDone }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { onDone(await api.login(email, password)) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="adm adm-center" dir="ltr">
      <form className="adm-login" onSubmit={submit}>
        <img src="/logo-jadeer.svg" alt="Jadeer" />
        <h1>Dashboard</h1>
        <label><span>Email</span><input className="adm-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label><span>Password</span><input className="adm-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="adm-err">{err}</p>}
        <button className="adm-btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}

function Dashboard({ user, onLogout }) {
  const { setContent: setLiveContent } = useContentContext()
  const [saved, setSaved] = useState(null)
  const [draft, setDraft] = useState(null)
  const [section, setSection] = useState(() => { const s = sessionStorage.getItem('adm-section'); return SECTIONS.some((x) => x.key === s) ? s : SECTIONS[0].key })
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [apps, setApps] = useState(null)

  // Job applications (badge in the sidebar + Careers inbox). Refreshed every minute.
  const reloadApps = useCallback(() => api.applications().then(setApps).catch(() => setApps((a) => a || [])), [])
  useEffect(() => {
    reloadApps()
    const id = setInterval(reloadApps, 60000)
    return () => clearInterval(id)
  }, [reloadApps])
  const newApps = apps ? apps.filter((a) => a.status === 'new').length : 0

  useEffect(() => {
    api.getContent().then((c) => { setSaved(c); setDraft(c) }).catch((e) => setStatus(e.message))
  }, [])
  useEffect(() => { sessionStorage.setItem('adm-section', section) }, [section])

  // The top bar's height changes (buttons wrap on phones); the side menu starts below it.
  useEffect(() => {
    const bar = document.querySelector('.adm-top')
    if (!bar) return
    const set = () => document.documentElement.style.setProperty('--adm-top', `${bar.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [])

  const dirty = useMemo(() => saved && draft && JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft])
  const dirtySections = useMemo(() => {
    if (!saved || !draft) return new Set()
    return new Set(SECTIONS.filter((s) => JSON.stringify(saved[s.key]) !== JSON.stringify(draft[s.key])).map((s) => s.key))
  }, [saved, draft])

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const save = useCallback(async () => {
    setSaving(true); setStatus('')
    try {
      const c = await api.saveContent(draft)
      setSaved(c); setDraft(c); setLiveContent(c)
      setStatus('Saved — the website is updated.')
    } catch (e) {
      setStatus(e.status === 401 ? 'Your session expired. Sign in again (copy your edits first).' : e.message)
    } finally { setSaving(false) }
  }, [draft, setLiveContent])

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty && !saving) save() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [dirty, saving, save])

  const resetSection = async () => {
    const keepJobs = section === 'careers'
    const msg = 'Replace this section with the original default text and images?'
      + (keepJobs ? ' Your job openings are kept.' : '')
      + ' Nothing changes on the site until you press Save.'
    if (!confirm(msg)) return
    try {
      const d = await api.getDefaults()
      setDraft((cur) => ({ ...cur, [section]: keepJobs ? { ...d.careers, jobs: cur.careers.jobs } : d[section] }))
    } catch (e) { setStatus(e.message) }
  }

  const meta = SECTIONS.find((s) => s.key === section) || SECTIONS[0]

  return (
    <div className="adm" dir="ltr">
      <header className="adm-top">
        <button type="button" className="adm-burger" onClick={() => setNavOpen((o) => !o)} aria-label="Sections">☰</button>
        <img src="/logo-jadeer.svg" alt="Jadeer" className="adm-logo" />
        <span className="adm-title">Dashboard</span>
        <div className="adm-top-r">
          {status && <span className={`adm-status${/Saved/.test(status) ? ' ok' : ''}`}>{status}</span>}
          {dirty && <button type="button" className="adm-btn ghost" onClick={() => { if (confirm('Discard all unsaved changes?')) setDraft(saved) }}>Discard</button>}
          <button type="button" className="adm-btn primary" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
          <a className="adm-btn ghost" href="/" target="_blank" rel="noreferrer">View site ↗</a>
          <div className="adm-user">
            <button type="button" className="adm-btn ghost" onClick={() => setPwOpen(true)} title={user.email}>Password</button>
            <button type="button" className="adm-btn ghost" onClick={() => { if (!dirty || confirm('You have unsaved changes. Sign out anyway?')) onLogout() }}>Sign out</button>
          </div>
        </div>
      </header>

      <div className="adm-body">
        <nav className={`adm-side${navOpen ? ' open' : ''}`}>
          {SECTIONS.map((s) => (
            <button
              key={s.key} type="button" className={s.key === section ? 'on' : ''}
              onClick={() => { setSection(s.key); setNavOpen(false); window.scrollTo(0, 0) }}
            >
              <span>{s.label}</span>
              {s.key === 'careers' && newApps > 0 && <b className="adm-badge" title="New applications">{newApps}</b>}
              {dirtySections.has(s.key) && <i className="adm-dot" title="Unsaved changes" />}
            </button>
          ))}
          {/* On phones the top bar has no room for these, so they live in the menu. */}
          <div className="adm-side-account">
            <span>{user.email}</span>
            <button type="button" onClick={() => { setNavOpen(false); setPwOpen(true) }}>Change password</button>
            <button type="button" onClick={() => { if (!dirty || confirm('You have unsaved changes. Sign out anyway?')) onLogout() }}>Sign out</button>
          </div>
        </nav>

        <main className="adm-main">
          {!draft ? <p className="adm-empty">Loading content…</p> : (
            <>
              <div className="adm-sec-head">
                <div>
                  <h1>{meta.label}</h1>
                  <p>{meta.hint}{section !== 'careers' && ' Each text has an English and an Arabic box.'}</p>
                </div>
                <button type="button" className="adm-btn ghost small" onClick={resetSection}>Restore defaults</button>
              </div>
              {section === 'careers' ? (
                <CareersAdmin
                  careers={draft.careers}
                  onChange={(v) => setDraft((cur) => ({ ...cur, careers: v }))}
                  apps={apps} setApps={setApps} reloadApps={reloadApps}
                />
              ) : (
                <Field
                  path={section} keyName="" bare
                  value={draft[section]}
                  onChange={(v) => setDraft((cur) => ({ ...cur, [section]: v }))}
                />
              )}
            </>
          )}
        </main>
      </div>

      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  )
}

function PasswordModal({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    try { await api.changePassword(current, next); setOk(true); setMsg('Password changed.') } catch (x) { setMsg(x.message) }
  }
  return (
    <div className="adm-modal" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="adm-modal-box adm-pw" onSubmit={submit}>
        <div className="adm-modal-head"><h3>Change password</h3></div>
        <label><span>Current password</span><input className="adm-input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></label>
        <label><span>New password (8+ characters)</span><input className="adm-input" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required /></label>
        {msg && <p className={ok ? 'adm-ok' : 'adm-err'}>{msg}</p>}
        <div className="adm-media-btns">
          {!ok && <button className="adm-btn primary">Change</button>}
          <button type="button" className="adm-btn ghost" onClick={onClose}>Close</button>
        </div>
      </form>
    </div>
  )
}
