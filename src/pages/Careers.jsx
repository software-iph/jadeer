import { useState } from 'react'
import { useLang } from '../i18n'
import { useContent } from '../content-context'
import { ArrowUpRight } from '../components/Icons'
import ApplyForm from '../components/ApplyForm'
import { externalApplyUrl } from '../jobs'

export default function Careers() {
  const { t, lang } = useLang()
  const { careers } = useContent()
  const pick = (o) => (o && o[lang]) || ''
  // Only open positions with a title are shown.
  const jobs = (careers.jobs || []).filter((j) => j.open !== false && (pick(j.title) || j.title?.en))
  const [applying, setApplying] = useState(null) // job object, 'general', or null

  return (
    <main id="top" className="page">
      <section className="pg-head">
        <div className="wrap pg-head-in">
          <div className="pg-head-txt">
            <span className="eyebrow">{t(careers.eyebrow)}</span>
            <h1 className="h2">{t(careers.title)} <span className="gold">{t(careers.titleGold)}</span></h1>
            <p className="lede">{t(careers.lede)}</p>
          </div>
          {careers.image && (
            <figure className="pg-head-fig">
              <img src={careers.image} alt="" />
              <span className="frame" aria-hidden="true"><i /><i /><i /><i /></span>
            </figure>
          )}
        </div>
      </section>

      <section className="pg-sec">
        <div className="wrap">
          <h2 className="pg-h">{t(careers.perksTitle)}</h2>
          <div className="perks">
            {careers.perks.map((p, i) => (
              <div className="perk" key={i}>
                <span className="perk-n num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{t(p.title)}</h3>
                <p>{t(p.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pg-sec pg-alt" id="openings">
        <div className="wrap">
          <h2 className="pg-h">{t(careers.openingsTitle)}</h2>
          {jobs.length === 0 ? (
            <p className="jobs-empty">{t(careers.noJobs)}</p>
          ) : (
            <ul className="jobs">
              {jobs.map((j, i) => {
                const external = externalApplyUrl(j)
                return (
                  <li className="job" key={j.id || i}>
                    <div className="job-main">
                      <h3>{pick(j.title) || j.title?.en}</h3>
                      <div className="job-meta">
                        {pick(j.location) && <span>{t(j.location)}</span>}
                        {pick(j.type) && <span>{t(j.type)}</span>}
                      </div>
                      {pick(j.text) && <p>{t(j.text)}</p>}
                    </div>
                    {external ? (
                      <a className="hx-pill gold" href={external} target="_blank" rel="noopener noreferrer">
                        {t(careers.applyLabel)}<ArrowUpRight />
                      </a>
                    ) : (
                      <button type="button" className="hx-pill gold" onClick={() => setApplying(j)}>
                        {t(careers.applyLabel)}<ArrowUpRight />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <div className="cv-card">
            <div>
              <h3>{t(careers.cvTitle)}</h3>
              <p>{t(careers.cvText)}</p>
            </div>
            <button type="button" className="hx-pill" onClick={() => setApplying('general')}>
              {t(careers.cvButton)}<ArrowUpRight />
            </button>
          </div>
        </div>
      </section>

      {applying && <ApplyForm job={applying === 'general' ? null : applying} onClose={() => setApplying(null)} />}
    </main>
  )
}
