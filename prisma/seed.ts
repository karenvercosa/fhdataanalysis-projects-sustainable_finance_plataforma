import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

/**
 * Seed da PLATAFORMA.
 *
 * A landing page e a plataforma rodam no MESMO servidor, contra o MESMO banco
 * e o mesmo Redis. Cada seed cuida da sua parte, sem se atropelar:
 *
 *  - a da landing page semeia o conteúdo do site (`landing_page_content`);
 *  - esta garante o administrador, as cotas de patrocínio e o catálogo de
 *    interesses — o que a plataforma precisa para abrir funcionando.
 *
 * Nenhuma das duas apaga o que é da outra. E todas as escritas daqui são
 * `upsert` sem `update`: rodar a seed de novo (num deploy, por exemplo) não
 * desfaz nada que o Admin tenha ajustado pelas telas.
 *
 * A senha é gravada do mesmo jeito que o Better Auth grava no cadastro: hash
 * scrypt na tabela `account` (provider `credential`), espelhado em
 * `usuario.senha_hash`. Nada de senha em texto puro no banco.
 */
const prisma = new PrismaClient();

// Sobrescreva por env em produção — o padrão existe para o ambiente local
// subir funcionando com `yarn db:seed`.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();
const ADMIN_SENHA = process.env.ADMIN_PASSWORD || "";
const ADMIN_NOME = process.env.ADMIN_NAME || "";

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

/**
 * Cotas de patrocínio — o que cada uma libera no perfil público.
 *
 * A migração já semeia estas linhas, mas a seed as reafirma: um banco criado
 * por `prisma db push` (que não roda migrações) subiria com a matriz vazia, e
 * aí nenhum patrocinador teria recurso algum no perfil.
 */
const COTAS = [
  {
    nome: "Bronze",
    ordem: 0,
    recursos: {
      topBanner: false, about: true, showPhone: false, showEmail: true,
      showLinkedin: true, materialUpload: false, featuredVideo: false, scheduleMeeting: false,
    },
  },
  {
    nome: "Prata",
    ordem: 1,
    recursos: {
      topBanner: true, about: true, showPhone: false, showEmail: true,
      showLinkedin: true, materialUpload: true, featuredVideo: false, scheduleMeeting: true,
    },
  },
  {
    nome: "Ouro",
    ordem: 2,
    recursos: {
      topBanner: true, about: true, showPhone: true, showEmail: true,
      showLinkedin: true, materialUpload: true, featuredVideo: true, scheduleMeeting: true,
    },
  },
];

/** Nuvem de temas do cadastro e do perfil, base dos relatórios de audiência. */
const INTERESSES = [
  "ESG", "Crédito de carbono", "Green bonds", "Fintech", "Investimento de impacto",
  "Energia renovável", "Agronegócio sustentável", "Governança", "Regulação",
  "Net zero", "Biodiversidade", "Economia circular",
];

async function semearCotas() {
  for (const cota of COTAS) {
    await prisma.cotaPlataforma.upsert({
      where: { nome: cota.nome },
      create: cota,
      // Sem `update`: o que o Admin marcou em `/admin/cotas` vale mais que o
      // padrão, e rodar a seed de novo não pode desfazer o ajuste dele.
      update: {},
    });
  }
  return COTAS.length;
}

async function semearInteresses() {
  for (const [ordem, nome] of INTERESSES.entries()) {
    await prisma.interesse.upsert({
      where: { nome },
      create: { nome, ordem },
      // Idem: tema removido pelo Admin não volta sozinho, e renomear não é
      // trabalho da seed.
      update: {},
    });
  }
  return INTERESSES.length;
}

async function main() {
  console.log("🔄 Semeando o usuário administrador da plataforma...");
  const id = await semearAdmin();
  console.log(`✅ Admin pronto: ${ADMIN_EMAIL} (id ${id})`);

  const cotas = await semearCotas();
  console.log(`✅ Cotas de patrocínio prontas: ${cotas}`);

  const interesses = await semearInteresses();
  console.log(`✅ Catálogo de interesses pronto: ${interesses} temas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
