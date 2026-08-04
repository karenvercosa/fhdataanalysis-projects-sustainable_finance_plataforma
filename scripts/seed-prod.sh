#!/bin/bash
set -euo pipefail

# ==============================================================================
# ROLLOUT SCRIPT - Sustainable Finance Migration/Seed (Production)
#
# Publica APENAS a imagem de migração. As imagens front/db/redis são
# publicadas pelo GitHub Actions (.github/workflows/deploy.yml).
#
# Mesmo repositório e mesma convenção de tag do CI:
#   ${DOCKER_HUB_USERNAME}/sustainable-finance:migration-v1.0.0
# ==============================================================================

DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-sustainablefinances}"
REGISTRY="${DOCKER_HUB_USERNAME}/sustainable-finance"
IMAGE="${REGISTRY}:v1-migration"

echo "🔐 Iniciando login no Docker Registry como '${DOCKER_HUB_USERNAME}'..."
docker login -u "${DOCKER_HUB_USERNAME}"

echo "🧹 Removendo imagem local antiga..."
docker rmi "${IMAGE}" --force 2>/dev/null || true

echo "📦 Building Migration Image (${IMAGE})..."
docker build --platform linux/amd64 -f Dockerfile.migration -t "${IMAGE}" .

echo "📤 Enviando imagem para o repositório..."
docker push "${IMAGE}"

echo "✅ Publicação concluída com sucesso!"
echo "👉 No servidor, execute o Job de migração/seed:"
echo "   kubectl apply -f prisma-job.yaml"
