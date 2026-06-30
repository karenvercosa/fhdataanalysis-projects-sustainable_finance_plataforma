import { ShieldCheck, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge, Card, CardBody, QRCode } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { PreviewLock } from "@/components/PreviewLock";
import { credentialCode } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/roles";

export default function CredentialPage() {
  const { user, can } = useAuth();
  const locked = !can("view:ticket-qr"); // Não Pago vê apenas um teaser
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
