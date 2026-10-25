'use client'

import { useState } from 'react'
import { Badge, Card, Eyebrow, Switch, Table } from '@ainam/ui'
import type { Dictionary } from '@/lib/dictionary'

export interface PublishFlowProps {
  eyebrow: string
  title: string
  body: string
  labels: Dictionary['publish']
  /** The live headline, so the demo shows this page's own value. */
  heroTitle: string
  /** How many feature cards are live; the draft shows one more. */
  cardCount: number
}

type State = 'live' | 'edited' | 'unchanged'

const withCount = (template: string, count: number) => template.replace('{count}', String(count))

/**
 * What the dashboard shows before and after a publish, on the page itself.
 *
 * The two states are the product's actual model — a draft row and a published
 * row per key — not a simulation of something else. The values come from this
 * page's own content, and flipping the switch is the only interactive thing on
 * it. The keys are code, so they stay as they are in every language.
 */
export function PublishFlow({ eyebrow, title, body, labels, heroTitle, cardCount }: PublishFlowProps) {
  const [showDrafts, setShowDrafts] = useState(false)

  const published: Array<{ key: string; value: string; state: State }> = [
    { key: 'home/hero/title', value: heroTitle, state: 'live' },
    { key: 'home/features/items', value: withCount(labels.cards, cardCount), state: 'live' },
    { key: 'home/logos/visible', value: 'false', state: 'live' },
  ]
  const draft: Array<{ key: string; value: string; state: State }> = [
    { key: 'home/hero/title', value: heroTitle, state: 'unchanged' },
    { key: 'home/features/items', value: withCount(labels.cards, cardCount + 1), state: 'edited' },
    { key: 'home/logos/visible', value: 'true', state: 'edited' },
  ]

  const rows = (showDrafts ? draft : published).map((entry) => ({
    key: entry.key,
    value: entry.value,
    state:
      entry.state === 'edited' ? (
        <Badge tone="info">{labels.edited}</Badge>
      ) : entry.state === 'live' ? (
        <Badge tone="success">{labels.live}</Badge>
      ) : (
        <Badge>{labels.unchanged}</Badge>
      ),
  }))

  return (
    <section id="publish" className="section publish">
      <div className="publish__glow" aria-hidden="true" />
      <div className="shell section__inner publish__grid">
        <div className="section__head">
          <Eyebrow rule>{eyebrow}</Eyebrow>
          <h2 className="section__title">{title}</h2>
          <p className="section__body">{body}</p>
        </div>

        <Card padding="none">
          <div className="publish__card-head">
            <div className="publish__card-title">
              <Badge tone={showDrafts ? 'info' : 'success'} dot>
                {showDrafts ? labels.draft : labels.published}
              </Badge>
              <span className="publish__key">home/*</span>
            </div>
            <Switch
              size="sm"
              label={labels.showDrafts}
              checked={showDrafts}
              onChange={setShowDrafts}
            />
          </div>
          <Table
            columns={[
              { key: 'key', label: labels.key, mono: true },
              { key: 'value', label: labels.value },
              { key: 'state', label: '', align: 'right', width: 100 },
            ]}
            rows={rows}
          />
        </Card>
      </div>
    </section>
  )
}
