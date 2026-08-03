
export const TipoVoucher = {
  gratuito: "gratuito",
  descontoPercentual: "desconto_percentual",
  descontoValor: "desconto_valor",
} as const;

export type TipoVoucher = (typeof TipoVoucher)[keyof typeof TipoVoucher];

/** Rótulos exibidos no CRUD do Admin. */
export const TIPO_VOUCHER_LABEL: Record<TipoVoucher, string> = {
  gratuito: "Gratuito (100%)",
  desconto_percentual: "Desconto %",
  desconto_valor: "Desconto R$",
};

/** Voucher como trafega entre a API e as telas (`Decimal` já virou número). */
export interface VoucherAdmin {
  id: string;
  codigo: string;
  tipo: TipoVoucher;
  /** Percentual (0–100) ou reais. `null` quando o tipo é `gratuito`. */
  valor: number | null;
  usosMaximos: number;
  usosFeitos: number;
  empresaNome: string;
  empresaCnpj: string | null;
  ativo: boolean;
}

/** Usuário como o CRUD do Admin enxerga. */
export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  role: import("./rbac").Role;
  /** Selo/cota exibido pelo Admin. `null` = sem selo. */
  selo: string | null;
  ativo: boolean;
  empresaNome: string | null;
  /** Código do voucher resgatado no cadastro, quando houve. */
  voucher: string | null;
}
