# AINAM marketing site

Our own site, built on AINAM. Every headline, feature card, step and footer link
on it is a row in an AINAM project, edited in the AINAM dashboard and published
without a deploy.

It is in `examples/` on purpose. A marketing site is the most honest test we
have: if editing this one is awkward, it is awkward for a customer, and we find
that out before they do. It also means the site survives our own downtime the
same way a customer's does — through the snapshot committed beside this file.

```bash
pnpm --filter @ainam/example-marketing-next dev   # http://localhost:3300
```

Unconfigured it renders from `ainam-snapshot.en.json`, so a clone shows the
finished site with no server, no keys and no database.

## Pointing it at a project

```bash
cp ../../.env.example .env          # then fill in the four AINAM_ values
pnpm ainam:push                     # upload ainam.config.ts
pnpm ainam:pull                     # regenerate types and the snapshot
```

`push` seeds every key's `default` into the draft and published rows, so the
site renders real copy from the first push. A later push never overwrites a
value someone has since edited — which also means changing a `default` here does
not change a project that already has the key. Edit it in the dashboard instead.

## How it differs from `starter-next`

`starter-next` is what a customer clones: its own CSS, its own brand, no
`@ainam/ui`. This one is us, so it imports the design system and is held to the
token scanner like `apps/*` are.

## What is not editable

The three snippets in the hero are code, not content. A hero snippet has to stay
runnable, and the moment it is a content field it is one careless edit away from
being pseudo-code on our own front page. They live in `src/components/SdkTabs.tsx`.

Feature-card icons are chosen from a fixed map in `src/components/FeatureIcon.tsx`
rather than resolved by name at runtime: lucide's `DynamicIcon` loads in the
browser, so every card would paint empty and fill in after hydration, on the one
screen where first paint is the product.

## Two sections that ship switched off

`home/logos/visible` and `home/testimonial/visible` default to `false`, and both
components render nothing when the names behind them are empty. They make claims
about other people. Turn them on when the names in them are real and those people
have agreed — not before.

## A first-run trap worth knowing

Reads are cached with `revalidate: false` and purged by the publish webhook, not
by a timer. Render the site after creating a project but *before* the first
`ainam push` and Next caches the empty response indefinitely: every key then
reads as missing until a publish purges the tag. `rm -rf .next` clears it
locally. `src/lib/content.ts` turns that state into an error naming the key,
rather than a crash inside whichever component rendered it first.
