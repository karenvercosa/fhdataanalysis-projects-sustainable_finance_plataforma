import { useState } from "react";
import { CheckCircle2, Copy, Check, CreditCard, Layers } from "lucide-react";
import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { useVouchers } from "@/context/VouchersContext";
import { cn } from "@/lib/utils";
import { type Voucher } from "@/data/schema";

/**
 * ⚠️ NÃO ESTÁ EM USO.
 *
 * Compra de convites em lote pelo curador — o checkout simulado que ocupava a
 * aba "Ingressos" antes dela virar um pedido por e-mail
 * (`SolicitarVouchers`). Foi tirado de `VoucherCheckout` e preservado aqui
 * inteiro, para o dia em que o pagamento (Asaas) for integrado de verdade.
 *
 * Depende do `VouchersContext`, que ainda trabalha com os vouchers de
 * protótipo de `src/data/catalog.ts` — não com a tabela `voucher` do banco.
 */

const LOTE_UNIT = 250; // valor por convite no lote do curador
const CURATOR_ID = "cur_1";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CompraLoteCurador() {
  const { createBatch, vouchers } = useVouchers();

  // Vouchers já criados/usados pelo curador (para o menu suspenso do lote).
  const myVoucherCodes = vouchers
    .filter((v) => v.ownerType === "curator" && v.ownerId === CURATOR_ID)
    .map((v) => v.code);

  const [quantity, setQuantity] = useState(10);
  const [loteCode, setLoteCode] = useState("");
  const [batch, setBatch] = useState<Voucher | null>(null);
  const [copied, setCopied] = useState(false);

  const loteTotal = Math.max(1, quantity) * LOTE_UNIT;
  const reusing = myVoucherCodes.some((c) => c.toLowerCase() === loteCode.trim().toLowerCase());

  const buyLote = () => setBatch(createBatch(CURATOR_ID, Math.max(1, quantity), loteCode));

  if (batch) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-success-500" />
            <h1 className="text-h2 text-neutral-900">Lote adquirido!</h1>
            <p className="max-w-md text-body text-neutral-600">
              Geramos um voucher com <strong>{batch.maxUses} convites</strong> para você distribuir
              e gerenciar na sua rede.
            </p>
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-neutral-50 px-4 py-3">
              <span className="font-mono text-h4 tracking-wide text-primary-700">{batch.code}</span>
              <Button
                variant={copied ? "secondary" : "outline"}
                size="sm"
                leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={() => {
                  navigator.clipboard?.writeText(batch.code);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copiado!" : "Copiar código"}
              </Button>
            </div>
            <p className="text-body-sm text-neutral-500">
              Acompanhe o uso em <strong>Início → Meus vouchers</strong>.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title="Adquirir ingressos"
        subtitle="Compre convites em lote ou avulso e distribua via voucher"
        icon={Layers}
      />

      {/* Voucher: escolher um já usado (menu suspenso) ou escrever um novo */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Voucher</p>
          <p className="text-body-sm text-neutral-600">
            Escolha um voucher já utilizado ou escreva um novo nome. Reutilizar um código soma os
            convites a ele.
          </p>
        </CardHeader>
        <CardBody className="space-y-1.5">
          <label htmlFor="lote-code" className="block text-h5 text-neutral-900">
            Nome do voucher
          </label>
          <input
            id="lote-code"
            list="curator-voucher-codes"
            value={loteCode}
            onChange={(e) => setLoteCode(e.target.value)}
            placeholder="Ex.: VERDE2026 — ou escolha um existente"
            className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          <datalist id="curator-voucher-codes">
            {myVoucherCodes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {loteCode.trim() && (
            <p className="text-body-sm text-neutral-600">
              {reusing
                ? "↻ Reutilizando um voucher existente — os convites serão somados a ele."
                : "＋ Novo voucher será criado com este nome."}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Quantidade de convites</p>
          <p className="text-body-sm text-neutral-600">
            Compre em lote ou em pouca quantidade — {brl(LOTE_UNIT)} por convite.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-md border border-neutral-200">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-10 w-10 text-h4 text-neutral-600 hover:bg-neutral-100"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="h-10 w-16 border-x border-neutral-200 text-center text-body text-neutral-900 outline-none"
              />
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="h-10 w-10 text-h4 text-neutral-600 hover:bg-neutral-100"
              >
                +
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[5, 10, 25, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuantity(n)}
                  className={cn(
                    "rounded-full px-3 py-1 text-body-sm transition-colors",
                    quantity === n ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-neutral-200 p-4 text-body-sm text-neutral-600">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Pagamento via <strong>Asaas</strong> (Cartão ou Pix). Ao concluir, você recebe 1
              voucher com {quantity} convites para distribuir.
            </span>
          </div>

          <div className="space-y-1 rounded-md bg-neutral-50 p-4">
            <div className="flex justify-between text-body text-neutral-600">
              <span>{quantity} × convite</span>
              <span>{brl(LOTE_UNIT)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-h4 text-neutral-900">
              <span>Total</span>
              <span>{brl(loteTotal)}</span>
            </div>
          </div>

          <Button fullWidth size="lg" onClick={buyLote}>
            Comprar {quantity} convites · {brl(loteTotal)}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
