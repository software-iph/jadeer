/** Map helpers for contact.map = { show, query, link }. */

/** Link that opens the location in Google Maps (the custom link wins if filled in). */
export function mapLink(map, fallback) {
  const custom = String(map?.link || '').trim()
  if (/^https?:\/\//i.test(custom)) return custom
  const q = String(map?.query || fallback || '').trim()
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}

/** Embeddable map URL (no API key needed). */
export function mapEmbed(map, fallback) {
  const q = String(map?.query || fallback || '').trim()
  return q ? `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed` : null
}
