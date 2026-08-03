# Use Node.js LTS (22) base image
FROM node:22-alpine AS base
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# Added openssl here so it's available in all stages (deps, builder, runner)
RUN apk add --no-cache libc6-compat openssl

# 1. Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Use yarn to install dependencies as indicated by the lockfile
RUN yarn install --frozen-lockfile

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before building
RUN npx prisma generate

# Next.js telemetry is disabled
ENV NEXT_TELEMETRY_DISABLED=1

# Nenhuma credencial (real ou dummy) é necessária para o build: os clients que
# dependem de env (Resend, Prisma, Better Auth) são instanciados sob demanda, na
# primeira requisição, e não no import dos módulos. Todos os segredos entram
# apenas em runtime, via env_file / K8s Secret.
# Ver SonarQube docker:S6472 — nem ENV nem ARG devem carregar segredos.

# Build the Next.js application
RUN yarn build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Instruções RUN agrupadas numa só camada (SonarQube docker:S7031):
# openssl (exigido pelo Prisma), usuário não-root e o diretório de cache do
# prerender já com o dono correto.
RUN apk add --no-cache openssl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir .next \
  && chown nextjs:nodejs .next \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
     /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
     /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Set mode to standalone in next.config.mjs to use these folders
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
CMD ["node", "server.js"]
