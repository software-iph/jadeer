import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { isVideo } from './schema'

function Preview({ url }) {
  if (!url) return <div className="adm-media-none">No file</div>
  return isVideo(url)
    ? <video src={url} muted playsInline preload="metadata" />
    : <img src={url} alt="" />
}

/** Image / video picker: shows a preview, uploads a new file, or picks from the library. */
export default function MediaField({ value, onChange }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [lib, setLib] = useState(false)

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true); setErr('')
    try { onChange((await api.upload(f)).url) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  return (
    <div className="adm-media">
      <div className="adm-media-prev"><Preview url={value} /></div>
      <div className="adm-media-side">
        <input className="adm-input" dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="adm-media-btns">
          <button type="button" className="adm-btn" onClick={() => fileRef.current.click()} disabled={busy}>
            {busy ? 'Uploading…' : 'Upload new'}
          </button>
          <button type="button" className="adm-btn ghost" onClick={() => setLib(true)}>Choose from library</button>
        </div>
        {err && <p className="adm-err">{err}</p>}
        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={onFile} />
      </div>
      {lib && <Library current={value} onPick={(u) => { onChange(u); setLib(false) }} onClose={() => setLib(false)} />}
    </div>
  )
}

function Library({ current, onPick, onClose }) {
  const [uploads, setUploads] = useState(null)
  const [builtin, setBuiltin] = useState([])
  const load = () => {
    api.uploads().then(setUploads).catch(() => setUploads([]))
    api.builtin().then(setBuiltin).catch(() => {})
  }
  useEffect(load, [])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const del = async (u) => {
    if (!confirm(`Delete ${u.originalName}? Pages still using it will show a broken image.`)) return
    await api.deleteUpload(u.id).catch(() => {})
    load()
  }

  const Grid = ({ items, deletable }) => (
    <div className="adm-lib-grid">
      {items.map((m) => (
        <div className={`adm-lib-item${m.url === current ? ' on' : ''}`} key={m.url}>
          <button type="button" onClick={() => onPick(m.url)} title={m.originalName}>
            <Preview url={m.url} />
            <span>{m.originalName}</span>
          </button>
          {deletable && <button type="button" className="adm-lib-del" title="Delete file" onClick={() => del(m)}>✕</button>}
        </div>
      ))}
    </div>
  )

  return (
    <div className="adm-modal" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="adm-modal-box adm-lib">
        <div className="adm-modal-head">
          <h3>Media library</h3>
          <button type="button" className="adm-btn ghost" onClick={onClose}>Close</button>
        </div>
        <h4>Uploaded</h4>
        {uploads === null ? <p className="adm-empty">Loading…</p> : uploads.length ? <Grid items={uploads} deletable /> : <p className="adm-empty">No uploads yet.</p>}
        <h4>Site files</h4>
        <Grid items={builtin} />
      </div>
    </div>
  )
}
