import { Award, Download, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button, Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";

// Evento: 04/09/2026 · Goiânia. Certificado liberado a partir do dia do evento.
const EVENT_DATE = new Date(2026, 8, 4); // mês 0-based: 8 = setembro
const EVENT_LABEL = "04 de setembro de 2026";
const EVENT_CITY = "Goiânia — GO";

export default function CertificatePage() {
  const { user } = useAuth();
  const available = new Date() >= EVENT_DATE;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Certificado" subtitle="Baixe seu certificado de participação" icon={Award} />

      {/* Status de liberação */}
      {available ? (
        <div className="flex items-center gap-2 rounded-md bg-success-50 px-4 py-3 text-body text-success-500">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> Seu certificado de participação está disponível.
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-md border border-secondary-500 bg-secondary-400/15 p-4">
          <Lock className="h-6 w-6 shrink-0 text-secondary-600" />
          <div>
            <p className="text-h4 text-neutral-900">Disponível após o evento</p>
            <p className="text-body-sm text-neutral-600">
              O certificado de participação é liberado a partir de <strong>{EVENT_LABEL}</strong>, quando o evento acontecer.
            </p>
          </div>
        </div>
      )}

      {/* Resumo do certificado (sem pré-visualização) */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600">
              <Award className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-h4 text-neutral-900">Certificado de participação</p>
              <p className="text-body-sm text-neutral-600">Sustainable Finance 2026 · {EVENT_LABEL} · {EVENT_CITY}</p>
            </div>
          </div>
          <p className="text-body text-neutral-700">
            Emitido em nome de <strong className="text-neutral-900">{user.name}</strong>.
          </p>
        </CardBody>
      </Card>

      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!available}
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => window.print()}
        >
          {available ? "Baixar certificado (PDF)" : "Disponível após o evento"}
        </Button>
      </div>
    </div>
  );
}
