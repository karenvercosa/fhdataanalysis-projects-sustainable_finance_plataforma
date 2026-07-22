import { useState } from "react";
import { Check, Download, Linkedin, Sparkles } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

export type TipoParticipante = "Premium" | "Palestrante" | "Patrocinador";

/**
 * Lado do card na exportação (1080×1080). O layout NÃO é fixado nessa medida:
 * todas as dimensões estão em `cqw` (% da largura do container), então o card
 * é fiel em qualquer tamanho — basta renderizar o container a 1080px para
 * exportar. Isso evita depender de medição por JS, que quebra silenciosamente
 * quando o ResizeObserver não dispara (aba oculta, container escondido).
 */
export const CARD_EXPORT_SIZE = 1080;

/** px do desenho original → cqw. */
const u = (px: number) => `${((px / CARD_EXPORT_SIZE) * 100).toFixed(4)}cqw`;

/**
 * Anel da foto por tipo de participante. São os mesmos matizes dos selos da
 * plataforma, clareados — os tons originais não têm contraste suficiente
 * sobre o verde escuro do card.
 */
const RING_COLOR: Record<TipoParticipante, string> = {
  Premium: "#7FCFA3", // primary-300 (o verde da marca sumiria no fundo)
  Palestrante: "#7FB2F5", // info clareado
  Patrocinador: "#A78BE8" // violeta clareado
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export interface EuVouCardProps {
  nomeUsuario: string;
  cargoEmpresa: string;
  urlFotoPerfil?: string;
  tipoParticipante: TipoParticipante;
}

/**
 * Card "Eu Vou" (1:1) para compartilhamento social. Ocupa 100% da largura do
 * container — que precisa declarar `container-type: inline-size`.
 */
export function EuVouCard({
  nomeUsuario,
  cargoEmpresa,
  urlFotoPerfil,
  tipoParticipante,
  className
}: EuVouCardProps & { className?: string }) {
  const ring = RING_COLOR[tipoParticipante];

  return (
    <div
      style={{ containerType: "inline-size", aspectRatio: "1 / 1" }}
      className={cn("relative w-full overflow-hidden bg-primary-ink text-white", className)}
    >
      {/* Brilho de fundo — dá profundidade sem competir com o conteúdo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "radial-gradient(circle at 22% 18%, #1E8E5A 0%, transparent 45%), radial-gradient(circle at 82% 88%, #0F5F3C 0%, transparent 50%)"
        }}
      />

      <div
        className="relative z-10 flex h-full flex-col items-center justify-between"
        style={{ padding: `${u(96)} ${u(80)}` }}
      >
        {/* Topo — chamada */}
        <div className="flex flex-col items-center" style={{ gap: u(24) }}>
          <span
            className="inline-flex items-center font-semibold uppercase"
            style={{
              gap: u(16),
              padding: `${u(16)} ${u(40)}`,
              fontSize: u(34),
              letterSpacing: u(7),
              borderRadius: u(999),
              backgroundColor: `${ring}26`,
              color: ring,
              boxShadow: `inset 0 0 0 ${u(3)} ${ring}66`
            }}
          >
            <Sparkles style={{ width: u(36), height: u(36) }} /> Eu vou
          </span>
          <p
            className="text-center font-heading font-bold text-white"
            style={{ fontSize: u(54), lineHeight: 1.15 }}
          >
            Sustainable Finance Summit 2026
          </p>
        </div>

        {/* Centro — foto, nome e cargo */}
        <div className="flex flex-col items-center" style={{ gap: u(32) }}>
          <div
            className="grid shrink-0 place-items-center rounded-full"
            style={{
              width: u(340),
              height: u(340),
              boxShadow: `0 0 0 ${u(12)} ${ring}, 0 0 0 ${u(24)} ${ring}33`
            }}
          >
            {urlFotoPerfil ? (
              <img src={urlFotoPerfil} alt={nomeUsuario} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span
                className="grid h-full w-full place-items-center rounded-full font-heading font-bold"
                style={{ fontSize: u(128), backgroundColor: `${ring}26`, color: ring }}
              >
                {initials(nomeUsuario)}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center" style={{ gap: u(12) }}>
            <p
              className="text-center font-heading font-bold"
              style={{ fontSize: u(72), lineHeight: 1.05 }}
            >
              {nomeUsuario}
            </p>
            <p className="text-center text-white/75" style={{ fontSize: u(38), lineHeight: 1.2 }}>
              {cargoEmpresa}
            </p>
            <span
              className="font-semibold"
              style={{
                marginTop: u(8),
                padding: `${u(12)} ${u(32)}`,
                fontSize: u(30),
                borderRadius: u(999),
                backgroundColor: ring,
                color: "#0A2A1C"
              }}
            >
              {tipoParticipante}
            </span>
          </div>

          <p
            className="text-center text-white/90"
            style={{ maxWidth: u(820), fontSize: u(40), lineHeight: 1.3 }}
          >
            Presença confirmada no maior encontro de finanças sustentáveis do país.
          </p>
        </div>

        {/* Rodapé — logo do evento + data/local */}
        <div
          className="flex w-full items-center justify-between border-white/15"
          style={{ borderTopWidth: u(2), paddingTop: u(40) }}
        >
          <div className="flex items-center" style={{ gap: u(20) }}>
            <div
              className="grid shrink-0 place-items-center bg-primary-500 font-heading font-bold"
              style={{ width: u(96), height: u(96), fontSize: u(42), borderRadius: u(20) }}
            >
              SF
            </div>
            <div>
              <p className="font-heading font-bold" style={{ fontSize: u(40), lineHeight: 1.15 }}>
                Sustainable Finance
              </p>
              <p className="text-white/70" style={{ fontSize: u(30), lineHeight: 1.2 }}>
                Summit 2026
              </p>
            </div>
          </div>
          <p className="text-right font-semibold text-white/90" style={{ fontSize: u(36) }}>
            04/09 · Goiânia
          </p>
        </div>
      </div>
    </div>
  );
}

/** Texto sugerido no compartilhamento — o usuário pode ajustar antes de postar. */
const LINKEDIN_TEXT = `Presença confirmada no Sustainable Finance Summit 2026! 🌱

Vou estar no maior encontro de finanças sustentáveis do país, dia 04/09, em Goiânia. Vamos falar sobre ESG, investimentos de impacto e o futuro do capital verde.

#SustainableFinance2026 #ESG #FinançasSustentáveis`;

/** Preview do card + ações de compartilhamento. */
export function EuVouShare(props: EuVouCardProps) {
  const [baixando, setBaixando] = useState(false);
  const [baixado, setBaixado] = useState(false);
  const [linkedinAberto, setLinkedinAberto] = useState(false);

  // SIMULAÇÃO — a exportação real exige rasterizar o nó (html-to-image/canvas)
  // com o container em 1080px. Nenhum arquivo é gerado por enquanto.
  const baixar = () => {
    setBaixando(true);
    window.setTimeout(() => {
      setBaixando(false);
      setBaixado(true);
      window.setTimeout(() => setBaixado(false), 2500);
    }, 1200);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={baixar}
          loading={baixando}
          leftIcon={baixado ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        >
          {baixando ? "Gerando…" : baixado ? "Imagem gerada" : "Baixar imagem (PNG)"}
        </Button>
        <Button
          className="bg-[#0A66C2] hover:bg-[#095196]"
          onClick={() => setLinkedinAberto(true)}
          leftIcon={<Linkedin className="h-4 w-4" />}
        >
          Compartilhar no LinkedIn
        </Button>
      </div>

      {baixado && (
        <p className="text-body-sm text-neutral-500">
          Protótipo: a geração do arquivo ainda não está conectada.
        </p>
      )}

      {/* Janela de compartilhamento simulada */}
      <Modal
        open={linkedinAberto}
        onClose={() => setLinkedinAberto(false)}
        title="Compartilhar no LinkedIn"
        className="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setLinkedinAberto(false)}>
              Cancelar
            </Button>
            <Button className="bg-[#0A66C2] hover:bg-[#095196]" onClick={() => setLinkedinAberto(false)}>
              Publicar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#0A66C2] text-white">
              <Linkedin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-body font-medium text-neutral-900">{props.nomeUsuario}</p>
              <p className="text-body-sm text-neutral-600">Publicar para: Qualquer pessoa</p>
            </div>
          </div>

          <textarea
            defaultValue={LINKEDIN_TEXT}
            rows={7}
            className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-body text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />

          <EuVouCard {...props} className="rounded-md border border-neutral-200" />

          <p className="text-body-sm text-neutral-500">
            Pré-visualização simulada — nada é publicado fora da plataforma.
          </p>
        </div>
      </Modal>
    </div>
  );
}
