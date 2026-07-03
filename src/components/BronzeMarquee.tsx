import { BRONZE_SPONSORS } from "@/data/sponsorAds";

function monogram(name: string) {
  const caps = name.match(/[A-ZÀ-Ý]/g);
  return (caps && caps.length >= 2 ? caps.slice(0, 2).join("") : name.slice(0, 2)).toUpperCase();
}

// Logo pequena (monograma) — cor neutra: a cota (Bronze) não fica aparente.
function BronzeLogo({ name }: { name: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 px-2">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-neutral-400 text-[11px] font-bold text-white ring-1 ring-black/5">
        {monogram(name)}
      </span>
      <span className="text-body-sm font-medium text-neutral-500">{name}</span>
    </span>
  );
}

/**
 * Esteira (marquee) de logos menores dos patrocinadores Bronze, rolando no
 * rodapé da tela inicial. A lista é duplicada para o loop ficar contínuo.
 */
export function BronzeMarquee() {
  if (!BRONZE_SPONSORS.length) return null;
  const items = [...BRONZE_SPONSORS, ...BRONZE_SPONSORS];

  return (
    <section aria-label="Patrocinadores" className="space-y-2">
      <p className="text-center text-body-sm font-medium uppercase tracking-wide text-neutral-400">
        Patrocinadores
      </p>
      <div className="relative overflow-hidden rounded-lg border border-neutral-100 bg-white py-3">
        {/* Máscaras de fade nas laterais */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent" />
        <div className="sf-marquee-track gap-8">
          {items.map((name, i) => (
            <BronzeLogo key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}
