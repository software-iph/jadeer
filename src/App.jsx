import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Loader from './components/Loader'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Home from './pages/Home'
import Careers from './pages/Careers'
import Contact from './pages/Contact'

// The dashboard is only downloaded when someone opens /admin.
const Admin = lazy(() => import('./admin/Admin'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => { if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  return null
}

function Site() {
  return (
    <>
      <Loader />
      <ScrollToTop />
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Suspense fallback={null}><Admin /></Suspense>} />
      <Route path="*" element={<Site />} />
    </Routes>
  )
}
