# Sustainable Finance 2026 — Hub Digital (PWA)

Plataforma do evento **Sustainable Finance** · Goiânia · **04/09/2026**.  
Web App **desktop-first e responsivo** + **PWA**, fiel ao Design System do Figma.

---

## Stack

- **Next.js 14 (App Router) + React 18 + TypeScript**
- **Tailwind CSS** (design tokens do Figma em `tailwind.config.js`)
- **react-router-dom** (SPA client-side + guards de autenticação/capacidade),  
  hospedada por um catch-all do App Router (`app/[[...slug]]`)
- **PWA** via `app/manifest.ts` · **lucide-react** · gráficos próprios em SVG/CSS
- **PostgreSQL 15** + **Redis 7** via Docker
- **Prisma ORM**
- **Vitest** para testes com cobertura
- **SonarQube Community** para análise de qualidade

---

## Como rodar o projeto

### Pré-requisitos

- **Node.js** 18+ e **Yarn**
- **Docker** e **Docker Compose**

---

### 1. Clonar e instalar dependências

```bash
git clone <URL_DO_REPOSITORIO>
cd fhdataanalysis-projects-sustainable_finance_plataforma
yarn install
```

---

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base nas variáveis abaixo:

```env
DATABASE_URL=postgresql://<USUARIO>:<SENHA>@localhost:5432/<BANCO>
REDIS_URL=redis_url
POSTGRES_USER=<USUARIO>
POSTGRES_PASSWORD=<SENHA>
POSTGRES_DB=<BANCO>
```

> As credenciais reais são compartilhadas pela equipe fora do repositório.

---

### 3. Subir a infraestrutura (PostgreSQL + Redis)

```bash
yarn db:up
```

Isso sobe os containers de **PostgreSQL** e **Redis** via Docker Compose.

---

### 4. Rodar as migrations do banco

```bash
npx prisma migrate dev
```

---

### 5. Iniciar o servidor de desenvolvimento

```bash
yarn dev
```

Acesse em: **http://localhost:3000**

---

### 6. Outros comandos úteis

| Comando | Descrição |
|---------|-----------|
| `yarn build` | Gera o build de produção |
| `yarn start` | Inicia o servidor em modo produção |
| `yarn lint` | Executa o linter |
| `yarn infra:up` | Sobe toda a stack (app + infra) via Docker |
| `yarn infra:down` | Derruba todos os containers |

---

## Como rodar a análise com SonarQube

O projeto possui integração com **SonarQube Community Edition** rodando localmente via Docker. Todo o fluxo — subir o Sonar, configurar o Quality Gate, gerar cobertura e enviar a análise — é executado com **um único comando**.

### Pré-requisitos

- **Docker** instalado e rodando
- **Python 3** instalado (usado nos scripts de configuração)
- O projeto deve estar rodando na porta `3000`

---

### 1. Configurar a senha do admin (opcional)

Por padrão, o script utiliza uma senha definida internamente pela equipe. Para sobrescrever sem alterar o código, exporte a variável de ambiente antes de rodar:

```bash
export SONAR_ADMIN_PASS=SuaSenhaAqui
yarn sonar
```

> Se a variável não for definida, o script usará o valor padrão da equipe.

---

### 2. Executar a análise completa

Na raiz do projeto:

```bash
yarn sonar
```

O script `sonar/start.sh` executa automaticamente as seguintes etapas:

| Etapa | O que acontece |
|-------|----------------|
| **1** | Sobe o container do SonarQube (`sonar/docker-compose.yml`) |
| **2** | Aguarda o SonarQube ficar disponível em `http://localhost:9000` |
| **3** | Detecta instalação nova e configura o Quality Gate automaticamente |
| **4** | Gera um token efêmero para o scan |
| **5** | Verifica se o app está online; se não estiver, sobe via Docker |
| **6** | Roda os testes com cobertura: `yarn vitest run --coverage` |
| **7** | Envia a análise ao SonarQube via `sonar-scanner-cli` |

---

### 3. Acessar o dashboard

Após a análise concluir, acesse:

```
http://localhost:9000/dashboard?id=sustainable_finance_plataforma
```

**Credenciais de acesso:**
- **Usuário:** `admin`
- **Senha:** definida pela equipe via `SONAR_ADMIN_PASS`

---

### 4. Derrubar o SonarQube

```bash
yarn sonar:down
```

> ⚠️ Este comando destrói os containers **e os volumes** do SonarQube. Todo o histórico de análises será perdido. Na próxima execução de `yarn sonar`, o Quality Gate será reconfigurado automaticamente.

---

### Quality Gate — "Sustainable Finance Plataforma Gate"

Configurado automaticamente pelo script de setup:

| Métrica | Condição |
|---------|----------|
| Cobertura geral | ≥ 70% |
| Cobertura de código novo | ≥ 70% |
| Security Rating | A |
| New Security Rating | A |
| Reliability Rating | ≤ B |
| New Reliability Rating | ≤ B |
| Maintainability Rating | A |
| Blocker Violations | 0 |
| Critical Violations | 0 |

---

## Arquitetura

```
src/
├─ hooks/usePersistentState.ts        # useState + localStorage (genérico)
├─ lib/
│  ├─ roles.ts                        # 7 perfis, capacidades, DEFAULT_MATRIX, can()
│  └─ utils.ts                        # cn(), CPF, credentialCode()
├─ data/
│  ├─ schema.ts                       # Arquitetura de dados (User, Voucher, Curator N:N…)
│  ├─ catalog.ts                      # tickets, vouchers, curadores, palestrantes
│  ├─ mock.ts                         # sessions, attendees
│  └─ users.ts                        # CRUD + tags
├─ context/                           # Stores reativos e persistentes
│  ├─ PermissionsContext              # matriz RBAC editável
│  ├─ AuthContext                     # sessão, login/registro/checkout
│  ├─ FavoritesContext                # agenda favoritada
│  ├─ InterestsContext                # catálogo da nuvem de interesses
│  ├─ VouchersContext                 # vouchers + resgate
│  ├─ SessionsContext                 # agenda
│  └─ CheckinContext                  # credenciamento
├─ components/
│  ├─ RoleGuard.tsx                   # protege rotas por capacidade
│  ├─ layout/AppShell                 # sidebar (desktop) + bottom-nav (mobile)
│  └─ ui/  Button Input Badge Avatar Card Modal Loader ProgressBar QRCode Charts
└─ pages/
   ├─ LoginPage · RegisterPage
   ├─ ParticipantDashboard · CredentialPage · VoucherCheckout
   ├─ ProgrammingPage · Networking · ContentHub · ProfilePage
   ├─ CuratorDashboard · OperatorPanel
   └─ admin/  Dashboard · Users · Crud · Sessions · Interests · Reports · Permissions
```

---

## RBAC — 7 perfis × capacidades

| Capacidade \ Perfil | Não Pago | Geral | Empresa | Palestr. | Curador | Operador | Admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Conteúdo público / Streaming | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver premium | ✅ | ✅ | – | ✅ | – | – | ✅ |
| **Baixar conteúdo** | – | ✅ | – | ✅ | – | – | ✅ |
| Credencial (QR) | – | ✅ | ✅ | ✅ | ✅ | – | – |
| Agenda pessoal | – | ✅ | – | ✅ | – | – | ✅ |
| Networking | – | ✅ | ✅ | ✅ | ✅ | – | ✅ |
| Perfil de empresa | – | – | ✅ | – | ✅ | – | ✅ |
| Painel do curador | – | – | – | – | ✅ | – | ✅ |
| Materiais do palestrante | – | – | – | ✅ | – | – | ✅ |
| Credenciamento (operação) | – | – | – | – | – | ✅ | ✅ |
| Gestão da plataforma | – | – | – | – | – | – | ✅ |

Veja [DEMO.md](DEMO.md) para o roteiro de demonstração.
