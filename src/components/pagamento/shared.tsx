"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Peças compartilhadas das etapas de pagamento.
 *
 * A integração com o Asaas veio da landing page, mas o LAYOUT é o da
 * plataforma: cards claros do design system dentro do AppShell, e não o card
 * escuro sobre foto que a landing page usa. Lá a assinatura é uma página
 * inteira; aqui ela é mais uma aba, ao lado do menu e do cabeçalho.
 */

export type CartaoData = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type TitularData = {
  postalCode: string;
  addressNumber: string;
};

/** Container das etapas + popup de confirmação. */
export function Wrapper({
  showPopup,
  popupText,
  children,
}: Readonly<{
  showPopup: boolean;
  popupText: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {children}

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex animate-in fade-in zoom-in-95 flex-col items-center gap-3 rounded-lg bg-white p-8 text-center shadow-pop duration-300">
            <CheckCircle2 className="h-12 w-12 text-success-500" />
            <p className="text-h4 text-neutral-900">{popupText}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Resumo do produto escolhido, no topo do checkout. */
export function PlanoCard({
  nome,
  desc,
  valor,
  periodo,
}: Readonly<{
  nome: string;
  desc: string;
  valor: string;
  periodo: string;
}>) {
  return (
    <Card className="border-primary-500 bg-primary-50">
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-h4 text-neutral-900">{nome}</p>
          <p className="text-body-sm text-neutral-600">{desc}</p>
        </div>
        <p className="text-h2 text-neutral-900">
          {valor} <span className="text-body text-neutral-600">/{periodo}</span>
        </p>
      </CardBody>
    </Card>
  );
}

/** Campo somente leitura com valor longo (copia-e-cola do PIX, linha do boleto). */
export const campoLeitura =
  "h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 text-body-sm text-neutral-700 outline-none";

/** Estado de espera das etapas que dependem de compensação bancária. */
export function Aguardando({ texto, className }: Readonly<{ texto: string; className?: string }>) {
  return (
    <p
      className={cn(
        "flex items-center justify-center gap-2 rounded-md bg-neutral-50 px-4 py-3 text-body-sm text-neutral-600",
        className,
      )}
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-100 border-t-primary-500" />
      {texto}
    </p>
  );
}

/** Máscara de CEP: só dígitos (máx. 8), formatado como 00000-000. */
export function formatarCep(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
