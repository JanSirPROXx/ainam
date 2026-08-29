import { Button } from '@ainam/ui'
import { DASHBOARD_URL, SOURCE_URL } from '@/lib/links'

export interface ClosingCtaProps {
  title: string
  subtitle: string
  primary: string
  secondary: string
}

export function ClosingCta({ title, subtitle, primary, secondary }: ClosingCtaProps) {
  return (
    <section className="section">
      <div className="shell section__inner closing">
        <h2 className="closing__title">
          {title}
          <br />
          <span>{subtitle}</span>
        </h2>
        <div className="actions">
          <Button as="a" href={DASHBOARD_URL} size="lg">
            {primary}
          </Button>
          <Button as="a" href={SOURCE_URL} size="lg" variant="secondary">
            {secondary}
          </Button>
        </div>
      </div>
    </section>
  )
}
