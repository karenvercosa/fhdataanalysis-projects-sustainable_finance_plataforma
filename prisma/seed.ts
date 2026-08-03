import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

/**
 * Seed da PLATAFORMA.
 *
 * A landing page e a plataforma compartilham o mesmo banco, e cada seed cuida
 * do que é seu: o da landing page semeia o conteúdo do site
 * (`landing_page_content`), este aqui garante o usuário administrador — sem
 * ele não há como entrar nas telas de gestão depois de um banco novo.
 *
 * A senha é gravada do mesmo jeito que o Better Auth grava no cadastro: hash
 * scrypt na tabela `account` (provider `credential`), espelhado em
 * `usuario.senha_hash`. Nada de senha em texto puro no banco.
 */
const prisma = new PrismaClient();

// Sobrescreva por env em produção — o padrão existe para o ambiente local
// subir funcionando com `yarn db:seed`.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@sf.com").toLowerCase();
const ADMIN_SENHA = process.env.ADMIN_PASSWORD || "SFSPlataforma2026!";
const ADMIN_NOME = process.env.ADMIN_NAME || "Admin SF";

async function semearAdmin() {
  const senhaHash = await hashPassword(ADMIN_SENHA);

  const usuario = await prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      nomeCompleto: ADMIN_NOME,
      // O admin é criado pela organização, não por um fluxo de confirmação por
      // e-mail: nasce verificado para não travar o login social depois.
      emailVerified: true,
      ativo: true,
      senhaHash,
    },
    update: {
      nomeCompleto: ADMIN_NOME,
      emailVerified: true,
      ativo: true,
      senhaHash,
    },
    select: { id: true },
  });

  // Credencial de e-mail/senha no formato do Better Auth.
  const credencial = await prisma.account.findFirst({
    where: { userId: usuario.id, providerId: "credential" },
    select: { id: true },
  });

  if (credencial) {
    await prisma.account.update({
      where: { id: credencial.id },
      data: { password: senhaHash },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: usuario.id,
        providerId: "credential",
        userId: usuario.id,
        password: senhaHash,
      },
    });
  }

  // É esta linha que o RBAC server-side lê para conceder `manage:platform`.
  await prisma.usuarioPerfil.upsert({
    where: { usuarioId_perfil: { usuarioId: usuario.id, perfil: "admin" } },
    create: { usuarioId: usuario.id, perfil: "admin" },
    update: {},
  });

  return usuario.id;
}

async function main() {
  console.log("🔄 Semeando o usuário administrador da plataforma...");
  const id = await semearAdmin();
  console.log(`✅ Admin pronto: ${ADMIN_EMAIL} (id ${id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
