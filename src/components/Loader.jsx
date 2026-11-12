import { useEffect, useState } from 'react'
import loaderSvg from './loaderSvg'
import { prefersReducedMotion } from '../hooks/useReducedMotion'

const MIN_SHOW_MS = 2500 // keep the mark on screen at least this long
const MAX_SHOW_MS = 5000 // never block the page longer than this

export default function Loader() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const root = document.documentElement
    let finished = false
    const timers = []
    const finish = () => {
      if (finished) return
      finished = true
      setDone(true)
      timers.push(setTimeout(() => root.classList.remove('loading'), 900))
    }
    const onLoad = () => timers.push(setTimeout(finish, Math.max(0, MIN_SHOW_MS - performance.now())))
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad)
    timers.push(setTimeout(finish, MAX_SHOW_MS))
    return () => {
      window.removeEventListener('load', onLoad)
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <div className={`loader${done ? ' done' : ''}`} aria-hidden="true">
      <div className="ld">
        <div className="ldj" dangerouslySetInnerHTML={{ __html: loaderSvg }} />
      </div>
    </div>
  )
}
