import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import defaultContent from './content'

const ContentContext = createContext({ content: defaultContent })

/**
 * Provides the site content. Starts with the bundled defaults (instant first paint)
 * and swaps in the live content from the API (edited in /admin).
 */
export function ContentProvider({ children }) {
  const [content, setContent] = useState(defaultContent)

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/content')
      if (res.ok) setContent(await res.json())
    } catch { /* API unavailable: keep defaults */ }
  }, [])

  useEffect(() => { reload() }, [reload])

  return <ContentContext.Provider value={{ content, setContent, reload }}>{children}</ContentContext.Provider>
}

/** The whole site content object ({ hero, about, services, ... }). */
export function useContent() {
  return useContext(ContentContext).content
}

export function useContentContext() {
  return useContext(ContentContext)
}
