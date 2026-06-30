import { TrendingUp, Users, Ticket, Lock, Download, Eye } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, ProgressBar } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { CURATOR_LEADS } from "@/data/mock";

const VOUCHER = "VERDE2026";
const TOTAL = 100;
const USED = 63;

export default function CuratorDashboard() {
  const consented = CURATOR_LEADS.filter((l) => l.consent);

  return (
    <div className="space-y-4">
      <PageHeader title="Painel do Curador" subtitle={`Voucher exclusivo · ${VOUCHER}`} icon={TrendingUp} />

      {/* Métricas de uso do voucher */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardBody className="space-y-1">
            <Ticket className="h-5 w-5 text-primary-600" />
            <p className="text-h1 text-neutral-900">{USED}</p>
            <p className="text-body-sm text-neutral-600">Vouchers ativados</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <Users className="h-5 w-5 text-primary-600" />
            <p className="text-h1 text-neutral-900">{consented.length}</p>
            <p className="text-body-sm text-neutral-600">Leads com consentimento</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            <p className="text-h1 text-neutral-900">{Math.round((USED / TOTAL) * 100)}%</p>
            <p className="text-body-sm text-neutral-600">Taxa de ativação</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <Eye className="h-5 w-5 text-primary-600" />
            <p className="text-h1 text-neutral-900">248</p>
            <p className="text-body-sm text-neutral-600">Visitas ao perfil</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="space-y-2">
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-neutral-600">Uso do lote</span>
            <span className="font-medium text-neutral-900">{USED}/{TOTAL}</span>
          </div>
          <ProgressBar value={USED} max={TOTAL} />
          <p className="text-body-sm text-neutral-600">{TOTAL - USED} convites restantes</p>
        </CardBody>
      </Card>

      {/* Leads permitidos pela LGPD */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <p className="text-h4 text-neutral-900">Leads gerados</p>
            <p className="text-body-sm text-neutral-600">Apenas quem usou o seu voucher</p>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
            CSV
          </Button>
        </CardHeader>
        <CardBody className="grid gap-2 lg:grid-cols-2">
          {CURATOR_LEADS.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between gap-3 rounded-md border border-neutral-100 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-body font-medium text-neutral-900">{lead.name}</p>
                {/* Modelo de privacidade: contato só com consentimento LGPD */}
                {lead.consent ? (
                  <p className="truncate text-body-sm text-neutral-600">
                    {lead.role} · {lead.company}
                  </p>
                ) : (
                  <p className="inline-flex items-center gap-1 text-body-sm text-neutral-400">
                    <Lock className="h-3.5 w-3.5" /> Contato restrito (sem consentimento)
                  </p>
                )}
              </div>
              <Badge tone={lead.consent ? "success" : "neutral"}>
                {lead.consent ? "Consentido" : "Anônimo"}
              </Badge>
            </div>
          ))}
          <p className="pt-1 text-body-sm text-neutral-400 lg:col-span-2">
            Em conformidade com a LGPD, exibimos dados de contato apenas de participantes que
            autorizaram o compartilhamento com o patrocinador.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
