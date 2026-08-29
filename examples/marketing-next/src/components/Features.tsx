import { Card, Eyebrow } from '@ainam/ui'
import { FeatureIcon } from './FeatureIcon'

export interface Feature {
  icon: string
  title: string
  body: string
}

export interface FeaturesProps {
  eyebrow: string
  title: string
  body: string
  items: Feature[]
}

export function Features({ eyebrow, title, body, items }: FeaturesProps) {
  return (
    <section id="product" className="section">
      <div className="shell section__inner">
        <div className="section__head">
          <Eyebrow rule>{eyebrow}</Eyebrow>
          <h2 className="section__title">{title}</h2>
          <p className="section__body">{body}</p>
        </div>

        <div className="section__grid">
          {items.map((item) => (
            <Card key={item.title} gradientBorder padding="md">
              <span className="feature__icon">
                <FeatureIcon name={item.icon} />
              </span>
              <h3 className="feature__title">{item.title}</h3>
              <p className="feature__body">{item.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
