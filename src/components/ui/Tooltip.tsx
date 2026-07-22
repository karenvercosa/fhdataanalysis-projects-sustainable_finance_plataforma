import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tooltip do Design System (Figma 2002:379): balão neutral/text-primary
 * (#102823) com texto branco 12px e uma seta apontando para o elemento.
 *
 * Aparece no hover e no foco (CSS puro, sem estado), acima do filho por padrão.
 * O `children` precisa ser focável/hoverável — normalmente um botão.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  className
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const isTop = side === "top";

  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}

      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2",
          "flex flex-col items-center opacity-0 transition-opacity duration-150",
          "group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          isTop ? "bottom-full mb-1 flex-col" : "top-full mt-1 flex-col-reverse"
        )}
      >
        <span className="whitespace-nowrap rounded-[4px] bg-[#102823] px-3 py-2 text-center text-body-sm leading-none text-white shadow-[0_2px_4px_0_rgba(30,30,30,0.12)]">
          {label}
        </span>
        {/* Seta: triângulo de 8×4 apontando para o elemento */}
        <span
          className={cn(
            "h-0 w-0 border-x-4 border-x-transparent",
            isTop ? "border-t-4 border-t-[#102823]" : "border-b-4 border-b-[#102823]"
          )}
        />
      </span>
    </span>
  );
}
