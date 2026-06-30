import { SESSIONS } from "./mock";
import type { TicketType, Voucher, Curator, Speaker, Content } from "./schema";

// ---------------------------------------------------------------------
//  Tipos de ingresso
// ---------------------------------------------------------------------
export const TICKET_TYPES: TicketType[] = [
  { id: "tt_full", name: "Inteira", price: 480, description: "Acesso completo + downloads" },
  { id: "tt_half", name: "Meia-entrada", price: 240, description: "Estudante / sócio" },
  { id: "tt_corp", name: "Corporativo", price: 600, description: "Empresas e grupos" }
];

// ---------------------------------------------------------------------
//  Vouchers (criados/controlados pelo Admin; donos: empresa ou curador)
// ---------------------------------------------------------------------
export const VOUCHERS: Voucher[] = [
  { id: "vc_1", code: "VERDE2026", kind: "free", value: 0, maxUses: 100, usedCount: 63, ownerType: "curator", ownerId: "cur_1", active: true },
  { id: "vc_2", code: "ESG50", kind: "percent", value: 50, maxUses: 50, usedCount: 12, ownerType: "company", ownerId: "cmp_1", active: true },
  { id: "vc_3", code: "BANK100", kind: "fixed", value: 100, maxUses: 30, usedCount: 5, ownerType: "curator", ownerId: "cur_2", active: true }
];

// ---------------------------------------------------------------------
//  Curadores (PF ou CNPJ)
// ---------------------------------------------------------------------
export const CURATORS: Curator[] = [
  { id: "cur_1", name: "João Patrocínio", personType: "PF", document: "123.456.789-09", email: "joao@verde.com", phone: "(62) 99999-1001", active: true },
  { id: "cur_2", name: "AgroVerde Patrocínios", personType: "CNPJ", document: "12.345.678/0001-90", email: "contato@agroverde.com", phone: "(62) 99999-1002", active: true },
  { id: "cur_3", name: "BankCo ESG", personType: "CNPJ", document: "98.765.432/0001-10", email: "esg@bankco.com", phone: "(62) 99999-1003", active: false }
];

// ---------------------------------------------------------------------
//  Palestrantes
// ---------------------------------------------------------------------
export const SPEAKERS: Speaker[] = [
  { id: "spk_1", name: "Helena Vasquez", jobTitle: "Head de ESG", company: "FundCo", track: "ESG" },
  { id: "spk_2", name: "Rafael Lima", jobTitle: "Gestor", company: "CarbonX", track: "Investimentos" },
  { id: "spk_3", name: "Marina Costa", jobTitle: "CEO", company: "Fintech Verde", track: "Inovação" }
];

// ---------------------------------------------------------------------
//  Conteúdos — cada material cruza Sessão × Palestrante × Curador
// ---------------------------------------------------------------------
export const CONTENTS: Content[] = [
  { id: "ct_1", title: "Guia: Introdução a ESG", format: "E-book", premium: false, phase: "Pré-evento", sessionIds: ["s1"], speakerIds: ["spk_1"], curatorIds: ["cur_2"] },
  { id: "ct_2", title: "Webinar: Tendências 2026", format: "Vídeo", premium: false, phase: "Pré-evento", sessionIds: ["s3"], speakerIds: ["spk_3"], curatorIds: ["cur_1"] },
  { id: "ct_3", title: "Relatório completo de mercado ESG", format: "Relatório", premium: true, phase: "Pré-evento", sessionIds: ["s4"], speakerIds: ["spk_1", "spk_2"], curatorIds: ["cur_2"] },
  { id: "ct_4", title: "Masterclass: Carteiras verdes", format: "Vídeo", premium: true, phase: "Pós-evento", sessionIds: ["s2"], speakerIds: ["spk_2"], curatorIds: ["cur_3"] },
  { id: "ct_5", title: "Podcast: Bastidores dos painéis", format: "Podcast", premium: true, phase: "Pós-evento", sessionIds: ["s4"], speakerIds: ["spk_3"], curatorIds: ["cur_1"] },
  { id: "ct_6", title: "PDF: Taxonomia verde aplicada", format: "PDF", premium: true, phase: "Pós-evento", sessionIds: ["s4"], speakerIds: ["spk_1"], curatorIds: ["cur_2"] }
];

// ---------------------------------------------------------------------
//  Helpers de resolução das relações
// ---------------------------------------------------------------------
export const getSpeaker = (id: string) => SPEAKERS.find((s) => s.id === id);
export const getCurator = (id: string) => CURATORS.find((c) => c.id === id);
export const getSessionTitle = (id: string) => SESSIONS.find((s) => s.id === id)?.title ?? id;
export const getTicketType = (id: string) => TICKET_TYPES.find((t) => t.id === id);
export const getVoucherByCode = (code: string) =>
  VOUCHERS.find((v) => v.code.toLowerCase() === code.trim().toLowerCase() && v.active);

/** Calcula o valor final aplicando um voucher sobre o preço base. */
export function applyVoucher(price: number, v?: Voucher): { total: number; discount: number } {
  if (!v) return { total: price, discount: 0 };
  if (v.kind === "free") return { total: 0, discount: price };
  if (v.kind === "percent") {
    const discount = Math.round((price * v.value) / 100);
    return { total: price - discount, discount };
  }
  const discount = Math.min(price, v.value); // fixed
  return { total: price - discount, discount };
}
