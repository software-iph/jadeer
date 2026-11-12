import { useCallback, useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { useContent } from '../content-context'
import { usePinned } from '../hooks/usePinned'
import { prefersReducedMotion } from '../hooks/useReducedMotion'
import { useRevealChildren } from '../hooks/useRevealChildren'
import { ChevronLeft, ChevronRight } from './Icons'

const pad = (n) => String(n).padStart(2, '0')

/**
 * "What we do" stacked cards.
 * When pinned, scroll progress slides the next card up over the previous one.
 * Card transforms are written straight to CSS variables every frame (no re-render).
 */
export default function Services() {
  const { t, lang, rtl } = useLang()
  const { services } = useContent()
  const items = services.items
  const n = items.length
  const pinned = usePinned()
  const [cur, setCur] = useState(0)

  const trackRef = useRef(null)
  const headRef = useRef(null)
  const cardRefs = useRef([])
  const anim = useRef({ pos: 0, target: 0, loopOn: false, cur: 0 })
  useRevealChildren(headRef)

  const apply = useCallback((p) => {
    const at = p * (n - 1)
    cardRefs.current.forEach((c, k) => {
      if (!c) return
      const rel = k - at
      let ty, sc, d
      if (rel >= 0) { ty = Math.min(rel, 1.2) * c.offsetHeight * 1.04; sc = 1; d = 0 }
      else { const q = Math.min(-rel, 2); ty = -q * 18; sc = 1 - q * 0.06; d = Math.min(q, 1) }
      c.style.setProperty('--ty', `${ty.toFixed(1)}px`)
      c.style.setProperty('--sc', sc.toFixed(4))
      c.style.setProperty('--d', d.toFixed(3))
      c.style.setProperty('--z', String(10 + k))
    })
    const i = Math.min(n - 1, Math.max(0, Math.round(at)))
    if (i !== anim.current.cur) { anim.current.cur = i; setCur(i) }
  }, [n])

  // Ease `pos` toward `target` each frame.
  const kick = useCallback(() => {
    const st = anim.current
    if (st.loopOn) return
    st.loopOn = true
    const loop = () => {
      const df = st.target - st.pos
      if (Math.abs(df) < 0.0004) { st.pos = st.target; apply(st.pos); st.loopOn = false; return }
      st.pos += df * 0.1
      apply(st.pos)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }, [apply])

  const span = () => {
    const range = Math.max(1, trackRef.current.offsetHeight - window.innerHeight)
    return Math.max(1, range - window.innerHeight * 0.45)
  }

  useEffect(() => {
    apply(anim.current.pos)
    if (!pinned) return
    const onScroll = () => {
      anim.current.target = Math.max(0, Math.min(1, -trackRef.current.getBoundingClientRect().top / span()))
      kick()
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [pinned, lang, apply, kick])

  const go = (i) => {
    i = Math.max(0, Math.min(n - 1, i))
    if (pinned) {
      const top = trackRef.current.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: top + span() * (n > 1 ? i / (n - 1) : 0) + 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    } else {
      anim.current.target = n > 1 ? i / (n - 1) : 0
      kick()
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { go(rtl ? cur - 1 : cur + 1); e.preventDefault() }
    if (e.key === 'ArrowLeft') { go(rtl ? cur + 1 : cur - 1); e.preventDefault() }
  }

  // Swipe support
  const x0 = useRef(null)
  const onPointerUp = (e) => {
    if (x0.current === null) return
    const dx = e.clientX - x0.current
    x0.current = null
    if (Math.abs(dx) > 40) go(cur + ((dx < 0) !== rtl ? 1 : -1))
  }

  return (
    <section className={`wwd2${pinned ? ' pin' : ''}`} id="services">
      <div
        className="sc-track"
        ref={trackRef}
        style={pinned ? { height: `calc(100vh + ${(n - 1) * 90 + 45}vh)` } : undefined}
      >
        {items.map((_, i) => (
          <span key={i} className="snap-pt" style={{ top: `${i * 90}vh` }} aria-hidden="true" />
        ))}
        <div className="sc-stick">
          <div className="sc-head wrap" ref={headRef}>
            <span className="eyebrow">{t(services.eyebrow)}</span>
            <h2 className="h2">{t(services.title)}<span className="gold">{t(services.titleGold)}</span></h2>
          </div>
          <div
            className="sc-stage"
            role="region"
            aria-roledescription="carousel"
            aria-label="Our services"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => { x0.current = e.clientX }}
            onPointerUp={onPointerUp}
          >
            {items.map((it, k) => (
              <article
                key={k}
                className="sc-card"
                ref={(el) => { cardRefs.current[k] = el }}
                onClick={() => { if (k !== cur) go(k) }}
              >
                <img src={it.img} alt="" style={{ objectPosition: it.imgPos }} />
                <span className="sc-shade" aria-hidden="true" />
                <div className="sc-top">
                  <span className="sc-k">{t(it.kicker)}</span>
                  <span className="num">{pad(k + 1)} / {pad(n)}</span>
                </div>
                <div className="sc-body">
                  <h3>{t(it.title)}</h3>
                  <div className="sc-det">
                    <p>{t(it.text)}</p>
                    <ul>{it.points.map((pt, j) => <li key={j}>{t(pt)}</li>)}</ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="sc-ctrl">
            <button className="cf-arrow" id="scPrev" type="button" aria-label="Previous service" onClick={() => go(cur - 1)}>
              <ChevronLeft />
            </button>
            <div className="sc-dots">
              {items.map((_, k) => (
                <button key={k} type="button" aria-label={`Service ${k + 1}`} aria-current={k === cur} onClick={() => go(k)} />
              ))}
            </div>
            <button className="cf-arrow" id="scNext" type="button" aria-label="Next service" onClick={() => go(cur + 1)}>
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
