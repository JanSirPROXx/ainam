import { Badge, Button, GridBackdrop } from '@ainam/ui'
import { DASHBOARD_URL, DOCS_URL } from '@/lib/links'
import { LogoWall } from './LogoWall'
import { SdkTabs } from './SdkTabs'

export interface HeroProps {
  announcement: { visible: boolean; tag: string; text: string } | null
  title: string
  subtitle: string
  body: string
  primaryCta: string
  secondaryCta: string
  install: string
  logos: { visible: boolean; label: string; names: Array<{ name: string }> }
}

/** The one section on the page carrying the glow — everything below keeps the grid alone. */
export function Hero(props: HeroProps) {
  const { announcement, title, subtitle, body, primaryCta, secondaryCta, install, logos } = props

  return (
    <GridBackdrop>
      <div className="shell">
        <div className="hero">
          {announcement?.visible ? (
            <span className="hero__pill">
              <Badge tone="success">{announcement.tag}</Badge>
              {announcement.text}
            </span>
          ) : null}

          <h1 className="hero__title">
            {title}
            <br />
            <span>{subtitle}</span>
          </h1>

          <p className="hero__body">{body}</p>

          <div className="actions">
            <Button as="a" href={DASHBOARD_URL} size="lg">
              {primaryCta}
            </Button>
            <Button
              as="a"
              href={DOCS_URL}
              size="lg"
              variant="secondary"
            >
              {secondaryCta}
            </Button>
          </div>

          <span className="hero__install">{install}</span>
        </div>

        <SdkTabs />

        {logos.visible ? <LogoWall label={logos.label} names={logos.names} /> : null}
      </div>
    </GridBackdrop>
  )
}
