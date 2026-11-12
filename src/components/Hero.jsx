import { useEffect, useRef } from 'react'
import { useLang } from '../i18n'
import { useContent } from '../content-context'
import { ArrowUpRight } from './Icons'
import SmartLink from './SmartLink'

export default function Hero() {
  const { t } = useLang()
  const { hero } = useContent()
  const videoRef = useRef(null)

  // Background video always autoplays (muted) and loops forever.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true // React doesn't reliably set the muted attribute; autoplay needs it
    const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}) }
    const replay = () => { v.currentTime = 0; tryPlay() } // fallback if `loop` is ignored
    tryPlay()
    const retry = setTimeout(tryPlay, 2600) // after the loader fades out
    const onVisible = () => { if (!document.hidden) tryPlay() }
    // Browsers may pause offscreen videos; resume whenever the hero is visible again.
    let inView = true
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) tryPlay() })
      : null
    io?.observe(v)
    const onPause = () => { if (inView && !document.hidden) setTimeout(tryPlay, 300) }
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', replay)
    v.addEventListener('canplay', tryPlay)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      io?.disconnect()
      v.removeEventListener('pause', onPause)
      clearTimeout(retry)
      v.removeEventListener('ended', replay)
      v.removeEventListener('canplay', tryPlay)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [hero.video.mp4, hero.video.webm])

  return (
    <section className="hero hx" aria-label="Jadeer">
      <video
        ref={videoRef} key={hero.video.mp4 + hero.video.webm} poster={hero.video.poster} autoPlay muted loop playsInline preload="auto" aria-hidden="true"
      >
        {/* MP4 first: replacing it in the dashboard always changes what visitors see.
            WebM is only a fallback, and is skipped when left empty. */}
        {hero.video.mp4 && <source src={hero.video.mp4} type="video/mp4" />}
        {hero.video.webm && <source src={hero.video.webm} type="video/webm" />}
      </video>
      <div className="hx-in">
        <span className="hx-tag"><i />{t(hero.tag)}</span>
        <h1>
          <span className="ln">{t(hero.titleLine1)}</span>
          <span className="ln">{t(hero.titleLine2)}<em>{t(hero.titleGold)}</em></span>
        </h1>
        <div className="hx-bot">
          <ul className="hx-list">
            {hero.list.map((item, i) => (
              <li key={i}><SmartLink href="/#services">{t(item)}</SmartLink></li>
            ))}
          </ul>
          <div className="hx-side">
            <p>{t(hero.side)}</p>
            <div className="hx-btns">
              <SmartLink className="hx-pill gold" href="/#services">{t(hero.ctaServices)}<ArrowUpRight /></SmartLink>
              <SmartLink className="hx-pill" href="/contact">{t(hero.ctaContact)}<ArrowUpRight /></SmartLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
