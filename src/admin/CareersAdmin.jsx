import { useMemo, useState } from 'react'
import { api } from './api'
import { Field } from './Editor'

const STATUS = {
  new: 'New',
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
}
const fmt = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Everything about careers in one place:
 * applications received, the job openings, and the Careers page text.
 */
export default function CareersAdmin({ careers, onChange, apps, reloadApps, setApps }) {
  const [tab, setTab] = useState(() => sessionStorage.getItem('adm-careers-tab') || 'applications')
  const go = (t) => { setTab(t); sessionStorage.setItem('adm-careers-tab', t) }
  const jobs = careers.jobs || []
  const { jobs: _omit, ...pageText } = careers
  const newCount = apps ? apps.filter((a) => a.status === 'new').length : 0
  const openCount = jobs.filter((j) => j.open !== false).length

  return (
    <div className="adm-careers">
      <div className="adm-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'applications'} className={tab === 'applications' ? 'on' : ''} onClick={() => go('applications')}>
          Applications {newCount > 0 && <b className="adm-badge">{newCount} new</b>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'jobs'} className={tab === 'jobs' ? 'on' : ''} onClick={() => go('jobs')}>
          Job openings <span className="adm-tab-n">{openCount} open</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'page'} className={tab === 'page' ? 'on' : ''} onClick={() => go('page')}>
          Page text
        </button>
      </div>

      {tab === 'applications' && <Applications apps={apps} jobs={jobs} reload={reloadApps} setApps={setApps} />}

      {tab === 'jobs' && (
        <>
          <p className="adm-help">
            <b>External apply link filled in</b> → the Apply button takes people straight to that link (LinkedIn, Google Form…).{' '}
            <b>Link left empty</b> → people apply on this site and their applications (with CV) arrive in the Applications tab.
            Untick <b>Position is open</b> to hide a job without deleting it. Remember to <b>Save changes</b>.
          </p>
          <div className="adm-obj">
            <Field path="careers.jobs" keyName="jobs" value={jobs} onChange={(v) => onChange({ ...careers, jobs: v })} />
          </div>
        </>
      )}

      {tab === 'page' && (
        <Field path="careers" keyName="" bare value={pageText} onChange={(v) => onChange({ ...v, jobs })} />
      )}
    </div>
  )
}

function Applications({ apps, jobs, reload, setApps }) {
  const [job, setJob] = useState('all')
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(null)
  const [err, setErr] = useState('')

  const jobName = (a) => {
    const j = a.jobId && jobs.find((x) => x.id === a.jobId)
    return j ? (j.title?.en || j.title?.ar || a.jobTitle) : a.jobTitle
  }
  const jobOptions = useMemo(() => {
    const m = new Map()
    ;(apps || []).forEach((a) => m.set(a.jobId || 'general', jobName(a)))
    return [...m.entries()]
  }, [apps, jobs]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!apps) return <p className="adm-empty">Loading applications…</p>

  const list = apps.filter((a) => (job === 'all' || (a.jobId || 'general') === job) && (status === 'all' || a.status === status))

  const setSt = async (a, s) => {
    setErr('')
    try {
      const u = await api.setApplicationStatus(a.id, s)
      setApps((xs) => xs.map((x) => (x.id === a.id ? u : x)))
    } catch (e) { setErr(e.message) }
  }
  const del = async (a) => {
    if (!confirm(`Delete the application from ${a.name}? Their CV file is deleted too. This cannot be undone.`)) return
    try {
      await api.deleteApplication(a.id)
      setApps((xs) => xs.filter((x) => x.id !== a.id))
    } catch (e) { setErr(e.message) }
  }
  const toggle = (a) => {
    const next = open === a.id ? null : a.id
    setOpen(next)
    if (next && a.status === 'new') setSt(a, 'reviewed') // opening it marks it as seen
  }

  return (
    <div className="adm-apps">
      <div className="adm-apps-bar">
        <select className="adm-input" value={job} onChange={(e) => setJob(e.target.value)}>
          <option value="all">All positions ({apps.length})</option>
          {jobOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any status</option>
          {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button type="button" className="adm-btn ghost" onClick={reload}>Refresh</button>
      </div>
      {err && <p className="adm-err">{err}</p>}

      {list.length === 0 ? (
        <p className="adm-empty adm-apps-empty">
          {apps.length ? 'No applications match these filters.' : 'No applications yet. They will appear here when someone applies through the Careers page.'}
        </p>
      ) : (
        <ul className="adm-app-list">
          {list.map((a) => (
            <li key={a.id} className={`adm-app${open === a.id ? ' open' : ''}`}>
              <button type="button" className="adm-app-head" onClick={() => toggle(a)}>
                <span className={`adm-st st-${a.status}`}>{STATUS[a.status] || a.status}</span>
                <span className="adm-app-name">{a.name}</span>
                <span className="adm-app-job">{jobName(a)}</span>
                <span className="adm-app-date">{fmt(a.createdAt)}</span>
              </button>
              {open === a.id && (
                <div className="adm-app-body">
                  <dl>
                    <dt>Email</dt><dd><a href={`mailto:${a.email}`}>{a.email}</a></dd>
                    {a.phone && <><dt>Phone</dt><dd><a href={`tel:${a.phone}`}>{a.phone}</a></dd></>}
                    <dt>Position</dt><dd>{jobName(a)}</dd>
                    {a.message && <><dt>Message</dt><dd className="adm-app-msg">{a.message}</dd></>}
                    <dt>CV</dt>
                    <dd>{a.cvFile ? <a className="adm-btn small" href={`/api/applications/${a.id}/cv`}>Download {a.cvName}</a> : 'No file attached'}</dd>
                  </dl>
                  <div className="adm-app-tools">
                    <label>Status{' '}
                      <select className="adm-input" value={a.status} onChange={(e) => setSt(a, e.target.value)}>
                        {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </label>
                    <a className="adm-btn ghost small" href={`mailto:${a.email}?subject=${encodeURIComponent(`Your application: ${jobName(a)}`)}`}>Reply by email</a>
                    <button type="button" className="adm-btn ghost small danger" onClick={() => del(a)}>Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
