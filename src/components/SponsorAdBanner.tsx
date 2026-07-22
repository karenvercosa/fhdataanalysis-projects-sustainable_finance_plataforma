import { useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { SPONSOR_ADS, SPONSOR_ADS_KEY, type SponsorAd } from "@/data/sponsorAds";
import { cn } from "@/lib/utils";

// Estilo ÚNICO para todas as divulgações — a cota (Ouro/Prata) não deve ficar
// aparente para os participantes; é apenas uma regra interna de exibição (2:1).
const AD_GRADIENT = "from-[#33404D] to-[#1F2933]";

const ROTATE_MS = 6000;

function monogram(name: string) {
  const caps = name.match(/[A-ZÀ-Ý]/g);
  return (caps && caps.length >= 2 ? caps.slice(0, 2).join("") : name.slice(0, 2)).toUpperCase();
}

/**
 * Banner rotativo de divulgações dos patrocinadores Ouro/Prata (gerido no Admin).
 * Proporção 2:1 — para cada divulgação Prata, duas Ouro (padrão [Ouro, Ouro, Prata]).
 */
export function SponsorAdBanner() {
  // Divulgações persistidas (editáveis em Admin → Divulgações).
  const [ads] = usePersistentState<SponsorAd[]>(SPONSOR_ADS_KEY, SPONSOR_ADS);

  // Playlist já na proporção 2:1, com round-robin entre os anúncios de cada cota.
  const playlist = useMemo<SponsorAd[]>(() => {
    const gold = ads.filter((a) => a.tier === "Ouro");
    const silver = ads.filter((a) => a.tier === "Prata");
    if (!gold.length) return silver;
    if (!silver.length) return gold;
    const slots = 3 * Math.max(gold.length, silver.length);
    const out: SponsorAd[] = [];
    let gi = 0, si = 0;
    for (let i = 0; i < slots; i++) {
      if (i % 3 === 2) out.push(silver[si++ % silver.length]);
      else out.push(gold[gi++ % gold.length]);
    }
    return out;
  }, [ads]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || playlist.length <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % playlist.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, playlist.length]);

  if (!playlist.length) return null;
  const ad = playlist[index % playlist.length];

  return (
    <section
      aria-label="Divulgação de patrocinadores"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "relative flex h-[192px] flex-col overflow-hidden rounded-lg bg-gradient-to-r p-4 text-white shadow-card sm:h-[184px] sm:p-5",
        AD_GRADIENT
      )}
    >
      {/* Selo de publicidade (sem revelar a cota do patrocinador) */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          <Megaphone className="h-3 w-3" /> Publicidade
        </span>
      </div>

      {/* Área central de altura flexível — mantém o banner sempre do mesmo tamanho */}
      <div className="flex flex-1 items-center gap-4">
        {/* Arquivo enviado no Admin; sem ele, cai no monograma da empresa */}
        {ad.image ? (
          <img
            src={ad.image}
            alt={ad.company}
            className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-white/30"
          />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-white/15 font-heading text-h3 font-bold ring-1 ring-white/30">
            {monogram(ad.company)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-white/80">{ad.company}</p>
          <p className="line-clamp-2 text-h4 leading-snug text-white">{ad.headline}</p>
          <p className="mt-0.5 line-clamp-2 text-body-sm text-white/85">{ad.subtext}</p>
        </div>
      </div>

      {/* Indicadores / navegação */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {playlist.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Ir para divulgação ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            )}
          />
        ))}
      </div>
    </section>
  );
}
