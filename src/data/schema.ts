// =====================================================================
//  ARQUITETURA DE DADOS — Sustainable Finance 2026 (v2)
//  Modelo relacional do Hub. Tipos usados pelos componentes e mocks.
//
//  Entidades:  User · TicketType · Voucher · Curator · Company ·
//              Speaker · Session · Content
//  Relações:   Voucher.ownerId → Company|Curator (1:N)
//              User.ticketTypeId → TicketType (N:1)
//              User.redeemedVoucherId → Voucher (N:1)
//              Content ↔ Session ↔ Speaker ↔ Curator (N:N via arrays de id)
// =====================================================================
import { type Role } from "@/lib/roles";

/** Selo/tag visual injetável pelo Admin (não altera rotas; só destaque). */
export type UserTag = "Palestrante" | "VIP" | "Imprensa" | "Staff" | "—";

// ---------------------------------------------------------------------
//  USER — onboarding segmentado em 2 fases (frictionless)
// ---------------------------------------------------------------------

/** FASE 1 — Acesso à plataforma/streaming (atrito mínimo). */
export interface UserPhase1 {
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // exclusivamente para confirmação de segurança (texto de UX)
}

/** FASE 2 — Momento de adquirir o ingresso (dados complementares). */
export interface UserPhase2 {
  company?: string;
  jobTitle?: string; // Cargo
  ticketTypeId?: string;
  redeemedVoucherId?: string;
}

export interface AppUser extends UserPhase1, UserPhase2 {
  id: string;
  role: Role;
  tags: UserTag[];          // Admin injeta/altera dinamicamente
  onboardingPhase: 1 | 2;   // 1 = só streaming · 2 = ingresso adquirido
  isPaid: boolean;          // possui ingresso (pago OU resgate via voucher)
  /** TRAVA RÍGIDA: download de conteúdo só para quem tem ingresso. */
  canDownload: boolean;     // === isPaid (Não Pago = false)
  interests: string[];
}

// ---------------------------------------------------------------------
//  INGRESSOS & VOUCHERS
// ---------------------------------------------------------------------
export interface TicketType {
  id: string;
  name: string;
  price: number;       // em R$ (0 = cortesia)
  description?: string;
}

export type VoucherKind = "free" | "percent" | "fixed";
export type OwnerType = "company" | "curator";

export interface Voucher {
  id: string;
  code: string;
  kind: VoucherKind;   // free = 100% · percent = % · fixed = R$ abatido
  value: number;       // % (0–100) ou R$; ignorado quando kind = free
  maxUses: number;     // Admin controla a quantidade de usos
  usedCount: number;
  ownerType: OwnerType;
  ownerId: string;     // Company.id ou Curator.id
  active: boolean;
}

// ---------------------------------------------------------------------
//  CURADOR / EMPRESA  (donos de voucher)
// ---------------------------------------------------------------------
export type PersonType = "PF" | "CNPJ";

export interface Curator {
  id: string;
  name: string;
  personType: PersonType; // Curador pode ser Pessoa Física ou CNPJ
  document: string;       // CPF ou CNPJ
  email: string;
  phone: string;
  active: boolean;
}

export interface Company {
  id: string;
  name: string;
  segment: string;
  tier: "Ouro" | "Prata" | "Bronze";
  active: boolean;
}

export interface Speaker {
  id: string;
  name: string;
  jobTitle: string;
  company: string;
  track: "ESG" | "Investimentos" | "Inovação";
}

// ---------------------------------------------------------------------
//  CONTEÚDO — associação coesa (N:N) Sessão × Palestrante × Curador
// ---------------------------------------------------------------------
export type ContentFormat = "Relatório" | "Vídeo" | "Podcast" | "E-book" | "PDF";

export interface Content {
  id: string;
  title: string;
  format: ContentFormat;
  /** Requer "Acesso ao Conhecimento" (download). Streaming é livre. */
  premium: boolean;
  phase: "Pré-evento" | "Pós-evento";
  sessionIds: string[];   // N:N → Session
  speakerIds: string[];   // N:N → Speaker
  curatorIds: string[];   // N:N → Curator (patrocinador)
}
