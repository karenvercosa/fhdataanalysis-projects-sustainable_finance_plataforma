// Diretório de networking: pessoas e empresas participantes do evento.

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

export const TIER_TONE = { Ouro: "warning", Prata: "info", Bronze: "neutral" } as const;
