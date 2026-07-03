import { Link } from "react-router-dom";
import { ChevronLeft, BarChart3, Download, Users, Ticket, UserCheck, Percent } from "lucide-react";
import { Card, CardBody, CardHeader, Donut, BarChart, type Segment, type ChartTone } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { useCheckin } from "@/context/CheckinContext";
import { useVouchers } from "@/context/VouchersContext";
import { getCurator } from "@/data/catalog";

const TICKETS_BY_LOT: Segment[] = [
  { label: "Lote Ouro", value: 320, tone: "primary" },
  { label: "Cortesia Curadores", value: 180, tone: "info" },
  { label: "VIP", value: 92, tone: "secondary" },
  { label: "Imprensa", value: 50, tone: "neutral" }
];

// Empresas (donas de voucher) — rótulos para o relatório.
const COMPANY_NAMES: Record<string, string> = {
  cmp_1: "AgroVerde",
  cmp_2: "BankCo",
  cmp_3: "Fintech Verde"
};
const TONES: ChartTone[] = ["primary", "info", "success", "secondary", "neutral"];

export default function ReportsAdmin() {
  const { stats } = useCheckin(); // check-in REAL do Operador
  const { vouchers } = useVouchers(); // cupons VIVOS

  const checkin: Segment[] = [
    { label: "Credenciados", value: stats.credentialed, tone: "primary" },
    { label: "Pendentes", value: stats.pending, tone: "warning" }
  ];

  // Cupons ativados por patrocinador (soma de usos por dono do voucher).
  const bySponsor = new Map<string, number>();
  for (const v of vouchers) {
    const name = v.ownerType === "curator" ? getCurator(v.ownerId)?.name ?? v.ownerId : COMPANY_NAMES[v.ownerId] ?? v.ownerId;
    bySponsor.set(name, (bySponsor.get(name) ?? 0) + v.usedCount);
  }
  const coupons: Segment[] = [...bySponsor.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, tone: TONES[i % TONES.length] }));
  const totalCoupons = coupons.reduce((acc, c) => acc + c.value, 0);

  const kpis = [
    { label: "Inscritos", value: "1.284", icon: Users },
    { label: "Ingressos emitidos", value: "642", icon: Ticket },
    { label: "Taxa de check-in", value: `${stats.rate}%`, icon: UserCheck },
    { label: "Cupons ativados", value: String(totalCoupons), icon: Percent }
  ];

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Relatórios" subtitle="Visão operacional e comercial" icon={BarChart3} />
        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-primary-500 px-4 text-button text-primary-600 hover:bg-primary-50">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardBody className="space-y-1">
              <Icon className="h-5 w-5 text-primary-600" />
              <p className="text-h1 text-neutral-900">{value}</p>
              <p className="text-body-sm text-neutral-600">{label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-h4 text-neutral-900">Credenciamento</p>
            <p className="text-body-sm text-neutral-600">Status real (check-in do Operador)</p>
          </CardHeader>
          <CardBody>
            <Donut segments={checkin} centerValue={`${stats.rate}%`} centerLabel="check-in" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-h4 text-neutral-900">Ingressos por lote</p>
            <p className="text-body-sm text-neutral-600">Distribuição de emissão</p>
          </CardHeader>
          <CardBody>
            <BarChart data={TICKETS_BY_LOT} />
          </CardBody>
        </Card>
      </div>

      {/* Relatório comercial de cupons por patrocinador */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Cupons ativados por patrocinador</p>
          <p className="text-body-sm text-neutral-600">Relatório comercial (vouchers em tempo real)</p>
        </CardHeader>
        <CardBody>
          <BarChart data={coupons} />
        </CardBody>
      </Card>
    </div>
  );
}
