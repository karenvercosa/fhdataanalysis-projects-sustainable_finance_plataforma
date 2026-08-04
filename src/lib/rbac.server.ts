import "server-only";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DEFAULT_MATRIX } from "@/lib/roles";
import {
  PerfilUsuario,
  type Capability,
  type Role,
  type SessaoServidor,
  type TipoConta,
} from "@/types";

/**
 * ============================================================================
 *  RBAC SERVER-SIDE
 * ============================================================================
 *
 * O RBAC do front (`PermissionsContext` + `RoleGuard`) vive no navegador e é
 * persistido em `localStorage`: serve para a experiência (esconder menus,
 * redirecionar), mas não é barreira de segurança — qualquer pessoa edita o
 * storage e vira `admin`.
 *
 * Este módulo é a versão autoritativa: a sessão vem do cookie assinado do
 * Better Auth e o papel vem da tabela `usuario_perfil` no Postgres. Nada aqui
 * confia em qualquer valor enviado pelo cliente.
 *
 * `import "server-only"` faz o build falhar se este arquivo for importado por
 * um Client Component — é o que impede o vazamento acidental para o bundle.
 */

/**
 * Tradução do enum do banco para os papéis da interface.
 *
 * O banco tem 9 perfis e a plataforma trabalha com 6: startup, investidor e
 * participante compartilham as mesmas telas (`attendee`), patrocinador
 * compartilha as do curador e `gratuito` é o próprio Plano Gratuito (`guest`).
 */
const PERFIL_PARA_ROLE: Record<PerfilUsuario, Role> = {
  [PerfilUsuario.admin]: "admin",
  [PerfilUsuario.operadorCredenciamento]: "operator",
  [PerfilUsuario.curador]: "curator",
  [PerfilUsuario.patrocinador]: "curator",
  [PerfilUsuario.palestrante]: "speaker",
  [PerfilUsuario.participante]: "attendee",
  [PerfilUsuario.startup]: "attendee",
  [PerfilUsuario.investidor]: "attendee",
  [PerfilUsuario.gratuito]: "guest",
};

/**
 * Perfil gravado quando o Admin escolhe um papel na tela de usuários.
 *
 * É o inverso de `PERFIL_PARA_ROLE`, e precisa ser declarado à parte porque
 * aquele mapa não é injetor: `startup`, `investidor` e `participante` levam
 * todos a `attendee`, e `patrocinador` e `curador` levam a `curator`. Aqui
 * fica a escolha canônica de cada papel — a que o CRUD grava.
 */
export const ROLE_PARA_PERFIL: Record<Role, PerfilUsuario> = {
  guest: PerfilUsuario.gratuito,
  attendee: PerfilUsuario.participante,
  speaker: PerfilUsuario.palestrante,
  curator: PerfilUsuario.curador,
  operator: PerfilUsuario.operadorCredenciamento,
  admin: PerfilUsuario.admin,
};

/**
 * Precedência quando a pessoa tem mais de um perfil: vale o mais poderoso.
 * Um curador que também é participante entra como curador.
 */
const PRECEDENCIA: Role[] = ["admin", "operator", "curator", "speaker", "attendee", "guest"];

/**
 * Sessão autenticada + papel efetivo, resolvidos inteiramente no servidor.
 * Devolve `null` para quem não está autenticado.
 */
export async function getSessaoServidor(headers: Headers): Promise<SessaoServidor | null> {
  const sessao = await auth.api.getSession({ headers });
  if (!sessao?.user?.id) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.user.id },
    select: {
      id: true,
      nomeCompleto: true,
      email: true,
      avatarUrl: true,
      ativo: true,
      selo: true,
      cargo: true,
      empresaNome: true,
      senhaProvisoriaHash: true,
      perfis: { select: { perfil: true } },
      ingressos: {
        where: { statusIngresso: "pago" },
        select: { qrCode: true },
        take: 1,
      },
      assinaturas: {
        where: { status: "ativa" },
        select: { id: true },
        take: 1,
      },
      // Resgate aguardando o curador — vira o aviso no topo da home.
      resgatesDeVoucher: {
        where: { status: "pendente" },
        select: { voucher: { select: { codigo: true, empresaNome: true } } },
        take: 1,
      },
    },
  });

  // Conta desativada pelo Admin perde o acesso mesmo com cookie de sessão válido.
  if (!usuario?.ativo) return null;

  const perfis = usuario.perfis.map((p) => p.perfil as PerfilUsuario);
  const role = roleEfetivo(perfis);
  const ingresso = usuario.ingressos[0];
  const isPaid = Boolean(ingresso);

  return {
    id: usuario.id,
    nome: usuario.nomeCompleto ?? usuario.email,
    email: usuario.email,
    avatarUrl: usuario.avatarUrl,
    role,
    capabilities: DEFAULT_MATRIX[role] ?? [],
    perfis,
    selo: usuario.selo,
    cargo: usuario.cargo,
    empresaNome: usuario.empresaNome,
    voucherPendente: usuario.resgatesDeVoucher[0]
      ? {
          codigo: usuario.resgatesDeVoucher[0].voucher.codigo,
          empresaNome: usuario.resgatesDeVoucher[0].voucher.empresaNome,
        }
      : null,
    tipoConta: tipoDeConta(role, isPaid, usuario.assinaturas.length > 0),
    senhaProvisoria: Boolean(usuario.senhaProvisoriaHash),
    isPaid,
    hasCredential: Boolean(ingresso?.qrCode),
    ticketCode: ingresso?.qrCode,
  };
}

/** Papel efetivo a partir dos perfis do banco. Sem perfil algum = `guest`. */
export function roleEfetivo(perfis: PerfilUsuario[]): Role {
  const papeis = perfis.map((p) => PERFIL_PARA_ROLE[p]).filter(Boolean);
  return PRECEDENCIA.find((r) => papeis.includes(r)) ?? "guest";
}

/**
 * Tipo comercial da conta.
 *
 * É `gratuito` só quem está no Plano Gratuito puro: nenhum perfil concedido
 * pela organização, nenhum ingresso pago e nenhuma assinatura ativa. Qualquer
 * uma dessas três coisas já caracteriza um assinante.
 */
export function tipoDeConta(
  role: Role,
  isPaid: boolean,
  assinaturaAtiva: boolean,
): TipoConta {
  if (role !== "guest" || isPaid || assinaturaAtiva) return "assinante";
  return "gratuito";
}

/** `true` quando o papel resolvido no servidor possui a capacidade. */
export function podeServidor(role: Role, cap: Capability): boolean {
  return DEFAULT_MATRIX[role]?.includes(cap) ?? false;
}

/** Erro devolvido por `exigirCapacidade` — carrega o status HTTP correto. */
export class ErroAutorizacao extends Error {
  constructor(
    readonly status: 401 | 403,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroAutorizacao";
  }
}

/**
 * Guarda das rotas de API: exige sessão válida e, opcionalmente, uma
 * capacidade. Lança `ErroAutorizacao` — o handler converte em resposta.
 *
 *   const sessao = await exigirCapacidade(req.headers, "manage:platform");
 */
export async function exigirCapacidade(
  headers: Headers,
  cap?: Capability,
): Promise<SessaoServidor> {
  const sessao = await getSessaoServidor(headers);
  if (!sessao) throw new ErroAutorizacao(401, "Sessão expirada. Entre novamente.");
  if (cap && !podeServidor(sessao.role, cap)) {
    throw new ErroAutorizacao(403, "Você não tem permissão para esta ação.");
  }
  return sessao;
}
