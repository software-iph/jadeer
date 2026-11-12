import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../i18n'
import { useContent } from '../content-context'
import { useRevealChildren } from '../hooks/useRevealChildren'
import ContactList from './ContactList'
import { ArrowUpRight } from './Icons'

/** Compact "Connect" band at the end of the home page. */
export default function Connect() {
  const { t } = useLang()
  const { connect } = useContent()
  const leftRef = useRef(null)
  useRevealChildren(leftRef)

  return (
    <section className="cx3" id="connect">
      <img className="cx3-mark" src="/icon.svg" alt="" aria-hidden="true" />
      <div className="wrap cx3-in">
        <div className="cx3-l" ref={leftRef}>
          <span className="eyebrow">{t(connect.eyebrow)}</span>
          <h2 className="h2">{t(connect.title)} <span className="gold">{t(connect.titleGold)}</span></h2>
          <p className="lede">{t(connect.lede)}</p>
          <div className="cx3-btns">
            <Link className="hx-pill gold" to="/contact">{t(connect.ctaContact)}<ArrowUpRight /></Link>
            <Link className="hx-pill ghost" to="/careers">{t(connect.ctaCareers)}<ArrowUpRight /></Link>
          </div>
        </div>
        <ContactList className="cx3-card" />
      </div>
    </section>
  )
}
