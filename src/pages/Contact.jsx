import { useState } from 'react'
import { useLang } from '../i18n'
import { useContent } from '../content-context'
import ContactList from '../components/ContactList'
import { mapEmbed, mapLink } from '../map'

export default function Contact() {
  const { t, lang } = useLang()
  const { contactPage: c, contact } = useContent()
  const [form, setForm] = useState({ name: '', org: '', email: '', phone: '', topic: '', message: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // No server inbox: open the visitor's email app with the message filled in.
  const onSubmit = (e) => {
    e.preventDefault()
    const subject = `${form.topic || 'Enquiry'} — ${form.name}`
    const body = [
      form.message,
      '',
      `${form.name}${form.org ? ` (${form.org})` : ''}`,
      form.email,
      form.phone,
    ].filter((l) => l !== undefined).join('\n')
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <main id="top" className="page">
      <section className="pg-head pg-head-sm">
        <div className="wrap">
          <div className="pg-head-txt">
            <span className="eyebrow">{t(c.eyebrow)}</span>
            <h1 className="h2">{t(c.title)} <span className="gold">{t(c.titleGold)}</span></h1>
            <p className="lede">{t(c.lede)}</p>
          </div>
        </div>
      </section>
      <section className="pg-sec ct-sec">
        <div className="wrap ct-grid">
          <div className="ct-side">
            <ContactList className="ct-info" />
            {contact.map?.show !== false && mapEmbed(contact.map, contact.location?.en) && (
              <div className="ct-map">
                <iframe
                  title={t(contact.labels.location)}
                  src={mapEmbed(contact.map, contact.location?.en)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <a className="ct-map-open" href={mapLink(contact.map, contact.location?.en)} target="_blank" rel="noopener noreferrer">
                  {lang === 'ar' ? 'افتح في خرائط Google' : 'Open in Google Maps'} ↗
                </a>
              </div>
            )}
          </div>
          <form className="ct-form" onSubmit={onSubmit}>
            <h2>{t(c.formTitle)}</h2>
            <div className="ct-row">
              <label><span>{t(c.name)}</span><input required value={form.name} onChange={set('name')} autoComplete="name" /></label>
              <label><span>{t(c.org)}</span><input value={form.org} onChange={set('org')} autoComplete="organization" /></label>
            </div>
            <div className="ct-row">
              <label><span>{t(c.emailField)}</span><input type="email" required value={form.email} onChange={set('email')} autoComplete="email" dir="ltr" /></label>
              <label><span>{t(c.phoneField)}</span><input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" dir="ltr" /></label>
            </div>
            <label>
              <span>{t(c.topic)}</span>
              <select value={form.topic} onChange={set('topic')}>
                <option value="">—</option>
                {c.topics.map((tp, i) => <option key={i} value={tp[lang]}>{tp[lang]}</option>)}
              </select>
            </label>
            <label><span>{t(c.message)}</span><textarea required rows={5} value={form.message} onChange={set('message')} /></label>
            <button className="hx-pill gold" type="submit">{t(c.send)}</button>
            <p className="ct-note">{t(c.note)}</p>
          </form>
        </div>
      </section>
    </main>
  )
}
