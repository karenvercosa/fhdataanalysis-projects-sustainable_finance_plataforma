import { useMemo, useState } from "react";
import { CreditCard, Ticket, Tag, CheckCircle2, QrCode, Gift } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useVouchers } from "@/context/VouchersContext";
import { TICKET_TYPES, applyVoucher, getCurator } from "@/data/catalog";
import { type Voucher } from "@/data/schema";

type Method = "card" | "voucher";
type VState = "idle" | "checking" | "valid" | "invalid";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function VoucherCheckout() {
  const { completeCheckout } = useAuth();
  const { getByCode, remaining, redeem } = useVouchers();

  // Fase 2 do onboarding — dados complementares no momento da compra.
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState(TICKET_TYPES[0].id);

  const [method, setMethod] = useState<Method>("card");
  const [code, setCode] = useState("");
  const [vState, setVState] = useState<VState>("idle");
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [done, setDone] = useState(false);

  const ticket = useMemo(() => TICKET_TYPES.find((t) => t.id === ticketTypeId)!, [ticketTypeId]);
  const applied = method === "voucher" && vState === "valid" ? voucher ?? undefined : undefined;
  const { total, discount } = applyVoucher(ticket.price, applied);

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
  const canSubmit = baseOk && (method === "card" || (method === "voucher" && vState === "valid"));

  const finish = () => {
    // Resgate consome 1 uso do voucher; checkout libera acesso/download.
    if (method === "voucher" && voucher) redeem(voucher.id);
    completeCheckout();
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-success-500" />
            <h1 className="text-h2 text-neutral-900">
              {total === 0 ? "Ingresso resgatado!" : "Pagamento confirmado!"}
            </h1>
            <p className="text-body text-neutral-600">
              Enviamos o ingresso e o QR Code por e-mail. Ele também está na aba{" "}
              <strong>Credencial</strong>, e seu acesso a <strong>downloads</strong> foi liberado.
            </p>
            <div className="flex items-center gap-2 rounded-md bg-success-50 px-3 py-2 text-success-500">
              <QrCode className="h-5 w-5" /> {ticket.name} · {brl(total)}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Adquirir ingresso" subtitle="Pague com cartão/Pix ou use um voucher" icon={Ticket} />

      {/* Passo 1 — Dados complementares (Fase 2) */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">1. Seus dados</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Empresa" placeholder="Onde você trabalha" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Input label="Cargo" placeholder="Ex.: Analista ESG" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-h5 text-neutral-900">Tipo de ingresso</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {TICKET_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTicketTypeId(t.id)}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    t.id === ticketTypeId ? "border-primary-500 bg-primary-50" : "border-neutral-200 hover:border-primary-300"
                  )}
                >
                  <p className="text-body font-medium text-neutral-900">{t.name}</p>
                  <p className="text-body-sm text-neutral-600">{brl(t.price)}</p>
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Passo 2 — Forma de aquisição (alternância) */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">2. Forma de aquisição</p>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Toggle de método (Consistência — Heurística 4) */}
          <div className="grid grid-cols-2 gap-2 rounded-md bg-neutral-100 p-1">
            {([
              { id: "card", label: "Cartão / Pix", icon: CreditCard },
              { id: "voucher", label: "Voucher de convidado", icon: Tag }
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMethod(id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md py-2 text-button transition-colors",
                  method === id ? "bg-white text-primary-700 shadow-card" : "text-neutral-600"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {method === "card" ? (
            <div className="rounded-md border border-neutral-200 p-4 text-body-sm text-neutral-600">
              Pagamento processado com segurança via <strong>Asaas</strong> (Cartão de crédito ou Pix).
              Simulação de gateway neste protótipo.
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                label="Código do voucher"
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
                  · {getCurator(voucher.ownerId)?.name ?? "Patrocinador"} · {remaining(voucher)} usos restantes
                </div>
              ) : (
                <Button variant="outline" onClick={checkVoucher} loading={vState === "checking"} disabled={code.trim().length < 3}>
                  Aplicar voucher
                </Button>
              )}
            </div>
          )}

          {/* Resumo do pedido */}
          <div className="space-y-1 rounded-md bg-neutral-50 p-4">
            <div className="flex justify-between text-body text-neutral-600">
              <span>{ticket.name}</span>
              <span>{brl(ticket.price)}</span>
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
          {!baseOk && (
            <p className="text-center text-body-sm text-neutral-600">Preencha empresa e cargo para continuar.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
