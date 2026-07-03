import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { useAuth, type Phase1Data } from "@/context/AuthContext";
import { useInterests } from "@/context/InterestsContext";
import { HOME_BY_ROLE } from "@/lib/roles";
import { cn } from "@/lib/utils";

/**
 * Onboarding FASE 1 (frictionless): dados essenciais + nuvem de interesses.
 * Empresa, cargo e ingresso ficam para a Fase 2 (no checkout).
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerGuest, loginWithGoogle, isAuthenticated } = useAuth();
  const { interests } = useInterests();
  const [form, setForm] = useState<Phase1Data>({ firstName: "", lastName: "", email: "", phone: "" });
  const [chosen, setChosen] = useState<string[]>([]);

  if (isAuthenticated) return <Navigate to="/app" replace />;

  const set = (k: keyof Phase1Data) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleInterest = (tag: string) =>
    setChosen((c) => (c.includes(tag) ? c.filter((t) => t !== tag) : [...c, tag]));

  const valid =
    form.firstName.trim() && form.lastName.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim().length >= 8;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    // Interesses definidos no cadastro — grava direto (o navigate desmonta a página).
    try {
      localStorage.setItem("sf_profile", JSON.stringify({ headline: "", company: "", bio: "", interests: chosen }));
    } catch {
      /* storage indisponível */
    }
    registerGuest(form);
    navigate(HOME_BY_ROLE.guest);
  };

  const field =
    "h-10 w-full rounded-md border border-neutral-200 bg-neutral-100 px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100";

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <img src="/login-bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-md space-y-6 rounded-md bg-[rgba(25,48,43,0.92)] p-6 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/sf-logo.svg" alt="Sustainable Finance" className="h-16" />
          <h1 className="text-h2 text-white">Crie sua conta</h1>
          <p className="text-body text-white/80">Acesso gratuito ao streaming do evento</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-h5 text-white">Nome</label>
            <input value={form.firstName} onChange={set("firstName")} placeholder="Seu nome" className={field} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-h5 text-white">Sobrenome</label>
            <input value={form.lastName} onChange={set("lastName")} placeholder="Seu sobrenome" className={field} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-h5 text-white">E-mail</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com" className={field} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-h5 text-white">Celular</label>
          <input value={form.phone} onChange={set("phone")} placeholder="(00) 00000-0000" className={field} />
          <p className="flex items-center gap-1.5 text-body-sm text-white/70">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Usamos seu celular exclusivamente para confirmação de segurança.
          </p>
        </div>

        {/* Nuvem de interesses (definida no cadastro) */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-h5 text-white">
            <Sparkles className="h-4 w-4" /> Seus interesses
          </label>
          <p className="text-body-sm text-white/70">
            Selecione os temas que mais te interessam — usamos para sugestões e networking.
          </p>
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
                      : "border-white/30 text-white/90 hover:border-white/60"
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={!valid}
          className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#8DD596] px-6 py-3 text-button text-[#102823] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Criar conta e acessar <ArrowRight className="h-4 w-4" />
        </button>

        {/* Divisor + cadastro social */}
        <div className="flex items-center gap-3 text-body-sm text-white/60">
          <span className="h-px flex-1 bg-white/20" /> ou <span className="h-px flex-1 bg-white/20" />
        </div>
        <button
          type="button"
          onClick={() => {
            loginWithGoogle();
            navigate(HOME_BY_ROLE.guest);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-sm bg-white px-6 py-3 text-button text-neutral-900 transition hover:bg-neutral-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 35.8 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z" />
          </svg>
          Continuar com Google
        </button>

        <p className="text-center text-body-sm text-white/80">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-white underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
