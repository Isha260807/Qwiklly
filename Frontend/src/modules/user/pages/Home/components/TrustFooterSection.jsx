import React from 'react'
import { themeColors } from '../../../../../theme'

const pick = (value, fallback) => {
  if (value === undefined) return fallback
  if (value === null) return fallback
  return value
}

const LaurelBranch = ({ flip = false, className = "h-11 w-4 text-gray-300" }) => (
  <svg
    viewBox="0 0 20 48"
    fill="currentColor"
    className={`${className} ${flip ? '-scale-x-100' : ''}`}
    aria-hidden="true"
  >
    {/* Smooth curved stem (from bottom to top) */}
    <path
      d="M14 46 C5 36, 4 14, 15 2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      opacity="0.4"
    />
    {/* Top leaf pointing up */}
    <path d="M15 2 C14 0, 11 0, 10 2 C11 4, 14 4, 15 2 Z" opacity="0.85" />
    
    {/* Pair 1 (near top) - pointing up */}
    <path d="M11 9 C8 7, 5 8, 4 10 C6 11, 9 11, 11 9 Z" opacity="0.85" />
    <path d="M13 8 C15 6, 18 7, 19 9 C17 10, 14 10, 13 8 Z" opacity="0.85" />

    {/* Pair 2 (upper middle) */}
    <path d="M7 17 C4 15, 1 16, 0 18 C2 19, 5 19, 7 17 Z" opacity="0.85" />
    <path d="M9 16 C11 14, 14 15, 15 17 C13 18, 10 18, 9 16 Z" opacity="0.85" />

    {/* Pair 3 (lower middle) */}
    <path d="M6 26 C3 24, 0 25, 0 27 C2 28, 5 28, 6 26 Z" opacity="0.85" />
    <path d="M8 25 C10 23, 13 24, 14 26 C12 27, 9 27, 8 25 Z" opacity="0.85" />

    {/* Pair 4 (near bottom) */}
    <path d="M8 35 C5 33, 2 34, 2 36 C4 37, 7 37, 8 35 Z" opacity="0.85" />
    <path d="M10 34 C12 32, 15 33, 16 35 C14 36, 11 36, 10 34 Z" opacity="0.85" />

    {/* Bottom pair */}
    <path d="M12 43 C9 41, 6 42, 6 44 C8 45, 11 45, 12 43 Z" opacity="0.85" />
  </svg>
)

const TrustFooterSection = ({ config = {}, services = [] }) => {
  if (config.isVisible === false) return null
  const ratings = services.map(service => Number(service.rating)).filter(rating => Number.isFinite(rating)).filter(rating => rating > 0)
  let calculatedRating = '4.8'
  if (ratings.length > 0) calculatedRating = (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
  const title = pick(config.title, 'Relax, your home is in professional hands')
  const trustedBy = pick(config.trustedBy, '15 lakh')
  const trustedLabel = pick(config.trustedLabel, 'Families')
  const rating = pick(config.rating, calculatedRating)
  const ratingLabel = pick(config.ratingLabel, '3 Lakh+ Ratings')
  const imageUrl = pick(config.imageUrl, '/Homster xpert .png')

  const renderTitle = (text) => {
    if (text === 'Relax, your home is in professional hands') {
      return (
        <>
          Relax, your home is in<br />professional hands
        </>
      )
    }
    return text
  }

  const ui = {
    section: 'mt-8 sm:mt-10 w-full overflow-hidden relative block lg:hidden',
    content: 'px-4 sm:px-6 pb-0 pt-5 sm:pt-7 text-center relative z-20',
    title: 'mx-auto max-w-[260px] sm:max-w-xs text-sm sm:text-base md:text-lg font-bold leading-snug tracking-tight',
    stats: 'mx-auto mt-5 sm:mt-6 flex items-center justify-center gap-4 sm:gap-8 max-w-sm px-2',
    statCard: 'flex items-center justify-center gap-1 sm:gap-1.5 flex-1 max-w-[150px]',
    statBody: 'text-center px-0.5 min-w-0',
    statLabel: 'text-[10px] sm:text-xs font-medium text-gray-500 leading-none mb-1 whitespace-nowrap',
    statValue: 'text-sm sm:text-base md:text-lg font-extrabold leading-tight text-gray-900',
    statMini: 'text-[9px] sm:text-[11px] text-gray-500 leading-none mt-1 whitespace-nowrap',
    visual: 'relative mt-4 sm:mt-5 w-full overflow-hidden flex items-end justify-center',
    skyline: 'absolute inset-x-0 bottom-0 h-36 sm:h-44 opacity-50 pointer-events-none',
    glow: 'absolute bottom-0 left-1/2 h-44 sm:h-56 w-44 sm:w-56 -translate-x-1/2 rounded-full opacity-60 pointer-events-none',
    person: 'relative z-10 w-full h-auto object-cover object-bottom select-none pointer-events-none block'
  }

  return (
    <section className={ui.section} style={{ background: themeColors.brand.background, borderColor: themeColors.brand.border }}>
      <div className={ui.content}>
        <h2 className={ui.title} style={{ color: themeColors.brand.heading }}>
          {renderTitle(title)}
        </h2>
        <div className={ui.stats}>
          {/* Trusted by stat */}
          <div className={ui.statCard}>
            <LaurelBranch className="h-9 sm:h-11 w-3 sm:w-4 text-gray-300 flex-shrink-0" />
            <div className={ui.statBody}>
              <p className={ui.statLabel}>{pick(config.trustedPrefix, 'Trusted by')}</p>
              <p className={ui.statValue} style={{ color: themeColors.brand.heading }}>{trustedBy}</p>
              <p className={ui.statMini}>{trustedLabel}</p>
            </div>
            <LaurelBranch flip className="h-9 sm:h-11 w-3 sm:w-4 text-gray-300 flex-shrink-0" />
          </div>

          {/* Rated stat */}
          <div className={ui.statCard}>
            <LaurelBranch className="h-9 sm:h-11 w-3 sm:w-4 text-gray-300 flex-shrink-0" />
            <div className={ui.statBody}>
              <p className={ui.statLabel}>{pick(config.ratedPrefix, 'Rated')}</p>
              <p className={ui.statValue} style={{ color: themeColors.brand.heading }}>{rating}</p>
              <p className={ui.statMini}>{ratingLabel}</p>
            </div>
            <LaurelBranch flip className="h-9 sm:h-11 w-3 sm:w-4 text-gray-300 flex-shrink-0" />
          </div>
        </div>
      </div>
      <div className={ui.visual}>
        <div className={ui.skyline} style={{ background: 'linear-gradient(135deg, transparent 0%, ' + themeColors.brand.accent + '25 100%)', clipPath: 'polygon(0 65%, 12% 50%, 22% 68%, 34% 35%, 48% 62%, 61% 42%, 75% 65%, 88% 45%, 100% 60%, 100% 100%, 0 100%)' }} />
        <div className={ui.glow} style={{ background: 'radial-gradient(circle, ' + themeColors.brand.accent + '45 0%, transparent 70%)' }} />
        <img src={imageUrl} alt={title} className={ui.person} />
      </div>
    </section>
  )
}

export default TrustFooterSection
