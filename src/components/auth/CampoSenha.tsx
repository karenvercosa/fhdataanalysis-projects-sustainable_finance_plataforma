"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { campoAutenticacao } from "@/components/auth/CardAutenticacao";
import { cn } from "@/lib/utils";

/**
 * Campo de senha com o olho de mostrar/ocultar.
 *
 * Digitar uma senha às cegas é a maior fonte de erro de digitação nestas
 * telas — ainda mais nas duas em que a pessoa está criando a senha e precisa
 * repeti-la. O botão alterna o `type` do input entre `password` e `text`.
 *
 * O `aria-pressed` comunica o estado a quem usa leitor de tela, e o rótulo do
 * botão muda junto: sem isso, o ícone sozinho não diz se a senha está visível.
 * `tabIndex={-1}` mantém o Tab indo direto para o próximo campo, sem esbarrar
 * no botão no meio do preenchimento.
 */
export function CampoSenha({
  id,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  ajuda,
  className,
}: Readonly<{
  id?: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  autoComplete?: string;
  ajuda?: string;
  className?: string;
}>) {
  const gerado = useId();
  const campoId = id ?? gerado;
  const [visivel, setVisivel] = useState(false);

  return (
    <div className={cn("w-full space-y-2", className)}>
      <label htmlFor={campoId} className="block text-h5 text-white">
        {label}
      </label>

      <div className="relative">
        <input
          id={campoId}
          type={visivel ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          // O padding à direita reserva o espaço do botão para o texto da
          // senha nunca passar por baixo do ícone.
          className={cn(campoAutenticacao, "pr-11")}
        />

        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-neutral-500 transition-colors hover:text-neutral-900"
        >
          {visivel ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      {ajuda && <p className="text-body-sm text-white/70">{ajuda}</p>}
    </div>
  );
}
