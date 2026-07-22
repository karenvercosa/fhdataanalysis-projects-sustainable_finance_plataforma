#!/bin/bash
set -e

SONAR_URL="http://localhost:9000"
GATE_NAME="Sustainable Finance Plataforma Gate"

# Senha local compartilhada — pode ser sobrescrita via env var:
#   SONAR_ADMIN_PASS=outrasenha yarn sonar
SONAR_ADMIN_PASS="${SONAR_ADMIN_PASS:-Sustainable2026!}"

echo "⏳ Aguardando SonarQube estar pronto..."
until curl -sf "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; do
  sleep 5
done
echo "✅ SonarQube pronto."

# ── Troca senha padrão ────────────────────────────────────────────────────────
# SonarQube 10+ bloqueia toda a API enquanto a senha padrão "admin" não for
# alterada (DefaultAdminCredentialsVerifierFilter). Trocar uma única vez libera
# todos os devs que subirem do zero.
echo "🔐 Trocando senha padrão do admin..."
HTTP=$(curl -so /dev/null -w "%{http_code}" -u "admin:admin" -X POST \
  "$SONAR_URL/api/users/change_password" \
  -d "login=admin&previousPassword=admin&password=$SONAR_ADMIN_PASS" 2>/dev/null)

if [ "$HTTP" = "204" ]; then
  echo "   ✅ Senha trocada com sucesso."
elif [ "$HTTP" = "400" ]; then
  echo "   ℹ️  Senha já foi trocada anteriormente — continuando."
else
  echo "   ⚠️  HTTP $HTTP ao tentar trocar senha."
fi

AUTH="admin:$SONAR_ADMIN_PASS"

# ── Criar Quality Gate ────────────────────────────────────────────────────────
echo "📐 Criando Quality Gate '$GATE_NAME'..."
curl -sf -u "$AUTH" -X POST \
  "$SONAR_URL/api/qualitygates/create" \
  --data-urlencode "name=$GATE_NAME" > /dev/null

# Atualizar new_coverage CAYC de 80% → 70%
GATE_JSON=$(curl -sf -u "$AUTH" \
  "$SONAR_URL/api/qualitygates/show?name=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$GATE_NAME'))")")

NEW_COVERAGE_ID=$(echo "$GATE_JSON" | python3 -c \
  "import sys,json; cs=json.load(sys.stdin)['conditions']; print(next((c['id'] for c in cs if c['metric']=='new_coverage'), ''))" 2>/dev/null || true)

if [ -n "$NEW_COVERAGE_ID" ]; then
  echo "   → Atualizando new_coverage CAYC: 80% → 70%"
  curl -sf -u "$AUTH" -X POST \
    "$SONAR_URL/api/qualitygates/update_condition" \
    -d "id=$NEW_COVERAGE_ID&metric=new_coverage&op=LT&error=70" > /dev/null
fi

# ── Condições extras ──────────────────────────────────────────────────────────
add_condition() {
  local METRIC=$1 OP=$2 ERROR=$3
  echo "   → $METRIC $OP $ERROR"
  curl -sf -u "$AUTH" -X POST \
    "$SONAR_URL/api/qualitygates/create_condition" \
    -d "gateName=$GATE_NAME&metric=$METRIC&op=$OP&error=$ERROR" > /dev/null
}

echo "📋 Adicionando condições..."
add_condition "coverage"               "LT" "70"
add_condition "security_rating"        "GT" "1"
add_condition "new_security_rating"    "GT" "1"
add_condition "reliability_rating"     "GT" "2"
add_condition "new_reliability_rating" "GT" "2"
add_condition "sqale_rating"           "GT" "1"
add_condition "blocker_violations"     "GT" "0"
add_condition "critical_violations"    "GT" "0"

echo "⭐ Definindo '$GATE_NAME' como Quality Gate padrão..."
curl -sf -u "$AUTH" -X POST \
  "$SONAR_URL/api/qualitygates/set_as_default" \
  -d "name=$GATE_NAME" > /dev/null

echo "✅ Quality Gate configurado! Acesse: $SONAR_URL/quality_gates"
