import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle, Settings, Users, Ticket, CalendarDays, Percent,
  ChevronRight, Sparkles, Handshake, Megaphone, Layers, Hourglass, Star
} from "lucide-react";
import { Badge, Card, CardBody, CardHeader, Loader, BarChart, type Segment } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { api } from "@/lib/admin-api";
import { type MetricasAdmin } from "@/types";

/** Módulos de gestão do painel central. */
const MODULES = [
  { label: "Gestão de Usuários", desc: "Contas, perfis e selos", icon: Users, to: "/admin/usuarios" },
  { label: "Gestão de Vouchers", desc: "Convites corporativos e seus donos", icon: Percent, to: "/admin/vouchers" },
  { label: "Programação", desc: "Sessões, trilhas e salas", icon: CalendarDays, to: "/admin/programacao-admin" },
  { label: "Divulgações", desc: "Banner rotativo (Ouro/Prata)", icon: Megaphone, to: "/admin/divulgacoes" },
  { label: "Cotas de patrocínio", desc: "O que cada cota libera no perfil público", icon: Layers, to: "/admin/cotas" },
  { label: "Interesses", desc: "Nuvem de temas do cadastro e do perfil", icon: Sparkles, to: "/admin/interesses" }
];

/** Cores do gráfico, em ciclo — a lista de interesses tem tamanho variável. */
const TONS: Segment["tone"][] = ["primary", "success", "info", "secondary", "primary", "neutral"];

/**
 * Painel do Admin.
 *
 * Os números vinham escritos no código ("1.284 inscritos", "642 ingressos") e
 * o gráfico de interesses era uma lista inventada — davam a impressão de uma
 * plataforma cheia. Agora tudo é contado no banco por `/api/admin/metricas`:
 * se há 3 contas, o painel mostra 3.
 *
 * O top de interesses é a primeira métrica de audiência de verdade, vinda da
 * tabela `usuario_interesse`.
 */
export default function AdminDashboard() {
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const { metricas: m } = await api.get<{ metricas: MetricasAdmin }>("/api/admin/metricas");
      setMetricas(m);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível carregar as métricas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const kpis = [
    { label: "Contas cadastradas", value: metricas?.inscritos ?? 0, icon: Users },
    { label: "Participantes Premium", value: metricas?.premium ?? 0, icon: Star },
    { label: "Vouchers ativos", value: metricas?.vouchersAtivos ?? 0, icon: Percent },
    { label: "Assinaturas ativas", value: metricas?.assinaturasAtivas ?? 0, icon: Ticket }
  ];

  const grafico: Segment[] = (metricas?.topInteresses ?? []).map((i, idx) => ({
    label: i.nome,
    value: i.total,
    tone: TONS[idx % TONS.length]
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Administração" subtitle="Painel central da plataforma" icon={Settings} />

      {erro && (
        <div role="alert" className="flex items-center gap-2 rounded-md bg-error-50 px-4 py-3 text-body text-error-500">
          <AlertCircle className="h-5 w-5 shrink-0" /> {erro}
        </div>
      )}

      {carregando && <Loader label="Carregando métricas…" />}

      {/* KPIs contados no banco */}
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

      {/* Resgates de voucher aguardando o curador — só aparece quando existem */}
      {!!metricas?.resgatesPendentes && (
        <div className="flex items-center gap-2 rounded-md bg-warning-50 px-4 py-3 text-body text-warning-500">
          <Hourglass className="h-5 w-5 shrink-0" />
          {metricas.resgatesPendentes === 1
            ? "1 resgate de voucher aguarda a liberação do curador."
            : `${metricas.resgatesPendentes} resgates de voucher aguardam a liberação dos curadores.`}
        </div>
      )}

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

      {/* Matchmaking — interesses realmente escolhidos pelos participantes */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary-600" />
          <div>
            <p className="text-h4 text-neutral-900">Matchmaking — Maiores interesses</p>
            <p className="text-body-sm text-neutral-600">
              Temas escolhidos pelos participantes no cadastro e no perfil
            </p>
          </div>
        </CardHeader>
        <CardBody>
          {grafico.length ? (
            <BarChart data={grafico} />
          ) : (
            <p className="text-body-sm text-neutral-600">
              Ninguém escolheu interesses ainda. Assim que os participantes marcarem os temas, o
              ranking aparece aqui.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Curadores — vindos da tabela de usuários, com os vouchers deles */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Curadores e patrocinadores</p>
          <p className="text-body-sm text-neutral-600">Donos de voucher na plataforma</p>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-body-sm text-neutral-600">
                <th className="px-4 py-2 font-medium">Curador</th>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Vouchers</th>
                <th className="px-4 py-2 font-medium">Convites usados</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(metricas?.curadores ?? []).map((c) => (
                <tr key={c.id} className="border-b border-neutral-50 text-body">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{c.nome}</p>
                    <p className="text-body-sm text-neutral-600">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {c.empresa ?? <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{c.vouchers}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.convitesUsados}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.ativo ? "success" : "neutral"}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!carregando && !metricas?.curadores.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-body text-neutral-600">
                    Nenhum curador cadastrado. Crie um em <strong>Gestão de Usuários</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
