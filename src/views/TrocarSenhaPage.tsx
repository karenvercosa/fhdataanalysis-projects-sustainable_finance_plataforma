"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui";
import { validarSenha } from "@/lib/politica-senha";
import { CampoSenha } from "@/components/auth/CampoSenha";
import {
  CardAutenticacao,
  botaoAutenticacao,
} from "@/components/auth/CardAutenticacao";

/** Volta para o login sinalizando que o link não serve mais. */
const LOGIN_TOKEN_INVALIDO = "/login?erro=token-invalido";

/**
 * Troca de senha — o destino do botão do e-mail de confirmação.
 *
 * A tela existe atrás de um token de uso único: o link do e-mail passa por
 * `/api/auth/reset-password/:token`, que valida o token e devolve para cá com
 * `?token=...`; o Server Component do catch-all confere de novo antes de
 * entregar a página. Quem digitar `/trocar-senha` na barra de endereço não
 * chega aqui — cai no login.
 *
 * Serve aos dois fluxos com o mesmo formulário: o primeiro acesso (senha ainda
 * provisória) e o "esqueci a senha". Salvar a senha nova apaga a provisória e
 * já abre a sessão — quem provou ter acesso ao e-mail e acabou de definir a
 * senha entra direto na plataforma, sem passar pelo login de novo.
 */
export default function TrocarSenhaPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token") ?? "";

  // O pop-up de e-mail confirmado é a primeira coisa que a pessoa vê: é o
  // retorno visível de ter clicado no botão do e-mail.
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(true);

  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /**
   * Sem token não há o que trocar: o servidor já barra esta rota, mas uma
   * navegação client-side dentro da SPA não passa por ele. Aqui a pessoa é
   * devolvida ao login com o erro, em vez de encarar um formulário que não
   * teria como funcionar.
   */
  useEffect(() => {
    if (!token) window.location.assign(LOGIN_TOKEN_INVALIDO);
  }, [token]);

  if (!token) return null;

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    const invalida = validarSenha(senha);
    if (invalida) {
      setErro(invalida);
      return;
    }
    if (senha !== repetir) {
      setErro("As senhas não conferem.");
      return;
    }

    setEnviando(true);
    setErro(null);

    // O servidor grava a senha e abre a sessão no mesmo passo: ao salvar, a
    // pessoa já entra na plataforma, sem passar de novo pelo login.
    const resp = await fetch("/api/senha/definir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, senha }),
    });
    const dados = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      // Token queimado (expirado, já usado ou de uma conta que não existe
      // mais): não adianta insistir no formulário — o caminho é pedir outro
      // e-mail, e o recado sai na tela de login.
      if (dados?.code === "INVALID_TOKEN") {
        window.location.assign(LOGIN_TOKEN_INVALIDO);
        return;
      }

      // Erro que a pessoa consegue corrigir aqui mesmo (a política de senha,
      // por exemplo): a mensagem fica no formulário, com o que foi digitado.
      setEnviando(false);
      setErro(dados?.error || "Não foi possível salvar a senha. Tente novamente.");
      return;
    }

    // Recarrega pelo servidor para o middleware e o Server Component
    // reavaliarem a rota já com a sessão nova.
    window.location.assign(dados?.destino || "/inicio");
  };

  return (
    <>
      <CardAutenticacao
        titulo="Crie sua senha"
        subtitulo="Ao salvar, você já entra na plataforma"
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

          <CampoSenha
            id="senha-nova"
            label="Nova senha"
            autoComplete="new-password"
            value={senha}
            onChange={(valor) => {
              setSenha(valor);
              setErro(null);
            }}
            ajuda="Mínimo de 8 caracteres, com maiúscula, minúscula, número e caractere especial."
          />

          <CampoSenha
            id="senha-repetir"
            label="Repita a nova senha"
            autoComplete="new-password"
            value={repetir}
            onChange={(valor) => {
              setRepetir(valor);
              setErro(null);
            }}
          />

          <button type="submit" disabled={enviando} className={botaoAutenticacao}>
            <KeyRound className="h-5 w-5" />
            {enviando ? "Entrando..." : "Salvar senha e entrar"}
          </button>
        </form>
      </CardAutenticacao>

      <Modal
        open={confirmacaoAberta}
        onClose={() => setConfirmacaoAberta(false)}
        title="E-mail confirmado"
        footer={
          <button
            type="button"
            onClick={() => setConfirmacaoAberta(false)}
            className="rounded-sm bg-[#8DD596] px-4 py-2 font-body text-button text-[#102823]"
          >
            Criar minha senha
          </button>
        }
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary-600" />
          <p className="text-body text-neutral-700">
            Seu e-mail foi confirmado com sucesso. Agora escolha a senha que você vai
            usar para entrar na plataforma.
          </p>
        </div>
      </Modal>
    </>
  );
}
