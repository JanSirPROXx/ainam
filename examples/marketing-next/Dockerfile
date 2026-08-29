# syntax=docker/dockerfile:1
# Built from the repository root: the site consumes the workspace packages the
# way a real consumer consumes the published ones.
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
# Next collects build and dev telemetry by default and has no config-file key
# to turn it off — only this variable.
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ainam/example-marketing-next... build

FROM base AS runtime
WORKDIR /app
# Next's standalone server reads PORT from the environment and ignores the
# --port flag in the package script. HOSTNAME as well, or it binds to the
# container's own IP and a loopback healthcheck cannot reach it.
ENV NODE_ENV=production PORT=3300 HOSTNAME=0.0.0.0
COPY --from=build /repo/examples/marketing-next/.next/standalone ./
COPY --from=build /repo/examples/marketing-next/.next/static ./examples/marketing-next/.next/static
USER node
EXPOSE 3300
CMD ["node", "examples/marketing-next/server.js"]
