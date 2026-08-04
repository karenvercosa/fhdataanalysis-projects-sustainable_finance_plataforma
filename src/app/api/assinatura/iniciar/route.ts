import { isValidPhoneNumber } from "libphonenumber-js";
import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { texto } from "@/lib/cadastro";
import { exigirCapacidade } from "@/lib/rbac.server";
import { telefoneNacional } from "@/lib/telefone";
import {
  createCustomer,
  createPayment,
  createSubscription,
  getBoletoInfo,
  getFirstSubscriptionPayment,
  getPixQrCode,
  type BillingType,
} from "@/services/asaas.service";
import { PRODUTOS, ehProdutoValido, type CobrancaIniciada } from "@/types";

// Prisma e o fetch ao Asaas não rodam no Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BILLING_VALIDOS = new Set<BillingType>(["PIX", "CREDIT_CARD", "BOLETO"]);

/**
 * Abre a cobrança de um dos produtos pagos.
 *
 * Diferença central em relação à landing page: aqui a pessoa SEMPRE tem conta —
 * a rota vive atrás da sessão. Nada de criar usuário nem pedir senha; o que
 * falta é só o que o cadastro não tem (CPF, e o que estiver em branco).
 *
 * A cobrança é recorrente ou avulsa conforme o produto: assinatura anual usa
 * `subscriptions` (cobra de novo no ano que vem), ingresso presencial usa
 * `payments` (uma vez só).
 */
export async function POST(req: Request) {
  return rotaAdmin("api/assinatura/iniciar POST", async () => {
    const sessao = await exigirCapacidade(req.headers);

    const corpo = (await req.json().catch(() => ({}))) as any;
    const billingType: BillingType = corpo?.billingType;
    const produtoId = corpo?.produto;

    if (!ehProdutoValido(produtoId)) {
      throw new ErroDeEntrada("Produto inválido.");
    }
    if (!BILLING_VALIDOS.has(billingType)) {
      throw new ErroDeEntrada("Método de pagamento inválido.");
    }

    const produto = PRODUTOS[produtoId];

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id: sessao.id },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        telefone: true,
        empresaNome: true,
        cargo: true,
        asaasCustomerId: true,
      },
    });

    // O formulário devolve o que a pessoa completou; o que já existia no
    // cadastro vem preenchido de lá e volta igual.
    const telefone = texto(corpo?.phone) || usuario.telefone || "";
    const empresa = texto(corpo?.empresa) || usuario.empresaNome || "";
    const cargo = texto(corpo?.cargo) || usuario.cargo || "";
    const cpfDigitos = texto(corpo?.cpf).replace(/\D/g, "");

    if (!telefone || !isValidPhoneNumber(telefone)) {
      throw new ErroDeEntrada("Informe um celular válido.");
    }
    if (!empresa || !cargo) {
      throw new ErroDeEntrada("Informe a empresa e o seu cargo.");
    }
    // O Asaas exige CPF para emitir a cobrança. Quem já tem cliente criado lá
    // não precisa informar de novo — o documento ficou com eles.
    if (!usuario.asaasCustomerId && cpfDigitos.length !== 11) {
      throw new ErroDeEntrada("Informe um CPF válido.");
    }

    await salvarDadosDoPagamento(usuario.id, { telefone, empresa, cargo, cpfDigitos });

    const customerId = await garantirClienteAsaas(
      {
        id: usuario.id,
        nome: usuario.nomeCompleto || usuario.email,
        email: usuario.email,
        telefone,
        asaasCustomerId: usuario.asaasCustomerId,
      },
      cpfDigitos,
    );

    const hoje = new Date().toISOString().split("T")[0];

    // Assinatura anual gera uma cobrança recorrente; o ingresso é avulso.
    let paymentId: string;
    let subscriptionId: string | null = null;

    if (produto.recorrente) {
      const subscription = await createSubscription({
        customerId,
        billingType,
        value: produto.valor,
        nextDueDate: hoje,
        cycle: "YEARLY",
        description: produto.descricaoAsaas,
      });
      subscriptionId = subscription.id;
      paymentId = (await getFirstSubscriptionPayment(subscription.id)).id;
    } else {
      const payment = await createPayment({
        customerId,
        billingType,
        value: produto.valor,
        dueDate: hoje,
        description: produto.descricaoAsaas,
      });
      paymentId = payment.id;
    }

    await prisma.assinaturaPlataforma.create({
      data: {
        usuarioId: usuario.id,
        asaasSubscriptionId: subscriptionId,
        asaasPaymentId: paymentId,
        billingType,
        internacional: Boolean(corpo?.internacional),
        valor: produto.valor,
        status: "pendente",
      },
    });

    const resposta: CobrancaIniciada = {
      paymentId,
      billingType,
      ...(await detalhesDaCobranca(billingType, paymentId)),
    };

    return resposta;
  });
}

/**
 * Guarda no cadastro o que a pessoa completou na tela de pagamento.
 *
 * O CPF é persistido MASCARADO por privacidade — apenas os 3 primeiros dígitos
 * (`139.***.***-**`). O documento completo existe só o tempo da chamada ao
 * Asaas; nunca é gravado.
 */
async function salvarDadosDoPagamento(
  usuarioId: string,
  dados: { telefone: string; empresa: string; cargo: string; cpfDigitos: string },
) {
  const cpf =
    dados.cpfDigitos.length === 11 ? `${dados.cpfDigitos.slice(0, 3)}.***.***-**` : undefined;

  try {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        telefone: dados.telefone,
        empresaNome: dados.empresa,
        cargo: dados.cargo,
        cpf,
      },
    });
  } catch {
    /* não-fatal: não impede o pagamento */
  }
}

/** Reaproveita o cliente do Asaas; só cria um novo quando ainda não existe. */
async function garantirClienteAsaas(
  conta: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    asaasCustomerId: string | null;
  },
  cpfDigitos: string,
): Promise<string> {
  if (conta.asaasCustomerId) return conta.asaasCustomerId;

  const asaasCustomerId = await createCustomer({
    name: conta.nome,
    email: conta.email,
    cpfCnpj: cpfDigitos || undefined,
    mobilePhone: telefoneNacional(conta.telefone),
  });

  await prisma.usuario.update({ where: { id: conta.id }, data: { asaasCustomerId } });
  return asaasCustomerId;
}

/** Dados extras da cobrança conforme o método escolhido. */
async function detalhesDaCobranca(billingType: BillingType, paymentId: string) {
  if (billingType === "PIX") return { pix: await getPixQrCode(paymentId) };
  if (billingType === "BOLETO") return { boleto: await getBoletoInfo(paymentId) };
  // CREDIT_CARD: o front coleta os dados do cartão na próxima etapa.
  return {};
}
