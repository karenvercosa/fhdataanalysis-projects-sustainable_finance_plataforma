"use client";

import { useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { PhoneField, paisPadraoDoLocale } from "@/components/ui/PhoneField";
import { campo } from "@/components/ui/campo";
import { type RespostaCadastro } from "@/types";

/**
 * Segunda etapa do cadastro por Google.
 *
 * O OAuth traz só nome e e-mail, então os campos obrigatórios do formulário
 * (celular, empresa e cargo) são pedidos aqui, na volta do Google. É também
 * neste passo que a senha provisória é gerada e enviada por e-mail.
 */
export function CompletarCadastro({
  onConcluido,
}: Readonly<{ onConcluido: (descricaoSucesso: string) => void }>) {
  const t = useTranslations("RegisterPage");
  const paisPadrao = paisPadraoDoLocale(useLocale());

  const [form, setForm] = useState({ phone: "", empresa: "", cargo: "", voucher: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const telefoneValido = Boolean(form.phone) && isValidPhoneNumber(form.phone);
  // O voucher segue opcional, como no formulário completo.
  const valid = telefoneValido && form.empresa.trim() && form.cargo.trim();

  const submit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const resp = await fetch("/api/cadastro/completar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone,
          empresa: form.empresa.trim(),
          cargo: form.cargo.trim(),
          voucher: form.voucher.trim(),
        }),
      });
      const dados: RespostaCadastro = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErrorMsg(dados?.error || t("erroCadastro"));
        return;
      }

      if (dados?.emailEnviado === false) onConcluido(t("sucessoEmailFalhou"));
      // Quem já tinha senha (cadastro por e-mail ligado ao Google agora) não
      // recebe outra: `emailEnviado` vem indefinido.
      else if (dados?.emailEnviado) onConcluido(t("sucessoSenhaDesc", { email: dados.email ?? "" }));
      else onConcluido(t("sucessoDesc"));
    } catch {
      setErrorMsg(t("erroCadastro"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <img src="/sf-logo.svg" alt="Sustainable Finance" className="h-12 w-auto" />
        <h1 className="text-h2 text-white">{t("completarTitulo")}</h1>
        <p className="text-body text-white/80">{t("completarDesc")}</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-h5 text-white">{t("labelCelular")}</label>
        <PhoneField
          value={form.phone}
          onChange={(valor) => setForm((f) => ({ ...f, phone: valor }))}
          defaultCountry={paisPadrao}
          inputClassName={campo}
          className="text-white"
          ariaLabel={t("labelCelular")}
        />
        {form.phone.length > 0 && !telefoneValido && (
          <p className="text-body-sm text-red-300">{t("erroCelular")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-h5 text-white">{t("labelEmpresa")}</label>
        <input value={form.empresa} onChange={set("empresa")} placeholder={t("placeholderEmpresa")} className={campo} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-h5 text-white">{t("labelCargo")}</label>
        <input value={form.cargo} onChange={set("cargo")} placeholder={t("placeholderCargo")} className={campo} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-h5 text-white">
          {t("labelVoucher")} <em className="text-body-sm font-normal text-white/70">{t("opcional")}</em>
        </label>
        <input value={form.voucher} onChange={set("voucher")} placeholder={t("placeholderVoucher")} className={campo} />
      </div>

      <p className="flex items-start gap-1.5 rounded-sm bg-white/5 p-3 text-body-sm text-white/80">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
        {t("avisoSenhaEmail")}
      </p>

      <button
        type="submit"
        disabled={!valid || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#8DD596] px-6 py-3 font-semibold text-[#102823] transition-all hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:hover:brightness-100"
      >
        {submitting ? t("btnEnviando") : t("btnConcluirCadastro")} <ArrowRight className="h-4 w-4" />
      </button>

      {errorMsg && <p className="text-center text-body-sm text-red-300">{errorMsg}</p>}
      {!valid && <p className="text-center text-body-sm text-white/70">{t("avisoCamposObrigatorios")}</p>}
    </form>
  );
}
