import { Link, useLocation } from 'react-router-dom'

/**
 * Link that understands the site's mix of in-page anchors and pages:
 * "/#about" scrolls on the home page and navigates home from other pages,
 * "/careers" uses client-side routing, anything else is a normal link.
 */
export default function SmartLink({ href = '', children, ...rest }) {
  const { pathname } = useLocation()
  if (href.startsWith('/#')) {
    if (pathname === '/') return <a href={href.slice(1)} {...rest}>{children}</a>
    return <Link to={href} {...rest}>{children}</Link>
  }
  if (href.startsWith('/') && !href.startsWith('/uploads')) return <Link to={href} {...rest}>{children}</Link>
  return <a href={href} {...rest}>{children}</a>
}
