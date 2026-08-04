import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getSessionCookie = vi.fn();
vi.mock("better-auth/cookies", () => ({
  getSessionCookie: (...a: unknown[]) => getSessionCookie(...a),
}));

const { middleware, config } = await import("@/middleware");

function requisicao(url: string, init?: { cookie?: string; acceptLanguage?: string }) {
  const headers = new Headers();
  if (init?.cookie) headers.set("cookie", init.cookie);
  if (init?.acceptLanguage) headers.set("accept-language", init.acceptLanguage);
  return new NextRequest(new URL(url, "http://localhost:3000"), { headers });
}

const cookieDeIdioma = (res: { cookies: { get: (n: string) => { value: string } | undefined } }) =>
  res.cookies.get("NEXT_LOCALE")?.value;

beforeEach(() => getSessionCookie.mockReset().mockReturnValue(null));

describe("requisições de infraestrutura", () => {
  it.each(["/api/sessao", "/_next/static/chunk.js", "/_vercel/insights", "/favicon.ico", "/manifest.webmanifest"])(
    "%s passa direto, sem redirecionamento nem cookie",
    (caminho) => {
      const res = middleware(requisicao(caminho));

      expect(res.status).toBe(200);
      expect(cookieDeIdioma(res)).toBeUndefined();
      expect(getSessionCookie).not.toHaveBeenCalled();
    },
  );
});

describe("idioma", () => {
  it("grava o cookie na primeira visita a partir do Accept-Language", () => {
    const res = middleware(requisicao("/login", { acceptLanguage: "en-US,en;q=0.9" }));
    expect(cookieDeIdioma(res)).toBe("en");
  });

  it("sem Accept-Language grava o padrão", () => {
    expect(cookieDeIdioma(middleware(requisicao("/login")))).toBe("pt");
  });

  it("não reescreve o cookie quando ele já é válido", () => {
    const res = middleware(requisicao("/login", { cookie: "NEXT_LOCALE=en" }));
    expect(cookieDeIdioma(res)).toBeUndefined();
  });

  it("cookie com idioma inválido é substituído", () => {
    const res = middleware(
      requisicao("/login", { cookie: "NEXT_LOCALE=fr", acceptLanguage: "en" }),
    );
    expect(cookieDeIdioma(res)).toBe("en");
  });
});

describe("rotas públicas", () => {
  it.each(["/login", "/cadastro", "/esqueci-senha", "/trocar-senha", "/cadastro/completar"])(
    "%s passa sem exigir sessão",
    (caminho) => {
      const res = middleware(requisicao(caminho));
      expect(res.status).toBe(200);
    },
  );

  it("quem já tem cookie não é barrado no login — isso seria um laço", () => {
    getSessionCookie.mockReturnValue("cookie");
    expect(middleware(requisicao("/login")).status).toBe(200);
  });
});

describe("rotas autenticadas", () => {
  it("sem cookie de sessão redireciona para o login", () => {
    const res = middleware(requisicao("/inicio"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("preserva o destino pretendido, com a query, para voltar depois do login", () => {
    const res = middleware(requisicao("/programacao?dia=2"));
    const destino = new URL(res.headers.get("location")!);

    expect(destino.pathname).toBe("/login");
    expect(destino.searchParams.get("next")).toBe("/programacao?dia=2");
  });

  it("o redirecionamento leva junto o cookie de idioma recém-definido", () => {
    const res = middleware(requisicao("/inicio", { acceptLanguage: "en" }));
    expect(cookieDeIdioma(res)).toBe("en");
  });

  it("com cookie de sessão a página é servida", () => {
    getSessionCookie.mockReturnValue("cookie-valido");

    const res = middleware(requisicao("/admin"));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("o corte é de presença de sessão, não de permissão — o papel nem é consultado", () => {
    getSessionCookie.mockReturnValue("cookie-valido");
    expect(middleware(requisicao("/admin/usuarios")).status).toBe(200);
  });
});

describe("config", () => {
  it("declara o matcher que poupa estáticos no build de produção", () => {
    expect(config.matcher).toEqual(["/((?!api|_next|_vercel|.*[.].*).*)"]);
  });
});
