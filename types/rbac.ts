/**
 * Tipos e enums do controle de acesso (RBAC).
 *
 * Este arquivo é a única definição de papéis e capacidades. Ele não importa
 * nada — nem do Prisma, nem de `server-only` — porque é consumido dos três
 * lados da aplicação: middleware (Edge), rotas de API (Node) e componentes do
 * navegador.
 */

/** Papéis da interface da plataforma. */
export type Role =
  | "guest" // Plano Gratuito (cadastro feito, sem ingresso)
  | "attendee" // Participante Premium (ingresso ativo via voucher)
  | "speaker" // Palestrante
  | "curator" // Curador (patrocinador que distribui vouchers)
  | "operator" // Operador (credenciamento no dia)
  | "admin"; // Administrador

/** Ações autorizáveis. As rotas e a UI perguntam por capacidade, não por papel. */
export type Capability =
  | "view:public-content" // landing + conteúdo público básico
  | "view:streaming" // streaming do evento (livre, inclusive Não Pago)
  | "view:premium-content" // ver conteúdos premium (capa/preview)
  | "download:content" // TRAVA: baixar relatórios/vídeos/PDFs (pago)
  | "redeem:voucher" // checkout por convite (validar voucher)
  | "view:ticket-qr" // QR de credenciamento
  | "manage:personal-agenda" // favoritar sessões / agenda pessoal
  | "view:networking" // descoberta e perfis para networking
  | "manage:company-profile" // editar perfil da empresa/patrocinador
  | "view:curator-dashboard" // métricas de voucher + leads (LGPD)
  | "manage:speaker-content" // materiais/slides do palestrante
  | "operate:checkin" // bipar QR, busca fallback, status
  | "purchase:ticket" // adquirir acesso ao evento (compra/voucher)
  | "view:event-map" // mapa do evento (palcos, stands, salas)
  | "view:certificate" // certificado de participação (pós-evento)
  | "manage:platform"; // admin total

/** Matriz de capacidades por papel. */
export type MatrizPermissoes = Record<Role, Capability[]>;

/**
 * Perfis gravados no banco — espelha o enum `perfil_usuario` do Postgres
 * (`prisma/schema.prisma`). Declarado como objeto congelado em vez de `enum`
 * do TypeScript para não gerar código em runtime nem quebrar o
 * `isolatedModules` ativo no tsconfig.
 */
export const PerfilUsuario = {
  admin: "admin",
  operadorCredenciamento: "operador_credenciamento",
  curador: "curador",
  startup: "startup",
  investidor: "investidor",
  patrocinador: "patrocinador",
  palestrante: "palestrante",
  participante: "participante",
} as const;

export type PerfilUsuario = (typeof PerfilUsuario)[keyof typeof PerfilUsuario];

/** Sessão resolvida no servidor: papel e capacidades vêm do banco, não do cliente. */
export interface SessaoServidor {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  capabilities: Capability[];
  /** Perfis crus do banco — úteis para regras específicas (ex.: patrocinador). */
  perfis: PerfilUsuario[];
  /** Tem ingresso pago/confirmado: libera o conteúdo premium. */
  isPaid: boolean;
  /** Só o ingresso presencial gera credencial (QR de check-in). */
  hasCredential: boolean;
  ticketCode?: string;
}

/** Regra que liga um prefixo de rota à capacidade exigida. */
export interface RegraRota {
  /** Prefixo do caminho. A regra mais específica (mais longa) vence. */
  prefixo: string;
  /** Capacidade exigida. `null` = basta estar autenticado. */
  capacidade: Capability | null;
  /**
   * O Plano Gratuito (`guest`) entra e vê a versão de amostra da página —
   * é o comportamento do `AcquireGuard` no front. Sem isso, quem ainda não
   * comprou seria expulso de telas que existem justamente para converter.
   */
  previewGratuito?: boolean;
}
