import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { texto } from "@/lib/cadastro";
import { exigirCapacidade } from "@/lib/rbac.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Catálogo de interesses.
 *
 * A leitura é PÚBLICA: a nuvem de temas aparece no formulário de cadastro, que
 * por definição é usado por quem ainda não tem conta. Exigir sessão aqui fazia
 * a tela pública receber 401 sem ter como resolver. Não há nada sensível — são
 * os temas do evento, os mesmos que a landing page divulga.
 *
 * Criar e remover continuam exigindo `manage:platform`: o catálogo é curadoria
 * da organização.
 *
 * Mora no banco (e não mais no `localStorage`) para que a escolha de cada
 * pessoa, em `usuario_interesse`, possa ser cruzada em relatórios depois.
 */
export async function GET() {
  return rotaAdmin("api/interesses GET", async () => {
    const interesses = await prisma.interesse.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true },
    });

    return { interesses };
  });
}

/** Acrescenta um tema ao catálogo. */
export async function POST(req: Request) {
  return rotaAdmin("api/interesses POST", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const nome = texto((await req.json().catch(() => ({})) as any)?.nome);

    if (!nome) throw new ErroDeEntrada("Informe o nome do interesse.");
    if (nome.length > 80) throw new ErroDeEntrada("O nome deve ter no máximo 80 caracteres.");

    // A busca é insensível a maiúsculas para "ESG" e "esg" não virarem dois
    // temas distintos na nuvem.
    const existente = await prisma.interesse.findFirst({
      where: { nome: { equals: nome, mode: "insensitive" } },
      select: { id: true, nome: true, ativo: true },
    });

    if (existente) {
      // Reativa em vez de recusar: se o tema foi removido antes, voltar a
      // adicioná-lo é exatamente o que o Admin quer.
      if (!existente.ativo) {
        await prisma.interesse.update({ where: { id: existente.id }, data: { ativo: true } });
      }
      return { interesse: { id: existente.id, nome: existente.nome } };
    }

    const ultimo = await prisma.interesse.findFirst({
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    });

    const interesse = await prisma.interesse.create({
      data: { nome, ordem: (ultimo?.ordem ?? -1) + 1 },
      select: { id: true, nome: true },
    });

    return { interesse };
  });
}
