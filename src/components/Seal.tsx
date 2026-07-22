import { Avatar } from "@/components/ui";
import { SEAL, type SealKind } from "@/lib/seals";
import { cn } from "@/lib/utils";

/** Tag colorida do papel (Palestrante / Curador / Patrocinador). */
export function SealBadge({ seal, className }: { seal?: SealKind; className?: string }) {
  if (!seal) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-body-sm font-medium",
        SEAL[seal].badge,
        className
      )}
    >
      {SEAL[seal].label}
    </span>
  );
}

/**
 * Foto com anel na cor do selo. Sem selo, cai no Avatar comum — assim dá para
 * usar em listas mistas sem condicional em cada ponto de uso.
 */
export function SealAvatar({
  name,
  src,
  seal,
  size = "md",
  className
}: {
  name: string;
  src?: string;
  seal?: SealKind;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Avatar
      name={name}
      src={src}
      size={size}
      className={cn(seal && SEAL[seal].ring, className)}
    />
  );
}

/** Legenda das cores — usada onde vários selos convivem (ex.: Networking). */
export function SealLegend({ seals, className }: { seals: SealKind[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {seals.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5 text-body-sm text-neutral-600">
          <span className={cn("h-2.5 w-2.5 rounded-full", SEAL[s].dot)} aria-hidden />
          {SEAL[s].label}
        </span>
      ))}
    </div>
  );
}
