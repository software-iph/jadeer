import { useEffect, useState } from 'react'
import { prefersReducedMotion } from './useReducedMotion'

function check() {
  return !prefersReducedMotion() && window.innerHeight >= (window.innerWidth > 900 ? 601 : 560)
}

/** Whether scroll-pinned sections should be used (tall enough viewport, motion allowed). */
export function usePinned() {
  const [pinned, setPinned] = useState(check)
  useEffect(() => {
    const onResize = () => setPinned(check())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return pinned
}
