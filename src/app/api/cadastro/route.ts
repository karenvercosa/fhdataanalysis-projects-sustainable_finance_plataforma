import { NextResponse } from "next/server";
import { auth, criarLinkDeTrocaDeSenha } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  EMAIL_REGEX,
  lerDadosCorporativos,
  texto,
  validarDadosCorporativos,
} from "@/lib/cadastro";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { resgatarVoucher, voucherUtilizavel } from "@/lib/voucher.server";
import { sendAcessoPlataformaEmail } from "@/services/email.service";
import { type DadosCadastro } from "@/types";

// O Prisma e o nodemailer não rodam no Edge.
export const runtime = "nodejs";

function lerDados(body: any): DadosCadastro {
  return {
    ...lerDadosCorporativos(body),
    firstName: texto(body?.firstName),
    lastName: texto(body?.lastName),
    email: texto(body?.email).toLowerCase(),
  };
}

/**
 * Mesma validação do formulário, refeita no servidor. O voucher é o único
 * campo opcional — os demais são obrigatórios.
 */
function validar(dados: DadosCadastro): string | null {
  if (!EMAIL_REGEX.test(dados.email)) return "Informe um e-mail válido, contendo @.";
  if (!dados.firstName || !dados.lastName) return "Preencha todos os campos obrigatórios.";
  return validarDadosCorporativos(dados);
}

/**
 * Cria a conta no Better Auth (o hash da senha vai para a tabela `account`) e
 * devolve o id do usuário. Retorna `null` quando o e-mail já está cadastrado.
 */
async function criarConta(nome: string, email: string, senha: string): Promise<string | null> {
  try {
    const cadastro = await auth.api.signUpEmail({
      body: { email, password: senha, name: nome },
    });
    return cadastro.user.id;
  } catch (error: any) {
    const msg = error?.message || "";
    if (/exist|já.*cadastr|already/i.test(msg)) return null;
    throw error;
  }
}

/**
 * Completa o cadastro com os dados do formulário e espelha em `usuario` o hash
 * de senha gerado pelo Better Auth.
 *
 * O mesmo hash vai para duas colunas: `senha_hash`, que é a senha em vigor, e
 * `senha_provisoria_hash`, que marca a conta como "primeiro acesso pendente".
 * Enquanto a segunda estiver preenchida, a plataforma só libera a troca de
 * senha; quando a pessoa define a definitiva, ela é apagada e só `senha_hash`
 * permanece. Só o hash é persistido — a senha em texto puro existe apenas o
 * tempo de montar o e-mail.
 *
 * O perfil não é concedido aqui: toda conta nova nasce `gratuito` pelo gancho
 * `databaseHooks.user.create` em `src/lib/auth.ts`, que cobre também o
 * cadastro pelo Google.
 */
async function completarCadastro(usuarioId: string, dados: DadosCadastro) {
  const credencial = await prisma.account.findFirst({
    where: { userId: usuarioId, providerId: "credential" },
    select: { password: true },
  });

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      telefone: dados.phone,
      empresaNome: dados.empresa,
      cargo: dados.cargo,
      voucher: dados.voucher || null,
      senhaHash: credencial?.password ?? undefined,
      senhaProvisoriaHash: credencial?.password ?? undefined,
    },
  });
}

export async function POST(req: Request) {
  try {
    const dados = lerDados(await req.json());

    const erro = validar(dados);
    if (erro) {
      return NextResponse.json({ error: erro }, { status: 400 });
    }

    const nome = `${dados.firstName} ${dados.lastName}`.trim();

    // O voucher é conferido ANTES de criar a conta: um código errado tem que
    // parar o cadastro com o formulário ainda editável, e não depois de a
    // conta existir — aí a segunda tentativa esbarraria em "e-mail já
    // cadastrado" e a pessoa ficaria sem saída.
    if (dados.voucher && !(await voucherUtilizavel(dados.voucher))) {
      return NextResponse.json(
        { error: "Voucher inválido, inativo ou esgotado. Confira o código com quem o enviou." },
        { status: 400 },
      );
    }

    // A senha não é escolhida pela pessoa: geramos uma provisória e a
    // enviamos por e-mail para o primeiro acesso à plataforma.
    const senha = gerarSenhaProvisoria();

    const usuarioId = await criarConta(nome, dados.email, senha);
    if (!usuarioId) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado." },
        { status: 409 },
      );
    }

    await completarCadastro(usuarioId, dados);

    // Resgate de verdade — vem DEPOIS de `completarCadastro` porque a empresa
    // dona do voucher tem a palavra final sobre a que foi digitada no
    // formulário. Pode falhar mesmo tendo passado na conferência acima, se o
    // último uso tiver sido consumido nesse intervalo; nesse caso a conta
    // continua criada e a resposta avisa que o convite não pegou.
    const resgate = dados.voucher ? await resgatarVoucher(usuarioId, dados.voucher) : null;

    const envio = await sendAcessoPlataformaEmail({
      nome,
      email: dados.email,
      senha,
      // Caminho curto do cadastro à plataforma: o botão do e-mail abre a tela
      // de nova senha e, ao salvar, a pessoa já entra.
      linkCriarSenha: await criarLinkDeTrocaDeSenha(usuarioId),
    });

    // A conta já existe mesmo se o SMTP falhar — repetir o cadastro só daria
    // "e-mail já cadastrado". Por isso devolvemos sucesso sinalizando que a
    // senha não chegou, para a tela orientar a pessoa a falar com o suporte.
    return NextResponse.json({
      success: true,
      emailEnviado: envio.success,
      empresaDoVoucher: resgate?.empresaNome,
      voucherAplicado: dados.voucher ? Boolean(resgate) : undefined,
      // Voucher de curador/patrocinador: o vínculo com a empresa só existe
      // depois que o dono do convite liberar.
      voucherPendente: resgate?.status === "pendente",
    });
  } catch (error: any) {
    console.error("[api/cadastro]", error);
    return NextResponse.json(
      { error: error?.message || "Não foi possível concluir o cadastro." },
      { status: 500 },
    );
  }
}
