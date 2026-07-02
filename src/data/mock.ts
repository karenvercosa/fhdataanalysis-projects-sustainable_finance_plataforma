// Dados mock do protótipo. Em produção vêm da API.

export interface SessionMaterial {
  title: string;
  format: string; // PDF, Slides, Vídeo…
}

export interface Session {
  id: string;
  title: string;
  track: "ESG" | "Investimentos" | "Inovação";
  room: string;
  start: string; // HH:mm
  end: string;
  speaker: string;
  favorite: boolean;
  capacity: number; // vagas totais da sessão
  description?: string; // "sobre" a pauta
  moderator?: string; // mediador
  materials?: SessionMaterial[]; // materiais disponíveis
}

export const SESSIONS: Session[] = [
  { id: "s1", title: "Abertura: O futuro das finanças sustentáveis", track: "ESG", room: "Palco Principal", start: "09:00", end: "09:45", speaker: "Helena Vasquez", favorite: true, capacity: 300,
    description: "Painel de abertura sobre os rumos das finanças sustentáveis no Brasil e no mundo, com uma visão dos próximos 5 anos.", moderator: "Marina Costa",
    materials: [{ title: "Slides de abertura", format: "PDF" }, { title: "Relatório-base ESG", format: "PDF" }] },
  { id: "s2", title: "Crédito de carbono na prática", track: "Investimentos", room: "Sala B", start: "10:00", end: "10:45", speaker: "Rafael Lima", favorite: true, capacity: 80,
    description: "Como estruturar, precificar e negociar créditos de carbono em projetos reais na América Latina.", moderator: "Patrícia Gomes",
    materials: [{ title: "Guia de crédito de carbono", format: "PDF" }] },
  { id: "s3", title: "Fintechs verdes e o novo investidor", track: "Inovação", room: "Sala C", start: "10:00", end: "10:45", speaker: "Marina Costa", favorite: false, capacity: 60,
    description: "O papel das fintechs na democratização do investimento sustentável para o varejo.", moderator: "Diego Rocha",
    materials: [{ title: "Deck Fintech Verde", format: "Slides" }] },
  { id: "s4", title: "Painel: Regulação e taxonomia ESG", track: "ESG", room: "Palco Principal", start: "11:00", end: "12:00", speaker: "Diversos", favorite: true, capacity: 300,
    description: "Debate sobre o avanço regulatório e a construção de uma taxonomia ESG comum no mercado brasileiro.", moderator: "Helena Vasquez",
    materials: [{ title: "Sumário regulatório", format: "PDF" }, { title: "Gravação do painel", format: "Vídeo" }] },
  { id: "s5", title: "Workshop: Mensuração de impacto", track: "Inovação", room: "Sala A", start: "11:00", end: "12:00", speaker: "Lucas Prado", favorite: false, capacity: 50,
    description: "Workshop prático sobre métricas e frameworks para mensurar impacto socioambiental.", moderator: "André Sato",
    materials: [{ title: "Template de mensuração", format: "Planilha" }] },
  { id: "s6", title: "Tendências de investimento ESG 2026", track: "Investimentos", room: "Sala B", start: "14:00", end: "14:45", speaker: "Patrícia Gomes", favorite: false, capacity: 80,
    description: "Panorama das principais tendências de alocação em ativos sustentáveis para 2026.", moderator: "Rafael Lima",
    materials: [{ title: "Relatório de tendências", format: "PDF" }] },
  { id: "s7", title: "Green bonds: oportunidades no Brasil", track: "Investimentos", room: "Palco Principal", start: "15:00", end: "15:45", speaker: "André Sato", favorite: false, capacity: 300,
    description: "Como emitir e investir em títulos verdes no mercado brasileiro, com casos práticos.", moderator: "Marina Costa",
    materials: [{ title: "Cartilha de green bonds", format: "PDF" }] },
  { id: "s8", title: "Encerramento e networking", track: "ESG", room: "Palco Principal", start: "16:00", end: "17:00", speaker: "Comissão", favorite: false, capacity: 300,
    description: "Encerramento oficial do evento seguido de espaço aberto de networking entre participantes e empresas.", moderator: "Helena Vasquez",
    materials: [] }
];

/** Converte "HH:mm" em minutos para checar sobreposição de horários. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** True se duas sessões se sobrepõem no tempo (alerta de conflito da agenda). */
export function sessionsOverlap(a: Session, b: Session): boolean {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

export const TRACK_TONE = {
  ESG: "success",
  Investimentos: "info",
  Inovação: "primary"
} as const;

export interface Lead {
  id: string;
  name: string;
  role: string;
  company: string;
  redeemedAt: string;
  consent: boolean; // LGPD: só aparece contato se houver consentimento
}

export const CURATOR_LEADS: Lead[] = [
  { id: "l1", name: "Bruno Andrade", role: "CFO", company: "AgroVerde", redeemedAt: "12/08", consent: true },
  { id: "l2", name: "Carla Mendes", role: "Analista ESG", company: "BankCo", redeemedAt: "13/08", consent: true },
  { id: "l3", name: "Diego Rocha", role: "Investidor", company: "—", redeemedAt: "14/08", consent: false }
];

export type CheckinStatus = "Confirmado" | "Credenciado";

export interface Attendee {
  id: string;
  name: string;
  email: string;
  cpf: string;
  code: string;
  company: string;
  status: CheckinStatus;
}

export const ATTENDEES: Attendee[] = [
  { id: "a1", name: "Marina Costa", email: "marina@empresa.com.br", cpf: "123.456.789-09", code: "SF26-7F3A-91KD", company: "Fintech Verde", status: "Confirmado" },
  { id: "a2", name: "Bruno Andrade", email: "bruno@agroverde.com", cpf: "987.654.321-00", code: "SF26-2K9P-44LM", company: "AgroVerde", status: "Confirmado" },
  { id: "a3", name: "Carla Mendes", email: "carla@bankco.com", cpf: "456.789.123-11", code: "SF26-8H1Q-77AB", company: "BankCo", status: "Credenciado" },
  { id: "a4", name: "Diego Rocha", email: "diego@solo.com", cpf: "321.654.987-22", code: "SF26-5T3R-12CD", company: "Investidor", status: "Confirmado" },
  { id: "a5", name: "Helena Vasquez", email: "helena@fundco.com", cpf: "654.321.789-33", code: "SF26-9W2E-88EF", company: "FundCo", status: "Credenciado" }
];

export interface Content {
  id: string;
  title: string;
  type: "E-book" | "Vídeo" | "Podcast";
  premium: boolean;
  phase: "Pré-evento" | "Pós-evento";
}

export const CONTENTS: Content[] = [
  { id: "c1", title: "Guia: Introdução a ESG", type: "E-book", premium: false, phase: "Pré-evento" },
  { id: "c2", title: "Webinar: Tendências 2026", type: "Vídeo", premium: false, phase: "Pré-evento" },
  { id: "c3", title: "Relatório completo de mercado", type: "E-book", premium: true, phase: "Pré-evento" },
  { id: "c4", title: "Masterclass: Carteiras verdes", type: "Vídeo", premium: true, phase: "Pós-evento" },
  { id: "c5", title: "Podcast: Bastidores dos painéis", type: "Podcast", premium: true, phase: "Pós-evento" }
];
