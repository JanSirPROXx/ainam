# Design system adherence

The design system ships `_adherence.oxlintrc.json`, which lints two separate
things. Only one of them still needs a linter here.

## Enforced by lint

Raw values. A hex colour, a px measurement or a font family written directly
into a `style` prop bypasses the token system, and nothing else would catch it.
These rules live in the repository's `.oxlintrc.json` and run on every build.

## Enforced by TypeScript instead

Prop contracts and variant enums. The design system's rules exist because its
components are untyped `.jsx` — a lint selector was the only way to say that
`<Button variant="huge">` is wrong.

Ported to `.tsx`, every component declares its props as a real interface and its
variants as a union type, so `tsc` rejects the same mistakes earlier, with a
better message, and without a selector per component to keep in sync. Duplicating
them as lint rules would mean two specs that can disagree.

The component interfaces in `src/components/` are therefore the API spec. They
were derived from the design system's `.d.ts` files and its adherence config, and
must not drift from them.

## Not enforced anywhere yet

Whether a view uses more than one `primary` button — the system allows exactly
one. That is a property of a screen, not of a file, so it needs a review pass or
a rendering check rather than a linter.

## Lint rules turned off, and why

`import/no-unassigned-import` is disabled: a stylesheet is imported for its side
effect, which is the only way to load one, and the rule fires on every correct
`import './globals.css'`.

`react/react-in-jsx-scope` is disabled in
`.oxlintrc.json`. Both predate React 17: with the automatic JSX runtime there is
no `React` binding to require, so they fire on every correct file. The oxlint
config schema rejects unknown keys, so the reason is recorded here rather than
as a comment beside them.

## Rules turned off workspace-wide

`no-await-in-loop` (perf category) — off. Every hit in this repo is a sequential write inside
one database transaction, where the rule's suggested fix is wrong: `Promise.all` over a single
transaction connection interleaves statements on a connection that cannot serve them
concurrently. Leaving the rule on trained us to skim a list of eight warnings on every run,
which is how a real one gets missed.
