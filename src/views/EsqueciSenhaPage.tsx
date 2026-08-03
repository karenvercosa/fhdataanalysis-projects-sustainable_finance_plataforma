"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, MailCheck, Send } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { EMAIL_REGEX } from "@/lib/cadastro";
import {
  CardAutenticacao,
  botaoAutenticacao,
  campoAutenticacao,
} from "@/components/auth/CardAutenticacao";

/**
 * "Esqueceu a senha?" — pede o e-mail e dispara a mesma confirmação do
 * primeiro acesso.
 *
 * O caminho daqui em diante é idêntico: o e-mail traz um botão, o botão valida
 * o token e devolve para `/trocar-senha`. A tela de troca não abre por
 * nenhuma outra via.
 *
 * A resposta é sempre a mesma, com ou sem conta no endereço informado — é o
 * comportamento do próprio Better Auth, para não revelar quem é cadastrado.
 */
export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    if (!EMAIL_REGEX.test(email.trim())) {
      setErro("Informe um e-mail válido, contendo @.");
      return;
    }

    setEnviando(true);
    setErro(null);

    const { error } = await authClient.requestPasswordReset({
      email: email.trim().toLowerCase(),
      redirectTo: "/trocar-senha",
    });

    setEnviando(false);

    if (error) {
      setErro("Não conseguimos enviar o e-mail agora. Tente novamente em instantes.");
      return;
    }

    setEnviado(true);
  };

  const voltar = (
    <>
      Lembrou a senha?{" "}
      <Link to="/login" className="font-medium text-white underline">
        Voltar para o login
      </Link>
    </>
  );

  if (enviado) {
    return (
      <CardAutenticacao
        titulo="Verifique seu e-mail"
        subtitulo="O link de redefinição está a caminho"
        rodape={voltar}
      >
        <div className="flex w-full items-start gap-3 rounded-md bg-white/5 p-4 text-white">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#8DD596]" />
          <p className="text-body-sm text-white/80">
            Se <span className="font-medium">{email.trim().toLowerCase()}</span> estiver
            cadastrado, enviamos uma mensagem com o botão de confirmação. Clique nele
            para abrir a tela de nova senha — o link vale por 60 minutos e só pode ser
            usado uma vez.
          </p>
        </div>
      </CardAutenticacao>
    );
  }

  return (
    <CardAutenticacao
      titulo="Esqueceu a senha?"
      subtitulo="Vamos confirmar seu e-mail primeiro"
      rodape={voltar}
    >
      <form onSubmit={submeter} className="flex w-full flex-col gap-6">
        {erro && (
          <div
            role="alert"
            className="flex w-full items-center gap-2 rounded-md bg-error-50 px-3 py-2 text-body-sm text-error-500"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erro}
          </div>
        )}

        <div className="w-full space-y-2">
          <label htmlFor="email-recuperacao" className="block text-h5 text-white">
            E-mail
          </label>
          <input
            id="email-recuperacao"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro(null);
            }}
            placeholder="seu@email.com"
            className={campoAutenticacao}
          />
          <p className="text-body-sm text-white/70">
            Enviaremos um botão de confirmação para este endereço. A tela de nova senha
            abre só por ele.
          </p>
        </div>

        <button type="submit" disabled={enviando} className={botaoAutenticacao}>
          <Send className="h-5 w-5" />
          {enviando ? "Enviando..." : "Enviar e-mail de confirmação"}
        </button>
      </form>
    </CardAutenticacao>
  );
}
