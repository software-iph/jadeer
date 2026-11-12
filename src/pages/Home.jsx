import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from '../components/Hero'
import About from '../components/About'
import Services from '../components/Services'
import Why from '../components/Why'
import Connect from '../components/Connect'

export default function Home() {
  const { hash } = useLocation()

  // Arriving from another page with "/#section": scroll to it once rendered.
  useEffect(() => {
    if (!hash) return
    const id = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 60)
    return () => clearTimeout(id)
  }, [hash])

  return (
    <main id="top">
      <Hero />
      <About />
      <Services />
      <Why />
      <Connect />
    </main>
  )
}
