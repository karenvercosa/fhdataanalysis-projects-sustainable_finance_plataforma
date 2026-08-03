import { type SponsorTier } from "@/data/sponsorTiers";
import { type SponsorKind } from "@/lib/seals";
import { type Capability, type Role, type TipoConta } from "./rbac";

/** Usuário logado, do ponto de vista da interface. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  ticketCode?: string; // presente quando há ingresso ativo
  curatorVoucher?: string; // empresa/curador: prefixo do voucher
  /** Curador/patrocinador: cota contratada (base para o upgrade). */
  tier?: SponsorTier;
  /** Distingue curador (pessoa) de patrocinador (empresa) no selo. */
  sponsorKind?: SponsorKind;
  isPaid?: boolean; // adquiriu ingresso (pago ou resgate via voucher)
  /** Só o ingresso Presencial (voucher) gera credencial; Online é digital. */
  hasCredential?: boolean;
  /** Plano Gratuito ou assinante — resolvido no servidor. */
  tipoConta?: TipoConta;
  /** Selo/cota concedido pelo Admin (Ouro, Prata, Bronze). */
  selo?: string | null;
}

/** Retorno do login por e-mail/senha. */
export interface LoginResult {
  ok: boolean;
  error?: string;
  role?: Role;
  tipoConta?: TipoConta;
  /** A senha usada ainda é a provisória: só a troca de senha fica liberada. */
  precisaTrocarSenha?: boolean;
}

/**
 * Sessão entregue pelo servidor ao cliente (`GET /api/sessao` e props do
 * Server Component). É o que o `AuthContext` passa a considerar verdade —
 * `role` e `capabilities` nunca mais são decididos no navegador.
 */
export interface SessaoCliente {
  user: CurrentUser;
  capabilities: Capability[];
  /** Primeiro acesso pendente: a senha ainda é a provisória do e-mail. */
  senhaProvisoria?: boolean;
}
