import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const login = vi.fn();
const loginWithGoogle = vi.fn();
const logout = vi.fn();
const auth = { user: { email: "marina@x.com" }, login, loginWithGoogle, logout };
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));

const requestPasswordReset = vi.fn();
vi.mock("@/lib/auth-client", () => ({ authClient: { requestPasswordReset } }));

const LoginPage = (await import("@/views/LoginPage")).default;
const EsqueciSenhaPage = (await import("@/views/EsqueciSenhaPage")).default;
const PrimeiroAcessoPage = (await import("@/views/PrimeiroAcessoPage")).default;
const TrocarSenhaPage = (await import("@/views/TrocarSenhaPage")).default;
const { ROTA_PRIMEIRO_ACESSO } = await import("@/lib/rotas");

const assign = vi.fn();

function comRota(ui: React.ReactNode, entrada = "/login") {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path="*" element={<>{ui}</>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  login.mockReset().mockResolvedValue({ ok: true, role: "attendee", tipoConta: "assinante" });
  loginWithGoogle.mockReset().mockResolvedValue(undefined);
  logout.mockReset();
  requestPasswordReset.mockReset().mockResolvedValue({ error: null });
  assign.mockReset();
  auth.user = { email: "marina@x.com" };
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...window.location, assign },
  });
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("LoginPage", () => {
  const entrar = async (email = "marina@x.com", senha = "Senha#Forte1") => {
    await userEvent.type(screen.getByLabelText("E-mail"), email);
    await userEvent.type(screen.getByLabelText("Senha"), senha);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
  };

  it("autentica com o que foi digitado", async () => {
    comRota(<LoginPage />);

    await entrar();

    expect(login).toHaveBeenCalledWith("marina@x.com", "Senha#Forte1", false);
  });

  it("'lembrar de mim' viaja junto para o Better Auth", async () => {
    comRota(<LoginPage />);

    await userEvent.click(screen.getByLabelText("Lembrar de mim"));
    await entrar();

    expect(login).toHaveBeenCalledWith("marina@x.com", "Senha#Forte1", true);
  });

  it("credencial recusada vira alerta na tela", async () => {
    login.mockResolvedValue({ ok: false, error: "E-mail ou senha inválidos." });
    comRota(<LoginPage />);

    await entrar();

    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
  });

  it("senha ainda provisória manda para o primeiro acesso", async () => {
    login.mockResolvedValue({ ok: true, role: "attendee", precisaTrocarSenha: true });
    comRota(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path={ROTA_PRIMEIRO_ACESSO} element={<p>Primeiro acesso</p>} />
      </Routes>,
    );

    await entrar();

    expect(await screen.findByText("Primeiro acesso")).toBeInTheDocument();
  });

  it("respeita o ?next= que o middleware guardou", async () => {
    render(
      <MemoryRouter initialEntries={["/login?next=%2Fconteudos"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/conteudos" element={<p>Conteúdos</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await entrar();

    expect(await screen.findByText("Conteúdos")).toBeInTheDocument();
  });

  it("ignora ?next= apontando para fora — não é rota de open redirect", async () => {
    render(
      <MemoryRouter initialEntries={["/login?next=https%3A%2F%2Fmalicioso.com"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<p>Destino interno</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await entrar();

    expect(await screen.findByText("Destino interno")).toBeInTheDocument();
  });

  it("traduz só os códigos de erro que o servidor emite", () => {
    const { unmount } = comRota(<LoginPage />, "/login?erro=login-social");
    expect(screen.getByRole("alert")).toHaveTextContent(/Google/);
    unmount();

    const outra = comRota(<LoginPage />, "/login?erro=token-invalido");
    expect(screen.getByRole("alert")).toHaveTextContent(/link de troca de senha/);
    outra.unmount();

    // Código forjado na URL não vira mensagem nenhuma.
    comRota(<LoginPage />, "/login?erro=inventado");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("o login social vai para a triagem, levando o ?next= saneado", async () => {
    comRota(<LoginPage />, "/login?next=%2Fconteudos");

    await userEvent.click(screen.getByRole("button", { name: /btnGoogle/ }));

    expect(loginWithGoogle).toHaveBeenCalledWith("/api/pos-login?next=%2Fconteudos");
  });

  it("sem ?next=, o social cai na triagem simples", async () => {
    comRota(<LoginPage />);

    await userEvent.click(screen.getByRole("button", { name: /btnGoogle/ }));

    expect(loginWithGoogle).toHaveBeenCalledWith("/api/pos-login");
  });

  it("leva para cadastro e recuperação de senha", () => {
    comRota(<LoginPage />);

    expect(screen.getByRole("link", { name: "Criar conta grátis" })).toHaveAttribute(
      "href",
      "/cadastro",
    );
    expect(screen.getByRole("link", { name: "Esqueceu a senha?" })).toHaveAttribute(
      "href",
      "/esqueci-senha",
    );
  });
});

describe("EsqueciSenhaPage", () => {
  it("recusa e-mail sem @ antes de chamar o servidor", async () => {
    const { container } = comRota(<EsqueciSenhaPage />);

    await userEvent.type(screen.getByLabelText("E-mail"), "semarroba");
    // Submissão direta no formulário: o `type="email"` já barraria o clique no
    // botão, e o que se testa aqui é a validação da própria tela.
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("@");
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("pede a redefinição com o e-mail normalizado", async () => {
    comRota(<EsqueciSenhaPage />);

    await userEvent.type(screen.getByLabelText("E-mail"), "  Marina@X.com ");
    await userEvent.click(screen.getByRole("button", { name: /Enviar e-mail/ }));

    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: "marina@x.com",
      redirectTo: "/trocar-senha",
    });
  });

  it("a confirmação não revela se o e-mail existe", async () => {
    comRota(<EsqueciSenhaPage />);

    await userEvent.type(screen.getByLabelText("E-mail"), "marina@x.com");
    await userEvent.click(screen.getByRole("button", { name: /Enviar e-mail/ }));

    expect(await screen.findByText("Verifique seu e-mail")).toBeInTheDocument();
    expect(screen.getByText(/estiver\s+cadastrado/)).toBeInTheDocument();
  });

  it("falha no envio mantém o formulário com um recado", async () => {
    requestPasswordReset.mockResolvedValue({ error: { message: "smtp fora" } });
    comRota(<EsqueciSenhaPage />);

    await userEvent.type(screen.getByLabelText("E-mail"), "marina@x.com");
    await userEvent.click(screen.getByRole("button", { name: /Enviar e-mail/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Tente novamente/);
  });
});

describe("PrimeiroAcessoPage", () => {
  it("dispara o e-mail de confirmação assim que a tela abre", async () => {
    comRota(<PrimeiroAcessoPage />);

    expect(await screen.findByText(/Enviamos um e-mail para/)).toBeInTheDocument();
    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: "marina@x.com",
      redirectTo: "/trocar-senha",
    });
  });

  it("mostra o endereço para onde o e-mail foi", async () => {
    comRota(<PrimeiroAcessoPage />);

    expect(await screen.findByText("marina@x.com")).toBeInTheDocument();
  });

  it("o reenvio fica em espera antes de liberar de novo", async () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <PrimeiroAcessoPage />
      </MemoryRouter>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: /Reenviar em 60s/ })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole("button", { name: /Reenviar em 59s/ })).toBeInTheDocument();
  });

  it("falha no envio aparece como alerta", async () => {
    requestPasswordReset.mockResolvedValue({ error: { message: "smtp fora" } });
    comRota(<PrimeiroAcessoPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Tente novamente/);
  });

  it("dá a saída de entrar com outra conta", async () => {
    comRota(<PrimeiroAcessoPage />);

    await userEvent.click(screen.getByRole("button", { name: /outra conta/ }));

    expect(logout).toHaveBeenCalledOnce();
  });

  it("sem e-mail na sessão, não dispara nada", async () => {
    auth.user = { email: "" };

    comRota(<PrimeiroAcessoPage />);

    await new Promise((r) => setTimeout(r, 0));
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("TrocarSenhaPage", () => {
  const SENHA = "Senha#Forte2026";

  const abrir = async (query = "?token=t1") => {
    comRota(<TrocarSenhaPage />, `/trocar-senha${query}`);
    // O pop-up de e-mail confirmado abre primeiro.
    if (screen.queryByRole("dialog")) {
      await userEvent.click(screen.getByRole("button", { name: "Criar minha senha" }));
    }
  };

  const preencher = async (senha = SENHA, repetir = SENHA) => {
    await userEvent.type(screen.getByLabelText("Nova senha"), senha);
    await userEvent.type(screen.getByLabelText("Repita a nova senha"), repetir);
    await userEvent.click(screen.getByRole("button", { name: /Salvar senha e entrar/ }));
  };

  it("sem token, devolve ao login em vez de mostrar o formulário", () => {
    comRota(<TrocarSenhaPage />, "/trocar-senha");

    expect(assign).toHaveBeenCalledWith("/login?erro=token-invalido");
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
  });

  it("confirma o e-mail antes de pedir a senha", async () => {
    comRota(<TrocarSenhaPage />, "/trocar-senha?token=t1");

    expect(screen.getByRole("dialog", { name: "E-mail confirmado" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Criar minha senha" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("recusa senha fora da política sem chamar o servidor", async () => {
    await abrir();

    await preencher("123", "123");

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("recusa quando as senhas não conferem", async () => {
    await abrir();

    await preencher(SENHA, `${SENHA}x`);

    expect(screen.getByRole("alert")).toHaveTextContent("As senhas não conferem.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("salva a senha e segue para o destino que o servidor indicou", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ destino: "/api/pos-login" }),
    } as Response);
    await abrir();

    await preencher();

    expect(fetch).toHaveBeenCalledWith(
      "/api/senha/definir",
      expect.objectContaining({ body: JSON.stringify({ token: "t1", senha: SENHA }) }),
    );
    expect(assign).toHaveBeenCalledWith("/api/pos-login");
  });

  it("token queimado devolve ao login com o recado", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ code: "INVALID_TOKEN" }),
    } as Response);
    await abrir();

    await preencher();

    expect(assign).toHaveBeenCalledWith("/login?erro=token-invalido");
  });

  it("erro corrigível fica no formulário, com o que foi digitado", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "A senha é fraca demais." }),
    } as Response);
    await abrir();

    await preencher();

    expect(await screen.findByRole("alert")).toHaveTextContent("A senha é fraca demais.");
    expect(screen.getByLabelText("Nova senha")).toHaveValue(SENHA);
  });
});
