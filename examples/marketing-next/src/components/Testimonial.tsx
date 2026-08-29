import { Eyebrow } from '@ainam/ui'

export interface TestimonialProps {
  quote: string
  name: string
  role: string
}

/**
 * Renders nothing without a quote and an attribution.
 *
 * An unattributed quote on a marketing page reads as a customer saying it, so
 * the section is absent rather than half-filled until both are set.
 */
export function Testimonial({ quote, name, role }: TestimonialProps) {
  if (quote.trim() === '' || name.trim() === '') return null

  return (
    <section className="section">
      <div className="shell section__inner">
        <div className="quote">
          <Eyebrow>Customers</Eyebrow>
          <blockquote className="quote__text">&ldquo;{quote}&rdquo;</blockquote>
          <div className="quote__by">
            <span className="quote__name">{name}</span>
            <span className="quote__role">{role}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
