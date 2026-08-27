import { AinamRichText, ainamImageProps } from '@ainam/next'
import { Badge, Button, Eyebrow, GridBackdrop, Metric, Wordmark } from '@ainam/ui'
import { draftMode } from 'next/headers'
import { ainam, isConfigured } from '@/lib/ainam'

/**
 * Every string on this page comes from AINAM. Nothing here is hardcoded copy —
 * that is the point of the template.
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
    <GridBackdrop glow>
      <main
        style={{
          maxWidth: 'var(--container-lg)',
          margin: '0 auto',
          padding: 'var(--section-y) var(--gutter-page)',
          display: 'grid',
          gap: 'var(--space-13)',
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Wordmark />
          {/* Stated on the page, not just in a cookie: someone looking at an
              unpublished draft has to be able to tell that is what they see. */}
          <Badge tone={previewing ? 'info' : isConfigured ? 'success' : 'warning'} dot>
            {previewing
              ? 'Preview — unpublished drafts'
              : isConfigured
                ? 'Live content'
                : 'Build-time snapshot'}
          </Badge>
        </header>

        <section style={{ display: 'grid', gap: 'var(--space-6)', maxWidth: 680 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 style={{ font: 'var(--type-display)', letterSpacing: 'var(--ls-display)' }}>
            {title}
            <br />
            <span style={{ color: 'var(--text-faint)' }}>{subtitle}</span>
          </h1>
          <div>
            <Button size="lg">{cta}</Button>
          </div>
        </section>

        {/* Closes up entirely when nobody has uploaded one — the only field
            kind with no default, so the site has to handle its absence. */}
        {image ? (
          <img
            {...image}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          />
        ) : null}

        <section style={{ display: 'grid', gap: 'var(--space-5)', maxWidth: 680 }}>
          <Eyebrow>About</Eyebrow>
          {/* React elements, not dangerouslySetInnerHTML: the renderer only
              emits the nodes the editor offers, and React does the escaping. */}
          <AinamRichText value={about} />
        </section>

        {/* A section the owner can switch off from the dashboard, no deploy. */}
        {showPricing ? (
          <section style={{ display: 'grid', gap: 'var(--space-5)' }}>
            <Eyebrow>Pricing</Eyebrow>
            <Metric label="Included seats" value={String(seats)} hint="Add more at any time" />
          </section>
        ) : null}
      </main>
    </GridBackdrop>
  )
}
