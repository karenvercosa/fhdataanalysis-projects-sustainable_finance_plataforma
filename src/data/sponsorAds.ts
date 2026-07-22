// Divulgações que as empresas Ouro e Prata exibem no banner rotativo da tela
// inicial/painel. Editáveis pelo Admin (persistidas em "sf_sponsor_ads").
export type AdTier = "Ouro" | "Prata";

export interface SponsorAd {
  id: string;
  company: string;
  tier: AdTier;
  headline: string;
  subtext: string;
  /** Arquivo (data URL) enviado no Admin; substitui o monograma no banner. */
  image?: string;
}

export const SPONSOR_ADS_KEY = "sf_sponsor_ads";

export const SPONSOR_ADS: SponsorAd[] = [
  // ---- Ouro ----
  { id: "ad_agro_1", company: "AgroVerde", tier: "Ouro", headline: "Agricultura regenerativa que vira crédito de carbono", subtext: "Conheça os projetos da AgroVerde e gere valor ESG no seu portfólio." },
  { id: "ad_fund_1", company: "FundCo", tier: "Ouro", headline: "R$ 5 bi sob gestão em estratégias ESG", subtext: "A FundCo desenha carteiras verdes sob medida para institucionais." },
  { id: "ad_agro_2", company: "AgroVerde", tier: "Ouro", headline: "Estande Ouro: rodada de negócios em agro sustentável", subtext: "Agende uma conversa no estande principal da AgroVerde." },
  { id: "ad_fund_2", company: "FundCo", tier: "Ouro", headline: "Relatório exclusivo: tendências ESG 2026", subtext: "Material da FundCo apresentado no painel de abertura." },
  // ---- Prata ----
  { id: "ad_bank_1", company: "BankCo", tier: "Prata", headline: "Crédito verde com condições especiais no evento", subtext: "A linha ESG do BankCo para financiar a sua transição." },
  { id: "ad_bank_2", company: "BankCo", tier: "Prata", headline: "Abra sua conta de investimentos sustentáveis", subtext: "Produtos ESG do BankCo com curadoria de especialistas." }
];

// Patrocinadores Bronze — exibidos como logos pequenas rolando no rodapé do início.
export const BRONZE_SPONSORS: string[] = [
  "Fintech Verde",
  "EcoLog",
  "SolarMais",
  "ReVerde",
  "BioParque",
  "VerdeCred",
  "CarbonZero",
  "AgroTech BR"
];
