import { useRef, useState } from 'react'
import { useLang } from '../i18n'
import { useContent } from '../content-context'
import { useRevealChildren } from '../hooks/useRevealChildren'

const HOVER_DELAY_MS = 120
const pad = (n) => String(n).padStart(2, '0')

/** "Why Jadeer": light section with an accordion next to a photo. */
export default function Why() {
  const { t } = useLang()
  const { why } = useContent()
  const [open, setOpen] = useState(0)
  const leftRef = useRef(null)
  const accRef = useRef(null)
  const hoverTimer = useRef(null)
  useRevealChildren(leftRef)
  useRevealChildren(accRef)

  const onEnter = (i) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setOpen(i), HOVER_DELAY_MS)
  }

  return (
    <section className="sec why why2" id="why">
      <div className="wrap">
        <div className="why2-grid">
          <div className="why2-main">
            <div className="why-l" ref={leftRef}>
              <span className="eyebrow">{t(why.eyebrow)}</span>
              <h2 className="h2"><span className="l">{t(why.title)}</span><span className="l gold">{t(why.titleGold)}</span></h2>
              <p className="lede">{t(why.lede)}</p>
            </div>
            <div className="acc" ref={accRef}>
              {why.items.map((it, i) => {
                const isOpen = open === i
                return (
                  <div
                    key={i}
                    className={`acc-i${isOpen ? ' open' : ''}`}
                    onMouseEnter={() => onEnter(i)}
                    onMouseLeave={() => clearTimeout(hoverTimer.current)}
                  >
                    <button
                      className="acc-b" type="button" aria-expanded={isOpen} aria-controls={`ac${i + 1}`}
                      onClick={() => setOpen(isOpen ? -1 : i)}
                    >
                      <span className="acc-n num">{pad(i + 1)}</span>
                      <span className="t">{t(it.title)}</span>
                      <span className="pm" aria-hidden="true" />
                    </button>
                    <div className="acc-p" id={`ac${i + 1}`}>
                      <div><p>{t(it.text)}</p></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <figure className="why2-fig">
            <img src={why.image} alt="" style={{ objectPosition: why.imagePos }} />
            <span className="frame" aria-hidden="true"><i /><i /><i /><i /></span>
            <figcaption>
              <img src="/icon.svg" alt="" aria-hidden="true" />
              <span>{t(why.caption)}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
