'use client'

import { useState } from 'react'
import { Badge, Card, Eyebrow, Switch, Table } from '@ainam/ui'

export interface PublishFlowProps {
  eyebrow: string
  title: string
  body: string
}

/**
 * What the dashboard shows before and after a publish, on the page itself.
 *
 * The two states are the product's actual model — a draft row and a published
 * row per key — not a simulation of something else. Flipping the switch is the
 * only interactive thing on this page.
 */
const PUBLISHED = [
  { key: 'home/hero/title', value: 'The AI-native CMS layer', state: 'live' },
  { key: 'home/features/items', value: '6 cards', state: 'live' },
  { key: 'home/logos/visible', value: 'false', state: 'live' },
]

const DRAFT = [
  { key: 'home/hero/title', value: 'The AI-native CMS layer', state: 'unchanged' },
  { key: 'home/features/items', value: '7 cards', state: 'edited' },
  { key: 'home/logos/visible', value: 'true', state: 'edited' },
]

export function PublishFlow({ eyebrow, title, body }: PublishFlowProps) {
  const [showDrafts, setShowDrafts] = useState(false)
  const entries = showDrafts ? DRAFT : PUBLISHED

  const rows = entries.map((entry) => ({
    key: entry.key,
    value: entry.value,
    state:
      entry.state === 'edited' ? (
        <Badge tone="info">edited</Badge>
      ) : entry.state === 'live' ? (
        <Badge tone="success">live</Badge>
      ) : (
        <Badge>unchanged</Badge>
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
                {showDrafts ? 'draft' : 'published'}
              </Badge>
              <span className="publish__key">home/*</span>
            </div>
            <Switch
              size="sm"
              label="Show drafts"
              checked={showDrafts}
              onChange={setShowDrafts}
            />
          </div>
          <Table
            columns={[
              { key: 'key', label: 'Key', mono: true },
              { key: 'value', label: 'Value' },
              { key: 'state', label: '', align: 'right', width: 100 },
            ]}
            rows={rows}
          />
        </Card>
      </div>
    </section>
  )
}
