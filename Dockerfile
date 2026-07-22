# ==========================================
# Etapa 1: Instalação de Dependências
# ==========================================
FROM node:20-alpine AS deps
# A biblioteca libc6-compat é necessária para alguns pacotes nativos no Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copia os arquivos de dependência
COPY package.json yarn.lock* ./
# Instala as dependências congelando o lockfile
RUN yarn install --frozen-lockfile

# ==========================================
# Etapa 2: Build da Aplicação
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copia as dependências instaladas na etapa anterior
COPY --from=deps /app/node_modules ./node_modules
# Copia o restante do código fonte
COPY . .

# Executa o build do Next.js
RUN yarn build

# ==========================================
# Etapa 3: Imagem de Produção (Runner)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Cria um usuário não-root por questões de segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia os diretórios necessários do builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Inicia a aplicação
CMD ["yarn", "start"]