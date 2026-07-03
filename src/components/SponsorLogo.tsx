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
