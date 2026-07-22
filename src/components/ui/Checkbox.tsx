import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox do Design System (Figma 2002:313).
 * Caixa 20×20, borda 1.5px e raio 4px. Base/marcado usam neutral/border-default;
 * o hover escurece a borda para neutral/400. O "check" é primary/default.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled,
  id,
  className,
  labelClassName
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Texto ao lado. Sem ele, passe `aria-label` via `label`. */
  label: React.ReactNode;
  hint?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Cor/tamanho do rótulo — necessário sobre fundos escuros. */
  labelClassName?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      {/* O input real fica invisível, mas continua sendo o alvo do rótulo,
          do teclado e dos leitores de tela. */}
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 z-10 size-5 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden
          className={cn(
            "grid size-5 place-items-center rounded-[4px] border-[1.5px] bg-white transition-colors",
            "border-[#E1E5E8] peer-hover:border-[#9AA5B1]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-100",
            disabled && "opacity-40"
          )}
        >
          <Check
            className={cn(
              "size-4 text-[#02976E] transition-opacity",
              checked ? "opacity-100" : "opacity-0"
            )}
            strokeWidth={3}
          />
        </span>
      </span>

      <label htmlFor={inputId} className={cn("cursor-pointer", disabled && "cursor-not-allowed opacity-60")}>
        <span className={cn("block text-body-sm text-neutral-700", labelClassName)}>{label}</span>
        {hint && <span className="block text-body-sm text-neutral-500">{hint}</span>}
      </label>
    </div>
  );
}
