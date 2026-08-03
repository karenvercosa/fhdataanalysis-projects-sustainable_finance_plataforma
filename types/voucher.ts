
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
  /** Curador/patrocinador responsável. `null` = voucher institucional. */
  curadorId: string | null;
  ativo: boolean;
}

/** Situação de um resgate — espelha o enum `status_resgate_voucher`. */
export const StatusResgateVoucher = {
  pendente: "pendente",
  aprovado: "aprovado",
  negado: "negado",
} as const;

export type StatusResgateVoucher =
  (typeof StatusResgateVoucher)[keyof typeof StatusResgateVoucher];

/** Um resgate como o painel do curador o enxerga. */
export interface ResgateCurador {
  id: string;
  status: StatusResgateVoucher;
  criadoEm: string;
  /** Código do voucher que a pessoa usou. */
  voucherCodigo: string;
  pessoaNome: string;
  pessoaEmail: string;
  pessoaEmpresa: string | null;
  pessoaCargo: string | null;
}

/** Payload do painel do curador: os vouchers dele e os resgates recebidos. */
export interface PainelCurador {
  vouchers: VoucherAdmin[];
  resgates: ResgateCurador[];
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
