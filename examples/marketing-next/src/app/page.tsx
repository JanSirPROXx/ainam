import { draftMode } from 'next/headers'
import { Badge } from '@ainam/ui'
import { isConfigured } from '@/lib/ainam'
import { loadContent } from '@/lib/content'
import { ClosingCta } from '@/components/ClosingCta'
import { Features } from '@/components/Features'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { PublishFlow } from '@/components/PublishFlow'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { Testimonial } from '@/components/Testimonial'

/**
 * The AINAM marketing site.
 *
 * Every string below comes from AINAM. The page reads its content the way a
 * customer's site does — one client, a build-time snapshot behind it — so an
 * outage or a bad publish shows up here before it shows up for anyone paying
 * us.
 *
 * Content is read in one call rather than one `get` per key: this page renders
 * nearly the whole project, and one typed reader beats thirty-seven awaits.
 */
export default async function HomePage() {
  const previewing = (await draftMode()).isEnabled
  const c = await loadContent()

  return (
    <>
      <SiteHeader links={c('nav/links')} cta={c('nav/cta')} />

      {/* Stated on the page, not just in a cookie: someone looking at an
          unpublished draft has to be able to tell that is what they see. */}
      {previewing || !isConfigured ? (
        <div className="shell">
          <Badge tone={previewing ? 'info' : 'neutral'} dot>
            {previewing ? 'preview — unpublished drafts' : 'build-time snapshot'}
          </Badge>
        </div>
      ) : null}

      <main>
        <Hero
          announcement={
            c('home/hero/announcement/visible')
              ? {
                  visible: true,
                  tag: c('home/hero/announcement/tag'),
                  text: c('home/hero/announcement/text'),
                }
              : null
          }
          title={c('home/hero/title')}
          subtitle={c('home/hero/subtitle')}
          body={c('home/hero/body')}
          primaryCta={c('home/hero/cta/primary')}
          secondaryCta={c('home/hero/cta/secondary')}
          install={c('home/hero/install')}
          logos={{
            visible: c('home/logos/visible'),
            label: c('home/logos/label'),
            names: c('home/logos/names'),
          }}
        />

        <HowItWorks
          eyebrow={c('home/how/eyebrow')}
          title={c('home/how/title')}
          body={c('home/how/body')}
          steps={c('home/how/steps')}
        />

        <Features
          eyebrow={c('home/features/eyebrow')}
          title={c('home/features/title')}
          body={c('home/features/body')}
          items={c('home/features/items')}
        />

        <PublishFlow
          eyebrow={c('home/publish/eyebrow')}
          title={c('home/publish/title')}
          body={c('home/publish/body')}
        />

        {c('home/testimonial/visible') ? (
          <Testimonial
            quote={c('home/testimonial/quote')}
            name={c('home/testimonial/name')}
            role={c('home/testimonial/role')}
          />
        ) : null}

        <ClosingCta
          title={c('home/cta/title')}
          subtitle={c('home/cta/subtitle')}
          primary={c('home/cta/primary')}
          secondary={c('home/cta/secondary')}
        />
      </main>

      <SiteFooter
        tagline={c('footer/tagline')}
        status={{ visible: c('footer/status/visible'), label: c('footer/status/label') }}
        links={c('footer/links')}
      />
    </>
  )
}
