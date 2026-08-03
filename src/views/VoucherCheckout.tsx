import { useState } from "react";
import { Ticket, Tag, CheckCircle2, QrCode, Gift, Monitor, MapPin, CreditCard, Infinity as InfinityIcon } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { PreInscricaoPresencial } from "@/components/PreInscricaoPresencial";
import { SolicitarVouchers } from "@/components/SolicitarVouchers";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useVouchers } from "@/context/VouchersContext";
import { applyVoucher, getCurator } from "@/data/catalog";
import { type Voucher } from "@/data/schema";

type TicketType = "online" | "presencial";
type VState = "idle" | "checking" | "valid" | "invalid";

const ONLINE_PRICE = 290;
const PRESENCIAL_PRICE = 480; // referência; o voucher costuma zerar/abater
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function VoucherCheckout() {
  const { completeCheckout, user } = useAuth();
  const { getByCode, remaining, redeem } = useVouchers();
  const isCurator = user.role === "curator";
  const isGuest = user.role === "guest"; // Plano Gratuito: pode se pré-inscrever

  // Fase 2 — dados complementares.
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [type, setType] = useState<TicketType>("online");
  const [code, setCode] = useState("");
  const [vState, setVState] = useState<VState>("idle");
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [done, setDone] = useState(false);

  const applied = type === "presencial" && vState === "valid" ? voucher ?? undefined : undefined;
  const base = type === "online" ? ONLINE_PRICE : PRESENCIAL_PRICE;
  const { total, discount } = type === "online" ? { total: ONLINE_PRICE, discount: 0 } : applyVoucher(base, applied);

  const checkVoucher = () => {
    setVState("checking");
    window.setTimeout(() => {
      const found = getByCode(code);
      if (found && remaining(found) > 0) {
        setVoucher(found);
        setVState("valid");
      } else {
        setVoucher(null);
        setVState("invalid");
      }
    }, 600);
  };

  const baseOk = company.trim() && jobTitle.trim();
  const canSubmit = baseOk && (type === "online" || (type === "presencial" && vState === "valid"));

  const finish = () => {
    if (type === "presencial") {
      if (voucher) redeem(voucher.id);
      completeCheckout({ credential: true }); // Presencial → Participante Geral + credencial
    } else {
      completeCheckout({ credential: false }); // Online → acesso ilimitado, sem credencial física
    }
    setDone(true);
  };

  // ---- CURADOR / PATROCINADOR: pedir mais convites ----
  // Não há checkout aqui: os convites da cota já estão no painel, e convite
  // adicional é negociado com o time comercial. A aba vira um formulário que
  // envia o pedido por e-mail.
  if (isCurator) return <SolicitarVouchers />;

  if (done) {
    const presencial = type === "presencial";
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-success-500" />
            <h1 className="text-h2 text-neutral-900">
              {presencial ? "Ingresso resgatado!" : "Pagamento confirmado!"}
            </h1>
            <p className="max-w-md text-body text-neutral-600">
              {presencial ? (
                <>
                  Sua <strong>credencial</strong> já está disponível na aba <strong>Credencial</strong> e você
                  tem <strong>acesso completo</strong> à plataforma.
                </>
              ) : (
                <>
                  Você agora tem <strong>acesso ilimitado</strong> a toda a plataforma (streaming, conteúdos e
                  downloads). O ingresso Online é digital — não há credencial de entrada.
                </>
              )}
            </p>
            <div className="flex items-center gap-2 rounded-md bg-success-50 px-3 py-2 text-success-500">
              {presencial ? <QrCode className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              Ingresso {presencial ? "Presencial" : "Online"} · {total === 0 ? "Grátis" : brl(total)}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Adquirir ingresso" subtitle="Escolha entre Online (pago) ou Presencial (voucher)" icon={Ticket} />

      {/* Passo 1 — Dados */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">1. Seus dados</p>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Input label="Empresa" placeholder="Onde você trabalha" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Input label="Cargo" placeholder="Ex.: Analista ESG" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </CardBody>
      </Card>

      {/* Passo 2 — Tipo de ingresso */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">2. Tipo de ingresso</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Online */}
            <button
              onClick={() => setType("online")}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                type === "online" ? "border-primary-500 bg-primary-50" : "border-neutral-200 hover:border-primary-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary-600" />
                  <span className="text-h4 text-neutral-900">Online</span>
                </div>
                <span className="text-h4 text-neutral-900">{brl(ONLINE_PRICE)}</span>
              </div>
              <p className="mt-1 inline-flex items-center gap-1 text-body-sm text-neutral-600">
                <InfinityIcon className="h-4 w-4" /> Acesso ilimitado à plataforma
              </p>
            </button>

            {/* Presencial */}
            <button
              onClick={() => setType("presencial")}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                type === "presencial" ? "border-primary-500 bg-primary-50" : "border-neutral-200 hover:border-primary-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  <span className="text-h4 text-neutral-900">Presencial</span>
                </div>
                <Badge tone="primary">Voucher</Badge>
              </div>
              <p className="mt-1 text-body-sm text-neutral-600">Acesso completo + credencial de entrada</p>
            </button>
          </div>

          {/* Online → pagamento */}
          {type === "online" ? (
            <div className="flex items-start gap-2 rounded-md border border-neutral-200 p-4 text-body-sm text-neutral-600">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Pagamento via <strong>Asaas</strong> (Cartão de crédito ou Pix). Simulação de gateway neste protótipo.</span>
            </div>
          ) : (
            /* Presencial → voucher */
            <div className="space-y-3">
              <Input
                label="Voucher de convidado"
                placeholder="Ex.: VERDE2026"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setVState("idle");
                }}
                success={vState === "valid"}
                error={vState === "invalid" ? "Voucher inválido ou esgotado." : undefined}
                hint={vState === "idle" ? "Fornecido por um patrocinador/curador." : undefined}
                rightSlot={<Tag className="h-4 w-4" />}
              />
              {vState === "valid" && voucher ? (
                <div className="flex items-center gap-2 rounded-md bg-success-50 px-3 py-2 text-body-sm text-success-500">
                  <Gift className="h-4 w-4" />
                  {voucher.kind === "free"
                    ? "Acesso gratuito"
                    : voucher.kind === "percent"
                    ? `${voucher.value}% de desconto`
                    : `${brl(voucher.value)} de desconto`}{" "}
                  · {getCurator(voucher.ownerId)?.name ?? "Patrocinador"}
                </div>
              ) : (
                <Button variant="outline" onClick={checkVoucher} loading={vState === "checking"} disabled={code.trim().length < 3}>
                  Aplicar voucher
                </Button>
              )}

              {/* Sem voucher, o Presencial fica travado — abre a pré-inscrição. */}
              {isGuest && vState !== "valid" && (
                <PreInscricaoPresencial
                  nome={user.name}
                  email={user.email}
                  empresaInicial={company}
                  cargoInicial={jobTitle}
                />
              )}
            </div>
          )}

          {/* Resumo do pedido */}
          <div className="space-y-1 rounded-md bg-neutral-50 p-4">
            <div className="flex justify-between text-body text-neutral-600">
              <span>Ingresso {type === "online" ? "Online" : "Presencial"}</span>
              <span>{brl(base)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-body text-success-500">
                <span>Desconto</span>
                <span>- {brl(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-h4 text-neutral-900">
              <span>Total</span>
              <span>{total === 0 ? "Grátis" : brl(total)}</span>
            </div>
          </div>

          <Button fullWidth size="lg" disabled={!canSubmit} onClick={finish}>
            {total === 0 ? "Resgatar ingresso grátis" : `Pagar ${brl(total)}`}
          </Button>
          {!baseOk && <p className="text-center text-body-sm text-neutral-600">Preencha empresa e cargo para continuar.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
