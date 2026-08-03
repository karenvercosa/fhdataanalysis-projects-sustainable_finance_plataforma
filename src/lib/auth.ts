import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";

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
    // Reforço no servidor da regra do formulário (mínimo de 8 caracteres).
    minPasswordLength: 8,
    autoSignIn: true,
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
  advanced: {
    database: {
      // As colunas `id` são `@db.Uuid` com default `gen_random_uuid()` no banco.
      // Desativamos a geração de ID do Better Auth para o Postgres preencher o UUID.
      generateId: false,
    },
  },
});
