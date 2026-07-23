import { useState } from "react";
import { ArrowRight, CheckCircle2, Handshake, Mail, Mic2, Phone, User } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { usePersistentState } from "@/hooks/usePersistentState";
import { COMMERCIAL_CONTACT } from "@/data/sponsorTiers";
import { AVISO_FORMULARIO_B2B } from "@/data/legal";
import { cn } from "@/lib/utils";

export const LEADS_PARCERIA_KEY = "sf_leads_parceria";

export type TipoParceria = "curador" | "patrocinador";

/** Lead comercial captado na tela inicial. */
export interface LeadParceria {
  id: string;
  tipo: TipoParceria;
  nome: string;
  email: string;
  empresa: string;
  cargo: string;
  telefone: string;
  mensagem: string;
  criadoEm: string;
}

const CONTEUDO: Record<
  TipoParceria,
  { titulo: string; sub: string; cta: string; icone: typeof Mic2; tema: string; card: string }
> = {
  curador: {
    titulo: "Lidere o debate no Summit",
    sub: "Inscreva-se para ser Curador de painéis.",
    cta: "Quero ser Curador",
    icone: Mic2,
    tema: "Qual painel você gostaria de curar?",
    card: "from-[#123C2B] to-[#0A2A1C]"
  },
  patrocinador: {
    titulo: "Destaque sua marca para decisores",
    sub: "Conheça nossas cotas de patrocínio e gere leads qualificados.",
    cta: "Quero patrocinar",
    icone: Handshake,
    tema: "Conte o objetivo da sua marca no evento",
    card: "from-[#2B2350] to-[#1A1533]"
  }
};

interface Props {
  nome: string;
  email: string;
}

/**
 * Captação comercial na tela inicial: dois convites lado a lado para quem pode
 * entrar no evento como Curador ou Patrocinador.
 */
export function PartnershipBanners({ nome, email }: Props) {
  const [leads, setLeads] = usePersistentState<LeadParceria[]>(LEADS_PARCERIA_KEY, []);
  const [aberto, setAberto] = useState<TipoParceria | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ empresa: "", cargo: "", telefone: "", mensagem: "" });

  const jaEnviou = (tipo: TipoParceria) =>
    leads.some((l) => l.tipo === tipo && l.email.toLowerCase() === email.toLowerCase());

  const abrir = (tipo: TipoParceria) => {
    setForm({ empresa: "", cargo: "", telefone: "", mensagem: "" });
    setEnviado(false);
    setAberto(tipo);
  };

  const fechar = () => {
    setAberto(null);
    window.setTimeout(() => setEnviado(false), 200);
  };

  const podeEnviar = form.empresa.trim() && form.cargo.trim() && form.telefone.trim();

  const enviar = () => {
    if (!aberto) return;
    setLeads((prev) => [
      ...prev.filter((l) => !(l.tipo === aberto && l.email.toLowerCase() === email.toLowerCase())),
      {
        id: `lead_${aberto}_${email}`,
        tipo: aberto,
        nome,
        email,
        empresa: form.empresa.trim(),
        cargo: form.cargo.trim(),
        telefone: form.telefone.trim(),
        mensagem: form.mensagem.trim(),
        criadoEm: new Date().toLocaleDateString("pt-BR")
      }
    ]);
    setEnviado(true);
  };

  const atual = aberto ? CONTEUDO[aberto] : null;

  return (
    <>
      <section aria-label="Seja parceiro do Summit" className="grid gap-3 lg:grid-cols-2">
        {(Object.keys(CONTEUDO) as TipoParceria[]).map((tipo) => {
          const c = CONTEUDO[tipo];
          const Icone = c.icone;
          const enviadoAntes = jaEnviou(tipo);
          return (
            <div
              key={tipo}
              className={cn(
                "flex flex-col justify-between gap-4 rounded-lg bg-gradient-to-br p-5 text-white shadow-card",
                c.card
              )}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white/15">
                  <Icone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-h3 leading-tight">{c.titulo}</p>
                  <p className="mt-1 text-body-sm text-white/80">{c.sub}</p>
                </div>
              </div>

              {enviadoAntes ? (
                <p className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-body-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Interesse registrado — entraremos em contato.
                </p>
              ) : (
                <button
                  onClick={() => abrir(tipo)}
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-white px-4 text-button font-semibold text-neutral-900 transition hover:bg-white/90"
                >
                  {c.cta} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </section>

      <Modal
        open={!!aberto}
        onClose={fechar}
        title={enviado ? "Interesse registrado" : atual?.cta ?? ""}
        footer={
          enviado ? (
            <Button onClick={fechar}>Concluir</Button>
          ) : (
            <>
              <Button variant="outline" onClick={fechar}>
                Cancelar
              </Button>
              <Button onClick={enviar} disabled={!podeEnviar}>
                Enviar
              </Button>
            </>
          )
        }
      >
        {enviado ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary-600" />
              <div>
                <p className="text-body font-medium text-neutral-900">
                  Recebemos seu interesse, {nome.split(" ")[0]}.
                </p>
                <p className="text-body-sm text-neutral-600">
                  O responsável comercial entra em contato em breve por {email}.
                </p>
              </div>
            </div>
            <ContatoComercial />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-body-sm text-neutral-700">{atual?.sub}</p>
            {aberto === "patrocinador" && <ContatoComercial />}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Empresa"
                placeholder="Nome da empresa"
                value={form.empresa}
                onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
              />
              <Input
                label="Cargo"
                placeholder="Ex.: Diretor de Marketing"
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              />
            </div>
            <Input
              label="Telefone / WhatsApp"
              placeholder="+55 62 99999-0000"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label htmlFor="lead-msg" className="block text-h5 text-neutral-900">
                {atual?.tema} (opcional)
              </label>
              <textarea
                id="lead-msg"
                value={form.mensagem}
                onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            {!podeEnviar && (
              <p className="text-body-sm text-neutral-600">
                Preencha empresa, cargo e telefone para enviar.
              </p>
            )}
            <p className="rounded-md bg-neutral-50 p-3 text-body-sm text-neutral-500">
              {AVISO_FORMULARIO_B2B}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

/** Dados do responsável comercial — os mesmos usados no upgrade de cota. */
function ContatoComercial() {
  return (
    <div className="space-y-2 rounded-md bg-neutral-50 p-3">
      <p className="inline-flex items-center gap-2 text-body font-medium text-neutral-900">
        <User className="h-4 w-4 text-primary-600" /> {COMMERCIAL_CONTACT.name}
      </p>
      <p className="text-body-sm text-neutral-600">{COMMERCIAL_CONTACT.role}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
        <a href={`mailto:${COMMERCIAL_CONTACT.email}`} className="inline-flex items-center gap-1.5 text-primary-600 hover:underline">
          <Mail className="h-3.5 w-3.5" /> {COMMERCIAL_CONTACT.email}
        </a>
        <a href={`tel:${COMMERCIAL_CONTACT.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1.5 text-primary-600 hover:underline">
          <Phone className="h-3.5 w-3.5" /> {COMMERCIAL_CONTACT.phone}
        </a>
      </div>
    </div>
  );
}
