# Changesets

Any change touching `packages/*` needs one. Run `pnpm changeset`, describe the
change the way a consumer would read it in a changelog, and commit the file it
writes alongside the code.

The applications under `apps/` and the template under `examples/` are private, so
changesets skips them — they are deployed, not published.
