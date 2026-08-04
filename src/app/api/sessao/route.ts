import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessaoServidor } from "@/lib/rbac.server";
import { cotaDoSelo } from "@/data/sponsorTiers";
import { type SessaoCliente } from "@/types";

export const runtime = "nodejs";
// A sessão é por usuário: nunca pode ser servida de cache estático.
export const dynamic = "force-dynamic";

/**
 * Fonte de verdade do usuário logado para o navegador.
 *
 * O `AuthContext` chama esta rota em vez de decidir papel e permissões a
 * partir do `localStorage`. Assim, mexer no storage muda no máximo o que a
 * própria pessoa vê na tela — nunca o que o servidor autoriza, já que toda
 * rota de API refaz a checagem com `exigirCapacidade`.
 */
export async function GET() {
  const sessao = await getSessaoServidor(headers());

  if (!sessao) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const corpo: SessaoCliente = {
    user: {
      id: sessao.id,
      name: sessao.nome,
      email: sessao.email,
      role: sessao.role,
      avatarUrl: sessao.avatarUrl ?? undefined,
      isPaid: sessao.isPaid,
      hasCredential: sessao.hasCredential,
      ticketCode: sessao.ticketCode,
      tipoConta: sessao.tipoConta,
      selo: sessao.selo,
      cargo: sessao.cargo,
      empresaNome: sessao.empresaNome,
      // A cota de patrocínio É o selo concedido pelo Admin. Sem esta
      // linha o curador chega sem cota e a plataforma o trata como Bronze.
      tier: cotaDoSelo(sessao.selo),
      voucherPendente: sessao.voucherPendente,
    },
    capabilities: sessao.capabilities,
    senhaProvisoria: sessao.senhaProvisoria,
  };

  return NextResponse.json(corpo);
}
