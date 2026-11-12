import { Link } from 'react-router-dom'
import { useLang } from '../i18n'
import { useContent } from '../content-context'
import SmartLink from './SmartLink'
import { ArrowUp } from './Icons'
import { mapLink } from '../map'

const tel = (p) => `tel:${p.replace(/[^\d+]/g, '')}`

/** Compact footer: brand · company links · work with us · contact, then a copyright bar. */
export default function Footer() {
  const { lang, t } = useLang()
  const { nav, footer, contact } = useContent()
  const companyLinks = nav.links.filter((l) => l.href.startsWith('/#'))

  return (
    <footer className="ft2">
      <div className="wrap">
        <div className="ft2-grid">
          <div className="ft2-brand">
            <Link to="/" aria-label="Jadeer" onClick={() => window.scrollTo({ top: 0 })}>
              <img src={lang === 'ar' ? '/logo-jadeer-ar.svg' : '/logo-jadeer.svg'} alt="" />
            </Link>
            <p>{t(footer.tagline)}</p>
          </div>
          <nav className="ft2-col" aria-label={t(footer.companyTitle)}>
            <h3>{t(footer.companyTitle)}</h3>
            {companyLinks.map((l, i) => <SmartLink key={i} href={l.href}>{t(l)}</SmartLink>)}
          </nav>
          <nav className="ft2-col" aria-label={t(footer.workTitle)}>
            <h3>{t(footer.workTitle)}</h3>
            <Link to="/careers">{t(footer.careersLink)}</Link>
            <Link to="/contact">{t(footer.contactLink)}</Link>
          </nav>
          <div className="ft2-col">
            <h3>{t(footer.contactTitle)}</h3>
            <a className="ltr" href={`mailto:${contact.email}`}>{contact.email}</a>
            {contact.phones[0] && <a className="ltr" href={tel(contact.phones[0])}>{contact.phones[0]}</a>}
            {mapLink(contact.map, contact.location?.en)
              ? <a href={mapLink(contact.map, contact.location?.en)} target="_blank" rel="noopener noreferrer">{t(contact.location)}</a>
              : <span>{t(contact.location)}</span>}
          </div>
        </div>
        <div className="ft2-bar">
          <p>{t(footer.text)}</p>
          <button
            type="button" className="ft-top" aria-label={lang === 'ar' ? 'العودة للأعلى' : 'Back to top'}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ArrowUp />
          </button>
        </div>
      </div>
    </footer>
  )
}
