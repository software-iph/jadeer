import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { useContent } from '../content-context'

/** Application form in a dialog. `job` = the position, or null for a general CV. */
export default function ApplyForm({ job, onClose }) {
  const { t, lang } = useLang()
  const { careers } = useContent()
  const f = careers.form
  const [state, setState] = useState('idle') // idle | sending | done
  const [err, setErr] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    boxRef.current?.querySelector('input')?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (job?.id) fd.append('jobId', job.id)
    const cv = fd.get('cv')
    if (cv && cv.size === 0) fd.delete('cv')
    setState('sending'); setErr('')
    try {
      const res = await fetch('/api/applications', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setState('done')
    } catch (x) {
      setErr(x.message); setState('idle')
    }
  }

  const jobTitle = job ? (job.title?.[lang] || job.title?.en) : null

  return (
    <div className="ap-modal" role="dialog" aria-modal="true" aria-labelledby="ap-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ap-box" ref={boxRef}>
        <button type="button" className="ap-x" aria-label={t(f.close)} onClick={onClose}>×</button>
        {state === 'done' ? (
          <div className="ap-done">
            <img src="/icon.svg" alt="" aria-hidden="true" />
            <p>{t(f.success)}</p>
            <button type="button" className="hx-pill gold" onClick={onClose}>{t(f.close)}</button>
          </div>
        ) : (
          <form className="ct-form ap-form" onSubmit={submit}>
            <h2 id="ap-title">{job ? <>{t(f.title)} <span>{jobTitle}</span></> : t(f.generalTitle)}</h2>
            <div className="ct-row">
              <label><span>{t(f.name)}</span><input name="name" required maxLength={120} autoComplete="name" /></label>
              <label><span>{t(f.email)}</span><input name="email" type="email" required maxLength={200} autoComplete="email" dir="ltr" /></label>
            </div>
            <label><span>{t(f.phone)}</span><input name="phone" type="tel" maxLength={40} autoComplete="tel" dir="ltr" /></label>
            <label><span>{t(f.cv)}</span><input name="cv" type="file" required accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /></label>
            <label><span>{t(f.message)}</span><textarea name="message" rows={4} maxLength={4000} /></label>
            {/* honeypot: hidden from people, bots fill it */}
            <input name="website" tabIndex={-1} autoComplete="off" className="ap-hp" aria-hidden="true" />
            {err && <p className="ap-err" role="alert">{err}</p>}
            <button className="hx-pill gold" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? t(f.sending) : t(f.submit)}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
