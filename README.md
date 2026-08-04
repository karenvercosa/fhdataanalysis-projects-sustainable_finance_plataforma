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
# Runtime da aplicação — role `sf_app`, sujeito ao RLS (não é dono das tabelas)
DATABASE_URL=postgresql://sf_app:<APP_DB_PASSWORD>@localhost:5432/<BANCO>
# Migrations, db push e criação do role — dono do banco
DATABASE_URL_OWNER=postgresql://<USUARIO>:<SENHA>@localhost:5432/<BANCO>
APP_DB_PASSWORD=<SENHA_DO_ROLE_DA_APLICACAO>

REDIS_URL=redis_url
POSTGRES_USER=<USUARIO>
POSTGRES_PASSWORD=<SENHA>
POSTGRES_DB=<BANCO>
```

> As credenciais reais são compartilhadas pela equipe fora do repositório.

**Por que duas conexões?** No Postgres o dono das tabelas ignora as políticas
de RLS. Enquanto a aplicação conectasse como dono, qualquer política seria
decorativa. `DATABASE_URL` passa a usar o role `sf_app`, que não é dono e por
isso é contido pelo RLS; `DATABASE_URL_OWNER` fica só para DDL. Veja
[Banco de dados e RLS](#banco-de-dados-e-rls).

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
   ├─ EsqueciSenhaPage · TrocarSenhaPage · PrimeiroAcessoPage
   ├─ ParticipantDashboard · CredentialPage · VoucherCheckout
   ├─ ProgrammingPage · Networking · ContentHub · ProfilePage
   ├─ CuratorDashboard · OperatorPanel
   └─ admin/  Dashboard · Users · Crud · Sessions · Interests · Reports · Permissions
```

---

## Banco de dados e RLS

A aplicação conecta com **dois roles diferentes**, e é essa separação que faz o
Row Level Security valer alguma coisa:

| Role | Onde é usado | Pode |
|---|---|---|
| `sf_app` | runtime (`DATABASE_URL`) | ler/gravar só nas tabelas com política explícita |
| dono (`sfuser`) | migrations, `db push` (`DATABASE_URL_OWNER`) | DDL, criar políticas, gerenciar roles |

O modelo é **deny by default**: a migração
`20260803180000_rls_role_de_aplicacao` lista as tabelas da aplicação, e só elas
recebem `GRANT` e uma política. Tabela nova nasce **inacessível** ao `sf_app`
até alguém conceder — inclusive `_prisma_migrations`, que a app nunca lê. Todas
as tabelas usam `FORCE ROW LEVEL SECURITY`, então nem uma conexão que voltasse a
usar o dono por engano escaparia das políticas.

As políticas são `USING (true)`: a autorização por usuário continua no servidor
(`exigirCapacidade` / `getSessaoServidor`). O que o RLS entrega aqui é
**contenção** — uma consulta injetada ou um bug de query não alcançam nada além
do que foi explicitamente concedido, e não conseguem DDL nem desligar o RLS.

A senha do `sf_app` **não** está na migração (que vai para o Git). Ela é
aplicada por `yarn db:role`, a partir de `APP_DB_PASSWORD`. Rodar de novo
reaplica a senha, o que também serve para rotacioná-la.

```bash
yarn db:up   # generate → migrate → role → push → seed
```

> **Ao adicionar uma tabela nova:** inclua-a no array de tabelas da migração de
> RLS (ou crie uma migração nova com o mesmo `GRANT` + `ENABLE/FORCE` +
> `CREATE POLICY`), senão a aplicação recebe *permission denied* nela.

---

## Autenticação — entrada, senha e sessão

**Toda conta nova nasce no Plano Gratuito.** O perfil `gratuito` é concedido no
gancho `databaseHooks.user.create` (`src/lib/auth.ts`), que é o único ponto por
onde passam tanto o cadastro por formulário quanto o login social.

**Primeiro acesso.** O cadastro não pede senha: o servidor gera uma provisória,
envia por e-mail e grava o hash em `usuario.senha_provisoria_hash`. Enquanto essa
coluna estiver preenchida, a única tela que abre é `/primeiro-acesso` — o corte é
feito no Server Component do catch-all, então não há URL que pule a etapa.

**Troca de senha por confirmação de e-mail.** `/primeiro-acesso` e
`/esqueci-senha` disparam o mesmo e-mail, com um botão que passa por
`/api/auth/reset-password/:token` e devolve para `/trocar-senha?token=…` com o
pop-up de e-mail confirmado. Essa rota **só** abre com um token válido: o
servidor confere na tabela `verification` antes de entregar a página. Gravada a
senha nova, ela vai para `usuario.senha_hash`, a provisória é apagada, o e-mail é
marcado como verificado e as sessões antigas caem.

**Login social.** O botão do Google volta para `/api/pos-login`, que decide no
banco: cadastro incompleto → segunda etapa do cadastro; senha ainda provisória →
`/primeiro-acesso`; senha definitiva → a home do tipo de conta (Plano Gratuito ou
assinante).

**Sessão.** "Lembrar de mim" é o `rememberMe` do Better Auth: marcado, o cookie é
persistente e vale 30 dias; desmarcado, morre ao fechar o navegador. Expirado o
cookie, é preciso entrar de novo. Quem já tem sessão não acessa `/login` — o
middleware devolve para `/inicio`.

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
