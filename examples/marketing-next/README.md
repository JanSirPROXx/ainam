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

Unconfigured it renders from `ainam-snapshot.en.json` and `ainam-snapshot.de.json`,
so a clone shows the finished site with no server, no keys and no database.

## Two languages

The site is in English and German, at `/en` and `/de`. `/` sends a visitor to
the one their browser asks for (`src/proxy.ts`), `de-CH` reading as German, and
a switcher in the header changes it. Each page carries `<html lang>`, a canonical
address and `hreflang` links to the other.

The copy of each language is a locale of the same AINAM project:

- English is the default of every key in `ainam.config.ts`.
- German is `content/de.json`, in Swiss spelling. A default is one value per
  key and a push seeds it into every language, so a translation cannot be a
  default. It is published as an edit instead, with `scripts/publish-locale.mjs`.
  That script signs in as a person, because an API key cannot edit content.
- The words that belong to the markup, such as "Sign in" and the labels of the
  publish demo, are in `src/lib/dictionary.ts`, beside the components they
  belong to.

The dashboard edits the default language today. Until it can switch language,
German copy changes go through `content/de.json` and the script, and the
feature card about locales says so.

`test/translations.test.ts` fails when the German copy falls behind: a key with
copy and no translation, a list with different fields or a different number of
rows, English left where German belongs, a sharp s, or a committed snapshot that
no longer matches its source.

## Pointing it at a project

```bash
cp ../../.env.example .env          # then fill in the four AINAM_ values
pnpm ainam:push                     # upload ainam.config.ts, in both languages
pnpm ainam:publish-de               # publish content/de.json (see the script's header)
pnpm ainam:pull                     # regenerate types and both snapshots
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

The words of the controls and of the publish demo are in `src/lib/dictionary.ts`
and change with the components, not through the dashboard.

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
