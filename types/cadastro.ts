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
}
