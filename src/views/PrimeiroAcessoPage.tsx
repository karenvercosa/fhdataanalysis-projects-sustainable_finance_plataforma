"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, MailCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authClient } from "@/lib/auth-client";
import {
  CardAutenticacao,
  botaoAutenticacao,
} from "@/components/auth/CardAutenticacao";

/** Espera entre dois reenvios do e-mail de confirmação, em segundos. */
const ESPERA_REENVIO_SEG = 60;

/**
 * Primeiro acesso — a senha gravada ainda é a provisória enviada no cadastro.
 *
 * Esta é a única tela autenticada que abre nesse estado: o Server Component do
 * catch-all redireciona qualquer outra rota para cá enquanto
 * `usuario.senha_provisoria_hash` estiver preenchido.
 *
 * O que ela faz é disparar o e-mail de confirmação. A troca em si acontece em
 * `/trocar-senha`, que só abre pelo botão daquele e-mail — por isso não há
 * campo de senha aqui: sem confirmar o endereço, não há o que preencher.
 */
export default function PrimeiroAcessoPage() {
  const { user, logout } = useAuth();

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [esperaSeg, setEsperaSeg] = useState(0);

  const enviar = useCallback(async () => {
    if (!user.email) return;

    setEnviando(true);
    setErro(null);

    const { error } = await authClient.requestPasswordReset({
      email: user.email,
      redirectTo: "/trocar-senha",
    });

    setEnviando(false);

    if (error) {
      setErro("Não conseguimos enviar o e-mail agora. Tente novamente em instantes.");
      return;
    }

    setEnviado(true);
    setEsperaSeg(ESPERA_REENVIO_SEG);
  }, [user.email]);

  // O primeiro envio é automático: a pessoa chegou aqui justamente porque
  // precisa confirmar o e-mail. O `ref` impede o disparo duplicado do
  // StrictMode em desenvolvimento, que mandaria dois e-mails.
  const jaDisparou = useRef(false);
  useEffect(() => {
    if (jaDisparou.current || !user.email) return;
    jaDisparou.current = true;
    void enviar();
  }, [enviar, user.email]);

  // Contagem regressiva do reenvio.
  useEffect(() => {
    if (esperaSeg <= 0) return;
    const id = setTimeout(() => setEsperaSeg((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [esperaSeg]);

  const podeReenviar = !enviando && esperaSeg === 0;

  return (
    <CardAutenticacao
      titulo="Confirme seu e-mail"
      subtitulo="Falta criar a sua senha definitiva"
      rodape={
        <button type="button" onClick={logout} className="underline hover:text-white">
          Sair e entrar com outra conta
        </button>
      }
    >
      <div className="flex w-full flex-col gap-4 text-white">
        <div className="flex items-start gap-3 rounded-md bg-white/5 p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#8DD596]" />
          <div className="space-y-1">
            <p className="text-body">
              {enviado ? "Enviamos um e-mail para" : "Vamos enviar um e-mail para"}{" "}
              <span className="font-medium">{user.email}</span>.
            </p>
            <p className="text-body-sm text-white/70">
              Abra a mensagem e clique no botão de confirmação. Ele leva de volta para a
              plataforma, na tela onde você define a sua nova senha — é o único caminho
              para ela.
            </p>
          </div>
        </div>

        <p className="text-body-sm text-white/70">
          Você entrou com a senha provisória que recebeu no cadastro. Ela deixa de valer
          assim que a senha definitiva for criada.
        </p>

        {erro && (
          <div
            role="alert"
            className="flex w-full items-center gap-2 rounded-md bg-error-50 px-3 py-2 text-body-sm text-error-500"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erro}
          </div>
        )}

        <button
          type="button"
          onClick={enviar}
          disabled={!podeReenviar}
          className={botaoAutenticacao}
        >
          <RefreshCw className={enviando ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
          {textoDoBotao(enviando, enviado, esperaSeg)}
        </button>
      </div>
    </CardAutenticacao>
  );
}

function textoDoBotao(enviando: boolean, enviado: boolean, esperaSeg: number): string {
  if (enviando) return "Enviando...";
  if (esperaSeg > 0) return `Reenviar em ${esperaSeg}s`;
  return enviado ? "Reenviar e-mail de confirmação" : "Enviar e-mail de confirmação";
}
