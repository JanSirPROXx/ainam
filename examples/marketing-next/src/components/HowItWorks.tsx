import { CodeBlock, Eyebrow } from '@ainam/ui'

export interface Step {
  title: string
  body: string
  code: string
  filename: string
}

export interface HowItWorksProps {
  eyebrow: string
  title: string
  body: string
  steps: Step[]
}

/** Numbering is positional, so reordering the list in the dashboard renumbers the steps. */
export function HowItWorks({ eyebrow, title, body, steps }: HowItWorksProps) {
  return (
    <section id="how" className="section">
      <div className="shell section__inner">
        <div className="section__head">
          <Eyebrow rule>{eyebrow}</Eyebrow>
          <h2 className="section__title">{title}</h2>
          <p className="section__body">{body}</p>
        </div>

        <div className="section__grid">
          {steps.map((step, index) => (
            <div key={step.title} className="step">
              <div className="step__head">
                <span className="step__no">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="step__title">{step.title}</h3>
              </div>
              <p className="step__body">{step.body}</p>
              {step.code === '' ? null : (
                <CodeBlock
                  code={step.code}
                  filename={step.filename === '' ? 'terminal' : step.filename}
                  showLineNumbers={false}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
