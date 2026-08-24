# syntax=docker/dockerfile:1
# Built from the repository root: the server depends on workspace packages, so
# the build context has to include them and the lockfile.
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ainam/cms-server... build
# Produces a self-contained directory with production dependencies only —
# pnpm's symlinked node_modules does not survive a plain COPY.
#
# --legacy rather than inject-workspace-packages: injecting would hard-copy
# @ainam/schema into every consumer instead of symlinking it, so a schema edit
# would stop showing up in `pnpm dev` until a rebuild. Paying that in daily
# development to satisfy a build step is the wrong trade.
RUN pnpm --filter @ainam/cms-server deploy --prod --legacy /out

FROM base AS runtime
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
COPY --from=build /out/drizzle ./drizzle
USER node
EXPOSE 8787
CMD ["node", "dist/index.mjs"]
