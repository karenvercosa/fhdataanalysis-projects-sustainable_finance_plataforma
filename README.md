# Sustainable Finance 2026 — Hub Digital (PWA)

Plataforma do evento **Sustainable Finance** · Goiânia · **04/09/2026**.
Web App **desktop-first e responsivo** + **PWA**, fiel ao Design System do Figma.

> Protótipo funcional de alta fidelidade: front-end completo, dados mock e
> **persistência local** (`localStorage`). Todos os fluxos conectados e reativos
> entre si. Pronto para plugar API/Asaas sem refazer a UI.

---

## Stack
- **Vite + React 18 + TypeScript**
- **Tailwind CSS** (design tokens do Figma em `tailwind.config.js`)
- **react-router-dom** (guards de autenticação + capacidade)
- **vite-plugin-pwa** · **lucide-react** · gráficos próprios em SVG/CSS

## Como rodar
```bash
npm install
npm run dev      # http://localhost:5188
npm run build
```

### Contas de teste (senha: `123456`)
`participante@sf.com` · `curador@sf.com` · `operador@sf.com` · `admin@sf.com`
> O seletor **"Perfil"** no topo alterna entre os 7 papéis para demonstração.
> Novos usuários entram como **Não Pago** via **/cadastro** (onboarding Fase 1).

---

## Regras de negócio implementadas

- **Onboarding em 2 fases:** Fase 1 (nome, sobrenome, e-mail, celular) libera o
  **streaming**; Fase 2 (empresa, cargo, ingresso) acontece no **checkout**.
- **Checkout híbrido:** pagar com **Cartão/Pix (Asaas, simulado)** *ou* aplicar
  **voucher** — `free` (100%), `percent` ou `fixed`. O resgate **consome 1 uso**
  do voucher (respeitando o limite definido pelo Admin) e promove o Não Pago a
  Participante Geral, liberando o acesso.
- **Vouchers flexíveis:** criados/controlados pelo Admin; donos podem ser
  **Empresa** ou **Curador** (PF ou CNPJ).
- **Monetização do conhecimento:** Não Pago tem streaming livre, mas **download
  bloqueado** (`download:content`). Pagantes baixam relatórios/vídeos/PDFs.
- **Palestrante** herda as rotas do Participante Geral; diferencial é o **selo**
  (tag injetável pelo Admin).
- **Credencial (QR)** apenas para Participante Geral, Empresa, Curador e
  Palestrante — com **código por perfil** (`SF26/EMP/CUR/SPK-…`).
- **Conteúdo coeso:** cada material cruza **Sessão × Palestrante × Curador** (N:N).
- **Privacidade (LGPD):** o curador só vê leads que consentiram.
- **Matchmaking:** o Admin vê os maiores interesses dos participantes.
- **RBAC editável em tempo real:** o Admin altera a matriz de permissões e isso
  reflete imediatamente em rotas, menus e ações.

---

## Arquitetura

```
src/
├─ hooks/usePersistentState.ts        # useState + localStorage (genérico)
├─ lib/
│  ├─ roles.ts                        # 7 perfis, capacidades, DEFAULT_MATRIX, can()
│  └─ utils.ts                        # cn(), CPF, credentialCode()
├─ data/
│  ├─ schema.ts                       # ARQUITETURA DE DADOS (User 2 fases, Voucher,
│  │                                  #   Curator PF/CNPJ, Content N:N, …)
│  ├─ catalog.ts                      # tickets, vouchers, curadores, palestrantes,
│  │                                  #   conteúdos + resolvers (applyVoucher, …)
│  ├─ mock.ts (sessions, attendees)   └─ users.ts (CRUD + tags)
├─ context/                           # stores reativos e persistentes
│  ├─ PermissionsContext  (sf_permissions)   # matriz RBAC editável → alimenta can()
│  ├─ AuthContext         (sf_session_email) # sessão, login/registro/checkout
│  ├─ FavoritesContext    (sf_favorites)     # agenda favoritada (compartilhada)
│  ├─ InterestsContext    (sf_interests)     # catálogo da nuvem de interesses
│  ├─ VouchersContext     (sf_vouchers_live) # vouchers + resgate (usedCount)
│  ├─ SessionsContext     (sf_sessions)      # agenda (admin edita → reflete no app)
│  └─ CheckinContext      (sf_checkin)       # credenciamento (alimenta Relatórios)
├─ components/
│  ├─ RoleGuard.tsx                   # protege rotas por capacidade
│  ├─ layout/AppShell                 # sidebar (desktop) + bottom-nav (mobile)
│  └─ ui/  Button Input Badge Avatar Card Modal Loader ProgressBar QRCode
│          Charts(Donut, BarChart)
└─ pages/
   ├─ LoginPage · RegisterPage(Fase 1)
   ├─ ParticipantDashboard · CredentialPage · VoucherCheckout(híbrido)
   ├─ ProgrammingPage · Networking · ContentHub(associações+trava) · ProfilePage
   ├─ CuratorDashboard · OperatorPanel
   └─ admin/  AdminDashboard(KPIs+Matchmaking+Curadores)
              UsersAdmin(+tags) · AdminCrud+crudConfigs(Ingressos/Vouchers/
              Palestrantes/Empresas) · SessionsAdmin · InterestsAdmin ·
              ReportsAdmin(vivo) · PermissionsAdmin(editor RBAC)
```

### Camadas de acesso
1. **Autenticação** — `ShellLayout` exige sessão (senão → `/login`).
2. **Capacidade** — `RoleGuard` consulta `can(role, cap)` (matriz **editável**).
3. **Navegação** — o menu mostra só o que o perfil pode acessar.

### Design Tokens (Figma `node 8-2`)
Verde de marca `primary-500 #1E8E5A` · âmbar accent `secondary-500 #FBAB38` ·
neutros + feedback documentados · **Miriam Libre** (headings) / **Lexend** (body)
· grid **8pt**. (Tela de Login replicada do template `node 4023:664`.)

---

## RBAC — 7 perfis × capacidades (padrão; editável em /admin/permissoes)

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

## Heurísticas de Nielsen
Status (loaders/toasts/validações) · Mundo real (voucher/credencial/trilhas) ·
Controle (favoritar, cancelar em modais) · Consistência (Button/Modal/CRUD único)
· Prevenção de erros (CPF, voucher, e-mail único) · Reconhecimento (QR a 1 clique)
· Flexibilidade (filtros/busca) · Minimalismo · Recuperação de erros (mensagens claras).

## Status
Todos os módulos do MVP e da evolução estão concluídos (nenhum placeholder).
Próximas frentes saem do protótipo: **backend real** (API + JWT + Asaas + dados
por usuário) e **deploy/PWA** (ícones, instalação e offline).

Veja [DEMO.md](DEMO.md) para o roteiro de demonstração.
