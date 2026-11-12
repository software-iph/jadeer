import { useState } from 'react'
import { HIDDEN_KEYS, labelFor, MEDIA_KEYS, MEDIA_RE, SELECTS, TEMPLATES } from './schema'
import MediaField from './MediaField'

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const isBilingual = (v) => isObj(v) && typeof v.en === 'string' && typeof v.ar === 'string'

/** A blank copy of `v` with the same shape (used when adding list items). */
function blankLike(v) {
  if (typeof v === 'string') return ''
  if (typeof v === 'number') return 0
  if (typeof v === 'boolean') return v
  if (Array.isArray(v)) return v.length && typeof v[0] !== 'object' ? [] : v.length ? [blankLike(v[0])] : []
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankLike(x)]))
  return v
}

/** Short title for a list item card. */
function summary(item, i) {
  const pick = (o) => (isBilingual(o) ? o.en || o.ar : '')
  if (typeof item === 'string') return item || `Item ${i + 1}`
  if (isBilingual(item)) return item.en || item.ar || `Item ${i + 1}`
  if (isObj(item)) {
    for (const k of ['title', 'strip', 'kicker', 'name']) if (pick(item[k])) return pick(item[k])
  }
  return `Item ${i + 1}`
}

// Fields that hold paragraphs: always get a multi-line box.
const LONG_KEYS = new Set(['text', 'lede', 'side', 'noJobs', 'cvText', 'note', 'success', 'message'])

function TextInput({ value, onChange, dir, placeholder, multiline }) {
  // Decide once (when the box appears) whether it's multi-line, so typing never swaps
  // the box and loses the cursor.
  const [multi] = useState(() => multiline || value.length > 60 || value.includes('\n'))
  if (!multi) {
    return <input className="adm-input" dir={dir} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  }
  const rows = Math.min(10, Math.max(2, Math.ceil(value.length / 60) + value.split('\n').length - 1))
  return <textarea className="adm-input" dir={dir} value={value} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} />
}

function Bilingual({ value, onChange, multiline }) {
  // Both boxes use the same height so English and Arabic line up.
  const multi = multiline || value.en.length > 60 || value.ar.length > 60 || /\n/.test(value.en + value.ar)
  return (
    <div className="adm-bi">
      <label className="adm-lang"><span>EN</span><TextInput value={value.en} dir="ltr" multiline={multi} onChange={(en) => onChange({ ...value, en })} /></label>
      <label className="adm-lang"><span>ع</span><TextInput value={value.ar} dir="rtl" multiline={multi} onChange={(ar) => onChange({ ...value, ar })} /></label>
    </div>
  )
}

function ListField({ path, value, onChange }) {
  const [openIdx, setOpenIdx] = useState(value.length <= 4 ? -2 : -1) // -2 = all open
  const tpl = TEMPLATES[path]
  const add = () => {
    onChange([...value, tpl ? tpl() : value.length ? blankLike(value[value.length - 1]) : ''])
    if (openIdx !== -2) setOpenIdx(value.length) // open the new item so it can be filled in
  }
  const remove = (i) => { if (confirm('Remove this item?')) onChange(value.filter((_, k) => k !== i)) }
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= value.length) return
    const next = [...value];[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  // Plain text list (e.g. phone numbers) vs. list of grouped items (e.g. jobs).
  const simple = value.length ? value.every((v) => typeof v === 'string') : !tpl || typeof tpl() === 'string'

  return (
    <div className="adm-list">
      {value.length === 0 && <p className="adm-empty">Nothing here yet.</p>}
      {value.map((item, i) => {
        const open = openIdx === -2 || openIdx === i || simple
        return (
          <div className={`adm-item${open ? ' open' : ''}`} key={i}>
            <div className="adm-item-head">
              {!simple && (
                <button type="button" className="adm-item-title" onClick={() => setOpenIdx(open && openIdx !== -2 ? -1 : i)}>
                  <span className="adm-chev" aria-hidden="true" />{summary(item, i)}
                </button>
              )}
              {simple && <Field path={`${path}.${i}`} keyName="" value={item} onChange={(v) => onChange(value.map((x, k) => (k === i ? v : x)))} bare />}
              <div className="adm-item-tools">
                <button type="button" title="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" title="Move down" onClick={() => move(i, 1)} disabled={i === value.length - 1}>↓</button>
                <button type="button" title="Remove" className="danger" onClick={() => remove(i)}>✕</button>
              </div>
            </div>
            {open && !simple && (
              <div className="adm-item-body">
                <Field path={`${path}.${i}`} keyName="" value={item} onChange={(v) => onChange(value.map((x, k) => (k === i ? v : x)))} bare />
              </div>
            )}
          </div>
        )
      })}
      <button type="button" className="adm-add" onClick={add}>+ Add {simple ? 'item' : 'new'}</button>
    </div>
  )
}

/** Renders the right editor for any value in the content tree. */
export function Field({ path, keyName, value, onChange, bare }) {
  const label = keyName !== '' ? labelFor(keyName) : null
  const wrap = (body, cls = '') => (bare ? body : (
    <div className={`adm-field ${cls}`}>
      {label && <div className="adm-label">{label}</div>}
      {body}
    </div>
  ))

  if (isBilingual(value)) {
    const extra = Object.keys(value).filter((k) => k !== 'en' && k !== 'ar')
    return wrap(
      <>
        <Bilingual value={value} onChange={onChange} multiline={LONG_KEYS.has(keyName)} />
        {extra.map((k) => (
          <Field key={k} path={`${path}.${k}`} keyName={k} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} />
        ))}
      </>,
    )
  }

  if (HIDDEN_KEYS.has(keyName)) return null

  if (typeof value === 'boolean') {
    return (
      <label className="adm-check">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
    )
  }

  if (typeof value === 'string' && SELECTS[keyName]) {
    return wrap(
      <select className="adm-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {SELECTS[keyName].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>,
    )
  }

  if (typeof value === 'string') {
    if (MEDIA_KEYS.has(keyName) || MEDIA_RE.test(value)) return wrap(<MediaField value={value} onChange={onChange} />)
    const isPos = /Pos$/.test(keyName)
    return wrap(<TextInput value={value} onChange={onChange} dir="auto" multiline={LONG_KEYS.has(keyName)} placeholder={isPos ? 'e.g. 50% 30%' : ''} />)
  }

  if (typeof value === 'number') {
    return wrap(<input className="adm-input" type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />)
  }

  if (Array.isArray(value)) return wrap(<ListField path={path} value={value} onChange={onChange} />, 'adm-field-list')

  if (isObj(value)) {
    const body = (
      <div className={bare ? 'adm-obj' : 'adm-obj adm-group'}>
        {Object.entries(value).map(([k, v]) => (
          <Field key={k} path={path ? `${path}.${k}` : k} keyName={k} value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} />
        ))}
      </div>
    )
    return wrap(body)
  }

  return null
}
