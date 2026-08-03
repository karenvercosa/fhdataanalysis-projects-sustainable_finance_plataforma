"use client";

import { cn } from "@/lib/utils";

/**
 * Moldura das telas de autenticação fora do AppShell (primeiro acesso, troca
 * de senha e recuperação).
 *
 * É o mesmo card translúcido do Login e do Cadastro — fundo `login-bg.png`,
 * `rgba(25,48,43,.9)` e logotipo no topo —, extraído para que as três telas
 * novas não repitam o layout nem saiam do padrão quando ele mudar.
 */
export function CardAutenticacao({
  titulo,
  subtitulo,
  children,
  rodape,
  className,
}: Readonly<{
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  className?: string;
}>) {
  return (
    <div
      className="min-h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: "url(/login-bg.png)" }}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex w-[400px] max-w-full flex-col items-center gap-2.5">
          <div
            className={cn(
              "flex w-full flex-col items-center gap-6 rounded-md bg-[rgba(25,48,43,0.9)] p-6 backdrop-blur-sm",
              className,
            )}
          >
            <img
              src="/sf-logo.svg"
              alt="Sustainable Finance"
              className="h-14 max-w-[150px] w-auto"
            />

            <div className="flex flex-col items-center gap-2 text-center text-white">
              <h1 className="font-heading text-h2 font-bold">{titulo}</h1>
              {subtitulo && <p className="font-body text-body-lg">{subtitulo}</p>}
            </div>

            {children}
          </div>

          {rodape && (
            <div className="w-full text-center text-body-sm text-white/80">{rodape}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Campo de texto no padrão dos formulários de autenticação. */
export const campoAutenticacao =
  "h-10 w-full rounded-md border border-neutral-200 bg-neutral-100 px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

/** Botão primário no padrão do "Entrar". */
export const botaoAutenticacao =
  "flex w-full items-center justify-center gap-2 rounded-sm bg-[#8DD596] px-6 py-3 font-body text-button text-[#102823] shadow-card transition hover:brightness-95 active:brightness-90 disabled:opacity-60";
