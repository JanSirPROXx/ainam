'use client'

import { useState } from 'react'
import { CodeBlock } from '@ainam/ui'

interface Snippet {
  key: string
  filename: string
  lineNumbers: boolean
  code: string
}

/**
 * The three snippets are code, not content.
 *
 * Everything else on this page is editable in the dashboard; these are not.
 * A hero snippet has to stay runnable, and the moment it is a content field it
 * is one careless edit away from being pseudo-code on our own front page.
 */
const SNIPPETS: Snippet[] = [
  {
    key: 'ainam.config.ts',
    filename: 'ainam.config.ts',
    lineNumbers: true,
    code: `import { defineContentSchema } from '@ainam/core'

export default defineContentSchema({
  'home/hero/title': {
    type: 'text',
    label: 'Hero title',
    required: true,
    multiline: false,
    default: 'Content, decoupled.',
  },
})`,
  },
  {
    key: 'app/page.tsx',
    filename: 'app/page.tsx',
    lineNumbers: true,
    code: `import { createAinamContent } from '@ainam/next'
import type { AinamContent } from './ainam.gen'

const ainam = createAinamContent<AinamContent>({
  apiKey: process.env.AINAM_API_KEY!,
  projectId: process.env.AINAM_PROJECT_ID!,
  baseUrl: process.env.AINAM_URL!,
  locale: 'en',
})

export default async function Page() {
  // Wrong key, wrong type: both are compile errors.
  return <h1>{await ainam.get('home/hero/title')}</h1>
}`,
  },
  {
    key: 'terminal',
    filename: 'terminal',
    lineNumbers: false,
    code: `$ ainam push
Pushed:
  added 1
    home/hero/title

$ ainam pull
Wrote ainam.gen.ts — 1 keys
Wrote ainam-snapshot.en.json — 1 entries`,
  },
]

export function SdkTabs() {
  const [active, setActive] = useState(SNIPPETS[0]!.key)
  const snippet = SNIPPETS.find((entry) => entry.key === active) ?? SNIPPETS[0]!

  return (
    <div className="sdk">
      <div className="sdk__tabs" role="tablist" aria-label="Integration steps">
        {SNIPPETS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={entry.key === active}
            className="sdk__tab"
            onClick={() => setActive(entry.key)}
          >
            {entry.key}
          </button>
        ))}
      </div>
      <CodeBlock
        className="sdk__code"
        filename={snippet.filename}
        showLineNumbers={snippet.lineNumbers}
        code={snippet.code}
      />
    </div>
  )
}
