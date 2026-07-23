#!/bin/bash
set -e

# Rodar sempre da raiz do projeto: yarn sonar
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SONAR_URL="http://localhost:9000"
APP_URL="http://localhost:3000"
GATE_NAME="Sustainable Finance Plataforma Gate"

SONAR_ADMIN_PASS="${SONAR_ADMIN_PASS:-Sustainable2026!}"
AUTH="admin:$SONAR_ADMIN_PASS"

# Nome do token único por dev (evita conflito entre devs no mesmo Sonar)
TOKEN_NAME="local-scanner-$(whoami)"

# ── 1. Sobe SonarQube ────────────────────────────────────────────────────────
echo "🐳 Subindo SonarQube..."
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" up -d

echo "⏳ Aguardando SonarQube iniciar (pode levar até 2min)..."
until curl -sf "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; do
  printf "."
  sleep 5
done
echo ""
echo "✅ SonarQube pronto."

# ── 2. Configura Quality Gate (apenas se necessário) ─────────────────────────
GATE_CHECK=$(curl -so /dev/null -w "%{http_code}" -u "$AUTH" "$SONAR_URL/api/qualitygates/list" 2>/dev/null)

if [ "$GATE_CHECK" = "401" ]; then
  echo "🆕 Instalação nova detectada. Rodando setup inicial..."
  bash "$SCRIPT_DIR/setup.sh"
elif curl -sf -u "$AUTH" "$SONAR_URL/api/qualitygates/list" 2>/dev/null | grep -q "$GATE_NAME"; then
  echo "✅ Quality Gate '$GATE_NAME' já existe."
else
  echo "📐 Quality Gate não encontrado. Rodando setup..."
  bash "$SCRIPT_DIR/setup.sh"
fi

# ── 3. Gera token efêmero para este scan ─────────────────────────────────────
echo "🔑 Gerando token de acesso..."
curl -sf -u "$AUTH" -X POST "$SONAR_URL/api/user_tokens/revoke" \
  -d "name=$TOKEN_NAME&login=admin" > /dev/null 2>&1 || true

SONAR_TOKEN=$(curl -sf -u "$AUTH" -X POST "$SONAR_URL/api/user_tokens/generate" \
  -d "name=$TOKEN_NAME&login=admin&type=USER_TOKEN" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# ── 4. Verifica se o app está online ─────────────────────────────────────────
echo "🔍 Verificando app em $APP_URL..."
APP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$APP_URL" 2>/dev/null || echo "000")

if [ "$APP_STATUS" != "200" ]; then
  echo "⚠️  App offline. Subindo com infra:up..."
  docker compose -f "$PROJECT_ROOT/docker-compose.yml" up -d --build
  until curl -sf -o /dev/null "$APP_URL" 2>/dev/null; do
    printf "."
    sleep 5
  done
  echo ""
  echo "✅ App online."
else
  echo "✅ App já está online."
fi

# ── 5. Gera coverage ─────────────────────────────────────────────────────────
echo ""
echo "🔬 Rodando testes com coverage..."
cd "$PROJECT_ROOT" && yarn vitest run --coverage

# ── 6. Roda análise via Docker ───────────────────────────────────────────────
echo ""
echo "📡 Enviando análise para SonarQube..."
docker run --rm \
  --network host \
  -v "$PROJECT_ROOT:/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dproject.settings=/usr/src/sonar/sonar-project.properties \
  -Dsonar.token="$SONAR_TOKEN"

echo ""
echo "✅ Análise concluída! Acesse: $SONAR_URL/dashboard?id=sustainable_finance"
