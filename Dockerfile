FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/.npmrc ./apps/web/
RUN pnpm install --frozen-lockfile
COPY apps/web ./apps/web
RUN pnpm --filter @yellow/web build
# A self-contained production tree: the two runtime deps and nothing else (~900KB), rather than
# the workspace's symlinked store, which would drag every build tool into the final image.
RUN pnpm --filter @yellow/web deploy --prod /app/prod

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Only what the server needs at runtime: the build, the entry, and its two production deps.
COPY --from=build /app/prod/node_modules ./node_modules
COPY --from=build /app/apps/web/build ./build
COPY --from=build /app/apps/web/server.js ./server.js
EXPOSE 3000
CMD ["node", "server.js"]
