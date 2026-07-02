import { Percent } from "lucide-react";
import { type CrudConfig } from "./AdminCrud";

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
  }
};
