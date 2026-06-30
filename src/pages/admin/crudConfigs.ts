import { Ticket, Mic, Building2, Percent } from "lucide-react";
import { type CrudConfig } from "./AdminCrud";

const STATUS_TONES = { Ativo: "success", Inativo: "neutral" } as const;
const TRACK_TONES = { ESG: "success", Investimentos: "info", Inovação: "primary" } as const;
const TIER_TONES = { Ouro: "warning", Prata: "info", Bronze: "neutral" } as const;
const KIND_TONES = { Gratuito: "success", "Desconto %": "info", "Desconto R$": "secondary" } as const;

// Registry de CRUDs do admin, indexado pelo slug da rota (/admin/:module).
export const CRUD_CONFIGS: Record<string, CrudConfig> = {
  vouchers: {
    title: "Vouchers",
    subtitle: "vouchers cadastrados",
    icon: Percent,
    storageKey: "sf_vouchers",
    entity: "Voucher",
    newLabel: "Novo voucher",
    searchKeys: ["code", "owner"],
    fields: [
      { key: "code", label: "Código", required: true, unique: true, inTable: true, placeholder: "Ex.: VERDE2026" },
      {
        key: "kind", label: "Tipo", type: "select", inTable: true, tones: KIND_TONES, filterable: true, colSpan: 1,
        options: [
          { value: "Gratuito", label: "Gratuito (100%)" },
          { value: "Desconto %", label: "Desconto %" },
          { value: "Desconto R$", label: "Desconto R$" }
        ]
      },
      { key: "value", label: "Valor (% ou R$)", inTable: true, placeholder: "0", colSpan: 1 },
      { key: "maxUses", label: "Usos máximos", required: true, inTable: true, placeholder: "Ex.: 100", colSpan: 1 },
      {
        key: "owner", label: "Dono", type: "select", inTable: true, colSpan: 1,
        options: [
          { value: "João Patrocínio (PF)", label: "João Patrocínio (PF)" },
          { value: "AgroVerde (CNPJ)", label: "AgroVerde (CNPJ)" },
          { value: "BankCo ESG (CNPJ)", label: "BankCo ESG (CNPJ)" }
        ]
      }
    ],
    seed: [
      { id: "vc_1", code: "VERDE2026", kind: "Gratuito", value: "—", maxUses: "100", owner: "João Patrocínio (PF)" },
      { id: "vc_2", code: "ESG50", kind: "Desconto %", value: "50", maxUses: "50", owner: "AgroVerde (CNPJ)" },
      { id: "vc_3", code: "BANK100", kind: "Desconto R$", value: "100", maxUses: "30", owner: "BankCo ESG (CNPJ)" }
    ]
  },

  ingressos: {
    title: "Ingressos & Lotes",
    subtitle: "lotes cadastrados",
    icon: Ticket,
    storageKey: "sf_lots",
    entity: "Lote",
    newLabel: "Novo lote",
    searchKeys: ["name", "category"],
    fields: [
      { key: "name", label: "Nome do lote", required: true, unique: true, inTable: true, placeholder: "Ex.: Lote Ouro" },
      {
        key: "category", label: "Categoria", type: "select", inTable: true, filterable: true, colSpan: 1,
        options: [
          { value: "Convite", label: "Convite" },
          { value: "Cortesia", label: "Cortesia" },
          { value: "Imprensa", label: "Imprensa" },
          { value: "VIP", label: "VIP" }
        ]
      },
      { key: "quota", label: "Vagas", required: true, inTable: true, placeholder: "Ex.: 100", colSpan: 1 },
      {
        key: "status", label: "Status", type: "select", inTable: true, tones: STATUS_TONES,
        options: [{ value: "Ativo", label: "Ativo" }, { value: "Inativo", label: "Inativo" }]
      }
    ],
    seed: [
      { id: "lot_1", name: "Lote Ouro", category: "Convite", quota: "100", status: "Ativo" },
      { id: "lot_2", name: "Cortesia Curadores", category: "Cortesia", quota: "50", status: "Ativo" },
      { id: "lot_3", name: "Imprensa", category: "Imprensa", quota: "20", status: "Inativo" }
    ]
  },

  palestrantes: {
    title: "Palestrantes",
    subtitle: "palestrantes",
    icon: Mic,
    storageKey: "sf_speakers",
    entity: "Palestrante",
    newLabel: "Novo palestrante",
    searchKeys: ["name", "role", "company"],
    fields: [
      { key: "name", label: "Nome completo", required: true, unique: true, inTable: true, placeholder: "Nome do palestrante" },
      { key: "role", label: "Cargo / Tag", inTable: true, placeholder: "Ex.: Head de ESG", colSpan: 1 },
      { key: "company", label: "Empresa", inTable: true, placeholder: "Empresa", colSpan: 1 },
      {
        key: "track", label: "Trilha", type: "select", inTable: true, tones: TRACK_TONES, filterable: true, colSpan: 1,
        options: [
          { value: "ESG", label: "ESG" },
          { value: "Investimentos", label: "Investimentos" },
          { value: "Inovação", label: "Inovação" }
        ]
      },
      {
        key: "status", label: "Status", type: "select", inTable: true, tones: { Confirmado: "success", Pendente: "warning" }, colSpan: 1,
        options: [{ value: "Confirmado", label: "Confirmado" }, { value: "Pendente", label: "Pendente" }]
      }
    ],
    seed: [
      { id: "spk_1", name: "Helena Vasquez", role: "Head de ESG", company: "FundCo", track: "ESG", status: "Confirmado" },
      { id: "spk_2", name: "Rafael Lima", role: "Gestor", company: "CarbonX", track: "Investimentos", status: "Confirmado" },
      { id: "spk_3", name: "Lucas Prado", role: "Pesquisador", company: "USP", track: "Inovação", status: "Pendente" }
    ]
  },

  empresas: {
    title: "Empresas",
    subtitle: "empresas",
    icon: Building2,
    storageKey: "sf_companies",
    entity: "Empresa",
    newLabel: "Nova empresa",
    searchKeys: ["name", "segment"],
    fields: [
      { key: "name", label: "Nome da empresa", required: true, unique: true, inTable: true, placeholder: "Razão social" },
      { key: "segment", label: "Segmento", inTable: true, placeholder: "Ex.: Banco, Agro, Fintech", colSpan: 1 },
      {
        key: "tier", label: "Cota de patrocínio", type: "select", inTable: true, tones: TIER_TONES, filterable: true, colSpan: 1,
        options: [
          { value: "Ouro", label: "Ouro" },
          { value: "Prata", label: "Prata" },
          { value: "Bronze", label: "Bronze" }
        ]
      },
      {
        key: "status", label: "Status", type: "select", inTable: true, tones: STATUS_TONES,
        options: [{ value: "Ativo", label: "Ativo" }, { value: "Inativo", label: "Inativo" }]
      }
    ],
    seed: [
      { id: "cmp_1", name: "AgroVerde", segment: "Agronegócio", tier: "Ouro", status: "Ativo" },
      { id: "cmp_2", name: "BankCo", segment: "Banco", tier: "Prata", status: "Ativo" },
      { id: "cmp_3", name: "Fintech Verde", segment: "Fintech", tier: "Bronze", status: "Ativo" }
    ]
  }
};
