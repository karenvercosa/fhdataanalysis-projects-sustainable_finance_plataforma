import { NextResponse } from "next/server";
import { auth, usuarioDoTokenDeTrocaDeSenha } from "@/lib/auth";
import { texto } from "@/lib/cadastro";
import { validarSenha } from "@/lib/politica-senha";

// O Prisma não roda no Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Para onde o navegador segue depois: a triagem decide a home pelo tipo de conta. */
const ROTA_TRIAGEM = "/api/pos-login";

/**
 * Grava a senha definitiva e já deixa a pessoa dentro da plataforma.
 *
 * São dois passos que precisam acontecer juntos, e por isso ficam no servidor:
 *
 *   1. `resetPassword` consome o token do e-mail, grava o hash novo, apaga a
 *      senha provisória (no gancho `onPasswordReset`) e derruba as sessões
 *      antigas;
 *   2. `signInEmail` abre uma sessão nova com a senha que acabou de ser
 *      criada — quem provou ter acesso ao e-mail e definiu a senha já está
 *      autenticado, não faz sentido pedir o login logo em seguida.
 *
 * A senha em texto puro só existe aqui, entre um passo e outro; o navegador
 * nunca precisa reenviá-la. Os `Set-Cookie` da sessão nova são repassados na
 * resposta, e o cliente segue para `/api/pos-login`, que escolhe o destino.
 *
 * A sessão nasce sem "lembrar de mim": ninguém marcou essa caixa neste fluxo,
 * então o cookie morre ao fechar o navegador.
 */
export async function POST(req: Request) {
  try {
    const corpo = await req.json().catch(() => ({}));
    const token = texto((corpo as any)?.token);
    const senha = typeof (corpo as any)?.senha === "string" ? (corpo as any).senha : "";

    const invalida = validarSenha(senha);
    if (invalida) {
      return NextResponse.json({ error: invalida }, { status: 400 });
    }

    // O e-mail vem do token, nunca do corpo da requisição: é o que impede
    // alguém de trocar a senha de uma conta e entrar em outra.
    const usuario = await usuarioDoTokenDeTrocaDeSenha(token);
    if (!usuario) {
      return NextResponse.json(
        { error: "O link de troca de senha expirou ou já foi usado.", code: "INVALID_TOKEN" },
        { status: 400 },
      );
    }

    await auth.api.resetPassword({ body: { token, newPassword: senha } });

    const login = await auth.api.signInEmail({
      body: { email: usuario.email, password: senha, rememberMe: false },
      asResponse: true,
    });

    if (!login.ok) {
      // A senha foi gravada; só a sessão não subiu. Entrar pelo login resolve.
      return NextResponse.json({ destino: "/login?senha=criada" });
    }

    const resposta = NextResponse.json({ destino: ROTA_TRIAGEM });
    login.headers.getSetCookie().forEach((cookie) => {
      resposta.headers.append("set-cookie", cookie);
    });
    return resposta;
  } catch (error: any) {
    console.error("[api/senha/definir]", error);
    return NextResponse.json(
      { error: error?.message || "Não foi possível salvar a senha." },
      { status: 500 },
    );
  }
}
