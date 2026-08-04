// =====================================================================
//  Senha do role de aplicação (`sf_app`)
// =====================================================================
//
//  A migração `20260803180000_rls_role_de_aplicacao` cria o role SEM login e
//  sem senha — migração versionada vai para o Git e não é lugar de segredo.
//  Quem fecha o ciclo é este script: conecta como DONO do banco
//  (`DATABASE_URL_OWNER`) e define `LOGIN PASSWORD` a partir de
//  `APP_DB_PASSWORD`.
//
//  É idempotente: rodar de novo só reaplica a senha, o que também serve para
//  rotacioná-la. Roda no `yarn db:up`, entre a migração e o seed — o seed já
//  conecta como `sf_app` e precisa do login funcionando.
// =====================================================================
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const ROLE = "sf_app";

/**
 * Lê uma variável do ambiente e, se não houver, do `.env` da raiz.
 *
 * Sem `dotenv`, que não é dependência do projeto — e não precisa ser: em
 * container o valor já chega pelo `env_file`, e localmente basta este
 * fallback. O parser cobre só o que este arquivo usa (`CHAVE="valor"`).
 */
function env(chave) {
  if (process.env[chave]) return process.env[chave];

  try {
    const arquivo = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const linha = arquivo
      .split("\n")
      .find((l) => l.trimStart().startsWith(`${chave}=`));
    if (!linha) return undefined;
    return linha.slice(linha.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

const urlDono = env("DATABASE_URL_OWNER");
const senha = env("APP_DB_PASSWORD");

if (!urlDono) {
  console.error("❌ DATABASE_URL_OWNER não definida — é a conexão do dono do banco.");
  process.exit(1);
}

if (!senha) {
  console.error("❌ APP_DB_PASSWORD não definida — é a senha do role da aplicação.");
  process.exit(1);
}

// Aspas simples dobradas: a senha entra num literal SQL, e `ALTER ROLE` não
// aceita parâmetro ligado ($1) para senha.
const senhaSql = `'${senha.replaceAll("'", "''")}'`;

const prisma = new PrismaClient({ datasources: { db: { url: urlDono } } });

try {
  const existe = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM pg_roles WHERE rolname = '${ROLE}'`,
  );

  if (!Array.isArray(existe) || existe.length === 0) {
    console.error(
      `❌ O role ${ROLE} não existe. Rode as migrations antes (\`yarn db:migrate\`).`,
    );
    process.exit(1);
  }

  await prisma.$executeRawUnsafe(`ALTER ROLE ${ROLE} WITH LOGIN PASSWORD ${senhaSql}`);
  console.log(`✅ Role ${ROLE} pronto para a aplicação conectar.`);
} catch (err) {
  console.error(`❌ Não foi possível configurar o role ${ROLE}:`, err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
