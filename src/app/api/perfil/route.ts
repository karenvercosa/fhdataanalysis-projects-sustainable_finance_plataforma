import prisma from "@/lib/prisma";
import { ErroDeEntrada, rotaAdmin } from "@/lib/admin.server";
import { texto } from "@/lib/cadastro";
import { exigirCapacidade } from "@/lib/rbac.server";
import { type PerfilPublico } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Imagens chegam como data URL. ~1,4 MB de arquivo vira ~2 MB de base64. */
const TAMANHO_MAXIMO_IMAGEM = 2_000_000;
const TAMANHO_MAXIMO_BIO = 2000;

const SELECAO = {
  nomeCompleto: true,
  email: true,
  cargo: true,
  empresaNome: true,
  telefone: true,
  bio: true,
  linkedinUrl: true,
  avatarUrl: true,
  capaUrl: true,
  interesses: { select: { interesseId: true } },
} as const;

function paraJson(u: {
  nomeCompleto: string | null;
  email: string;
  cargo: string | null;
  empresaNome: string | null;
  telefone: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  avatarUrl: string | null;
  capaUrl: string | null;
  interesses: { interesseId: string }[];
}): PerfilPublico {
  return {
    nome: u.nomeCompleto ?? "",
    email: u.email,
    cargo: u.cargo ?? "",
    empresa: u.empresaNome ?? "",
    telefone: u.telefone ?? "",
    bio: u.bio ?? "",
    linkedin: u.linkedinUrl ?? "",
    foto: u.avatarUrl ?? "",
    capa: u.capaUrl ?? "",
    interesseIds: u.interesses.map((i) => i.interesseId),
  };
}

/**
 * Aceita só data URL de imagem ou string vazia (que significa "remover").
 *
 * Sem esta checagem o campo aceitaria qualquer texto — inclusive uma URL
 * `javascript:` ou um endereço externo, que transformaria o perfil num vetor
 * de rastreamento ou de injeção quando renderizado em `<img src>`.
 */
function lerImagem(valor: unknown, rotulo: string): string | null {
  if (typeof valor !== "string" || !valor) return null;
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(valor)) {
    throw new ErroDeEntrada(`A ${rotulo} precisa ser um arquivo de imagem.`);
  }
  if (valor.length > TAMANHO_MAXIMO_IMAGEM) {
    throw new ErroDeEntrada(`A ${rotulo} é grande demais. Use uma imagem menor.`);
  }
  return valor;
}

/** Perfil público da pessoa logada. */
export async function GET(req: Request) {
  return rotaAdmin("api/perfil GET", async () => {
    const sessao = await exigirCapacidade(req.headers);

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id: sessao.id },
      select: SELECAO,
    });

    return { perfil: paraJson(usuario) };
  });
}

/**
 * Salva o perfil público.
 *
 * O e-mail NÃO é editável aqui: ele é a chave de login, e trocá-lo por este
 * caminho deixaria a conta inacessível sem passar por nenhuma confirmação.
 *
 * Os interesses são substituídos por inteiro dentro da mesma transação —
 * desmarcar um tema tem que apagar a linha, senão o relatório contaria uma
 * escolha que a pessoa desfez.
 */
export async function PUT(req: Request) {
  return rotaAdmin("api/perfil PUT", async () => {
    const sessao = await exigirCapacidade(req.headers);

    const corpo = (await req.json().catch(() => ({}))) as any;

    const bio = texto(corpo?.bio);
    if (bio.length > TAMANHO_MAXIMO_BIO) {
      throw new ErroDeEntrada(`A bio deve ter no máximo ${TAMANHO_MAXIMO_BIO} caracteres.`);
    }

    const linkedin = texto(corpo?.linkedin);
    if (linkedin && !/^https?:\/\//i.test(linkedin)) {
      throw new ErroDeEntrada("O LinkedIn deve começar com http:// ou https://.");
    }

    const foto = lerImagem(corpo?.foto, "foto de perfil");
    const capa = lerImagem(corpo?.capa, "foto de capa");

    // Só entram temas que existem e estão ativos: um id inventado no corpo da
    // requisição não vira vínculo.
    const pedidos: string[] = Array.isArray(corpo?.interesseIds)
      ? corpo.interesseIds.filter((i: unknown) => typeof i === "string")
      : [];
    const validos = pedidos.length
      ? await prisma.interesse.findMany({
          where: { id: { in: pedidos }, ativo: true },
          select: { id: true },
        })
      : [];

    const usuario = await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: sessao.id },
        data: {
          cargo: texto(corpo?.cargo) || null,
          empresaNome: texto(corpo?.empresa) || null,
          telefone: texto(corpo?.telefone) || null,
          bio: bio || null,
          linkedinUrl: linkedin || null,
          avatarUrl: foto,
          capaUrl: capa,
        },
      });

      await tx.usuarioInteresse.deleteMany({ where: { usuarioId: sessao.id } });
      if (validos.length) {
        await tx.usuarioInteresse.createMany({
          data: validos.map((i) => ({ usuarioId: sessao.id, interesseId: i.id })),
        });
      }

      return tx.usuario.findUniqueOrThrow({ where: { id: sessao.id }, select: SELECAO });
    });

    return { perfil: paraJson(usuario) };
  });
}
