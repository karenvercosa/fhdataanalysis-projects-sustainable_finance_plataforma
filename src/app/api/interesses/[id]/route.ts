import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { exigirCapacidade } from "@/lib/rbac.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: { id: string } };

/**
 * Remove um tema do catálogo.
 *
 * É uma DESATIVAÇÃO, não um `DELETE`: quem já escolheu o tema tem uma linha em
 * `usuario_interesse`, e apagar o interesse levaria esse histórico junto pela
 * cascata. Desativado, ele some da nuvem mas continua contável nos relatórios.
 */
export async function DELETE(req: Request, { params }: Contexto) {
  return rotaAdmin("api/interesses DELETE", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const interesse = await prisma.interesse.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!interesse) throw new ErroDeEntrada("Interesse não encontrado.");

    await prisma.interesse.update({ where: { id: params.id }, data: { ativo: false } });

    return { ok: true };
  });
}
