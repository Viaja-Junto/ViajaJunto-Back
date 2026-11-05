# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

# Schema and config first: the postinstall hook runs `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --fetch-retries=5 \
           --fetch-retry-mintimeout=20000 \
           --fetch-retry-maxtimeout=120000

COPY . .
RUN npm run build

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=dev alone would still install the `prisma` CLI, an optional peer of @prisma/client.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --omit=optional --ignore-scripts \
           --fetch-retries=5 \
           --fetch-retry-mintimeout=20000 \
           --fetch-retry-maxtimeout=120000

FROM node:22-alpine AS runtime
ENV NODE_ENV=production

# tini as PID 1 forwards SIGTERM to Node, so pods stop at once on Kubernetes.
RUN apk add --no-cache tini

# npm, yarn and corepack are never used at runtime and only add CVE surface.
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/'+(process.env.API_PREFIX||'api')+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
