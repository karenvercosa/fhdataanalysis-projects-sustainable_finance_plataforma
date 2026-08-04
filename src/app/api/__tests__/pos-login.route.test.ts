import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { criarPrismaFalso, limparPrismaFalso } from "@/test/prisma";
import { sessaoFalsa } from "@/test/sessao";

const prisma = criarPrismaFalso();
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const getSessaoServidor = vi.fn();
vi.mock("@/lib/rbac.server", async (real) => ({
  ...(await real<typeof import("@/lib/rbac.server")>()),
  getSessaoServidor: (...a: unknown[]) => getSessaoServidor(...a),
}));

const pedirTrocaDeSenha = vi.fn();
vi.mock("@/lib/auth", () => ({ pedirTrocaDeSenha: (...a: unknown[]) => pedirTrocaDeSenha(...a) }));

const { GET } = await import("@/app/api/pos-login/route");

const requisicao = (url = "/api/pos-login") =>
  new NextRequest(new URL(url, "http://localhost:3000"));

const destinoDe = (res: Response) => new URL(res.headers.get("location")!);

beforeEach(() => {
  limparPrismaFalso(prisma);
  vi.spyOn(console, "error").mockImplementation(() => {});
  getSessaoServidor.mockReset().mockResolvedValue(sessaoFalsa());
  pedirTrocaDeSenha.mockReset().mockResolvedValue(undefined);
  prisma.account.findFirst.mockResolvedValue({ id: "acc1" });
});

describe("sem sessão", () => {
  it("volta ao login com um erro genérico — não revela o motivo", async () => {
    getSessaoServidor.mockResolvedValue(null);

    const destino = destinoDe(await GET(requisicao()));

    expect(destino.pathname).toBe("/login");
    expect(destino.searchParams.get("erro")).toBe("login-social");
  });
});

describe("conta recém-criada pelo Google", () => {
  it("sem credencial de e-mail/senha vai completar o cadastro", async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    const destino = destinoDe(await GET(requisicao()));

    expect(destino.pathname).toBe("/cadastro");
    expect(destino.searchParams.get("cadastro")).toBe("sucesso");
  });

  it("a marca é a credencial, não os campos do formulário", async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    await GET(requisicao());

    expect(prisma.account.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: sessaoFalsa().id, providerId: "credential" },
      }),
    );
  });
});

describe("primeiro acesso pendente", () => {
  it("dispara a confirmação e leva à tela do primeiro acesso", async () => {
    getSessaoServidor.mockResolvedValue(sessaoFalsa({ senhaProvisoria: true }));

    const destino = destinoDe(await GET(requisicao()));

    expect(pedirTrocaDeSenha).toHaveBeenCalledWith("pessoa@teste.com");
    expect(destino.pathname).toBe("/primeiro-acesso");
  });

  it("SMTP fora não impede a pessoa de chegar à tela", async () => {
    getSessaoServidor.mockResolvedValue(sessaoFalsa({ senhaProvisoria: true }));
    pedirTrocaDeSenha.mockRejectedValue(new Error("smtp fora"));

    const destino = destinoDe(await GET(requisicao()));

    expect(destino.pathname).toBe("/primeiro-acesso");
    expect(console.error).toHaveBeenCalled();
  });
});

describe("senha definitiva", () => {
  it("o Plano Gratuito cai sempre na home", async () => {
    getSessaoServidor.mockResolvedValue(sessaoFalsa({ role: "guest", tipoConta: "gratuito" }));

    expect(destinoDe(await GET(requisicao())).pathname).toBe("/inicio");
  });

  it("o assinante segue o painel do seu papel", async () => {
    getSessaoServidor.mockResolvedValue(sessaoFalsa({ role: "admin", tipoConta: "assinante" }));
    expect(destinoDe(await GET(requisicao())).pathname).toBe("/admin");

    getSessaoServidor.mockResolvedValue(sessaoFalsa({ role: "curator", tipoConta: "assinante" }));
    expect(destinoDe(await GET(requisicao())).pathname).toBe("/curador");
  });

  it("respeita o `next` que o middleware guardou", async () => {
    const destino = destinoDe(await GET(requisicao("/api/pos-login?next=/programacao")));
    expect(destino.pathname).toBe("/programacao");
  });

  it("descarta um `next` que aponta para fora do site", async () => {
    for (const next of ["https://evil.com", "//evil.com", "/\\evil.com", "/%2fevil.com"]) {
      const url = `/api/pos-login?next=${encodeURIComponent(next)}`;
      expect(destinoDe(await GET(requisicao(url))).host).toBe("localhost:3000");
    }
  });
});
