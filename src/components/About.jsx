import { useRef, useState } from 'react'
import { useLang } from '../i18n'
import { useContent } from '../content-context'
import { useRevealChildren } from '../hooks/useRevealChildren'

const pad = (n) => String(n).padStart(2, '0')
const HOVER_DELAY_MS = 140

/**
 * "About" expanding panels. A panel opens when you hover it (mouse devices)
 * or click / tap it. Scrolling doesn't change the panels.
 */
export default function About() {
  const { t } = useLang()
  const { about } = useContent()
  const panels = about.panels
  const [cur, setCur] = useState(0)
  const headRef = useRef(null)
  const hoverTimer = useRef(null)
  useRevealChildren(headRef)

  const onEnter = (k) => {
    if (k === cur || !window.matchMedia('(hover: hover) and (min-width: 901px)').matches) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setCur(k), HOVER_DELAY_MS)
  }

  return (
    <section className="sec about ax2 ax-hover" id="about">
      <div className="wrap ax2-in">
        <div className="ax2-head" ref={headRef}>
          <span className="eyebrow">{t(about.eyebrow)}</span>
          <span className="ax2-hint">{t(about.hint)}</span>
        </div>
        <div className="acc3">
          {panels.map((p, i) => {
            const isOpen = i === cur
            return (
              <article
                key={i}
                className={`ac p${i + 1}${isOpen ? ' open' : ''}`}
                onMouseEnter={() => onEnter(i)}
                onMouseLeave={() => clearTimeout(hoverTimer.current)}
              >
                <button
                  className="ac-strip" type="button" aria-expanded={isOpen} aria-controls={`acb${i}`}
                  onClick={() => setCur(i)}
                >
                  <span className="num">{pad(i + 1)}</span>
                  <span className="ac-sw">{t(p.strip)}</span>
                  <span className="ac-plus" aria-hidden="true" />
                </button>
                <div className="ac-body" id={`acb${i}`}>
                  <div className="ac-top">
                    <div className="ac-txt">
                      <span className="ac-no num">{pad(i + 1)}</span>
                      <span className="ac-k">{t(p.kicker)}</span>
                      <h3>{t(p.title)}</h3>
                      <p>{t(p.text)}</p>
                    </div>
                    <div className="ac-img"><img src={p.img} alt="" style={{ objectPosition: p.imgPos }} /></div>
                  </div>
                  <div className="ac-word" aria-hidden="true">{t(p.word)}</div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
