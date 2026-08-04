import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { type SessaoCliente } from "@/types";

const signIn = { email: vi.fn(), social: vi.fn() };
const signOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn, signOut } }));

const { AuthProvider, useAuth } = await import("@/context/AuthContext");
const { PermissionsProvider } = await import("@/context/PermissionsContext");

const SESSAO: SessaoCliente = {
  user: {
    id: "u1",
    name: "Marina",
    email: "marina@x.com",
    role: "attendee",
    tipoConta: "assinante",
  },
  capabilities: ["view:content"],
  senhaProvisoria: false,
} as SessaoCliente;

function envolver(sessao: SessaoCliente | null) {
  return ({ children }: { children: ReactNode }) => (
    <PermissionsProvider>
      <AuthProvider sessao={sessao}>{children}</AuthProvider>
    </PermissionsProvider>
  );
}

const render = (sessao: SessaoCliente | null = SESSAO) =>
  renderHook(() => useAuth(), { wrapper: envolver(sessao) });

/** Resposta de `/api/sessao`. */
function respondeSessao(corpo: unknown) {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => corpo,
  } as Response);
}

const assign = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  Object.defineProperty(window, "location", {
    writable: true,
    value: { assign, href: "http://localhost/" },
  });
  signIn.email.mockReset().mockResolvedValue({ error: null });
  signIn.social.mockReset().mockResolvedValue(undefined);
  signOut.mockReset().mockResolvedValue(undefined);
  assign.mockReset();
  respondeSessao(SESSAO);
});

afterEach(() => vi.unstubAllGlobals());

describe("estado inicial", () => {
  it("nasce da sessão entregue pelo servidor", () => {
    const { result } = render();

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.email).toBe("marina@x.com");
    expect(result.current.roleServidor).toBe("attendee");
  });

  it("sem sessão fica anônimo e sem conceder nada", () => {
    const { result } = render(null);

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user.role).toBe("guest");
    expect(result.current.can("manage:platform")).toBe(false);
  });

  it("exige o provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});

describe("can", () => {
  it("segue as capacidades do servidor enquanto o papel exibido é o real", () => {
    const { result } = render();

    expect(result.current.can("view:content")).toBe(true);
    expect(result.current.can("manage:platform")).toBe(false);
  });

  it("passa a seguir a matriz editável quando o Admin troca o papel exibido", () => {
    const { result } = render();

    act(() => result.current.setRole("admin"));

    // O papel exibido diverge do real: a UI passa a consultar a matriz local.
    expect(result.current.user.role).toBe("admin");
    expect(result.current.can("manage:platform")).toBe(true);
  });
});

describe("login", () => {
  it("normaliza o e-mail e repassa o 'lembrar de mim'", async () => {
    const { result } = render(null);

    await act(async () => {
      await result.current.login("  Marina@X.com ", "senha", true);
    });

    expect(signIn.email).toHaveBeenCalledWith({
      email: "marina@x.com",
      password: "senha",
      rememberMe: true,
    });
  });

  it("não vaza se o e-mail existe quando a credencial falha", async () => {
    signIn.email.mockResolvedValue({ error: { message: "User not found" } });
    const { result } = render(null);

    let saida: Awaited<ReturnType<typeof result.current.login>>;
    await act(async () => {
      saida = await result.current.login("a@x.com", "errada");
    });

    expect(saida!).toEqual({ ok: false, error: "E-mail ou senha inválidos." });
  });

  it("aplica a sessão que o servidor devolveu e informa o papel", async () => {
    const { result } = render(null);

    let saida: Awaited<ReturnType<typeof result.current.login>>;
    await act(async () => {
      saida = await result.current.login("marina@x.com", "senha");
    });

    expect(saida!).toMatchObject({
      ok: true,
      role: "attendee",
      tipoConta: "assinante",
      precisaTrocarSenha: false,
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("sinaliza primeiro acesso quando a senha ainda é a provisória", async () => {
    respondeSessao({ ...SESSAO, senhaProvisoria: true });
    const { result } = render(null);

    let saida: Awaited<ReturnType<typeof result.current.login>>;
    await act(async () => {
      saida = await result.current.login("marina@x.com", "senha");
    });

    expect(saida!).toMatchObject({ ok: true, precisaTrocarSenha: true });
    expect(result.current.senhaProvisoria).toBe(true);
  });

  it("falha quando a sessão não vem junto", async () => {
    respondeSessao({});
    const { result } = render(null);

    let saida: Awaited<ReturnType<typeof result.current.login>>;
    await act(async () => {
      saida = await result.current.login("marina@x.com", "senha");
    });

    expect(saida!).toEqual({ ok: false, error: "Não foi possível carregar a sessão." });
  });
});

describe("loginWithGoogle", () => {
  it("usa /inicio como destino padrão", async () => {
    const { result } = render(null);

    await act(async () => {
      await result.current.loginWithGoogle();
    });

    expect(signIn.social).toHaveBeenCalledWith({ provider: "google", callbackURL: "/inicio" });
  });

  it("respeita o destino informado", async () => {
    const { result } = render(null);

    await act(async () => {
      await result.current.loginWithGoogle("/assinatura");
    });

    expect(signIn.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/assinatura",
    });
  });
});

describe("recarregarSessao", () => {
  it("relê /api/sessao sem cache", async () => {
    const { result } = render();

    await act(async () => {
      await result.current.recarregarSessao();
    });

    expect(fetch).toHaveBeenCalledWith("/api/sessao", { cache: "no-store" });
  });

  it("derruba o estado quando o servidor não devolve usuário", async () => {
    respondeSessao({});
    const { result } = render();

    await act(async () => {
      await result.current.recarregarSessao();
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("mantém o estado atual quando a rede está fora", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("offline"));
    const { result } = render();

    await act(async () => {
      await result.current.recarregarSessao();
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe("completeCheckout", () => {
  it("promove convidado a participante, marca pago e emite credencial", () => {
    const { result } = render({
      ...SESSAO,
      user: { ...SESSAO.user, role: "guest" },
    } as SessaoCliente);

    act(() => result.current.completeCheckout());

    expect(result.current.user).toMatchObject({ role: "attendee", isPaid: true, hasCredential: true });
    expect(result.current.user.ticketCode).toMatch(/^SF26-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it("sem credencial (online) não gera código de ingresso", () => {
    const { result } = render();

    act(() => result.current.completeCheckout({ credential: false }));

    expect(result.current.user).toMatchObject({ isPaid: true, hasCredential: false });
    expect(result.current.user.ticketCode).toBeUndefined();
  });

  it("não rebaixa quem já tem papel acima de convidado", () => {
    const { result } = render();

    act(() => result.current.completeCheckout());

    expect(result.current.user.role).toBe("attendee");
  });
});

describe("logout e exclusão de conta", () => {
  it("encerra a sessão e recarrega pelo servidor", async () => {
    const { result } = render();

    await act(async () => {
      await result.current.logout();
    });

    expect(signOut).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("excluir a conta apaga os dados pessoais do navegador", async () => {
    localStorage.setItem("sf_profile", "{}");
    localStorage.setItem("sf_sessions_v6", "[]");
    const { result } = render();

    await act(async () => {
      await result.current.deleteAccount();
    });

    // Catálogos do evento pertencem à organização e continuam.
    expect(localStorage.getItem("sf_profile")).toBeNull();
    expect(localStorage.getItem("sf_sessions_v6")).toBe("[]");
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("segue para o logout mesmo com o storage indisponível", async () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage bloqueado");
    });
    const { result } = render();

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(signOut).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith("/login");
  });
});

describe("integração com o restante da SPA", () => {
  it("a sessão nova chega às telas depois de recarregar", async () => {
    const { result } = render(null);

    respondeSessao({ ...SESSAO, capabilities: ["manage:platform"] });
    await act(async () => {
      await result.current.recarregarSessao();
    });

    await waitFor(() => expect(result.current.can("manage:platform")).toBe(true));
  });
});
