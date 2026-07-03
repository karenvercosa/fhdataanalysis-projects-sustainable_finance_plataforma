import { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Users, Ticket, Lock, Download, Eye, Copy, Check, QrCode, ChevronRight, Power } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, ProgressBar } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { SponsorAdBanner } from "@/components/SponsorAdBanner";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useAuth } from "@/context/AuthContext";
import { useVouchers } from "@/context/VouchersContext";
import { credentialCode, cn } from "@/lib/utils";
import { CURATOR_LEADS, type Lead } from "@/data/mock";
import { type Voucher } from "@/data/schema";

const CURATOR_ID = "cur_1"; // curador da sessão (protótipo): João Patrocínio
const TOTAL = 100;
const USED = 63;

// Cada resgate do voucher do curador pode ser ativado/desativado por ele.
type Redemption = Lead & { active: boolean };

const kindLabel = (v: Voucher) =>
  v.kind === "free" ? "Acesso gratuito" : v.kind === "percent" ? `${v.value}% de desconto` : `R$ ${v.value} de desconto`;

export default function CuratorDashboard() {
  const { user } = useAuth();
  const credCode = credentialCode(user.role, user.email, user.ticketCode);
  const { vouchers } = useVouchers();
  const myVouchers = vouchers.filter((v) => v.ownerType === "curator" && v.ownerId === CURATOR_ID);
  const [copied, setCopied] = useState<string | null>(null);

  // Resgates do voucher do curador (persistidos), com estado ativo/inativo.
  const [redemptions, setRedemptions] = usePersistentState<Redemption[]>(
    "sf_curator_redemptions",
    CURATOR_LEADS.map((l) => ({ ...l, active: true }))
  );
  const consented = redemptions.filter((l) => l.consent);
  const toggleRedemption = (id: string) =>
    setRedemptions((prev) => prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l)));

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Painel do Curador" subtitle="Métricas, leads e seus vouchers" icon={TrendingUp} />

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

      {/* Meus vouchers — códigos criados pelo Admin para o curador distribuir */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Meus vouchers</p>
          <p className="text-body-sm text-neutral-600">
            Códigos exclusivos criados pelo Admin para você distribuir na sua rede.
          </p>
        </CardHeader>
        <CardBody className="space-y-2">
          {myVouchers.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-100 p-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-h4 tracking-wide text-primary-700">{v.code}</p>
                <p className="text-body-sm text-neutral-600">
                  {kindLabel(v)} · {v.usedCount}/{v.maxUses} convites usados
                </p>
              </div>
              <Button
                variant={copied === v.code ? "secondary" : "outline"}
                size="sm"
                leftIcon={copied === v.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={() => copy(v.code)}
              >
                {copied === v.code ? "Copiado!" : "Copiar código"}
              </Button>
            </div>
          ))}
          {myVouchers.length === 0 && (
            <p className="text-body-sm text-neutral-600">Nenhum voucher atribuído ainda.</p>
          )}
        </CardBody>
      </Card>

      {/* Utilização de vouchers — quem resgatou (contato só com consentimento LGPD) */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <p className="text-h4 text-neutral-900">Utilização de vouchers</p>
            <p className="text-body-sm text-neutral-600">Quem resgatou o seu voucher</p>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
            CSV
          </Button>
        </CardHeader>
        <CardBody className="grid gap-2 lg:grid-cols-2">
          {redemptions.map((lead) => (
            <div
              key={lead.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border p-3",
                lead.active ? "border-neutral-100" : "border-neutral-200 bg-neutral-50 opacity-80"
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-body font-medium text-neutral-900">{lead.name}</p>
                  <Badge tone={lead.active ? "success" : "neutral"}>{lead.active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="truncate text-body-sm text-neutral-600">Resgatou em {lead.redeemedAt}</p>
                {/* Modelo de privacidade: contato só com consentimento LGPD */}
                {lead.consent ? (
                  <p className="truncate text-body-sm text-neutral-600">{lead.role} · {lead.company}</p>
                ) : (
                  <p className="inline-flex items-center gap-1 text-body-sm text-neutral-400">
                    <Lock className="h-3.5 w-3.5" /> Contato restrito (sem consentimento)
                  </p>
                )}
              </div>
              <Button
                variant={lead.active ? "outline" : "primary"}
                size="sm"
                leftIcon={<Power className="h-4 w-4" />}
                onClick={() => toggleRedemption(lead.id)}
              >
                {lead.active ? "Desativar" : "Ativar"}
              </Button>
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
