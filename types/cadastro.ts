/** Tipos do fluxo de cadastro (formulário, API e etapa pós-Google). */

/** Vínculo corporativo pedido em qualquer cadastro. */
export interface DadosCorporativos {
  phone: string;
  empresa: string;
  cargo: string;
  voucher: string;
}

/** Corpo completo aceito por `POST /api/cadastro`. */
export interface DadosCadastro extends DadosCorporativos {
  firstName: string;
  lastName: string;
  email: string;
}

/** Resposta das rotas de cadastro. */
export interface RespostaCadastro {
  success?: boolean;
  /** `false` quando a conta foi criada mas o SMTP falhou. */
  emailEnviado?: boolean;
  email?: string;
  error?: string;
  /** Empresa dona do voucher resgatado, quando houve um. */
  empresaDoVoucher?: string;
  /** `false` quando o código informado não pôde ser resgatado. */
  voucherAplicado?: boolean;
  /**
   * Voucher de curador/patrocinador: o resgate ficou aguardando a liberação
   * do dono do convite, então o vínculo com a empresa ainda não vale.
   */
  voucherPendente?: boolean;
}
