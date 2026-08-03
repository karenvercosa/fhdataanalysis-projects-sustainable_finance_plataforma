"use client";

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldCheck, ArrowRight, Sparkles, Building2, KeyRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { useInterests } from "@/context/InterestsContext";
import { Checkbox } from "@/components/ui";
import { PhoneField, paisPadraoDoLocale } from "@/components/ui/PhoneField";
import { campo as field } from "@/components/ui/campo";
import { SuccessCard } from "@/components/ui/SuccessCard";
import { CompletarCadastro } from "@/components/CompletarCadastro";
import { LegalModal } from "@/components/legal/LegalModal";
import { CONSENTIMENTO_KEY, type LegalDocId } from "@/data/legal";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { caminhoInternoSeguro } from "@/lib/safe-redirect";
import { EMAIL_REGEX } from "@/lib/cadastro";
import { type DadosCadastro, type RespostaCadastro } from "@/types";

/**
 * Onboarding: dados essenciais, vínculo corporativo (empresa e cargo),
 * voucher e nuvem de interesses.
 *
 * A pessoa NÃO escolhe senha — o servidor gera uma provisória e a envia por
 * e-mail para o primeiro acesso. É o mesmo fluxo do cadastro da landing page,
 * gravando na mesma tabela `usuario` do mesmo banco: quem se cadastrar num dos
 * dois entra no outro com as mesmas credenciais.
 */
export default function RegisterPage() {
  const t = useTranslations("RegisterPage");
  const paisPadrao = paisPadraoDoLocale(useLocale());
  const location = useLocation();
  const { interests } = useInterests();

  const [form, setForm] = useState<DadosCadastro>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    empresa: "",
    cargo: "",
    voucher: "",
  });
  const [chosen, setChosen] = useState<string[]>([]);
  // Consentimentos LGPD, ambos desmarcados por padrão.
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aceiteMarketing, setAceiteMarketing] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Descrição do card de sucesso: muda conforme o caminho (e-mail com a senha
  // provisória, Google, ou senha criada mas não entregue por falha no SMTP).
  const [sucessoDesc, setSucessoDesc] = useState<string | null>(null);

  // O login com Google usa redirecionamento OAuth (recarrega a página). Ao
  // voltar do Google com o marcador `?cadastro=sucesso`, o cadastro ainda
  // está pela metade: o OAuth traz só nome e e-mail. Então em vez do card de
  // sucesso mostramos a segunda etapa, que pede celular, empresa e cargo e
  // dispara a senha provisória por e-mail.
  const [completandoGoogle, setCompletandoGoogle] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("cadastro") === "sucesso") setCompletandoGoogle(true);
  }, [location.search]);

  // Controle de abas
  const [activeTab, setActiveTab] = useState<"participante" | "patrocinador">("participante");

  const set = (k: keyof DadosCadastro) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleInterest = (tag: string) =>
    setChosen((c) => (c.includes(tag) ? c.filter((t) => t !== tag) : [...c, tag]));

  const emailValido = EMAIL_REGEX.test(form.email);

  // O celular chega em E.164 do seletor de país, então a validação é a da
  // própria biblioteca — cada país tem um comprimento diferente.
  const telefoneValido = Boolean(form.phone) && isValidPhoneNumber(form.phone);

  // Todos os campos são obrigatórios, menos o voucher; sem o aceite dos Termos
  // não há cadastro — o consentimento de marketing também é facultativo.
  const valid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    emailValido &&
    telefoneValido &&
    form.empresa.trim() &&
    form.cargo.trim() &&
    aceiteTermos;

  const submit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      // A senha não é digitada aqui: o servidor gera uma provisória e a envia
      // por e-mail para o primeiro acesso à plataforma.
      const resp = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          empresa: form.empresa.trim(),
          cargo: form.cargo.trim(),
          voucher: form.voucher.trim(),
        }),
      });
      const dados: RespostaCadastro = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErrorMsg(dados?.error || t("erroCadastro"));
        setSubmitting(false);
        return;
      }

      setSucessoDesc(
        dados?.emailEnviado === false
          ? t("sucessoEmailFalhou")
          : t("sucessoSenhaDesc", { email: form.email.trim().toLowerCase() }),
      );

      // Interesses e prova de consentimento (o que foi aceito, por quem e quando).
      try {
        localStorage.setItem(
          "sf_profile",
          JSON.stringify({ headline: "", company: form.empresa.trim(), bio: "", interests: chosen }),
        );
        localStorage.setItem(
          CONSENTIMENTO_KEY,
          JSON.stringify({
            email: form.email.trim().toLowerCase(),
            termos: true,
            marketing: aceiteMarketing,
            aceitoEm: new Date().toISOString(),
          }),
        );
      } catch {
        /* storage indisponível */
      }

      setSuccess(true);
    } catch {
      setErrorMsg(t("erroCadastro"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Volta para a MESMA rota atual com o marcador de sucesso. O caminho
      // passa por `caminhoInternoSeguro` para que uma URL preparada por
      // terceiros não transforme o retorno do OAuth num salto para fora do
      // site (open redirect).
      const rota = caminhoInternoSeguro(window.location.pathname, "/cadastro");
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${rota}?cadastro=sucesso`,
      });
    } catch {
      setErrorMsg(t("erroCadastro"));
    }
  };

  // Segunda etapa do cadastro por Google — mesmo card da página.
  if (completandoGoogle && !success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <img src="/login-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative z-10 w-full max-w-md space-y-6 rounded-md bg-[rgba(25,48,43,0.92)] p-6 backdrop-blur-sm shadow-xl">
          <CompletarCadastro
            onConcluido={(descricao) => {
              setSucessoDesc(descricao);
              setSuccess(true);
            }}
          />
        </div>
      </div>
    );
  }

  // Tela de confirmação após o cadastro — mesmo padrão de card da página.
  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <img src="/login-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative z-10 w-full max-w-md space-y-6 rounded-md bg-[rgba(25,48,43,0.92)] p-6 backdrop-blur-sm shadow-xl">
          <SuccessCard
            title={t("sucessoTitulo")}
            desc={sucessoDesc ?? t("sucessoDesc")}
            btnText={t("btnVoltarInicio")}
            to="/login"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <img src="/login-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-md space-y-6 rounded-md bg-[rgba(25,48,43,0.92)] p-6 backdrop-blur-sm shadow-xl"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/sf-logo.svg" alt="Sustainable Finance" className="h-16" />
          <h1 className="text-h2 text-white">{t("titulo")}</h1>
          <p className="text-body text-white/80">{t("subtitulo")}</p>
        </div>

        {/* Abas */}
        <div className="flex w-full overflow-hidden rounded-md border border-white/20 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("participante")}
            className={cn(
              "flex-1 rounded-sm py-2 text-center text-body-sm font-medium transition-all duration-300",
              activeTab === "participante"
                ? "bg-[#8DD596] text-[#102823] shadow-sm"
                : "text-white hover:bg-white/10",
            )}
          >
            {t("abaParticipante")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("patrocinador")}
            className={cn(
              "flex-1 rounded-sm py-2 text-center text-body-sm font-medium transition-all duration-300",
              activeTab === "patrocinador"
                ? "bg-[#8DD596] text-[#102823] shadow-sm"
                : "text-white hover:bg-white/10",
            )}
          >
            {t("abaPatrocinador")}
          </button>
        </div>

        {activeTab === "patrocinador" ? (
          <div className="flex animate-in fade-in zoom-in-95 flex-col items-center gap-4 py-6 text-center duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[#8DD596]">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-h3 text-white">{t("patrocinadorTitulo")}</h2>
              <p className="text-body-sm text-white/80">{t("patrocinadorDesc")}</p>
            </div>
            {/* O contato comercial de patrocínio acontece na landing page,
                onde mora o formulário que dispara o e-mail para o time. */}
            <a
              href="https://sustainablefinance.com.br/#patrocinar"
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-[#8DD596] px-6 py-3 font-semibold text-[#102823] shadow-card transition-all hover:brightness-110 active:brightness-95"
            >
              {t("btnQueroPatrocinar")} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-h5 text-white">{t("labelNome")}</label>
                <input value={form.firstName} onChange={set("firstName")} placeholder={t("placeholderNome")} className={field} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-h5 text-white">{t("labelSobrenome")}</label>
                <input value={form.lastName} onChange={set("lastName")} placeholder={t("placeholderSobrenome")} className={field} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-h5 text-white">{t("labelEmail")}</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder={t("placeholderEmail")} className={field} />
              {form.email.length > 0 && !emailValido && (
                <p className="text-body-sm text-red-300">{t("erroEmail")}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-h5 text-white" htmlFor="cadastro-celular">{t("labelCelular")}</label>
              <PhoneField
                value={form.phone}
                onChange={(valor) => setForm((f) => ({ ...f, phone: valor }))}
                defaultCountry={paisPadrao}
                inputClassName={field}
                className="text-white"
                ariaLabel={t("labelCelular")}
              />
              {form.phone.length > 0 && !telefoneValido && (
                <p className="text-body-sm text-red-300">{t("erroCelular")}</p>
              )}
              <p className="flex items-center gap-1.5 text-body-sm text-white/70">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {t("segurancaCelular")}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-h5 text-white">{t("labelEmpresa")}</label>
              <input value={form.empresa} onChange={set("empresa")} placeholder={t("placeholderEmpresa")} className={field} />
            </div>

            <div className="space-y-1.5">
              <label className="block text-h5 text-white">{t("labelCargo")}</label>
              <input value={form.cargo} onChange={set("cargo")} placeholder={t("placeholderCargo")} className={field} />
            </div>

            <div className="space-y-1.5">
              <label className="block text-h5 text-white">
                {t("labelVoucher")} <em className="text-body-sm font-normal text-white/70">{t("opcional")}</em>
              </label>
              <input value={form.voucher} onChange={set("voucher")} placeholder={t("placeholderVoucher")} className={field} />
              <p className="text-body-sm text-white/70">{t("voucherAjuda")}</p>
            </div>

            {/* A senha não é escolhida aqui: chega por e-mail após o cadastro. */}
            <p className="flex items-start gap-1.5 rounded-sm bg-white/5 p-3 text-body-sm text-white/80">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
              {t("avisoSenhaEmail")}
            </p>

            {/* Nuvem de interesses (definida no cadastro) */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-h5 text-white">
                <Sparkles className="h-4 w-4" /> {t("interessesTitulo")}
              </label>
              <p className="text-body-sm text-white/70">{t("interessesDesc")}</p>
              <div className="flex flex-wrap gap-2">
                {interests.map((tag) => {
                  const active = chosen.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-body-sm transition-colors",
                        active
                          ? "border-[#8DD596] bg-[#8DD596] text-[#102823]"
                          : "border-white/30 text-white/90 hover:border-white/60",
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Consentimentos LGPD — o de marketing é opcional e independente */}
            <div className="space-y-3">
              <Checkbox
                checked={aceiteTermos}
                onChange={setAceiteTermos}
                labelClassName="text-white/85"
                label={
                  <>
                    {t("termos1")}{" "}
                    <button type="button" onClick={() => setLegalDoc("termos")} className="font-medium underline hover:text-white">
                      {t("termosLink")}
                    </button>{" "}
                    {t("termos2")}{" "}
                    <button type="button" onClick={() => setLegalDoc("privacidade")} className="font-medium underline hover:text-white">
                      {t("privacidadeLink")}
                    </button>
                    .
                  </>
                }
              />

              <Checkbox
                checked={aceiteMarketing}
                onChange={setAceiteMarketing}
                labelClassName="text-white/70"
                label={
                  <>
                    {t("marketing")} <em>{t("opcional")}</em>
                  </>
                }
              />
            </div>

            <button
              type="submit"
              disabled={!valid || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#8DD596] px-6 py-3 font-semibold text-[#102823] transition-all hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:hover:brightness-100"
            >
              {submitting ? t("btnEnviando") : t("btnCriarConta")} <ArrowRight className="h-4 w-4" />
            </button>
            {errorMsg && <p className="text-center text-body-sm text-red-300">{errorMsg}</p>}
            {!aceiteTermos && (
              <p className="text-center text-body-sm text-white/70">{t("avisoTermos")}</p>
            )}
            {aceiteTermos && !valid && (
              <p className="text-center text-body-sm text-white/70">{t("avisoCamposObrigatorios")}</p>
            )}

            {/* Divisor + cadastro social */}
            <div className="flex items-center gap-3 text-body-sm text-white/60">
              <span className="h-px flex-1 bg-white/20" /> {t("ou")} <span className="h-px flex-1 bg-white/20" />
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-white px-6 py-3 font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              <GoogleIcon />
              {t("btnGoogle")}
            </button>
          </div>
        )}

        <p className="text-center text-body-sm text-white/80">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-white underline hover:text-[#8DD596] transition-colors">
            Entrar
          </Link>
        </p>
      </form>

      <LegalModal open={!!legalDoc} onClose={() => setLegalDoc(null)} docInicial={legalDoc ?? "termos"} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 35.8 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
