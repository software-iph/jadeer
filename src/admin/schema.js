// Dashboard structure: which sections appear in the sidebar, friendlier field names,
// and blank templates for lists that can start empty.

export const SECTIONS = [
  { key: 'hero', label: 'Hero', hint: 'Video, headline and buttons at the top of the home page.' },
  { key: 'about', label: 'About panels', hint: 'The three expanding panels (Jadeer / Mission / Vision).' },
  { key: 'services', label: 'Services', hint: 'The "What we do" cards.' },
  { key: 'why', label: 'Why Jadeer', hint: 'Accordion, photo and caption.' },
  { key: 'connect', label: 'Connect band', hint: 'Short call-to-action at the end of the home page.' },
  { key: 'contact', label: 'Contact details', hint: 'Email, phone numbers and location used across the site.' },
  { key: 'careers', label: 'Careers', hint: 'Applications received, job openings and the Careers page text.' },
  { key: 'contactPage', label: 'Contact page', hint: 'Heading and form labels on the Contact page.' },
  { key: 'nav', label: 'Menu', hint: 'Top navigation links.' },
  { key: 'footer', label: 'Footer', hint: 'Footer headings, tagline and copyright.' },
]

const LABELS = {
  en: 'English', ar: 'العربية', href: 'Link', img: 'Image', image: 'Image', poster: 'Poster image',
  mp4: 'Video (MP4) — main video', webm: 'Video (WebM) — optional backup, can be left empty', imgPos: 'Image focus point', imagePos: 'Image focus point',
  eyebrow: 'Small heading', lede: 'Intro text', titleGold: 'Title (gold part)', titleLine1: 'Title line 1',
  titleLine2: 'Title line 2', tag: 'Tag line', side: 'Side text', ctaServices: 'Button: services',
  ctaContact: 'Button: contact', ctaCareers: 'Button: careers', hint: 'Hint text', strip: 'Strip label',
  kicker: 'Kicker', word: 'Big background word', points: 'Bullet points', items: 'Items', panels: 'Panels',
  list: 'Service list', perks: 'Perks', jobs: 'Job openings', topics: 'Topic options', phones: 'Phone numbers',
  noJobs: 'Text when no jobs are open', applyLabel: 'Apply button', cvTitle: 'CV box title', cvText: 'CV box text',
  cvButton: 'CV box button', email: 'Email address', emailField: 'Email field', phoneField: 'Phone field',
  openingsTitle: 'Openings heading', perksTitle: 'Perks heading', formTitle: 'Form heading', text: 'Text',
  links: 'Links', map: 'Map', show: 'Show the map on the Contact page',
  query: 'Map location: address or coordinates (e.g. 32.1167, 20.0667)', link: 'Google Maps share link (optional, used when people click the location)', open: 'Position is open (shown on the site)', applyType: 'How people apply',
  applyUrl: 'External apply link (optional) — if filled in, Apply opens this link. Leave empty to receive applications here in the dashboard', applyLinkLabel: 'External apply button', form: 'Application form labels',
  generalTitle: 'General CV form title', sending: 'Sending text', success: 'Thank-you message', submit: 'Submit button', close: 'Close button', cv: 'CV field', connect: 'Contact button', labels: 'Labels', caption: 'Photo caption', note: 'Note under form',
}

export function labelFor(key) {
  if (key in LABELS) return LABELS[key]
  if (/^\d+$/.test(key)) return `#${Number(key) + 1}`
  const s = String(key).replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const bi = () => ({ en: '', ar: '' })
export const TEMPLATES = {
  'careers.jobs': () => ({
    id: Math.random().toString(36).slice(2, 10), open: true, applyType: 'form', applyUrl: '',
    title: bi(), location: bi(), type: bi(), text: bi(),
  }),
  'contact.phones': () => '',
}

export const MEDIA_KEYS = new Set(['img', 'image', 'poster', 'mp4', 'webm'])
export const MEDIA_RE = /\.(jpe?g|png|webp|gif|svg|avif|mp4|webm)(\?.*)?$/i
export const isVideo = (url) => /\.(mp4|webm)(\?.*)?$/i.test(url || '')

/** Fields shown as a dropdown instead of a text box. */
export const SELECTS = {
  applyType: [
    ['form', 'Application form on this site (applications appear in the dashboard)'],
    ['link', 'External link (e.g. LinkedIn, Google Form)'],
  ],
}

/** Internal keys that are never shown in the editor. */
export const HIDDEN_KEYS = new Set(['id', 'applyType']) // applyType: the external link field decides instead
