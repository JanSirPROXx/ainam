import { Badge, Button, Eyebrow, GridBackdrop, Metric, Wordmark } from '@ainam/ui'
import { draftMode } from 'next/headers'
import { ainam, isConfigured } from '@/lib/ainam'

/**
 * Every string on this page comes from AINAM. Nothing here is hardcoded copy —
 * that is the point of the template.
 */
export default async function HomePage() {
  const previewing = (await draftMode()).isEnabled

  const [eyebrow, title, subtitle, cta, showPricing, seats] = await Promise.all([
    ainam.get('home/hero/eyebrow'),
    ainam.get('home/hero/title'),
    ainam.get('home/hero/subtitle'),
    ainam.get('home/hero/cta'),
    ainam.get('home/pricing/visible'),
    ainam.get('home/pricing/seats'),
  ])

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
