import { cn } from "@/lib/utils";

/**
 * Toggle do Design System (Figma 2002:328).
 * Trilho 40×24 com padding 3px e botão de 18px; off = neutral/100, hover do
 * off = neutral/400, ligado = primary/default.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Rótulo acessível — a matriz é visual, então não há texto ao lado. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group inline-flex h-6 w-10 shrink-0 items-center rounded-full p-[3px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-100",
        checked
          ? "justify-end bg-[#02976E]"
          : "justify-start bg-[#EDF0F2] hover:bg-[#9AA5B1]",
        disabled && "cursor-not-allowed opacity-40 hover:bg-[#EDF0F2]",
        className
      )}
    >
      <span
        aria-hidden
        className="block size-[18px] rounded-full bg-white shadow-[0_2px_4px_0_rgba(30,30,30,0.12)]"
      />
    </button>
  );
}
