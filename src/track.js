// Tells the server a page was shown (for the dashboard's Visitors page).
// No cookies: the only thing kept in the browser is where this visit came from,
// in sessionStorage, which is gone when the tab is closed.
const SRC_KEY = 'jd-src'
let last = { path: '', t: 0 }

function visitSource() {
  let src = sessionStorage.getItem(SRC_KEY)
  if (src !== null) return src
  const utm = new URLSearchParams(location.search).get('utm_source')
  if (utm) src = `utm:${utm}`
  else {
    try { src = document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : '' } catch { src = '' }
  }
  sessionStorage.setItem(SRC_KEY, src)
  return src
}

export function trackPage(path, lang) {
  try {
    const now = Date.now()
    if (path === last.path && now - last.t < 1500) return // same page reported twice (React dev mode)
    last = { path, t: now }
    const body = JSON.stringify({ path, lang, ref: visitSource() })
    const blob = new Blob([body], { type: 'application/json' })
    if (!(navigator.sendBeacon && navigator.sendBeacon('/api/track', blob))) {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch { /* statistics must never break the site */ }
}
