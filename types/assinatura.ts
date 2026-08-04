/**
 * Produtos pagos da plataforma.
 *
 * São dois, com naturezas diferentes de cobrança:
 *
 *  - `online` — assinatura ANUAL recorrente. Dá acesso completo à plataforma.
 *  - `presencial` — ingresso do evento, cobrança ÚNICA. Assinatura seria
 *    errado aqui: cobraria a pessoa de novo no ano seguinte por um evento que
 *    já aconteceu.
 *
 * Os valores vivem aqui, e não numa tabela, porque hoje não existe tela para
 * editá-los — deixá-los no banco criaria uma configuração que ninguém
 * consegue mudar. Quando houver essa tela, o lugar natural é uma tabela de
 * produtos com o mesmo formato.
 */
export const PRODUTOS = {
  online: {
    id: "online",
    /** R$ por ano. */
    valor: 1000,
    recorrente: true,
    descricaoAsaas: "Assinatura anual — Plataforma Sustainable Finance 2026",
  },
  presencial: {
    id: "presencial",
    /** R$ pagos uma única vez. */
    valor: 3000,
    recorrente: false,
    descricaoAsaas: "Ingresso presencial — Sustainable Finance 2026",
  },
} as const;

export type ProdutoId = keyof typeof PRODUTOS;

export const PRODUTO_IDS = Object.keys(PRODUTOS) as ProdutoId[];

export function ehProdutoValido(valor: unknown): valor is ProdutoId {
  return typeof valor === "string" && valor in PRODUTOS;
}

/** Formas de pagamento aceitas pelo Asaas nesta plataforma. */
export type BillingTypeCliente = "PIX" | "CREDIT_CARD" | "BOLETO";

/** O que a tela precisa saber sobre a pessoa antes de montar o formulário. */
export interface DadosParaPagamento {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  cargo: string;
  /**
   * `true` quando ainda não existe cliente no Asaas e o CPF precisa ser
   * pedido. O CPF é guardado mascarado no banco, então nunca dá para
   * recuperá-lo — só o cliente já criado dispensa perguntar de novo.
   */
  precisaCpf: boolean;
  /** Já é Participante Premium: não faz sentido oferecer a assinatura de novo. */
  jaEhPremium: boolean;
}

/** Resposta de `POST /api/assinatura/iniciar`. */
export interface CobrancaIniciada {
  paymentId: string;
  billingType: BillingTypeCliente;
  pix?: { encodedImage: string; payload: string };
  boleto?: { bankSlipUrl?: string; identificationField?: string };
}
