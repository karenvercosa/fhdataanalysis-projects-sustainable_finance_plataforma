import { randomBytes } from "node:crypto";
import { betterAuth, APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";
import { TAMANHO_MINIMO_SENHA, validarSenha } from "@/lib/politica-senha";
import { sendConfirmacaoTrocaSenhaEmail } from "@/services/email.service";
import { PerfilUsuario } from "@/types";

/**
 * Configuração do Better Auth da PLATAFORMA.
 *
 * Espelha a configuração da landing page (mesmo banco, mesma tabela
 * `Usuario`, mesmo Google OAuth), mudando apenas a URL base: a plataforma é
 * publicada em outro endereço, então a env se chama `BETTER_AUTH_URL_PLATAFORMA`
 * para as duas aplicações conviverem no mesmo servidor / mesmo `.env`.
 *
 * A tabela usa campos em português (`nomeCompleto`, `criadoEm`, ...), então
 * mapeamos os campos padrão do Better Auth (`name`, `image`, `createdAt`, ...)
 * para os nomes reais das colunas. A senha criptografada é gravada na tabela
 * `account`, não em `Usuario`.
 */
const BASE_URL = process.env.BETTER_AUTH_URL_PLATAFORMA || "http://localhost:3000";

/** Validade do link de troca de senha pedido pela pessoa (recuperação). */
const VALIDADE_TOKEN_SENHA_SEG = 60 * 60;

/**
 * Validade do link que vai no e-mail de cadastro.
 *
 * Bem maior que a da recuperação porque o papel dele é outro: não é resposta a
 * um pedido feito no minuto anterior, é um convite que a pessoa pode abrir
 * dias depois. E ele não afrouxa nada — vai no MESMO e-mail que já carrega a
 * senha provisória, que não expira. Se ainda assim vencer, entrar com a senha
 * provisória leva a `/primeiro-acesso`, que reenvia a confirmação.
 */
const VALIDADE_LINK_PRIMEIRO_ACESSO_SEG = 60 * 60 * 24 * 7;

/**
 * A tela que o link do e-mail abre. O Better Auth valida o token antes de
 * redirecionar para cá — e devolve `?error=INVALID_TOKEN` quando ele expirou.
 */
const REDIRECT_TROCA_SENHA = "/trocar-senha";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: BASE_URL,
  // Allowlist de destinos pós-login. Declarada explicitamente para que o
  // servidor recuse qualquer `callbackURL` apontando para fora desta origem —
  // a defesa server-side do open redirect, que não depende do que o navegador
  // enviou. Caminhos relativos internos continuam válidos.
  trustedOrigins: [BASE_URL],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Mapeamento da tabela existente `Usuario` (campos em português) para os
  // nomes padrão que o Better Auth espera. A senha criptografada vai para
  // a tabela `account`, não para `Usuario`.
  user: {
    modelName: "Usuario",
    fields: {
      name: "nomeCompleto",
      email: "email",
      image: "avatarUrl",
      emailVerified: "emailVerified",
      createdAt: "criadoEm",
      updatedAt: "atualizadoEm",
    },
  },
  emailAndPassword: {
    enabled: true,
    // Reforço no servidor da regra do formulário (mínimo de 8 caracteres). A
    // exigência de maiúscula, minúscula, número e especial é aplicada no
    // gancho `hooks.before` mais abaixo, que o Better Auth não cobre sozinho.
    minPasswordLength: TAMANHO_MINIMO_SENHA,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: VALIDADE_TOKEN_SENHA_SEG,
    // Trocar a senha derruba as sessões antigas: quem estava logado com a
    // senha provisória (ou com a senha vazada que motivou o "esqueci") precisa
    // entrar de novo com a senha nova.
    revokeSessionsOnPasswordReset: true,

    /**
     * E-mail de confirmação que libera a tela de troca de senha.
     *
     * É o portão do fluxo inteiro: a rota `/trocar-senha` só abre com o token
     * que sai daqui, tanto no primeiro acesso quanto no "esqueci a senha". O
     * texto muda conforme o caso, e quem sabe qual é o caso é o banco — se
     * `senha_provisoria_hash` ainda está preenchido, a pessoa nunca escolheu
     * uma senha.
     */
    sendResetPassword: async ({ user, url }) => {
      const registro = await prisma.usuario.findUnique({
        where: { id: user.id },
        select: { nomeCompleto: true, senhaProvisoriaHash: true },
      });

      await sendConfirmacaoTrocaSenhaEmail({
        email: user.email,
        nome: registro?.nomeCompleto || user.name || user.email,
        motivo: registro?.senhaProvisoriaHash ? "primeiro-acesso" : "esqueci-senha",
        url,
        validadeMinutos: Math.round(VALIDADE_TOKEN_SENHA_SEG / 60),
      });
    },

    /**
     * Senha definitiva criada: o hash novo passa a ser o principal e a senha
     * provisória some do banco.
     *
     * O Better Auth já gravou o hash em `account.password`; aqui espelhamos em
     * `usuario.senha_hash` (a coluna que a plataforma lê) e limpamos
     * `usuario.senha_provisoria_hash` — é o apagamento que encerra o estado de
     * "primeiro acesso pendente" e destrava as demais telas.
     *
     * Chegar até aqui exige ter clicado no botão de um e-mail entregue naquele
     * endereço, o que é prova de posse: por isso a conta também sai daqui com
     * o e-mail marcado como verificado.
     */
    onPasswordReset: async ({ user }) => {
      const credencial = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
        select: { password: true },
      });

      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          senhaHash: credencial?.password ?? undefined,
          senhaProvisoriaHash: null,
          emailVerified: true,
        },
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  account: {
    // Quando o e-mail do Google já existe na tabela `usuario` (cadastro feito
    // antes pelo formulário, aqui ou na landing page), o Better Auth recusa o
    // login com `account_not_linked` em vez de ligar as duas contas.
    accountLinking: {
      enabled: true,
      // O Google só devolve e-mails que ele mesmo verificou, então é seguro
      // usá-lo como prova de posse do endereço.
      trustedProviders: ["google"],
      // O padrão exige que o cadastro local já esteja com `emailVerified`.
      // Não temos fluxo de verificação por e-mail: quem se cadastra pelo
      // formulário nasce com `email_verified = false`, então essa exigência
      // bloquearia o login social de qualquer pessoa vinda do site.
      requireLocalEmailVerified: false,
    },
  },
  /**
   * Duas conferências que o Better Auth não faz sozinho, antes do endpoint —
   * portanto válidas para qualquer cliente, inclusive um `curl` que ignore a
   * validação do formulário.
   *
   *  1. POLÍTICA DE SENHA — o Better Auth só sabe conferir comprimento;
   *     maiúscula, minúscula, número e caractere especial ficam por nossa
   *     conta.
   *  2. DONO DO TOKEN — um token de troca de senha cujo usuário foi apagado ou
   *     desativado faria o endpoint tentar criar a credencial de alguém que
   *     não existe, estourando a chave estrangeira `account_userId_fkey` e
   *     devolvendo 500. Aqui vira `INVALID_TOKEN`, que a tela entende e
   *     transforma numa volta para o login com a mensagem de erro.
   */
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/reset-password" && ctx.path !== "/change-password") return;

      const senha = ctx.body?.newPassword;
      if (typeof senha === "string") {
        const erro = validarSenha(senha);
        if (erro) throw new APIError("BAD_REQUEST", { message: erro });
      }

      if (ctx.path !== "/reset-password") return;

      const token = ctx.body?.token ?? ctx.query?.token;
      if (typeof token !== "string") return;

      if (!(await usuarioDoTokenDeTrocaDeSenha(token))) {
        throw new APIError("BAD_REQUEST", {
          code: "INVALID_TOKEN",
          message: "O link de troca de senha expirou ou já foi usado.",
        });
      }
    }),
  },
  /**
   * Sessão por cookie — é o que sustenta o "Lembrar de mim" da tela de login.
   *
   * Com `rememberMe: true` o cookie é persistente e vale `expiresIn`; com
   * `rememberMe: false` o Better Auth grava um cookie de sessão do navegador,
   * que morre ao fechá-lo. Nos dois casos, expirado o cookie não há sessão: o
   * middleware devolve a pessoa para o login.
   *
   * `updateAge` renova a validade no máximo uma vez por dia — sem isso, cada
   * navegação reescreveria o cookie e a sessão nunca expiraria de fato.
   */
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // 1 dia
  },
  databaseHooks: {
    user: {
      create: {
        /**
         * Toda conta nova nasce no Plano Gratuito.
         *
         * O gancho fica aqui, e não nas rotas de cadastro, porque o usuário
         * também pode ser criado pelo login social — que não passa por
         * `/api/cadastro`. Sendo o único ponto por onde toda criação passa, é
         * o único lugar onde a regra não tem como ser esquecida.
         *
         * `usuario_perfil` é a tabela que o RBAC server-side lê: sem uma linha
         * aqui o papel efetivo já seria `guest`, mas o registro explícito é o
         * que permite ao Admin ver e trocar o plano da pessoa.
         */
        after: async (user) => {
          await prisma.usuarioPerfil.upsert({
            where: {
              usuarioId_perfil: { usuarioId: user.id, perfil: PerfilUsuario.gratuito },
            },
            create: { usuarioId: user.id, perfil: PerfilUsuario.gratuito },
            update: {},
          });
        },
      },
    },
  },
  advanced: {
    database: {
      // As colunas `id` são `@db.Uuid` com default `gen_random_uuid()` no banco.
      // Desativamos a geração de ID do Better Auth para o Postgres preencher o UUID.
      generateId: false,
    },
  },
});

/**
 * Dispara o e-mail de confirmação que libera a troca de senha.
 *
 * Encapsula `requestPasswordReset` para que o `redirectTo` — a tela que o link
 * do e-mail abre — seja o mesmo nos dois fluxos (primeiro acesso e "esqueci a
 * senha") e não precise ser repetido em cada rota.
 *
 * Nunca lança por e-mail inexistente: o próprio Better Auth responde igual
 * para endereço cadastrado e não cadastrado, para não revelar quem tem conta.
 */
export async function pedirTrocaDeSenha(email: string) {
  await auth.api.requestPasswordReset({
    body: { email: email.trim().toLowerCase(), redirectTo: REDIRECT_TROCA_SENHA },
  });
}

/** As colunas `id` são `@db.Uuid`: consultar com outro formato faz o Prisma lançar. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Dono do token de troca de senha, ou `null` quando o token não serve.
 *
 * Não basta o token existir e estar no prazo: ele guarda um id de usuário, e
 * esse usuário pode ter sido apagado ou desativado depois que o e-mail saiu.
 * Sem esta conferência o `POST /reset-password` do Better Auth tentaria criar
 * a credencial de um usuário inexistente e estouraria a chave estrangeira
 * `account_userId_fkey` — um 500 no lugar de um "link inválido" honesto.
 */
export async function usuarioDoTokenDeTrocaDeSenha(token: string) {
  if (!token) return null;

  const verificacao = await prisma.verification.findFirst({
    where: {
      identifier: `reset-password:${token}`,
      expiresAt: { gt: new Date() },
    },
    select: { value: true },
  });

  if (!verificacao || !UUID.test(verificacao.value)) return null;

  return prisma.usuario.findFirst({
    where: { id: verificacao.value, ativo: true },
    select: { id: true, email: true },
  });
}

/**
 * O token do e-mail ainda vale?
 *
 * Usado pelo Server Component para decidir se entrega a tela `/trocar-senha`.
 * Quem de fato consome o token é o `POST /reset-password` do Better Auth, no
 * envio do formulário.
 */
export async function tokenDeTrocaDeSenhaValido(token: string): Promise<boolean> {
  return Boolean(await usuarioDoTokenDeTrocaDeSenha(token));
}

/**
 * Link "criar minha senha" que vai junto com a senha provisória, no e-mail do
 * cadastro.
 *
 * O `requestPasswordReset` do Better Auth não serve aqui porque ele dispara o
 * próprio e-mail — teríamos duas mensagens para a mesma pessoa, no mesmo
 * instante. Então gravamos a verificação no formato que ele consome
 * (`reset-password:<token>`) e devolvemos a MESMA URL que ele montaria: o
 * botão do e-mail continua passando por `/api/auth/reset-password/:token`, que
 * valida o token e devolve para `/trocar-senha`.
 */
export async function criarLinkDeTrocaDeSenha(usuarioId: string): Promise<string> {
  // 24 caracteres URL-safe, no mesmo tamanho dos tokens do Better Auth.
  const token = randomBytes(18).toString("base64url");

  await prisma.verification.create({
    data: {
      identifier: `reset-password:${token}`,
      value: usuarioId,
      expiresAt: new Date(Date.now() + VALIDADE_LINK_PRIMEIRO_ACESSO_SEG * 1000),
    },
  });

  const callback = encodeURIComponent(REDIRECT_TROCA_SENHA);
  return `${BASE_URL}/api/auth/reset-password/${token}?callbackURL=${callback}`;
}
