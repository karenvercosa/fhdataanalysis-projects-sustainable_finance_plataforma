import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle, TrendingUp, Ticket, Copy, Check, QrCode, ChevronRight,
  Power, ThumbsUp, ThumbsDown, Hourglass
} from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Loader, ProgressBar } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { SponsorAdBanner } from "@/components/SponsorAdBanner";
import { TierUpgradeCard } from "@/components/TierUpgradeCard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/admin-api";
import { credentialCode, cn } from "@/lib/utils";
import {
  StatusResgateVoucher,
  TipoVoucher,
  type PainelCurador,
  type ResgateCurador,
  type VoucherAdmin,
} from "@/types";

/** "Acesso gratuito" / "50% de desconto" / "R$ 100 de desconto". */
function descreveTipo(v: VoucherAdmin): string {
  if (v.tipo === TipoVoucher.gratuito) return "Acesso gratuito";
  if (v.tipo === TipoVoucher.descontoPercentual) return `${v.valor}% de desconto`;
  return `R$ ${v.valor} de desconto`;
}

const STATUS_LABEL: Record<StatusResgateVoucher, string> = {
  pendente: "Aguardando você",
  aprovado: "Ativo",
  negado: "Inativo",
};

const STATUS_TONE: Record<StatusResgateVoucher, "warning" | "success" | "neutral"> = {
  pendente: "warning",
  aprovado: "success",
  negado: "neutral",
};

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Painel do curador/patrocinador.
 *
 * Duas áreas, ambas lendo do banco e recortadas pelo curador da sessão:
 *
 *  - **Meus vouchers** — os códigos que o Admin criou no nome dele;
 *  - **Utilização de vouchers** — quem resgatou. Cada resgate de um voucher
 *    com curador nasce PENDENTE: a pessoa se cadastrou, mas o vínculo com a
 *    empresa só existe depois que ele permite. Negar (ou desativar depois)
 *    desfaz o vínculo e devolve o convite para a cota.
 */
export default function CuratorDashboard() {
  const { user } = useAuth();
  const credCode = credentialCode(user.role, user.email, user.ticketCode);

  const [dados, setDados] = useState<PainelCurador>({ vouchers: [], resgates: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [decidindo, setDecidindo] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setDados(await api.get<PainelCurador>("/api/curador/painel"));
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível carregar o painel.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const decidir = async (resgate: ResgateCurador, status: StatusResgateVoucher) => {
    setDecidindo(resgate.id);
    setErro(null);
    try {
      await api.patch(`/api/curador/resgates/${resgate.id}`, { status });
      // Recarrega em vez de ajustar o estado local: a decisão mexe na contagem
      // de convites do voucher, e ela precisa refletir o banco.
      await carregar();
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível registrar a decisão.");
    } finally {
      setDecidindo(null);
    }
  };

  const copy = (codigo: string) => {
    navigator.clipboard?.writeText(codigo);
    setCopied(codigo);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const pendentes = dados.resgates.filter((r) => r.status === StatusResgateVoucher.pendente);
  const totalConvites = dados.vouchers.reduce((s, v) => s + v.usosMaximos, 0);
  const convitesUsados = dados.vouchers.reduce((s, v) => s + v.usosFeitos, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Painel do Curador" subtitle="Seus vouchers e quem os resgatou" icon={TrendingUp} />

      {/* Acesso rápido à credencial */}
      <Link to="/credencial" aria-label="Abrir Minha credencial" className="block lg:max-w-md">
        <Card className="border-primary-500 bg-primary-500 text-white transition hover:bg-primary-600">
          <CardBody className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-md bg-white/15">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <p className="text-h4">Minha credencial</p>
                <p className="font-mono text-body-sm text-white/80">{credCode}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </CardBody>
        </Card>
      </Link>

      {/* Banner rotativo de divulgações dos patrocinadores Ouro/Prata (2:1) */}
      <SponsorAdBanner />

      {erro && (
        <div role="alert" className="flex items-center gap-2 rounded-md bg-error-50 px-4 py-3 text-body text-error-500">
          <AlertCircle className="h-5 w-5 shrink-0" /> {erro}
        </div>
      )}

      {pendentes.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-warning-50 px-4 py-3 text-body text-warning-500">
          <Hourglass className="h-5 w-5 shrink-0" />
          {pendentes.length === 1
            ? "1 pessoa está aguardando sua liberação."
            : `${pendentes.length} pessoas estão aguardando sua liberação.`}
        </div>
      )}

      {/* Uso da cota — soma dos vouchers do curador */}
      {totalConvites > 0 && (
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-neutral-600">Uso dos seus convites</span>
              <span className="font-medium text-neutral-900">{convitesUsados}/{totalConvites}</span>
            </div>
            <ProgressBar value={convitesUsados} max={totalConvites} />
            <p className="text-body-sm text-neutral-600">
              {totalConvites - convitesUsados} convites restantes
            </p>
          </CardBody>
        </Card>
      )}

      {/* Sugestão de upgrade de cota — conduzido pelo responsável comercial */}
      <TierUpgradeCard />

      {/* Meus vouchers — códigos criados pelo Admin para o curador distribuir */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Meus vouchers</p>
          <p className="text-body-sm text-neutral-600">
            Códigos exclusivos criados pelo Admin para você distribuir na sua rede.
          </p>
        </CardHeader>
        <CardBody className="space-y-2">
          {carregando && <Loader label="Carregando vouchers…" />}

          {dados.vouchers.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-100 p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-h4 tracking-wide text-primary-700">{v.codigo}</p>
                  {!v.ativo && <Badge tone="neutral">Inativo</Badge>}
                </div>
                <p className="text-body-sm text-neutral-600">
                  {descreveTipo(v)} · {v.usosFeitos}/{v.usosMaximos} convites usados
                </p>
              </div>
              <Button
                variant={copied === v.codigo ? "secondary" : "outline"}
                size="sm"
                leftIcon={copied === v.codigo ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={() => copy(v.codigo)}
              >
                {copied === v.codigo ? "Copiado!" : "Copiar código"}
              </Button>
            </div>
          ))}

          {!carregando && dados.vouchers.length === 0 && (
            <p className="text-body-sm text-neutral-600">
              Nenhum voucher atribuído ainda. Peça convites na aba <strong>Ingressos</strong>.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Utilização de vouchers — permitir, negar e desativar cada resgate */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Utilização de vouchers</p>
          <p className="text-body-sm text-neutral-600">
            Quem se cadastrou usando um código seu. Um resgate só vale depois que você permite —
            e você pode desativar a qualquer momento, devolvendo o convite para a sua cota.
          </p>
        </CardHeader>
        <CardBody className="grid gap-2 lg:grid-cols-2">
          {carregando && <Loader label="Carregando resgates…" />}

          {dados.resgates.map((r) => {
            const pendente = r.status === StatusResgateVoucher.pendente;
            const aprovado = r.status === StatusResgateVoucher.aprovado;
            const ocupado = decidindo === r.id;

            return (
              <div
                key={r.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-md border p-3",
                  pendente
                    ? "border-warning-500/40 bg-warning-50/40"
                    : aprovado
                    ? "border-neutral-100"
                    : "border-neutral-200 bg-neutral-50 opacity-80"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-body font-medium text-neutral-900">{r.pessoaNome}</p>
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </div>
                  <p className="truncate text-body-sm text-neutral-600">
                    {r.pessoaEmail}
                    {r.pessoaCargo && ` · ${r.pessoaCargo}`}
                  </p>
                  <p className="truncate text-body-sm text-neutral-500">
                    <span className="font-mono">{r.voucherCodigo}</span> · resgatou em {dataCurta(r.criadoEm)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {pendente ? (
                    <>
                      <Button
                        size="sm"
                        disabled={ocupado}
                        leftIcon={<ThumbsUp className="h-4 w-4" />}
                        onClick={() => decidir(r, StatusResgateVoucher.aprovado)}
                      >
                        Permitir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={ocupado}
                        leftIcon={<ThumbsDown className="h-4 w-4" />}
                        onClick={() => decidir(r, StatusResgateVoucher.negado)}
                      >
                        Negar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant={aprovado ? "outline" : "primary"}
                      size="sm"
                      disabled={ocupado}
                      leftIcon={<Power className="h-4 w-4" />}
                      onClick={() =>
                        decidir(
                          r,
                          aprovado ? StatusResgateVoucher.negado : StatusResgateVoucher.aprovado,
                        )
                      }
                    >
                      {aprovado ? "Desativar" : "Reativar"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {!carregando && dados.resgates.length === 0 && (
            <p className="text-body-sm text-neutral-600 lg:col-span-2">
              Ninguém resgatou seus vouchers ainda.
            </p>
          )}

          <p className="pt-1 text-body-sm text-neutral-400 lg:col-span-2">
            <Ticket className="mr-1 inline h-3.5 w-3.5" />
            Os dados de contato aparecem porque a pessoa usou um convite seu. Use-os apenas para
            a finalidade do evento, conforme a LGPD.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
