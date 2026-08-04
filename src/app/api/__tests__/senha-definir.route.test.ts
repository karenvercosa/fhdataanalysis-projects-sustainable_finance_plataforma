import { describe, it, expect, vi, beforeEach } from "vitest";
import { requisicao } from "@/test/sessao";

const resetPassword = vi.fn();
const signInEmail = vi.fn();
const usuarioDoTokenDeTrocaDeSenha = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      resetPassword: (...a: unknown[]) => resetPassword(...a),
      signInEmail: (...a: unknown[]) => signInEmail(...a),
    },
  },
  usuarioDoTokenDeTrocaDeSenha: (...a: unknown[]) => usuarioDoTokenDeTrocaDeSenha(...a),
}));

const { POST } = await import("@/app/api/senha/definir/route");

const SENHA_OK = "Senha#Forte2026";

/** Resposta do Better Auth em forma de `Response`, como o `asResponse` devolve. */
function loginOk(cookies: string[] = ["sf.session=abc; Path=/; HttpOnly"]) {
  const headers = new Headers();
  cookies.forEach((c) => headers.append("set-cookie", c));
  return new Response(null, { status: 200, headers });
}

const definir = (json: unknown) => POST(requisicao("http://x/api/senha/definir", { json }));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  resetPassword.mockReset().mockResolvedValue({ status: true });
  signInEmail.mockReset().mockResolvedValue(loginOk());
  usuarioDoTokenDeTrocaDeSenha.mockReset().mockResolvedValue({ email: "marina@x.com" });
});

describe("POST /api/senha/definir", () => {
  it("recusa senha fora da política antes de tocar no token", async () => {
    const res = await definir({ token: "t1", senha: "123" });

    expect(res.status).toBe(400);
    expect(usuarioDoTokenDeTrocaDeSenha).not.toHaveBeenCalled();
  });

  it("recusa senha ausente", async () => {
    expect((await definir({ token: "t1" })).status).toBe(400);
  });

  it("recusa token expirado ou já usado com um código para a tela tratar", async () => {
    usuarioDoTokenDeTrocaDeSenha.mockResolvedValue(null);

    const res = await definir({ token: "t1", senha: SENHA_OK });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ code: "INVALID_TOKEN" });
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("tira o e-mail do token, nunca do corpo da requisição", async () => {
    await definir({ token: "t1", senha: SENHA_OK, email: "impostor@x.com" });

    expect(signInEmail).toHaveBeenCalledWith({
      body: { email: "marina@x.com", password: SENHA_OK, rememberMe: false },
      asResponse: true,
    });
  });

  it("abre a sessão sem 'lembrar de mim' — ninguém marcou essa caixa aqui", async () => {
    await definir({ token: "t1", senha: SENHA_OK });

    expect(signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ rememberMe: false }) }),
    );
  });

  it("repassa os cookies da sessão nova e manda para a triagem", async () => {
    signInEmail.mockResolvedValue(loginOk(["a=1; Path=/", "b=2; Path=/"]));

    const res = await definir({ token: "t1", senha: SENHA_OK });

    await expect(res.json()).resolves.toEqual({ destino: "/api/pos-login" });
    expect(res.headers.getSetCookie()).toEqual(
      expect.arrayContaining(["a=1; Path=/", "b=2; Path=/"]),
    );
  });

  it("manda para o login quando a senha gravou mas a sessão não subiu", async () => {
    signInEmail.mockResolvedValue(new Response(null, { status: 401 }));

    const res = await definir({ token: "t1", senha: SENHA_OK });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ destino: "/login?senha=criada" });
  });

  it("devolve 500 quando o Better Auth falha", async () => {
    resetPassword.mockRejectedValue(new Error("token inválido"));

    const res = await definir({ token: "t1", senha: SENHA_OK });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: "token inválido" });
  });

  it("aguenta corpo que não é JSON", async () => {
    const res = await POST(new Request("http://x", { method: "POST", body: "x" }));
    expect(res.status).toBe(400);
  });
});
