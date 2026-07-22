import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Search, Building2, Star, ChevronDown, Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useConnectionFavorites } from "@/context/ConnectionFavoritesContext";
import { Badge, Button, Card, CardBody, Input } from "@/components/ui";
import { SealAvatar, SealBadge, SealLegend } from "@/components/Seal";
import { ALL_SEALS, SEAL } from "@/lib/seals";
import { PageHeader } from "@/components/layout/AppShell";
import { PreviewLock } from "@/components/PreviewLock";
import { CONNECTIONS, sealForConnection, sponsorTier, type ConnectionKind, type SponsorTier } from "@/data/networking";
import { cn } from "@/lib/utils";

// Pílula compacta da cota de patrocínio (canto superior direito do card).
const TIER_PILL: Record<SponsorTier, string> = {
  Ouro: "bg-warning-50 text-warning-500",
  Prata: "bg-info-50 text-info-500",
  Bronze: "bg-neutral-100 text-neutral-600"
};

type Filter = "Todos" | "Pessoas" | "Empresas" | "Favoritos";
const FILTERS: { label: Filter; kind?: ConnectionKind }[] = [
  { label: "Todos" },
  { label: "Pessoas", kind: "person" },
  { label: "Empresas", kind: "company" },
  { label: "Favoritos" }
];

export default function Networking() {
  const { can, user } = useAuth();
  const { isFavorite, toggle, count } = useConnectionFavorites();
  const locked = !can("view:networking");
  // Cota de patrocínio (Ouro/Prata/Bronze) visível só para Admin e Curador.
  const showTier = user.role === "admin" || user.role === "curator";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Todos");
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 6;

  // Ao mudar busca/filtro, recolhe a lista novamente.
  useEffect(() => setShowAll(false), [query, filter]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const kind = FILTERS.find((f) => f.label === filter)?.kind;
    return CONNECTIONS.filter(
      (c) =>
        (!kind || c.kind === kind) &&
        (filter !== "Favoritos" || isFavorite(c.id)) &&
        (!q || c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q))
    );
  }, [query, filter, isFavorite]);

  const body = (
    <div className="space-y-4">
      <PageHeader title="Networking" subtitle="Participantes e empresas do evento" icon={Users} />

      <Input placeholder="Buscar por nome, cargo ou setor…" rightSlot={<Search className="h-4 w-4" />} className="lg:max-w-md" value={query} onChange={(e) => setQuery(e.target.value)} />

      {/* Legenda dos selos de identidade */}
      <SealLegend seals={ALL_SEALS} />

      {/* Filtro por tipo */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.label)}
            className={
              "rounded-full px-3 py-1 text-body-sm transition-colors " +
              (filter === f.label ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600")
            }
          >
            {f.label === "Favoritos" && count > 0 ? `Favoritos (${count})` : f.label}
          </button>
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(showAll ? list : list.slice(0, LIMIT)).map((c) => (
          <li key={c.id}>
            <Link to={`/networking/${c.id}`} className="block">
              <Card className="relative h-[128px] transition-shadow hover:shadow-pop">
                {/* Cota de patrocínio — pílula pequena no canto superior direito (só Admin e Curador) */}
                {showTier && sponsorTier(c) && (
                  <span className={cn("absolute right-2 top-2 z-10 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", TIER_PILL[sponsorTier(c)!])}>
                    <Award className="h-2.5 w-2.5" /> {sponsorTier(c)}
                  </span>
                )}
                <CardBody className="flex h-full items-center gap-3">
                  {c.kind === "company" ? (
                    <div className={cn(
                      "grid h-14 w-14 shrink-0 place-items-center rounded-md bg-[#F1ECFB] text-[#5B3FBF]",
                      SEAL.Patrocinador.ring
                    )}>
                      <Building2 className="h-6 w-6" />
                    </div>
                  ) : (
                    <SealAvatar name={c.name} seal={sealForConnection(c)} size="lg" className="h-14 w-14 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-h4 text-neutral-900">{c.name}</p>
                    <p className="truncate text-body-sm text-neutral-600">{c.subtitle}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <SealBadge seal={sealForConnection(c)} />
                      {c.tags.slice(0, 1).map((t) => (
                        <Badge key={t} tone="primary">{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(c.id);
                    }}
                    aria-label={isFavorite(c.id) ? "Remover dos favoritos" : "Favoritar"}
                    aria-pressed={isFavorite(c.id)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-neutral-100"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        isFavorite(c.id) ? "fill-current text-secondary-500" : "text-neutral-400"
                      )}
                    />
                  </button>
                </CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {/* Ver mais / ver menos — limita a lista a 6 cards */}
      {list.length > LIMIT && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAll((v) => !v)}>
            <span className="inline-flex items-center gap-2">
              {showAll ? "Ver menos" : `Ver mais (${list.length - LIMIT})`}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAll && "rotate-180")} />
            </span>
          </Button>
        </div>
      )}
    </div>
  );

  return locked ? (
    <PreviewLock message="Veja uma amostra dos participantes e empresas. Torne-se membro para conectar e ver perfis completos.">
      {body}
    </PreviewLock>
  ) : (
    body
  );
}
