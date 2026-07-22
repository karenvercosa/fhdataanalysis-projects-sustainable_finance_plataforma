// ---------------------------------------------------------------------
//  COTAS DE PATROCÍNIO — benefícios, upgrade e contato comercial
// ---------------------------------------------------------------------
export type SponsorTier = "Bronze" | "Prata" | "Ouro";

/** Da menor para a maior — define o "próximo nível" no upgrade. */
export const TIER_ORDER: SponsorTier[] = ["Bronze", "Prata", "Ouro"];

/**
 * Benefícios de cada cota. São cumulativos (a cota maior entrega tudo o que a
 * anterior entrega) e refletem o que já existe na plataforma: esteira de logos,
 * banner rotativo (2:1), logo nos cards de programação e lote de vouchers.
 */
export const TIER_BENEFITS: Record<SponsorTier, string[]> = {
  Bronze: [
    "Logo na esteira de patrocinadores da tela inicial",
    "Perfil público no Networking",
    "Lote de 50 vouchers de convite"
  ],
  Prata: [
    "Divulgações no banner rotativo da tela inicial",
    "Logo nos cards das sessões da Programação",
    "Lote de 100 vouchers de convite",
    "Relatório de leads com consentimento (LGPD)"
  ],
  Ouro: [
    "Dobro de exibições no banner rotativo (proporção 2:1)",
    "Destaque na abertura e no encerramento do evento",
    "Lote de 250 vouchers de convite",
    "Sessão patrocinada na Programação",
    "Envio de conteúdo próprio na aba Conteúdos"
  ]
};

/** Responsável comercial que conduz a negociação do upgrade de cota. */
export const COMMERCIAL_CONTACT = {
  name: "Ana Ribeiro",
  role: "Responsável Comercial · Sustainable Finance 2026",
  email: "comercial@sustainablefinance2026.com.br",
  phone: "(62) 98888-1010"
};

export const TIER_UPGRADE_KEY = "sf_tier_upgrade_request";
/** Preferência de recolher/expandir o painel de cotas. */
export const TIER_PANEL_KEY = "sf_tier_panel_expanded";

/** Solicitação de upgrade aberta pelo curador/patrocinador. */
export interface UpgradeRequest {
  from: SponsorTier;
  to: SponsorTier;
  message: string;
  /** Data legível da solicitação (dd/mm/aaaa). */
  requestedAt: string;
}

/**
 * Todas as cotas acima da atual — o patrocinador pode pular níveis
 * (ex.: sair do Bronze direto para o Ouro). Vazio quando já está no topo.
 */
export function tiersAbove(tier: SponsorTier): SponsorTier[] {
  const i = TIER_ORDER.indexOf(tier);
  return i < 0 ? [] : TIER_ORDER.slice(i + 1);
}

/**
 * Benefícios ganhos ao migrar de uma cota para outra. Como as cotas são
 * cumulativas, quem sai do Bronze para o Ouro leva também os do Prata.
 */
export function benefitsGained(from: SponsorTier, to: SponsorTier): string[] {
  const start = TIER_ORDER.indexOf(from) + 1;
  const end = TIER_ORDER.indexOf(to);
  return TIER_ORDER.slice(start, end + 1).flatMap((t) => TIER_BENEFITS[t]);
}
