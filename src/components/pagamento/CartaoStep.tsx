"use client";

import { AlertCircle, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { formatarCep, type CartaoData, type TitularData } from "./shared";

/** Etapa de pagamento via cartão de crédito (nacional ou internacional). */
export function CartaoStep({
  card,
  onCardChange,
  titular,
  onTitularChange,
  submitting,
  errorMsg,
  onPagar,
}: Readonly<{
  card: CartaoData;
  onCardChange: (k: keyof CartaoData) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  titular: TitularData;
  onTitularChange: (k: keyof TitularData) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  submitting: boolean;
  errorMsg: string | null;
  onPagar: () => void;
}>) {
  const t = useTranslations("Assinatura");

  return (
    <>
      <PageHeader title={t("cartaoTitulo")} subtitle={t("titulo")} icon={CreditCard} />

      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">{t("cartaoTitulo")}</p>
        </CardHeader>
        <CardBody className="space-y-3">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md bg-error-50 px-3 py-2 text-body-sm text-error-500"
            >
              <AlertCircle className="h-4 w-4 shrink-0" /> {errorMsg}
            </div>
          )}

          <Input
            label={t("labelTitular")}
            placeholder={t("placeholderTitular")}
            autoComplete="cc-name"
            value={card.holderName}
            onChange={onCardChange("holderName")}
          />

          <Input
            label={t("labelNumero")}
            placeholder="0000 0000 0000 0000"
            inputMode="numeric"
            autoComplete="cc-number"
            value={card.number}
            onChange={onCardChange("number")}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label={t("labelMes")}
              placeholder="MM"
              inputMode="numeric"
              autoComplete="cc-exp-month"
              value={card.expiryMonth}
              onChange={onCardChange("expiryMonth")}
            />
            <Input
              label={t("labelAno")}
              placeholder="AAAA"
              inputMode="numeric"
              autoComplete="cc-exp-year"
              value={card.expiryYear}
              onChange={onCardChange("expiryYear")}
            />
            <Input
              label={t("labelCvv")}
              placeholder="123"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={card.ccv}
              onChange={onCardChange("ccv")}
            />
          </div>

          {/* Endereço do titular: exigido pelo Asaas na tokenização. */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("labelCep")}
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
              value={formatarCep(titular.postalCode)}
              onChange={onTitularChange("postalCode")}
              hint={t("avisoCep")}
            />
            <Input
              label={t("labelNumeroEndereco")}
              placeholder="123"
              value={titular.addressNumber}
              onChange={onTitularChange("addressNumber")}
            />
          </div>

          <Button fullWidth size="lg" onClick={onPagar} disabled={submitting}>
            {submitting ? t("processando") : t("btnRealizarPagamento")}
          </Button>
        </CardBody>
      </Card>
    </>
  );
}
