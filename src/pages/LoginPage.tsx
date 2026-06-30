import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { HOME_BY_ROLE } from "@/lib/roles";

/**
 * Tela de Login — réplica fiel do template do Figma "Tela de Login" (node 4023:664).
 * Fundo: imagem do próprio design system (public/login-bg.png).
 * Card translúcido (primary/header-bg rgba(25,48,43,.9)), inputs neutros,
 * botão "Entrar" em primary/subtle (#8DD596).
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Já autenticado? Não faz sentido ver a tela de login.
  if (isAuthenticated) return <Navigate to="/app" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(email, password);
    if (result.ok && result.role) {
      navigate(HOME_BY_ROLE[result.role]);
    } else {
      setError(result.error ?? "Não foi possível entrar.");
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: "url(/login-bg.png)" }}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex w-[400px] max-w-full flex-col items-center gap-2.5">
          {/* Card */}
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col items-center gap-8 rounded-md bg-[rgba(25,48,43,0.9)] p-6 backdrop-blur-sm"
          >
            {/* Logotipo */}
            <img
              src="/sf-logo.svg"
              alt="Sustainable Finance"
              className="h-[84px] w-auto"
            />

            {/* Título + subtítulo */}
            <div className="flex flex-col items-center gap-2 text-center text-white">
              <h1 className="font-heading text-h2 font-bold">Entre na sua conta</h1>
              <p className="font-body text-body-lg">Acesse a plataforma do evento</p>
            </div>

            {/* Erro de autenticação (Heurística 9) */}
            {error && (
              <div
                role="alert"
                className="flex w-full items-center gap-2 rounded-md bg-error-50 px-3 py-2 text-body-sm text-error-500"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* E-mail */}
            <div className="w-full space-y-2">
              <label htmlFor="email" className="block text-h5 text-white">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="seu@email.com"
                className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-100 px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            {/* Senha */}
            <div className="w-full space-y-2">
              <label htmlFor="password" className="block text-h5 text-white">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-100 px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#8DD596] px-6 py-3 font-body text-button text-[#102823] shadow-card transition hover:brightness-95 active:brightness-90"
            >
              <LogIn className="h-5 w-5" />
              Entrar
            </button>

            {/* Divisor */}
            <div className="flex items-center gap-3 text-body-sm text-white/60">
              <span className="h-px flex-1 bg-white/20" /> ou <span className="h-px flex-1 bg-white/20" />
            </div>

            {/* Login social (Google) */}
            <button
              type="button"
              onClick={() => {
                loginWithGoogle();
                navigate(HOME_BY_ROLE.guest);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-white px-6 py-3 font-body text-button text-neutral-900 shadow-card transition hover:bg-neutral-50"
            >
              <GoogleIcon />
              Continuar com Google
            </button>
          </form>

          {/* Auxiliar */}
          <div className="flex w-full items-center justify-between p-2.5 text-white">
            <label className="flex cursor-pointer items-center gap-2 text-body">
              <input
                type="checkbox"
                className="h-5 w-5 rounded-sm border-[1.5px] border-neutral-200 accent-primary-500"
              />
              Lembrar de mim
            </label>
            <button type="button" className="text-body underline hover:text-primary-200">
              Esqueceu a senha?
            </button>
          </div>

          {/* Cadastro (onboarding Fase 1) */}
          <p className="w-full text-center text-body-sm text-white/80">
            Não tem conta?{" "}
            <Link to="/cadastro" className="font-medium text-white underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
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
