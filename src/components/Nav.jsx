import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { Link } from 'react-router-dom'
import { useContent } from '../content-context'
import SmartLink from './SmartLink'
import { ArrowUpRight, Burger, Close } from './Icons'

export default function Nav() {
  const { lang, toggle, t } = useLang()
  const { nav } = useContent()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu on Escape or a click outside the header.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e) => { if (!headerRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header ref={headerRef} className={`nav${scrolled || open ? ' solid' : ''}${open ? ' menu-open' : ''}`}>
      <div className="wrap">
        <Link className="brand" to="/" aria-label="Jadeer" onClick={() => window.scrollTo({ top: 0 })}>
          {lang === 'ar'
            ? <img src="/logo-jadeer-ar.svg" alt="جدير" />
            : <img src="/logo-jadeer.svg" alt="Jadeer" />}
        </Link>
        <nav className={`links${open ? ' open' : ''}`} id="links" aria-label="Main">
          {nav.links.map((l) => (
            <SmartLink key={l.href} href={l.href} onClick={close}>
              <span className="lbl">{t(l)}</span>
            </SmartLink>
          ))}
          <Link className="connect" to="/contact" onClick={close}>
            {t(nav.connect)}<ArrowUpRight strokeWidth={1.3} />
          </Link>
        </nav>
        <div className="nav-act">
          <button className="lang" type="button" onClick={toggle}>
            {lang === 'ar'
              ? <span lang="en">English</span>
              : <span className="ar-lbl" lang="ar">العربية</span>}
          </button>
          <Link className="nav-cta" to="/contact">{t(nav.connect)}<ArrowUpRight strokeWidth={1.5} /></Link>
          <button
            className="burger" type="button" aria-controls="links" aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <Close /> : <Burger />}
          </button>
        </div>
      </div>
    </header>
  )
}
