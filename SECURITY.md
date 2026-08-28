# Security

## Reporting

Report a vulnerability through GitHub's private advisory form on this
repository, or by email to the address on the maintainer's GitHub profile. Please
do not open a public issue for anything exploitable.

Expect an acknowledgement within a few days. This is a small project — that is a
statement of fact rather than a service level.

## What is in scope

The applications under `apps/` and the packages under `packages/`. In
particular:

- Anything that lets one organisation read or change another's content
- Anything that lets a credential exceed its scope — a `content:read` key
  writing, or reading unpublished drafts
- Stored content reaching a customer's page unescaped
- An upload that executes rather than being served as an image

## What is out of scope

The `development-only-*` secrets in `.env.example` and `docker/`. They are
published deliberately so a clean checkout runs, and `cms-server` refuses to
start with the auth one when `NODE_ENV=production`.
