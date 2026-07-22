// =====================================================================
//  RBAC — Sustainable Finance 2026
//  7 perfis x capacidades (capability-based). As rotas e a UI consultam
//  `can(role, capability)` em vez de checar o papel diretamente — assim
//  novas regras de negócio não exigem reescrever guards.
// =====================================================================

export type Role =
  | "guest"        // Plano Gratuito (cadastro feito, sem ingresso)
  | "attendee"     // Participante Premium (ingresso ativo via voucher)
  | "speaker"      // Palestrante
  | "curator"      // Curador (patrocinador que distribui vouchers)
  | "operator"     // Operador (credenciamento no dia)
  | "admin";       // Administrador

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Plano Gratuito",
  attendee: "Participante Premium",
  speaker: "Palestrante",
  curator: "Curador / Patrocinador",
  operator: "Operador",
  admin: "Administrador"
};

export type Capability =
  | "view:public-content"     // landing + conteúdo público básico
  | "view:streaming"          // streaming do evento (livre, inclusive Não Pago)
  | "view:premium-content"    // ver conteúdos premium (capa/preview)
  | "download:content"        // TRAVA: baixar relatórios/vídeos/PDFs (pago)
  | "redeem:voucher"          // checkout por convite (validar voucher)
  | "view:ticket-qr"          // QR de credenciamento
  | "manage:personal-agenda"  // favoritar sessões / agenda pessoal
  | "view:networking"         // descoberta e perfis para networking
  | "manage:company-profile"  // editar perfil da empresa/patrocinador
  | "view:curator-dashboard"  // métricas de voucher + leads (LGPD)
  | "manage:speaker-content"  // materiais/slides do palestrante
  | "operate:checkin"         // bipar QR, busca fallback, status
  | "purchase:ticket"         // adquirir acesso ao evento (compra/voucher)
  | "view:event-map"          // mapa do evento (palcos, stands, salas)
  | "view:certificate"        // certificado de participação (pós-evento)
  | "manage:platform";        // admin total

// Participante Geral (pago): base herdada pelo Palestrante.
// `view:ticket-qr` (credencial) NÃO entra na base — é concedido só a quem
// precisa ser credenciado: Participante Geral, Curador e Palestrante.
const ATTENDEE_CAPS: Capability[] = [
  "view:public-content",
  "view:streaming",
  "view:premium-content",
  "download:content",
  "manage:personal-agenda",
  "view:networking",
  "view:event-map"
];

// Rótulos legíveis das capacidades (usados no editor de Permissões).
export const CAPABILITY_LABEL: Record<Capability, string> = {
  "view:public-content": "Conteúdo público",
  "view:streaming": "Streaming",
  "view:premium-content": "Ver premium",
  "download:content": "Baixar conteúdo",
  "redeem:voucher": "Resgatar voucher",
  "view:ticket-qr": "Credencial (QR)",
  "manage:personal-agenda": "Agenda pessoal",
  "view:networking": "Networking",
  "manage:company-profile": "Perfil de empresa",
  "view:curator-dashboard": "Painel do curador",
  "manage:speaker-content": "Materiais do palestrante",
  "operate:checkin": "Credenciamento",
  "purchase:ticket": "Adquirir ingresso",
  "view:event-map": "Mapa do evento",
  "view:certificate": "Certificado de participação",
  "manage:platform": "Gestão da plataforma"
};

export const ALL_CAPABILITIES = Object.keys(CAPABILITY_LABEL) as Capability[];

// Matriz PADRÃO de capacidades por papel (semente do editor de Permissões).
export const DEFAULT_MATRIX: Record<Role, Capability[]> = {
  // Plano Gratuito: streaming livre, sem download e SEM credencial; pode adquirir
  // acesso. Agenda pessoal é recurso de membro — favoritar exige upgrade.
  guest: ["view:public-content", "view:streaming", "view:premium-content", "purchase:ticket"],
  attendee: [...ATTENDEE_CAPS, "view:ticket-qr", "view:certificate"],
  // Palestrante HERDA as rotas do Participante Geral (+ materiais próprios).
  // O diferencial é apenas visual (selo/tag), injetável pelo Admin.
  speaker: [...ATTENDEE_CAPS, "view:ticket-qr", "manage:speaker-content", "view:certificate"],
  curator: [
    "view:public-content",
    "view:streaming",
    "view:premium-content",
    "download:content",
    "view:networking",
    "manage:personal-agenda",
    "manage:company-profile",
    "view:curator-dashboard",
    "view:ticket-qr",
    "purchase:ticket",
    "view:event-map",
    "view:certificate"
  ],
  // Operador e Admin operam o evento — não possuem credencial própria.
  operator: ["view:public-content", "view:streaming", "manage:personal-agenda", "operate:checkin"],
  // Admin vê tudo igual aos outros usuários (inclui credencial e certificado)
  // + todas as funcionalidades de gestão.
  admin: [
    ...ATTENDEE_CAPS,
    "view:ticket-qr",
    "view:certificate",
    "manage:company-profile",
    "view:curator-dashboard",
    "manage:speaker-content",
    "operate:checkin",
    "manage:platform"
  ]
};

/** Verificação estática (fallback). A versão editável vem do PermissionsContext. */
export function can(role: Role, cap: Capability): boolean {
  return DEFAULT_MATRIX[role]?.includes(cap) ?? false;
}

/** Rota inicial recomendada por papel após o login. */
export const HOME_BY_ROLE: Record<Role, string> = {
  guest: "/inicio",
  attendee: "/inicio",
  speaker: "/inicio",
  curator: "/curador",
  operator: "/operacao",
  admin: "/admin"
};
