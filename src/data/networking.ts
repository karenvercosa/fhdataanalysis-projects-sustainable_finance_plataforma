// Diretório de networking: pessoas e empresas participantes do evento.
import { CURATORS } from "@/data/catalog";
import { SESSIONS } from "@/data/mock";
import { sponsorKindOf, type SealKind } from "@/lib/seals";

export type ConnectionKind = "person" | "company";
export type SponsorTier = "Ouro" | "Prata" | "Bronze";

export interface Connection {
  id: string;
  kind: ConnectionKind;
  name: string;
  /** person: "Cargo · Empresa" · company: segmento */
  subtitle: string;
  bio: string;
  tags: string[];
  // Pessoa
  role?: string;
  company?: string;
  // Empresa
  segment?: string;
  tier?: SponsorTier;
  website?: string;
  // Contato (pessoa e empresa)
  linkedin?: string;
  phone?: string;
  email?: string;
  banner?: string; // URL de banner horizontal (opcional)
}

export const CONNECTIONS: Connection[] = [
  // Pessoas
  {
    id: "p_1", kind: "person", name: "Helena Vasquez", role: "Head de ESG", company: "FundCo",
    subtitle: "Head de ESG · FundCo", tags: ["ESG", "Regulação", "Net zero"],
    bio: "Lidera a estratégia ESG da FundCo, com foco em integração de riscos climáticos a carteiras institucionais.",
    linkedin: "linkedin.com/in/helena-vasquez", phone: "+55 62 99999-0001", email: "helena@fundco.com"
  },
  {
    id: "p_2", kind: "person", name: "Rafael Lima", role: "Gestor", company: "CarbonX",
    subtitle: "Gestor · CarbonX", tags: ["Crédito de carbono", "Investimentos"],
    bio: "Gestor de fundos de crédito de carbono, estruturando projetos de compensação na América Latina.",
    linkedin: "linkedin.com/in/rafael-lima", phone: "+55 62 99999-0002", email: "rafael@carbonx.com"
  },
  {
    id: "p_3", kind: "person", name: "Diego Rocha", role: "Investidor-anjo", company: "Independente",
    subtitle: "Investidor-anjo · Independente", tags: ["Startups", "Impacto"],
    bio: "Investe em startups de climatech em estágio inicial e mentora fundadores de negócios de impacto.",
    linkedin: "linkedin.com/in/diego-rocha", phone: "+55 62 99999-0003", email: "diego@rochainveste.com"
  },
  {
    id: "p_4", kind: "person", name: "Marina Costa", role: "CEO", company: "Fintech Verde",
    subtitle: "CEO · Fintech Verde", tags: ["Fintech", "Inovação"],
    bio: "Fundadora da Fintech Verde, plataforma de investimentos sustentáveis para o varejo.",
    linkedin: "linkedin.com/in/marina-costa", phone: "+55 62 99999-0004", email: "marina@fintechverde.com.br"
  },

  {
    id: "p_5", kind: "person", name: "João Patrocínio", role: "Curador", company: "Independente",
    subtitle: "Curador · Independente", tags: ["Finanças sustentáveis", "Impacto"],
    bio: "Curador do Sustainable Finance 2026, conecta investidores e negócios de impacto na região Centro-Oeste.",
    linkedin: "linkedin.com/in/joao-patrocinio", phone: "+55 62 99999-1001", email: "joao@verde.com"
  },

  // Empresas
  {
    id: "cmp_1", kind: "company", name: "AgroVerde", segment: "Agronegócio", tier: "Ouro",
    subtitle: "Agronegócio", tags: ["Agro", "Crédito de carbono"], website: "agroverde.com.br",
    bio: "Patrocinadora Ouro. Referência em agricultura regenerativa e geração de créditos de carbono.",
    linkedin: "linkedin.com/company/agroverde", phone: "+55 62 3200-0001", email: "contato@agroverde.com.br"
  },
  {
    id: "cmp_2", kind: "company", name: "BankCo", segment: "Banco", tier: "Prata",
    subtitle: "Banco", tags: ["Banco", "ESG"], website: "bankco.com",
    bio: "Patrocinadora Prata. Banco com linha de crédito verde e produtos de investimento ESG.",
    linkedin: "linkedin.com/company/bankco", phone: "+55 11 3000-0002", email: "contato@bankco.com"
  },
  {
    id: "cmp_3", kind: "company", name: "Fintech Verde", segment: "Fintech", tier: "Bronze",
    subtitle: "Fintech", tags: ["Fintech", "Varejo"], website: "fintechverde.com.br",
    bio: "Patrocinadora Bronze. Plataforma de microinvestimentos em ativos sustentáveis.",
    linkedin: "linkedin.com/company/fintech-verde", phone: "+55 62 3200-0003", email: "contato@fintechverde.com.br"
  },
  {
    id: "cmp_4", kind: "company", name: "FundCo", segment: "Gestora de recursos", tier: "Ouro",
    subtitle: "Gestora de recursos", tags: ["Investimentos", "ESG"], website: "fundco.com",
    bio: "Patrocinadora Ouro. Gestora com mais de R$ 5 bi sob gestão em estratégias ESG.",
    linkedin: "linkedin.com/company/fundco", phone: "+55 11 3000-0004", email: "contato@fundco.com"
  }
];

export const getConnection = (id: string) => CONNECTIONS.find((c) => c.id === id);

/**
 * Cota de patrocínio (Ouro/Prata/Bronze) de uma conexão:
 * - empresa: sua própria cota;
 * - pessoa: a cota da empresa em que ela trabalha (se for patrocinadora).
 */
export function sponsorTier(c: Connection): SponsorTier | undefined {
  if (c.kind === "company") return c.tier;
  return CONNECTIONS.find((x) => x.kind === "company" && x.name === c.company)?.tier;
}

/** Cota de patrocínio de uma empresa pelo nome (usada nos cards de programação). */
export function companyTier(name?: string): SponsorTier | undefined {
  if (!name) return undefined;
  return CONNECTIONS.find((x) => x.kind === "company" && x.name === name)?.tier;
}

export const TIER_TONE = { Ouro: "warning", Prata: "info", Bronze: "neutral" } as const;

/**
 * Selo de identidade de uma conexão, visível a todos os participantes:
 * - empresa patrocinadora  → Patrocinador
 * - curador pessoa física  → Curador
 * - quem palestra em alguma sessão → Palestrante
 * Demais participantes circulam sem selo.
 */
export function sealForConnection(c: Connection): SealKind | undefined {
  if (c.kind === "company") return "Patrocinador";
  const curator = CURATORS.find((x) => x.name === c.name);
  if (curator) return sponsorKindOf(curator.personType);
  if (SESSIONS.some((s) => s.speaker === c.name)) return "Palestrante";
  return undefined;
}

/** Empresa em que uma pessoa atua (para creditar os envolvidos numa sessão). */
export function personCompany(name?: string): string | undefined {
  if (!name) return undefined;
  const c = CONNECTIONS.find((x) => x.kind === "person" && x.name === name)?.company;
  // "Independente" não é uma empresa a ser creditada.
  return c && c !== "Independente" ? c : undefined;
}
