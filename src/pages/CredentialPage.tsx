import { ShieldCheck, Lock, Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge, Button, Card, CardBody, QRCode } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { PreviewLock } from "@/components/PreviewLock";
import { credentialCode } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/roles";

export default function CredentialPage() {
  const { user, can } = useAuth();
  const locked = !can("view:ticket-qr"); // Não Pago vê apenas um teaser
  const onlineOnly = user.hasCredential === false; // ingresso Online não gera credencial

  if (onlineOnly) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <PageHeader title="Credencial" subtitle="Disponível para ingresso presencial" icon={ShieldCheck} />
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-neutral-100 text-neutral-500">
              <Lock className="h-7 w-7" />
            </div>
            <p className="text-h4 text-neutral-900">Seu ingresso é Online</p>
            <p className="max-w-xs text-body text-neutral-600">
              A credencial de entrada é exclusiva do ingresso <strong>Presencial</strong>. Seu acesso Online
              é <strong>ilimitado</strong> em toda a plataforma.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }
  // Código próprio por perfil (EMP/CUR/SPK/SF26) quando não há ticket de compra.
  const code = credentialCode(user.role, user.email, user.ticketCode);

  const body = (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader title="Credencial" subtitle="Apresente na entrada para o credenciamento" icon={ShieldCheck} />

      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-6">
          <Badge tone={locked ? "neutral" : "success"}>{ROLE_LABEL[user.role]}</Badge>
          {locked ? (
            <div className="grid h-[224px] w-[224px] place-items-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400">
              <div className="flex flex-col items-center gap-2">
                <Lock className="h-8 w-8" />
                <span className="text-body-sm">QR disponível após adquirir</span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 p-4">
              <QRCode value={code} size={224} />
            </div>
          )}
          <div className="text-center">
            <p className="text-h3 text-neutral-900">{user.name}</p>
            <p className="text-body text-neutral-600">{user.email}</p>
            <p className="mt-2 font-mono text-h4 tracking-widest text-primary-600">
              {locked ? "•••• •••• ••••" : code}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Download da credencial (disponível para quem já a possui) */}
      {!locked && (
        <div className="flex justify-center">
          <Button size="lg" fullWidth leftIcon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
            Baixar credencial
          </Button>
        </div>
      )}

      <p className="text-center text-body-sm text-neutral-600">
        Mantenha o brilho da tela no máximo para facilitar a leitura.
      </p>
    </div>
  );

  return locked ? (
    <PreviewLock message="Sua credencial com QR Code é gerada após adquirir o ingresso.">{body}</PreviewLock>
  ) : (
    body
  );
}
