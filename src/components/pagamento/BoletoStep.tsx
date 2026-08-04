"use client";

import { Barcode, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { Aguardando, campoLeitura } from "./shared";

type BoletoData = { bankSlipUrl?: string; identificationField?: string };

/** Etapa de pagamento via boleto: linha digitável + PDF, aguardando compensação. */
export function BoletoStep({ boleto }: Readonly<{ boleto: BoletoData | null }>) {
  const t = useTranslations("Assinatura");

  return (
    <>
      <PageHeader title={t("boletoTitulo")} subtitle={t("titulo")} icon={Barcode} />

      <Card>
        <CardBody className="space-y-4">
          {boleto?.identificationField && (
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">{t("boletoLinha")}</label>
              <input readOnly value={boleto.identificationField} className={campoLeitura} />
            </div>
          )}

          {boleto?.bankSlipUrl && (
            <a
              href={boleto.bankSlipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-button text-white transition-colors hover:bg-primary-600 sm:w-auto"
            >
              {t("btnAbrirBoleto")} <ArrowRight className="h-4 w-4" />
            </a>
          )}

          <Aguardando texto={t("boletoAguardando")} />
        </CardBody>
      </Card>
    </>
  );
}
