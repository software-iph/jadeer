/**
 * Where a job's Apply button should go. If an external link is filled in, it wins
 * (whatever the dropdown says). Links typed without "https://" are fixed up.
 * Returns null when the job uses the on-site application form.
 */
export function externalApplyUrl(job) {
  const url = String(job?.applyUrl || '').trim()
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (/^(mailto:|tel:)/i.test(url)) return url
  if (/^[\w-]+(\.[\w-]+)+/.test(url)) return `https://${url}` // e.g. linkedin.com/jobs/...
  return null
}
