import "server-only";

import prisma from "@/lib/prisma";
import { ErroDeEntrada } from "@/lib/admin.server";
import { EMAIL_REGEX, texto } from "@/lib/cadastro";
import { ROLE_PARA_PERFIL, roleEfetivo } from "@/lib/rbac.server";
import { type PerfilUsuario, type Role, type UsuarioAdmin } from "@/types";

/**
 * Peças compartilhadas pelas rotas do CRUD de usuários do Admin.
 *
 * Ficam fora dos arquivos `route.ts` porque o App Router só aceita os
 * handlers HTTP como exportações de uma rota — qualquer outro `export` ali
 * quebra o build.
 */

const SELOS_VALIDOS = new Set(["Ouro", "Prata", "Bronze"]);

export const SELECAO_USUARIO = {
  id: true,
  nomeCompleto: true,
  email: true,
  selo: true,
  ativo: true,
  empresaNome: true,
  voucher: true,
  perfis: { select: { perfil: true } },
} as const;

interface RegistroUsuario {
  id: string;
  nomeCompleto: string | null;
  email: string;
  selo: string | null;
  ativo: boolean;
  empresaNome: string | null;
  voucher: string | null;
  perfis: { perfil: string }[];
}

export function usuarioParaJson(u: RegistroUsuario): UsuarioAdmin {
  return {
    id: u.id,
    nome: u.nomeCompleto ?? "",
    email: u.email,
    role: roleEfetivo(u.perfis.map((p) => p.perfil as PerfilUsuario)),
    selo: u.selo,
    ativo: u.ativo,
    empresaNome: u.empresaNome,
    voucher: u.voucher,
  };
}

/** Valida e normaliza o corpo do formulário do Admin. */
export function lerFormularioUsuario(body: any) {
  const nome = texto(body?.nome);
  const email = texto(body?.email).toLowerCase();
  const role = texto(body?.role) as Role;
  const selo = texto(body?.selo);

  if (nome.length < 2) throw new ErroDeEntrada("Informe o nome completo.");
  if (!EMAIL_REGEX.test(email)) throw new ErroDeEntrada("Informe um e-mail válido, contendo @.");
  if (!ROLE_PARA_PERFIL[role]) throw new ErroDeEntrada("Perfil inválido.");
  if (selo && !SELOS_VALIDOS.has(selo)) throw new ErroDeEntrada("Selo inválido.");

  return {
    nome,
    email,
    role,
    // "Sem selo" chega como string vazia e é gravado como ausência.
    selo: selo || null,
    ativo: body?.ativo !== false,
  };
}

/** Cliente do Prisma ou o handle de uma transação — as duas coisas servem. */
type ClientePrisma = Pick<typeof prisma, "usuarioPerfil">;

/**
 * Deixa `usuario_perfil` com exatamente o perfil escolhido.
 *
 * Trocar de papel é substituir, não acumular: sem o `deleteMany` um usuário
 * rebaixado de admin para participante continuaria com a linha `admin`, e o
 * `roleEfetivo` — que vale o perfil mais poderoso — o manteria admin.
 */
export async function aplicarPerfil(tx: ClientePrisma, usuarioId: string, role: Role) {
  const perfil = ROLE_PARA_PERFIL[role];
  await tx.usuarioPerfil.deleteMany({ where: { usuarioId, perfil: { not: perfil } } });
  await tx.usuarioPerfil.upsert({
    where: { usuarioId_perfil: { usuarioId, perfil } },
    create: { usuarioId, perfil },
    update: {},
  });
}
