import { AinamRichText, ainamImageProps } from '@ainam/next'
import { draftMode } from 'next/headers'
import { ainam, isConfigured } from '@/lib/ainam'

/**
 * Every string on this page comes from AINAM. Nothing here is hardcoded copy —
 * that is the point of the template.
 *
 * The markup and styles are the template's own, not AINAM's design system: this
 * is what a customer clones, and it should show them their site rather than
 * ours. Replace `site.css` with whatever you actually use.
 */
export default async function HomePage() {
  const previewing = (await draftMode()).isEnabled

  const [eyebrow, title, subtitle, cta, showPricing, seats, hero, about] = await Promise.all([
    ainam.get('home/hero/eyebrow'),
    ainam.get('home/hero/title'),
    ainam.get('home/hero/subtitle'),
    ainam.get('home/hero/cta'),
    ainam.get('home/pricing/visible'),
    ainam.get('home/pricing/seats'),
    ainam.get('home/hero/image'),
    ainam.get('home/about/body'),
  ])

  // Props, not a component: @ainam/core has no runtime dependencies, so it
  // hands over what an <img> needs and the site decides how to render it.
  const image = ainamImageProps(hero)

  return (
    <main className="site">
      <header className="site__header">
        <span className="site__brand">Your brand</span>
        {/* Stated on the page, not just in a cookie: someone looking at an
            unpublished draft has to be able to tell that is what they see. */}
        <span className="badge">
          {previewing ? 'Preview — unpublished drafts' : isConfigured ? 'Live content' : 'Build-time snapshot'}
        </span>
      </header>

      <section style={{ display: 'grid', gap: 24 }}>
        <span className="eyebrow">{eyebrow}</span>
        <h1>
          {title}
          <br />
          <span>{subtitle}</span>
        </h1>
        <div>
          <a className="button" href="#get-started">
            {cta}
          </a>
        </div>
      </section>

      {/* Closes up entirely when nobody has uploaded one — the only field kind
          with no default, so the site has to handle its absence. */}
      {image ? <img {...image} className="hero__image" alt={image.alt} /> : null}

      <section style={{ display: 'grid', gap: 16 }}>
        <span className="eyebrow">About</span>
        {/* React elements, not dangerouslySetInnerHTML: the renderer only emits
            the nodes the editor offers, and React does the escaping. */}
        <AinamRichText value={about} className="prose" />
      </section>

      {/* A section the owner can switch off from the dashboard, no deploy. */}
      {showPricing ? (
        <section className="metric">
          <div className="metric__label">Included seats</div>
          <div className="metric__value">{seats}</div>
        </section>
      ) : null}
    </main>
  )
}
