import { Percent, Megaphone } from "lucide-react";
import { type CrudConfig, type CrudRow } from "./AdminCrud";
import { SPONSOR_ADS, SPONSOR_ADS_KEY } from "@/data/sponsorAds";

const KIND_TONES = { Gratuito: "success", "Desconto %": "info", "Desconto R$": "secondary" } as const;
const AD_TIER_TONES = { Ouro: "warning", Prata: "info" } as const;

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

  // Gestão do banner rotativo (divulgações Ouro/Prata da tela inicial).
  divulgacoes: {
    title: "Divulgações (Banner)",
    subtitle: "divulgações no banner rotativo",
    icon: Megaphone,
    storageKey: SPONSOR_ADS_KEY,
    entity: "Divulgação",
    newLabel: "Nova divulgação",
    searchKeys: ["company", "headline"],
    fields: [
      { key: "company", label: "Empresa", required: true, inTable: true, placeholder: "Ex.: AgroVerde" },
      {
        key: "tier", label: "Cota", type: "select", inTable: true, tones: AD_TIER_TONES, filterable: true, colSpan: 1,
        options: [
          { value: "Ouro", label: "Ouro" },
          { value: "Prata", label: "Prata" }
        ]
      },
      { key: "headline", label: "Título", required: true, inTable: true, placeholder: "Chamada principal da divulgação" },
      { key: "subtext", label: "Subtexto", placeholder: "Descrição curta" },
      {
        key: "image",
        label: "Arquivo da divulgação",
        type: "image",
        inTable: true,
        hint: "Imagem exibida no banner. Ideal na proporção do banner (horizontal)."
      }
    ],
    // Reusa a mesma semente do banner (mesma chave de storage).
    seed: SPONSOR_ADS as unknown as CrudRow[]
  }
};
