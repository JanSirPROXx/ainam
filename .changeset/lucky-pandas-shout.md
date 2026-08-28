---
'@ainam/core': minor
'@ainam/next': minor
'ainam': minor
---

Require an explicit server origin, and add image and rich-text rendering.

`baseUrl` (and `AINAM_URL` for the CLI) no longer default to AINAM Cloud. A
default decides where your content and your API key are sent, and a self-hosted
site that omitted it was sending both to a server it never named. The error
message says what to set and what the Cloud value is.

New in `@ainam/core`: `ainamImageProps`, `renderRichTextToHtml`,
`contentSnapshot`, and the rich-text node allowlist. New in `@ainam/next`:
`AinamRichText`, `createPreviewHandler`, and draft-mode reads through a separate
`previewApiKey`.

An image key now resolves to `ResolvedImage | null` — the URL and the intrinsic
dimensions are spliced in by the server, so a layout can reserve the space and
storage can move without rewriting content. Regenerate with `ainam pull`.
