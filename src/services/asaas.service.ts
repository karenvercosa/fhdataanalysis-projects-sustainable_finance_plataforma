// Serviço de integração com o gateway Asaas (sandbox ou produção).
//
// Portado da landing page para a plataforma, com uma diferença: aqui existem
// DOIS produtos — a assinatura anual (cobrança recorrente) e o ingresso
// presencial (cobrança avulsa) —, então além de `createSubscription` há
// `createPayment`.
//
// Centraliza as chamadas REST usando o fetch nativo. A API key e a URL base
// vêm das variáveis de ambiente (ASAAS_API_KEY / ASAAS_API_URL).

/**
 * Lê uma variável obrigatória do ambiente e falha com mensagem clara.
 *
 * A leitura é feita SOB DEMANDA (a cada chamada), nunca no import do módulo:
 * o `next build` importa este arquivo para coletar os route handlers, e nesse
 * momento nenhum segredo existe — validar no topo quebraria o build.
 *
 * Sem esta validação, uma variável ausente virava a string "undefined" na URL
 * (`fetch("undefined/customers")`) e o erro chegava ao usuário como um 500
 * genérico, sem indicar que o problema era de configuração.
 */
function envObrigatoria(nome: "ASAAS_API_KEY" | "ASAAS_API_URL"): string {
  const valor = process.env[nome]?.trim();
  if (!valor) {
    throw new Error(
      `Configuração ausente: defina ${nome} no ambiente (K8s Secret / env_file).`,
    );
  }
  return valor;
}

function asaasHeaders() {
  return {
    "Content-Type": "application/json",
    access_token: envObrigatoria("ASAAS_API_KEY"),
  };
}

/**
 * Remove as barras finais da URL base para não gerar `//` ao concatenar com o
 * path. Feito em laço, e não com `/\/+$/`: o quantificador seguido de âncora
 * tem performance super-linear por backtracking (SonarQube typescript:S8786).
 */
function semBarraFinal(url: string): string {
  let fim = url.length;
  while (fim > 0 && url[fim - 1] === "/") fim--;
  return url.slice(0, fim);
}

/**
 * Recusa do gateway — quase sempre um dado que a pessoa digitou.
 *
 * "O CEP informado é inválido", "cartão recusado", "CPF inválido": nada disso é
 * falha do servidor, e devolver 500 fazia a tela parecer quebrada em vez de
 * mostrar o que corrigir. Com um tipo próprio, a casca das rotas responde 400
 * e a mensagem do Asaas chega ao formulário.
 */
export class ErroAsaas extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroAsaas";
  }
}

async function asaasFetch(path: string, init?: RequestInit) {
  const baseUrl = semBarraFinal(envObrigatoria("ASAAS_API_URL"));
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: asaasHeaders(),
    // NUNCA cachear: o Next intercepta o `fetch` e, por padrão, guarda a
    // resposta de um GET no Data Cache. Isso congelava a consulta de status —
    // a primeira leitura devolvia `PENDING`, e todas as seguintes repetiam esse
    // `PENDING` mesmo depois de o Asaas já ter marcado a cobrança como paga.
    // Resultado: o pagamento nunca era reconhecido e a conta não virava Premium.
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || `Erro Asaas (${res.status})`;
    throw new ErroAsaas(msg);
  }
  return data;
}

export type BillingType = "PIX" | "CREDIT_CARD" | "BOLETO";

/** Cria (ou reutiliza) o cliente no Asaas. */
export async function createCustomer(user: {
  name: string;
  email: string;
  cpfCnpj?: string;
  mobilePhone?: string;
}): Promise<string> {
  const data = await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      cpfCnpj: user.cpfCnpj || undefined,
      mobilePhone: user.mobilePhone || undefined,
    }),
  });
  return data.id; // cus_...
}

/**
 * Cria a assinatura recorrente.
 *
 * `cycle` é parametrizado porque a plataforma cobra ANUALMENTE, enquanto a
 * landing page cobra por mês — os dois falam com a mesma conta do Asaas.
 */
export async function createSubscription(params: {
  customerId: string;
  billingType: BillingType;
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle?: "MONTHLY" | "YEARLY";
  description?: string;
}) {
  return asaasFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customerId,
      billingType: params.billingType,
      value: params.value,
      nextDueDate: params.nextDueDate,
      cycle: params.cycle ?? "YEARLY",
      description: params.description,
    }),
  });
}

/**
 * Cria uma cobrança avulsa.
 *
 * É o ingresso presencial: pagamento único, sem recorrência. Assinatura seria
 * errado aqui — cobraria a pessoa de novo no ano seguinte por um evento que já
 * aconteceu.
 */
export async function createPayment(params: {
  customerId: string;
  billingType: BillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
}) {
  return asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customerId,
      billingType: params.billingType,
      value: params.value,
      dueDate: params.dueDate,
      description: params.description,
    }),
  });
}

/** Recupera a primeira cobrança gerada pela assinatura. */
export async function getFirstSubscriptionPayment(subscriptionId: string) {
  const data = await asaasFetch(`/subscriptions/${subscriptionId}/payments`);
  const payment = data?.data?.[0];
  if (!payment) throw new Error("Nenhuma cobrança gerada para a assinatura.");
  return payment;
}

/** QR Code + copia e cola do PIX de uma cobrança. */
export async function getPixQrCode(paymentId: string) {
  const data = await asaasFetch(`/payments/${paymentId}/pixQrCode`);
  return {
    encodedImage: data.encodedImage as string, // PNG base64 (sem prefixo data:)
    payload: data.payload as string, // copia e cola
    expirationDate: data.expirationDate as string | undefined,
  };
}

/** Linha digitável / boleto de uma cobrança. */
export async function getBoletoInfo(paymentId: string) {
  const [payment, idField] = await Promise.all([
    asaasFetch(`/payments/${paymentId}`),
    asaasFetch(`/payments/${paymentId}/identificationField`).catch(() => ({})),
  ]);
  return {
    bankSlipUrl: payment.bankSlipUrl as string | undefined,
    identificationField: (idField as any).identificationField as string | undefined,
    barCode: (idField as any).barCode as string | undefined,
  };
}

export type CartaoInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type TitularInput = {
  name: string;
  email: string;
  cpfCnpj?: string;
  postalCode?: string;
  addressNumber?: string;
  phone?: string;
};

/** Paga uma cobrança com cartão de crédito (nacional ou internacional). */
export async function payWithCreditCard(params: {
  paymentId: string;
  card: CartaoInput;
  titular: TitularInput;
  remoteIp?: string;
}) {
  return asaasFetch(`/payments/${params.paymentId}/payWithCreditCard`, {
    method: "POST",
    body: JSON.stringify({
      creditCard: {
        holderName: params.card.holderName,
        number: params.card.number.replace(/\s+/g, ""),
        expiryMonth: params.card.expiryMonth,
        expiryYear: params.card.expiryYear,
        ccv: params.card.ccv,
      },
      creditCardHolderInfo: {
        name: params.titular.name,
        email: params.titular.email,
        cpfCnpj: params.titular.cpfCnpj || undefined,
        postalCode: params.titular.postalCode || undefined,
        addressNumber: params.titular.addressNumber || undefined,
        phone: params.titular.phone || undefined,
      },
      remoteIp: params.remoteIp || undefined,
    }),
  });
}

/** Consulta o status atual de uma cobrança (para polling do PIX/boleto). */
export async function getPaymentStatus(paymentId: string): Promise<string> {
  const data = await asaasFetch(`/payments/${paymentId}`);
  return data.status as string; // PENDING | RECEIVED | CONFIRMED | OVERDUE ...
}

/** Status que indicam pagamento aprovado. */
export function isPago(status: string) {
  return status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH";
}
