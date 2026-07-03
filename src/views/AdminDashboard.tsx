import { Link } from "react-router-dom";
import {
  Settings, Users, Ticket, CalendarDays, Building2,
  ChevronRight, Sparkles, Percent, Handshake, Megaphone
} from "lucide-react";
import { Badge, Card, CardBody, CardHeader, BarChart, type Segment } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { SponsorAdBanner } from "@/components/SponsorAdBanner";
import { useVouchers } from "@/context/VouchersContext";
import { SESSIONS } from "@/data/mock";
import { CURATORS } from "@/data/catalog";

const KPIS = [
  { label: "Inscritos", value: "1.284", icon: Users },
  { label: "Ingressos emitidos", value: "642", icon: Ticket },
  { label: "Sessões", value: String(SESSIONS.length), icon: CalendarDays },
  { label: "Patrocinadores", value: String(CURATORS.length), icon: Building2 }
];

// Matchmaking: maiores interesses dos participantes (agregado).
const TOP_INTERESTS: Segment[] = [
  { label: "ESG", value: 312, tone: "primary" },
  { label: "Investimento de impacto", value: 268, tone: "success" },
  { label: "Crédito de carbono", value: 221, tone: "info" },
  { label: "Fintech", value: 187, tone: "secondary" },
  { label: "Energia renovável", value: 156, tone: "primary" },
  { label: "Net zero", value: 98, tone: "neutral" }
];

// Mascara o documento (CPF/CNPJ) — dado sensível: revela só o início e o fim.
function maskDocument(doc: string) {
  const digits = doc.replace(/\D/g, "").length;
  let i = 0;
  return doc.replace(/\d/g, (d) => {
    i += 1;
    return i <= 3 || i > digits - 2 ? d : "•";
  });
}

// Módulos de gestão do painel central.
const MODULES = [
  { label: "Gestão de Usuários", desc: "Gerenciar contas, perfis e tags", icon: Users, to: "/admin/usuarios" },
  { label: "Gestão de Vouchers", desc: "Free / desconto + nº de usos", icon: Percent, to: "/admin/vouchers" },
  { label: "Programação", desc: "Sessões, trilhas e salas", icon: CalendarDays, to: "/admin/programacao-admin" },
  { label: "Divulgações", desc: "Banner rotativo (Ouro/Prata)", icon: Megaphone, to: "/admin/divulgacoes" },
  { label: "Interesses", desc: "Nuvem de temas do onboarding", icon: Sparkles, to: "/admin/interesses" }
];

export default function AdminDashboard() {
  // Métricas por curador derivadas dos vouchers VIVOS (refletem resgates).
  const { vouchers } = useVouchers();
  const curatorRows = CURATORS.map((c) => {
    const owned = vouchers.filter((v) => v.ownerType === "curator" && v.ownerId === c.id);
    return {
      ...c,
      vouchers: owned.length,
      leads: owned.reduce((acc, v) => acc + v.usedCount, 0)
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Administração" subtitle="Painel central da plataforma" icon={Settings} />

      {/* Banner rotativo de divulgações dos patrocinadores Ouro/Prata (2:1) */}
      <SponsorAdBanner />

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPIS.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardBody className="space-y-1">
              <Icon className="h-5 w-5 text-primary-600" />
              <p className="text-h1 text-neutral-900">{value}</p>
              <p className="text-body-sm text-neutral-600">{label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Módulos de gestão */}
      <section className="space-y-3">
        <h2 className="text-h3 text-neutral-900">Gestão</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ label, desc, icon: Icon, to }) => (
            <Link key={label} to={to} className="block">
              <Card className="h-full transition-shadow hover:shadow-pop">
                <CardBody className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-neutral-900">{label}</p>
                    <p className="text-body-sm text-neutral-600">{desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Matchmaking — maiores interesses dos participantes */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary-600" />
          <div>
            <p className="text-h4 text-neutral-900">Matchmaking — Maiores interesses</p>
            <p className="text-body-sm text-neutral-600">Mapeie conexões e facilite negócios</p>
          </div>
        </CardHeader>
        <CardBody>
          <BarChart data={TOP_INTERESTS} />
        </CardBody>
      </Card>

      {/* Curadores — listagem e controle */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Curadores</p>
          <p className="text-body-sm text-neutral-600">Donos de voucher (PF ou CNPJ)</p>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-body-sm text-neutral-600">
                <th className="px-4 py-2 font-medium">Curador</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Documento</th>
                <th className="px-4 py-2 font-medium">Vouchers</th>
                <th className="px-4 py-2 font-medium">Leads</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {curatorRows.map((c) => (
                <tr key={c.id} className="border-b border-neutral-50 text-body">
                  <td className="px-4 py-3 font-medium text-neutral-900">{c.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.personType === "CNPJ" ? "info" : "neutral"}>{c.personType}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-body-sm text-neutral-600" title="Documento parcialmente oculto (dado sensível)">{maskDocument(c.document)}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.vouchers}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.leads}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Ativo" : "Inativo"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
