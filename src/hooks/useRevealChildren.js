import { useEffect } from 'react'
import { prefersReducedMotion } from './useReducedMotion'

/**
 * Fades/slides in each direct child of `ref` when it scrolls into view,
 * staggered by 90ms (uses the .rv / .rv.in classes from global.css).
 */
export function useRevealChildren(ref) {
  useEffect(() => {
    const parent = ref.current
    if (!parent || prefersReducedMotion() || !('IntersectionObserver' in window)) return
    const els = Array.from(parent.children)
    els.forEach((el, i) => {
      el.classList.add('rv')
      el.style.transitionDelay = `${i * 90}ms`
    })
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      })
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ref])
}
