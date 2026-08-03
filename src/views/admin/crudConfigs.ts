import { Megaphone } from "lucide-react";
import { type CrudConfig, type CrudRow } from "./AdminCrud";
import { SPONSOR_ADS, SPONSOR_ADS_KEY } from "@/data/sponsorAds";

const AD_TIER_TONES = { Ouro: "warning", Prata: "info" } as const;

/**
 * Registry de CRUDs do admin, indexado pelo slug da rota (/admin/:module).
 *
 * Este motor genérico guarda tudo em `localStorage` — serve para os módulos
 * que ainda são protótipo. Usuários e Vouchers saíram daqui: gravam no
 * Postgres e têm telas próprias (`UsersAdmin`, `VouchersAdmin`).
 */
export const CRUD_CONFIGS: Record<string, CrudConfig> = {
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
