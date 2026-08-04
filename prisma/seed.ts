import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

/**
 * Seed ÚNICA do banco compartilhado.
 *
 * A landing page e a plataforma rodam no MESMO servidor, contra o MESMO banco,
 * e publicam UMA única imagem de migração (a mesma tag no Docker Hub). Então
 * esta seed atende às duas:
 *
 *  - administrador, cotas de patrocínio e catálogo de interesses (plataforma);
 *  - conteúdo do site em PT e EN (landing page).
 *
 * Todas as escritas são `upsert`/`create` condicionais, nunca `deleteMany`:
 * rodar a seed de novo a cada deploy não pode desfazer o que a equipe ajustou
 * pelos painéis em produção.
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

/**
 * Conteúdo da landing page (PT/EN).
 *
 * É um SNAPSHOT do `src/data/seedContent.ts` da landing page, exportado para
 * JSON. Existe aqui porque a plataforma e a landing page publicam UMA única
 * imagem de migração — a mesma tag no Docker Hub —, então uma só seed precisa
 * atender às duas. Copiar o `.ts` traria junto todo o conteúdo e os catálogos
 * de mensagens da LP; o JSON quebra esse acoplamento.
 *
 * Para atualizar depois de mexer no conteúdo da LP:
 *
 *   npx tsx -e 'import {SEED_DATA_PT,SEED_DATA_EN} from "@/data/seedContent"; \
 *     console.log(JSON.stringify({PT:SEED_DATA_PT,EN:SEED_DATA_EN},null,2))' \
 *     > ../plataforma/prisma/landing-page-content.json
 */
async function semearLandingPage() {
  const caminho = new URL("./landing-page-content.json", import.meta.url);
  const conteudo = JSON.parse(readFileSync(caminho, "utf8")) as Record<string, unknown>;

  let criados = 0;
  for (const lang of ["PT", "EN"] as const) {
    // `upsert` sem `update`, e NÃO o `deleteMany` da seed original da LP: o
    // conteúdo é editável pelo painel, e apagar tudo a cada deploy desfaria o
    // que a equipe tivesse ajustado em produção.
    const existente = await prisma.landingPageContent.findUnique({
      where: { lang },
      select: { id: true },
    });
    if (existente) continue;

    await prisma.landingPageContent.create({
      data: { lang, data: conteudo[lang] as any },
    });
    criados += 1;
  }

  return criados;
}

async function main() {
  console.log("🔄 Semeando o usuário administrador da plataforma...");
  const id = await semearAdmin();
  console.log(`✅ Admin pronto: ${ADMIN_EMAIL} (id ${id})`);

  const cotas = await semearCotas();
  console.log(`✅ Cotas de patrocínio prontas: ${cotas}`);

  const interesses = await semearInteresses();
  console.log(`✅ Catálogo de interesses pronto: ${interesses} temas`);

  const idiomas = await semearLandingPage();
  console.log(
    idiomas
      ? `✅ Conteúdo da landing page semeado (${idiomas} idioma(s))`
      : "✅ Conteúdo da landing page já existia — preservado",
  );
}

// O projeto é ESM (`"type": "module"`), então o await de topo é direto — a
// cadeia de promessas só existia para contornar a ausência dele.
try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
