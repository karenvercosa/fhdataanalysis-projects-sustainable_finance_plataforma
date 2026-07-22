import { companyTier } from "@/data/networking";
import { cn } from "@/lib/utils";

// Cores da "logo" (monograma) por cota de patrocínio.
const TIER_STYLE: Record<"Ouro" | "Prata", string> = {
  Ouro: "bg-[#E6A100] text-white ring-[#C98F00]",
  Prata: "bg-[#8794A1] text-white ring-[#6B7684]"
};

function monogram(name: string) {
  const caps = name.replace(/[^A-Za-zÀ-ÿ]/g, "").match(/[A-ZÀ-Ý]/g);
  const mono = caps && caps.length >= 2 ? caps.slice(0, 2).join("") : name.slice(0, 2);
  return mono.toUpperCase();
}

/**
 * Logo do patrocinador na programação — exibida apenas para empresas
 * Ouro ou Prata. Sem asset de imagem, usa um monograma tintado pela cota.
 */
export function SponsorLogo({ name, size = "sm" }: { name?: string; size?: "sm" | "md" }) {
  const tier = companyTier(name);
  if (!name || (tier !== "Ouro" && tier !== "Prata")) return null;
  const dim = size === "md" ? "h-8 w-8 text-[11px]" : "h-7 w-7 text-[10px]";
  return (
    <span
      title={`${name} · Patrocinador ${tier}`}
      aria-label={`Patrocinador ${tier}: ${name}`}
      className={cn(
        "grid shrink-0 place-items-center rounded-md font-heading font-bold ring-1",
        dim,
        TIER_STYLE[tier]
      )}
    >
      {monogram(name)}
    </span>
  );
}

/**
 * Marca da empresa "dona" da pauta, em destaque no popup de detalhamento.
 * Diferente da `SponsorLogo`, aparece para QUALQUER empresa — a cota apenas
 * tinge a marca quando existe (Ouro/Prata).
 */
export function CompanyMark({ name, className }: { name: string; className?: string }) {
  const tier = companyTier(name);
  const style =
    tier === "Ouro" || tier === "Prata" ? TIER_STYLE[tier] : "bg-neutral-600 text-white ring-neutral-900";
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-12 w-12 shrink-0 place-items-center rounded-md font-heading text-h4 font-bold ring-1",
        style,
        className
      )}
    >
      {monogram(name)}
    </span>
  );
}
