// The site always plays its animations (scroll-driven sections, loader, video),
// even when the operating system's "reduce animations" setting is on.
// To respect that setting again, return the media query result instead:
//   window.matchMedia('(prefers-reduced-motion: reduce)').matches
export function prefersReducedMotion() {
  return false
}

export function useReducedMotion() {
  return prefersReducedMotion()
}
