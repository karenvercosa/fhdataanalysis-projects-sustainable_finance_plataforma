import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { PerfilUsuario } from "@/types";

const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const { usuarioParaJson, lerFormularioUsuario, aplicarPerfil, SELECAO_USUARIO } = await import(
  "@/lib/usuarios-admin.server"
);

const FORMULARIO_OK = { nome: "Pessoa Teste", email: "PESSOA@Teste.com", role: "admin", selo: "Ouro" };

beforeEach(() => limparPrismaFalso(prisma));

describe("SELECAO_USUARIO", () => {
  it("traz os campos que o CRUD do Admin exibe, incluindo os perfis", () => {
    expect(SELECAO_USUARIO).toMatchObject({
      id: true,
      nomeCompleto: true,
      email: true,
      selo: true,
      ativo: true,
      empresaNome: true,
      voucher: true,
      perfis: { select: { perfil: true } },
    });
  });
});

describe("usuarioParaJson", () => {
  const registro = {
    id: "u1",
    nomeCompleto: "Pessoa Teste",
    email: "pessoa@teste.com",
    selo: "Ouro",
    ativo: true,
    empresaNome: "ACME",
    voucher: "VERDE",
    perfis: [{ perfil: PerfilUsuario.curador }],
  };

  it("resolve o papel efetivo a partir dos perfis do banco", () => {
    expect(usuarioParaJson(registro)).toMatchObject({ id: "u1", role: "curator" });
  });

  it("nome ausente vira string vazia, não `null` na tela", () => {
    expect(usuarioParaJson({ ...registro, nomeCompleto: null }).nome).toBe("");
  });

  it("sem perfil algum o papel é guest", () => {
    expect(usuarioParaJson({ ...registro, perfis: [] }).role).toBe("guest");
  });

  it("preserva selo, empresa e voucher como vieram", () => {
    expect(usuarioParaJson(registro)).toMatchObject({
      selo: "Ouro",
      empresaNome: "ACME",
      voucher: "VERDE",
      ativo: true,
    });
  });
});

describe("lerFormularioUsuario", () => {
  it("normaliza o e-mail para minúsculas", () => {
    expect(lerFormularioUsuario(FORMULARIO_OK).email).toBe("pessoa@teste.com");
  });

  it("aceita o formulário completo", () => {
    expect(lerFormularioUsuario(FORMULARIO_OK)).toEqual({
      nome: "Pessoa Teste",
      email: "pessoa@teste.com",
      role: "admin",
      selo: "Ouro",
      ativo: true,
    });
  });

  it("recusa nome com menos de duas letras", () => {
    expect(() => lerFormularioUsuario({ ...FORMULARIO_OK, nome: "A" })).toThrow(/nome completo/i);
    expect(() => lerFormularioUsuario({ ...FORMULARIO_OK, nome: "" })).toThrow(/nome completo/i);
  });

  it("recusa e-mail sem @", () => {
    expect(() => lerFormularioUsuario({ ...FORMULARIO_OK, email: "semarroba" })).toThrow(/@/);
  });

  it("recusa papel fora da lista", () => {
    expect(() => lerFormularioUsuario({ ...FORMULARIO_OK, role: "hacker" })).toThrow(
      /Perfil inválido/,
    );
  });

  it("aceita todos os papéis conhecidos", () => {
    for (const role of ["guest", "attendee", "speaker", "curator", "operator", "admin"]) {
      expect(lerFormularioUsuario({ ...FORMULARIO_OK, role }).role).toBe(role);
    }
  });

  it("recusa selo desconhecido", () => {
    expect(() => lerFormularioUsuario({ ...FORMULARIO_OK, selo: "Diamante" })).toThrow(
      /Selo inválido/,
    );
  });

  it('"sem selo" chega vazio e é gravado como ausência', () => {
    expect(lerFormularioUsuario({ ...FORMULARIO_OK, selo: "" }).selo).toBeNull();
    expect(lerFormularioUsuario({ ...FORMULARIO_OK, selo: undefined }).selo).toBeNull();
  });

  it("ativo só é falso quando vem explicitamente false", () => {
    expect(lerFormularioUsuario({ ...FORMULARIO_OK, ativo: false }).ativo).toBe(false);
    expect(lerFormularioUsuario({ ...FORMULARIO_OK, ativo: undefined }).ativo).toBe(true);
    expect(lerFormularioUsuario({ ...FORMULARIO_OK, ativo: "não" }).ativo).toBe(true);
  });
});

describe("aplicarPerfil", () => {
  it("substitui o perfil em vez de acumular", async () => {
    await aplicarPerfil(prisma, "u1", "attendee");

    expect(prisma.usuarioPerfil.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: "u1", perfil: { not: PerfilUsuario.participante } },
    });
    expect(prisma.usuarioPerfil.upsert).toHaveBeenCalledWith({
      where: {
        usuarioId_perfil: { usuarioId: "u1", perfil: PerfilUsuario.participante },
      },
      create: { usuarioId: "u1", perfil: PerfilUsuario.participante },
      update: {},
    });
  });

  it("grava o perfil canônico de cada papel", async () => {
    for (const [role, perfil] of [
      ["guest", PerfilUsuario.gratuito],
      ["speaker", PerfilUsuario.palestrante],
      ["curator", PerfilUsuario.curador],
      ["operator", PerfilUsuario.operadorCredenciamento],
      ["admin", PerfilUsuario.admin],
    ] as const) {
      limparPrismaFalso(prisma);
      await aplicarPerfil(prisma, "u1", role);
      expect(prisma.usuarioPerfil.upsert.mock.calls[0][0].create.perfil).toBe(perfil);
    }
  });
});
