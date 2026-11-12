import { createContext, Fragment, useCallback, useContext, useState } from 'react'

const LangContext = createContext(null)
const STORAGE_KEY = 'jadeer-lang-ar'

// index.html sets data-lang before first paint; start from that so there is no flash.
function initialLang() {
  return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'ar'
}

function applyLang(l) {
  const root = document.documentElement
  root.setAttribute('data-lang', l)
  root.setAttribute('lang', l)
  root.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr')
  try { localStorage.setItem(STORAGE_KEY, l) } catch { /* storage unavailable */ }
}

/** Renders a string, turning "\n" into <br>. */
export function renderText(s) {
  if (typeof s !== 'string' || !s.includes('\n')) return s
  return s.split('\n').map((part, i) => (
    <Fragment key={i}>{i > 0 && <br />}{part}</Fragment>
  ))
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)
  const setLang = useCallback((l) => { applyLang(l); setLangState(l) }, [])
  const toggle = useCallback(() => setLang(lang === 'ar' ? 'en' : 'ar'), [lang, setLang])
  /** Pick the current language from a { en, ar } entry and render it. */
  const t = useCallback((entry) => renderText(entry?.[lang]), [lang])
  return (
    <LangContext.Provider value={{ lang, rtl: lang === 'ar', setLang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
