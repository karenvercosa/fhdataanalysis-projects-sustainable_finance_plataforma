import { SPEAKERS } from "./catalog";
import { SESSIONS } from "./mock";
import { CONNECTIONS } from "./networking";

// Conteúdo de marca criado pelo Curador — compartilhado entre o perfil do
// curador, a aba de gestão e a Seção de Conteúdos (participantes).
export type BrandFormat = "E-book" | "Podcast" | "Vídeo" | "Artigo";

export interface BrandContent {
  id: string;
  title: string;
  format: BrandFormat;
  // Associações independentes — o curador escolhe painel, palestrante e empresa.
  speaker?: string; // palestrante
  company?: string; // empresa
  panel?: string; // painel
  fileName?: string; // E-book/Artigo: arquivo enviado
  link?: string; // Podcast/Vídeo: link em vez de arquivo
  ownerId?: string; // curador dono
}

// Chave versionada: o modelo de associação mudou (kind/value → 3 campos),
// então incrementamos o sufixo para invalidar dados antigos no navegador.
export const BRAND_KEY = "sf_curator_content_v2";
export const BRAND_FORMATS: BrandFormat[] = ["E-book", "Podcast", "Vídeo", "Artigo"];

// Opções para os seletores do modal de criação.
export const SPEAKER_OPTIONS = SPEAKERS.map((s) => s.name);
export const PANEL_OPTIONS = SESSIONS.map((s) => s.title);
export const BRAND_COMPANIES = CONNECTIONS.filter((c) => c.kind === "company").map((c) => c.name);

export const BRAND_SEED: BrandContent[] = [
  // Conteúdos do curador da sessão (cur_1)
  { id: "bc_1", title: "Relatório ESG AgroVerde 2026", format: "E-book", company: "AgroVerde", fileName: "relatorio-esg-2026.pdf", ownerId: "cur_1" },
  { id: "bc_2", title: "Podcast: Crédito de carbono na prática", format: "Podcast", speaker: "Rafael Lima", panel: "Painel: Regulação e taxonomia ESG", fileName: "ep-carbono.mp3", ownerId: "cur_1" },
  { id: "bc_3", title: "Vídeo: Bastidores do painel ESG", format: "Vídeo", panel: "Painel: Regulação e taxonomia ESG", company: "AgroVerde", fileName: "video-esg.mp4", ownerId: "cur_1" },
  { id: "bc_4", title: "Artigo: Taxonomia verde aplicada", format: "Artigo", company: "FundCo", ownerId: "cur_1" },
  // Conteúdos publicados por OUTROS patrocinadores (visíveis, mas não editáveis)
  { id: "bc_5", title: "E-book: Finanças verdes no varejo", format: "E-book", company: "BankCo", fileName: "financas-verdes.pdf", ownerId: "cur_3" },
  { id: "bc_6", title: "Podcast: Fintechs e o novo investidor", format: "Podcast", speaker: "Marina Costa", fileName: "ep-fintech.mp3", ownerId: "cur_2" }
];
