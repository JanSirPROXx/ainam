# syntax=docker/dockerfile:1
# Built from the repository root: the template consumes the workspace packages
# exactly as a real consumer would consume the published ones.
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ainam/example-starter-next... build

FROM base AS runtime
WORKDIR /app
# Next's standalone server reads PORT from the environment and ignores the
# --port flag in the package script, so it has to be stated here.
# HOSTNAME as well as PORT: left unset, Next's standalone server binds to the
# container's own IP rather than all interfaces, so anything checking the
# service over loopback — a healthcheck, a sidecar — cannot reach it.
ENV NODE_ENV=production PORT=3200 HOSTNAME=0.0.0.0
COPY --from=build /repo/examples/starter-next/.next/standalone ./
COPY --from=build /repo/examples/starter-next/.next/static ./examples/starter-next/.next/static
USER node
EXPOSE 3200
CMD ["node", "examples/starter-next/server.js"]
