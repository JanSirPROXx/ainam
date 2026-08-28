# syntax=docker/dockerfile:1
# Built from the repository root: the dashboard depends on workspace packages,
# so the build context has to include them and the lockfile.
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
# Next collects build and dev telemetry by default and has no config-file key
# to turn it off — only this variable, or a machine-global opt-in file. Set in
# the base stage so the build and the runtime both inherit it.
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ainam/dashboard... build

FROM base AS runtime
WORKDIR /app
# Next's standalone server reads PORT from the environment, not the --port flag
# in the package script. 3000 is its default, but relying on that is accidental.
# HOSTNAME as well as PORT: left unset, Next's standalone server binds to the
# container's own IP rather than all interfaces, so anything checking the
# service over loopback — a healthcheck, a sidecar — cannot reach it.
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/dashboard/.next/standalone ./
COPY --from=build /repo/apps/dashboard/.next/static ./apps/dashboard/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/dashboard/server.js"]
