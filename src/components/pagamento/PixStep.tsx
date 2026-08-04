"use client";

import { QrCode, Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { Aguardando, campoLeitura } from "./shared";

type PixData = { encodedImage: string; payload: string };

/** Etapa de pagamento via PIX: copia-e-cola + QR Code, aguardando confirmação. */
export function PixStep({
  pix,
  copied,
  onCopy,
}: Readonly<{
  pix: PixData | null;
  copied: boolean;
  onCopy: () => void;
}>) {
  const t = useTranslations("Assinatura");

  return (
    <>
      <PageHeader title={t("pixTitulo")} subtitle={t("titulo")} icon={QrCode} />

      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">{t("pixCopiaCola")}</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex gap-2">
            <input readOnly value={pix?.payload || ""} className={campoLeitura} />
            <Button
              variant={copied ? "secondary" : "outline"}
              onClick={onCopy}
              leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              className="shrink-0"
            >
              {copied ? t("copiado") : t("btnCopiar")}
            </Button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-body-sm text-neutral-600">{t("pixQr")}</p>
            {pix?.encodedImage && (
              <img
                src={`data:image/png;base64,${pix.encodedImage}`}
                alt="QR Code PIX"
                className="h-52 w-52 rounded-md border border-neutral-200 bg-white p-2"
              />
            )}
          </div>

          <Aguardando texto={t("pixAguardando")} />
        </CardBody>
      </Card>
    </>
  );
}
