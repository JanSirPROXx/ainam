# @ainam/ui

The AINAM design system as React components and CSS tokens.

Dark only — there is no light theme. The accent is achromatic; saturated hue
appears only for status, always as a tinted background with a saturated
foreground. Elevation is carried by hairlines, not shadows.

## Install

```bash
npm install @ainam/ui
```

## Use

```tsx
import '@ainam/ui/styles.css'
import { Button, Card, Badge } from '@ainam/ui'

export function Example() {
  return (
    <Card title="API keys" footer={<Button>Create key</Button>}>
      <Badge tone="success" dot>Active</Badge>
    </Card>
  )
}
```

`@ainam/ui/styles.css` brings tokens, a minimal reset and the component layer.
Import `@ainam/ui/tokens.css` instead when a surface wants the design system's
values but brings its own components.

The package is client-side: every interactive component uses hooks or event
handlers, so the entry point carries `'use client'`.

## What is in it

25 components in seven groups:

- **actions** — `Button`, `IconButton`
- **forms** — `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`
- **surfaces** — `Card`, `Dialog`
- **data** — `Badge`, `Tag`, `Table`, `CodeBlock`, `Metric`
- **navigation** — `Tabs`, `SidebarNav`, `Breadcrumb`
- **feedback** — `Toast`, `Tooltip`, `EmptyState`
- **brand** — `Wordmark`, `GridBackdrop`, `Eyebrow`

Tokens cover colour, type, spacing, radius, elevation and motion. Never write a
raw hex or a raw font family — `scripts/check-tokens.mjs` fails the build on
either. See `ADHERENCE.md` for what is enforced where.

## Placeholders

Geist and Geist Mono stand in for a brand typeface and load from Google Fonts;
swapping them means replacing one `@import` in `styles/tokens/fonts.css`. There
is deliberately no logo mark — the brand is the typographic `Wordmark`.

## Licence

MIT
