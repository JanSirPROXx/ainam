# @ainam/core

Framework-agnostic client for the AINAM content API.

Zero runtime dependencies — the package ships types and a `fetch` wrapper,
nothing else.

## Install

```bash
npm install @ainam/core
```

## Use

```ts
import { createAinamClient } from '@ainam/core'
import type { AinamContent } from './ainam.gen'

const ainam = createAinamClient<AinamContent>({
  apiKey: process.env.AINAM_API_KEY!,
  projectId: process.env.AINAM_PROJECT_ID!,
  locale: 'de',
})

const title = await ainam.get('home/hero/title')  // string, not unknown
```

`ainam.gen.ts` comes from `ainam pull`. Without it the client still works, but
keys are unchecked and values come back as `ContentValue`.

`get` throws `AinamError` with code `not_found` for a key that is not published,
which is safe because `ainam push` seeds a value for every key in the schema.
Use `getOptional` where a key may legitimately be absent.

The client deduplicates concurrent reads but does not cache across calls. On a
Next.js site use [`@ainam/next`](../next), which caches through the framework
and invalidates on publish.

## Surviving CMS downtime

Pass a build-time snapshot and the client falls back to it whenever the API is
unreachable, so the site keeps rendering:

```ts
import snapshot from './ainam-snapshot.json'

const ainam = createAinamClient({ /* … */ snapshot })
```

## Licence

MIT
