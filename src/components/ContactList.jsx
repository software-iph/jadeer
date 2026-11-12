import { useLang } from '../i18n'
import { useContent } from '../content-context'
import { Mail, Phone, Pin } from './Icons'
import { mapLink } from '../map'

const tel = (p) => `tel:${p.replace(/[^\d+]/g, '')}`

/** Email / phone / location rows (shared by the home Connect section and the Contact page). */
export default function ContactList({ className = '' }) {
  const { t } = useLang()
  const { contact } = useContent()
  return (
    <ul className={`clist ${className}`}>
      <li>
        <span className="clist-ic"><Mail /></span>
        <div>
          <span className="clist-lbl">{t(contact.labels.email)}</span>
          <a className="ltr" href={`mailto:${contact.email}`}>{contact.email}</a>
        </div>
      </li>
      <li>
        <span className="clist-ic"><Phone /></span>
        <div>
          <span className="clist-lbl">{t(contact.labels.phone)}</span>
          <span className="clist-phones">
            {contact.phones.map((p, i) => <a key={i} className="ltr" href={tel(p)}>{p}</a>)}
          </span>
        </div>
      </li>
      <li>
        <span className="clist-ic"><Pin /></span>
        <div>
          <span className="clist-lbl">{t(contact.labels.location)}</span>
          {mapLink(contact.map, contact.location?.en)
            ? <a href={mapLink(contact.map, contact.location?.en)} target="_blank" rel="noopener noreferrer">{t(contact.location)} ↗</a>
            : <span>{t(contact.location)}</span>}
        </div>
      </li>
    </ul>
  )
}
