// ---------------------------------------------------------------------
//  COTAS DE PATROCÍNIO — benefícios, upgrade e contato comercial
// ---------------------------------------------------------------------
export type SponsorTier = "Bronze" | "Prata" | "Ouro";

/** Da menor para a maior — define o "próximo nível" no upgrade. */
export const TIER_ORDER: SponsorTier[] = ["Bronze", "Prata", "Ouro"];

/**
 * A cota que o Admin concedeu, quando é uma cota conhecida.
 *
 * A cota mora em `usuario.selo` — é o campo "Selo / Cota" da tela de usuários
 * do Admin. Esta função é a ponte entre aquela coluna e o `tier` da sessão;
 * sem ela o curador entra sem cota nenhuma e a plataforma trata todo mundo
 * como Bronze.
 *
 * Os nomes conferidos são os do seletor do Admin. Se as cotas forem
 * renomeadas na aba "Cotas", renomeie também as opções daquele seletor — os
 * dois lugares se encontram por nome.
 */
export function cotaDoSelo(selo: string | null | undefined): SponsorTier | undefined {
  return TIER_ORDER.includes(selo as SponsorTier) ? (selo as SponsorTier) : undefined;
}

/**
 * ⚠️ NÃO ESTÁ EM USO pelo `TierUpgradeCard`.
 *
 * Lista fixa de benefícios por cota, de quando o card ainda não lia a Matriz
 * de Cotas do Admin. Hoje os pontos exibidos são os recursos LIGADOS naquela
 * matriz (`TIER_FEATURE_ROWS` + `useTierMatrix`), para o que o Admin marca ser
 * exatamente o que o patrocinador vê.
 *
 * Mantida como referência dos benefícios comerciais que não são recursos da
 * plataforma (esteira de logos, lote de vouchers, sessão patrocinada).
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

/**
 * Solicitação de upgrade aberta pelo curador/patrocinador.
 *
 * `from`/`to` são `string`, e não `SponsorTier`, porque as cotas podem ser
 * renomeadas na aba "Cotas" do Admin — a solicitação guarda o nome que estava
 * valendo no momento em que foi feita.
 */
export interface UpgradeRequest {
  from: string;
  to: string;
  message: string;
  /** Data legível da solicitação (dd/mm/aaaa). */
  requestedAt: string;
}

/**
 * ⚠️ NÃO ESTÁ EM USO — ver a nota de `TIER_BENEFITS`.
 *
 * Ordem das cotas a partir da lista fixa. O card passou a tirar a ordem da
 * própria Matriz de Cotas, que é o que o Admin controla.
 */
export function tiersAbove(tier: SponsorTier): SponsorTier[] {
  const i = TIER_ORDER.indexOf(tier);
  return i < 0 ? [] : TIER_ORDER.slice(i + 1);
}

/** ⚠️ NÃO ESTÁ EM USO — ver a nota de `TIER_BENEFITS`. */
export function benefitsGained(from: SponsorTier, to: SponsorTier): string[] {
  const start = TIER_ORDER.indexOf(from) + 1;
  const end = TIER_ORDER.indexOf(to);
  return TIER_ORDER.slice(start, end + 1).flatMap((t) => TIER_BENEFITS[t]);
}
