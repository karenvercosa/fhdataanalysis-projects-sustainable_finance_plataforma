import { cn } from "@/lib/utils";

/** Loader circular (DS) — Visibilidade do status do sistema (Heurística 1). */
export function Loader({ className, label = "Carregando…" }: { className?: string; label?: string }) {
  return (
    <div role="status" className={cn("inline-flex items-center gap-2 text-neutral-600", className)}>
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-500" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
