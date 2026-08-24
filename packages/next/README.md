# @ainam/next

AINAM adapter for the Next.js App Router.

## Install

```bash
npm install @ainam/next
```

## Read content

```ts
// lib/ainam.ts
import { createAinamContent } from '@ainam/next'

export const ainam = createAinamContent({
  apiKey: process.env.AINAM_API_KEY!,
  projectId: process.env.AINAM_PROJECT_ID!,
  locale: 'de',
})
```

Reads register under a cache tag and are cached indefinitely — content changes
when someone publishes, not on a timer, so there is no TTL to tune and no
request-time fetch against the CMS.

## Revalidate on publish

```ts
// app/api/ainam/revalidate/route.ts
import { createRevalidateHandler } from '@ainam/next'

export const POST = createRevalidateHandler({
  secret: process.env.AINAM_WEBHOOK_SECRET!,
  projectId: process.env.AINAM_PROJECT_ID!,
})
```

Point the project's webhook at this route. It verifies the signature in constant
time and purges the cache tag for the published locale.

## Licence

MIT
