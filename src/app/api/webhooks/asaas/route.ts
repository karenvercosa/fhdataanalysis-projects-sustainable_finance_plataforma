import { NextResponse } from "next/server";
import { confirmarPagamento } from "@/lib/premium.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENTOS_DE_PAGAMENTO = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

/**
 * Webhook do Asaas — confirmação automática em produção.
 *
 * Em sandbox e em ambiente local ele não chega, e a tela confirma por polling
 * em `/api/assinatura/status`. As duas vias caem no mesmo `confirmarPagamento`,
 * que é idempotente: a mesma cobrança pode ser confirmada duas vezes sem
 * promover ninguém duas vezes.
 *
 * A plataforma e a landing page dividem a mesma conta do Asaas, então chegam
 * aqui eventos de cobranças que não são desta aplicação. `confirmarPagamento`
 * devolve `false` nesses casos e o webhook responde 200 assim mesmo — um erro
 * faria o Asaas reenviar o evento indefinidamente.
 */
export async function POST(req: Request) {
  try {
    // Segurança: valida o token do webhook, se configurado.
    const token = process.env.ASAAS_WEBHOOK_TOKEN;
    if (token && req.headers.get("asaas-access-token") !== token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    if (EVENTOS_DE_PAGAMENTO.has(body?.event)) {
      const paymentId = body?.payment?.id;
      if (typeof paymentId === "string") await confirmarPagamento(paymentId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhooks/asaas]", error);
    return NextResponse.json({ error: "Erro no Webhook" }, { status: 500 });
  }
}
