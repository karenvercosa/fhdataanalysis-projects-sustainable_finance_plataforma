import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Radio do Design System (Figma 2002:320).
 * Círculo 20×20 com borda 1.5px; marcado mostra um ponto de 10px em
 * primary/default. No hover o ponto aparece esmaecido, antecipando a escolha.
 */
export function Radio({
  checked,
  onChange,
  label,
  hint,
  name,
  value,
  disabled,
  id,
  className
}: {
  checked: boolean;
  onChange: (value: string) => void;
  label: React.ReactNode;
  hint?: string;
  /** Agrupa as opções — obrigatório para a navegação por setas funcionar. */
  name: string;
  value: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={inputId}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={() => onChange(value)}
          className="peer absolute inset-0 z-10 size-5 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden
          className={cn(
            "grid size-5 place-items-center rounded-full border-[1.5px] bg-white transition-colors",
            "border-[#E1E5E8] peer-hover:border-[#9AA5B1]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-100",
            disabled && "opacity-40"
          )}
        >
          <span
            className={cn(
              "size-2.5 rounded-full bg-[#02976E] transition-opacity",
              checked ? "opacity-100" : "opacity-0 peer-hover:opacity-30"
            )}
          />
        </span>
      </span>

      <label htmlFor={inputId} className={cn("cursor-pointer", disabled && "cursor-not-allowed opacity-60")}>
        <span className="block text-body-sm text-neutral-700">{label}</span>
        {hint && <span className="block text-body-sm text-neutral-500">{hint}</span>}
      </label>
    </div>
  );
}
