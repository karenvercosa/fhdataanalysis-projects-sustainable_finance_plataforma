import { useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, CheckCircle2, ChevronDown, Mail, Phone, Sparkles, User } from "lucide-react";
import { Badge, Button, Card, CardBody, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useAuth } from "@/context/AuthContext";
import {
  COMMERCIAL_CONTACT,
  TIER_BENEFITS,
  TIER_PANEL_KEY,
  TIER_UPGRADE_KEY,
  benefitsGained,
  tiersAbove,
  type SponsorTier,
  type UpgradeRequest
} from "@/data/sponsorTiers";

const TIER_TONE = { Ouro: "warning", Prata: "info", Bronze: "neutral" } as const;

function today() {
  return new Date().toLocaleDateString("pt-BR");
}

/** Bloco com os dados do responsável comercial (reutilizado no form e na devolutiva). */
function CommercialContact() {
  return (
    <div className="space-y-2 rounded-md bg-neutral-50 p-3">
      <p className="inline-flex items-center gap-2 text-body font-medium text-neutral-900">
        <User className="h-4 w-4 text-primary-600" /> {COMMERCIAL_CONTACT.name}
      </p>
      <p className="text-body-sm text-neutral-600">{COMMERCIAL_CONTACT.role}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
        <a
          href={`mailto:${COMMERCIAL_CONTACT.email}`}
          className="inline-flex items-center gap-1.5 text-primary-600 hover:underline"
        >
          <Mail className="h-3.5 w-3.5" /> {COMMERCIAL_CONTACT.email}
        </a>
        <a
          href={`tel:${COMMERCIAL_CONTACT.phone.replace(/\D/g, "")}`}
          className="inline-flex items-center gap-1.5 text-primary-600 hover:underline"
        >
          <Phone className="h-3.5 w-3.5" /> {COMMERCIAL_CONTACT.phone}
        </a>
      </div>
    </div>
  );
}

/**
 * Sugere ao curador/patrocinador o upgrade da cota contratada. O upgrade é
 * conduzido pelo responsável comercial: o curador registra o interesse e recebe
 * a devolutiva de que será contatado em breve.
 */
export function TierUpgradeCard() {
  const { user } = useAuth();
  const tier: SponsorTier = user.tier ?? "Bronze";
  // Todas as cotas acima da atual — dá para pular níveis (Bronze → Ouro).
  const options = tiersAbove(tier);

  const [request, setRequest] = usePersistentState<UpgradeRequest | null>(TIER_UPGRADE_KEY, null);
  // Recolhido por padrão: a oferta fica disponível sem competir com métricas e leads.
  const [expanded, setExpanded] = usePersistentState<boolean>(TIER_PANEL_KEY, false);

  // Altura real do conteúdo — medida antes da pintura e re-medida no resize,
  // já que a quebra do grid muda a altura entre mobile e desktop.
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      if (contentRef.current) setContentHeight(contentRef.current.scrollHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [expanded, options.length]);
  // Cota escolhida no modal. Na cota máxima (Ouro) o contato é sobre renovação.
  const [target, setTarget] = useState<SponsorTier>(options[0] ?? tier);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false); // etapa de devolutiva dentro do modal
  const [message, setMessage] = useState("");

  const openFor = (t: SponsorTier) => {
    setTarget(t);
    setOpen(true);
  };

  const submit = () => {
    setRequest({ from: tier, to: target, message: message.trim(), requestedAt: today() });
    setSent(true);
  };

  const closeModal = () => {
    setOpen(false);
    // Reseta a etapa só depois da animação de fechamento.
    window.setTimeout(() => setSent(false), 200);
  };

  return (
    <>
      {request ? (
        // ---- Estado 2: solicitação registrada → devolutiva persistente ----
        <Card className="border-primary-500 bg-primary-50">
          <CardBody className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
              <div className="min-w-0">
                <p className="text-h4 text-neutral-900">Solicitação de upgrade enviada</p>
                <p className="text-body-sm text-neutral-700">
                  O responsável comercial entrará em contato em breve para falar sobre a cota{" "}
                  <strong>{request.to}</strong>. Solicitado em {request.requestedAt}.
                </p>
                <p className="mt-1 text-body-sm text-neutral-600">
                  {COMMERCIAL_CONTACT.name} · {COMMERCIAL_CONTACT.email}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setRequest(null)}>
              Cancelar solicitação
            </Button>
          </CardBody>
        </Card>
      ) : (
        // ---- Estado 1: sugestão de upgrade ----
        <Card>
          {/* Cabeçalho é o próprio controle de recolher/expandir */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="tier-upgrade-panel"
            className={cn(
              "flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left",
              "transition-colors hover:bg-neutral-50",
              expanded && "border-b border-neutral-100"
            )}
          >
            <span className="block">
              <span className="flex items-center gap-2 text-h4 text-neutral-900">
                <Sparkles className="h-4 w-4 shrink-0 text-secondary-500" />
                {options.length ? "Upgrade de cota" : "Sua cota de patrocínio"}
              </span>
              <span className="block text-body-sm text-neutral-600">
                {options.length
                  ? "Escolha a cota que faz sentido para a sua empresa — dá para subir mais de um nível."
                  : "Você já está na cota máxima do evento."}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-body-sm text-neutral-600">
              Cota atual <Badge tone={TIER_TONE[tier]}>{tier}</Badge>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-neutral-500 transition-transform duration-300 ease-out",
                  expanded && "rotate-180"
                )}
              />
            </span>
          </button>

          {/* Painel recolhível — altura medida do conteúdo (fr não interpola de
              forma confiável em todos os navegadores). */}
          <div
            id="tier-upgrade-panel"
            style={{ height: expanded ? contentHeight : 0 }}
            className="overflow-hidden transition-[height] duration-300 ease-out"
          >
            <div ref={contentRef}>
              <CardBody className="space-y-3">
            {options.length ? (
              <>
                {/* Uma opção por cota disponível acima da atual */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {options.map((t) => (
                    <div
                      key={t}
                      className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4 transition-shadow hover:shadow-card"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-h4 text-neutral-900">Cota {t}</p>
                        <Badge tone={TIER_TONE[t]}>{t}</Badge>
                      </div>
                      <p className="text-body-sm text-neutral-600">
                        O que você ganha saindo do {tier}:
                      </p>
                      <ul className="flex-1 space-y-1.5">
                        {benefitsGained(tier, t).map((b) => (
                          <li key={b} className="flex items-start gap-2 text-body-sm text-neutral-700">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                            {b}
                          </li>
                        ))}
                      </ul>
                      <Button
                        fullWidth
                        variant={t === "Ouro" ? "primary" : "outline"}
                        onClick={() => openFor(t)}
                        leftIcon={<ArrowUpRight className="h-4 w-4" />}
                      >
                        Quero a cota {t}
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-body-sm text-neutral-600">
                  O upgrade é feito com o responsável comercial do evento.
                </p>
              </>
            ) : (
              <>
                <p className="text-body-sm font-medium text-neutral-900">
                  Benefícios ativos da cota {tier}:
                </p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {TIER_BENEFITS[tier].map((b) => (
                    <li key={b} className="flex items-start gap-2 text-body-sm text-neutral-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button onClick={() => openFor(tier)} leftIcon={<ArrowUpRight className="h-4 w-4" />}>
                    Falar com o comercial
                  </Button>
                  <p className="text-body-sm text-neutral-600">
                    Renovação e condições especiais com o responsável comercial.
                  </p>
                </div>
              </>
            )}
              </CardBody>
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={open}
        onClose={closeModal}
        title={
          sent
            ? "Solicitação enviada"
            : options.length
            ? `Upgrade para a cota ${target}`
            : "Falar com o comercial"
        }
        footer={
          sent ? (
            <Button onClick={closeModal}>Concluir</Button>
          ) : (
            <>
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button onClick={submit}>Enviar solicitação</Button>
            </>
          )
        }
      >
        {sent ? (
          // ---- Devolutiva de feedback ----
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary-600" />
              <div>
                <p className="text-body font-medium text-neutral-900">
                  Recebemos o seu interesse na cota {target}.
                </p>
                <p className="text-body-sm text-neutral-600">
                  O responsável comercial entrará em contato em breve pelos dados do seu cadastro
                  ({user.email}) para apresentar as condições e concluir o upgrade.
                </p>
              </div>
            </div>
            <CommercialContact />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-body-sm text-neutral-700">
              {options.length
                ? `Registre seu interesse em migrar da cota ${tier} para a cota ${target}. O responsável comercial abaixo conduz a negociação e entra em contato com você.`
                : "Fale com o responsável comercial sobre renovação e condições especiais da sua cota."}
            </p>
            {options.length > 1 && (
              // Permite trocar a cota escolhida sem fechar o modal.
              <div className="space-y-1.5">
                <label htmlFor="upgrade-tier" className="block text-h5 text-neutral-900">
                  Cota desejada
                </label>
                <select
                  id="upgrade-tier"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as SponsorTier)}
                  className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                >
                  {options.map((t) => (
                    <option key={t} value={t}>
                      Cota {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <CommercialContact />
            <div className="space-y-1.5">
              <label htmlFor="upgrade-msg" className="block text-h5 text-neutral-900">
                Mensagem (opcional)
              </label>
              <textarea
                id="upgrade-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Conte o que a sua empresa busca com o patrocínio…"
                className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
