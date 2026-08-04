import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronLeft, BarChart3, Users, Ticket, Percent, Star } from "lucide-react";
import { Card, CardBody, CardHeader, Loader, BarChart, type Segment, type ChartTone } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { api } from "@/lib/admin-api";
import { type MetricasAdmin } from "@/types";

const TONS: ChartTone[] = ["primary", "info", "success", "secondary", "neutral"];

/**
 * Relatórios do Admin.
 *
 * Os KPIs eram texto fixo ("1.284 inscritos") e os gráficos vinham de listas
 * inventadas — "Ingressos por lote" descrevia lotes que não existem, e os
 * cupons por patrocinador liam empresas de `src/data/catalog.ts`. Tudo aqui
 * agora sai de `/api/admin/metricas`, contado no banco.
 *
 * Os gráficos de credenciamento e de lotes saíram: dependem de `ingresso` e
 * `credencial`, que ainda não têm fluxo que os alimente. Um gráfico sem fonte
 * é pior do que gráfico nenhum.
 */
export default function ReportsAdmin() {
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const { metricas: m } = await api.get<{ metricas: MetricasAdmin }>("/api/admin/metricas");
      setMetricas(m);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível carregar os relatórios.");
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
    { label: "Assinaturas ativas", value: metricas?.assinaturasAtivas ?? 0, icon: Ticket },
    { label: "Convites resgatados", value: metricas?.resgatesAprovados ?? 0, icon: Percent }
  ];

  const interesses: Segment[] = (metricas?.topInteresses ?? []).map((i, idx) => ({
    label: i.nome,
    value: i.total,
    tone: TONS[idx % TONS.length]
  }));

  // Convites usados por curador — o relatório comercial que tem lastro real.
  const porCurador: Segment[] = (metricas?.curadores ?? [])
    .filter((c) => c.convitesUsados > 0)
    .sort((a, b) => b.convitesUsados - a.convitesUsados)
    .map((c, idx) => ({
      label: c.empresa || c.nome,
      value: c.convitesUsados,
      tone: TONS[idx % TONS.length]
    }));

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <PageHeader title="Relatórios" subtitle="Números da plataforma, contados no banco" icon={BarChart3} />

      {erro && (
        <div role="alert" className="flex items-center gap-2 rounded-md bg-error-50 px-4 py-3 text-body text-error-500">
          <AlertCircle className="h-5 w-5 shrink-0" /> {erro}
        </div>
      )}

      {carregando && <Loader label="Carregando relatórios…" />}

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-h4 text-neutral-900">Maiores interesses</p>
            <p className="text-body-sm text-neutral-600">Temas escolhidos pelos participantes</p>
          </CardHeader>
          <CardBody>
            {interesses.length ? (
              <BarChart data={interesses} />
            ) : (
              <p className="text-body-sm text-neutral-600">Ninguém escolheu interesses ainda.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-h4 text-neutral-900">Convites usados por curador</p>
            <p className="text-body-sm text-neutral-600">Resgates dos vouchers de cada patrocinador</p>
          </CardHeader>
          <CardBody>
            {porCurador.length ? (
              <BarChart data={porCurador} />
            ) : (
              <p className="text-body-sm text-neutral-600">Nenhum convite resgatado ainda.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
