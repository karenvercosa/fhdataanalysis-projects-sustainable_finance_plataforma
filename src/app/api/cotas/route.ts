import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { texto } from "@/lib/cadastro";
import { exigirCapacidade } from "@/lib/rbac.server";
import { TIER_FEATURE_ROWS, type TierFeatures, type TierMatrix } from "@/data/tierMatrix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAVES = TIER_FEATURE_ROWS.map((r) => r.key);

/**
 * Normaliza os recursos vindos da tela.
 *
 * O JSON do banco é livre por natureza, então a leitura precisa ser
 * defensiva: recurso ausente ou com tipo errado vira `false`, e chave que não
 * está em `TIER_FEATURE_ROWS` é descartada. Assim uma linha antiga (gravada
 * antes de um recurso existir) não quebra a tela nem libera nada por acidente.
 */
function lerRecursos(valor: unknown): TierFeatures {
  const bruto = (valor ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    CHAVES.map((chave) => [chave, bruto[chave] === true]),
  ) as unknown as TierFeatures;
}

/**
 * Matriz de cotas — o que cada cota libera no perfil público.
 *
 * A leitura é liberada a qualquer pessoa autenticada porque a matriz decide o
 * que aparece no perfil de todo mundo; a escrita exige `manage:platform`.
 */
export async function GET(req: Request) {
  return rotaAdmin("api/cotas GET", async () => {
    await exigirCapacidade(req.headers);

    const cotas = await prisma.cotaPlataforma.findMany({ orderBy: { ordem: "asc" } });

    const matriz: TierMatrix = cotas.map((c) => ({
      id: c.id,
      name: c.nome,
      features: lerRecursos(c.recursos),
    }));

    return { matriz };
  });
}

/**
 * Salva a matriz inteira (o "Salvar alterações" do Admin).
 *
 * Grava linha a linha em vez de apagar e recriar: as cotas são referenciadas
 * por NOME (`usuario.selo`), então recriá-las trocaria os ids a cada save sem
 * necessidade. Renomear continua possível — o id é a âncora.
 */
export async function PUT(req: Request) {
  return rotaAdmin("api/cotas PUT", async () => {
    await exigirCapacidade(req.headers, "manage:platform");

    const corpo = await req.json().catch(() => ({}));
    const matriz = (corpo as any)?.matriz;

    if (!Array.isArray(matriz) || matriz.length === 0) {
      throw new ErroDeEntrada("Matriz de cotas inválida.");
    }

    const linhas = matriz.map((cota: any, indice: number) => {
      const nome = texto(cota?.name);
      if (!nome) throw new ErroDeEntrada("Toda cota precisa de um nome.");
      if (nome.length > 40) throw new ErroDeEntrada("O nome da cota é longo demais.");
      return { id: texto(cota?.id), nome, ordem: indice, recursos: lerRecursos(cota?.features) };
    });

    const nomes = linhas.map((l) => l.nome.toLowerCase());
    if (new Set(nomes).size !== nomes.length) {
      throw new ErroDeEntrada("Duas cotas não podem ter o mesmo nome.");
    }

    await prisma.$transaction(
      linhas.map((linha) =>
        prisma.cotaPlataforma.upsert({
          where: { id: linha.id || "00000000-0000-0000-0000-000000000000" },
          // `{ ...recursos }` porque o Prisma exige um objeto JSON indexável;
          // `TierFeatures` tem chaves fixas e não casa com `InputJsonObject`.
          create: { nome: linha.nome, ordem: linha.ordem, recursos: { ...linha.recursos } },
          update: { nome: linha.nome, ordem: linha.ordem, recursos: { ...linha.recursos } },
        }),
      ),
    );

    const cotas = await prisma.cotaPlataforma.findMany({ orderBy: { ordem: "asc" } });

    return {
      matriz: cotas.map((c) => ({ id: c.id, name: c.nome, features: lerRecursos(c.recursos) })),
    };
  });
}
