import { useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin, Mic, Star, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useSessions } from "@/context/SessionsContext";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { TRACK_TONE, toMinutes, sessionsOverlap, type Session } from "@/data/mock";
import { cn } from "@/lib/utils";

type TrackFilter = "Todas" | Session["track"];
const TRACKS: TrackFilter[] = ["Todas", "ESG", "Investimentos", "Inovação"];

export default function ProgrammingPage() {
  const { can } = useAuth();
  const canFavorite = can("manage:personal-agenda");
  // Favoritos compartilhados e persistentes (sincroniza com o Dashboard).
  const { isFavorite, toggle } = useFavorites();
  const { sessions } = useSessions();
  const [track, setTrack] = useState<TrackFilter>("Todas");

  // Conflitos: pares de sessões favoritadas que se sobrepõem no horário.
  const conflictIds = useMemo(() => {
    const favs = sessions.filter((s) => isFavorite(s.id));
    const ids = new Set<string>();
    for (let i = 0; i < favs.length; i++)
      for (let j = i + 1; j < favs.length; j++)
        if (sessionsOverlap(favs[i], favs[j])) {
          ids.add(favs[i].id);
          ids.add(favs[j].id);
        }
    return ids;
  }, [isFavorite, sessions]);

  // Filtra por trilha e agrupa por horário de início (ordenado).
  const grouped = useMemo(() => {
    const filtered = sessions.filter((s) => track === "Todas" || s.track === track).sort(
      (a, b) => toMinutes(a.start) - toMinutes(b.start)
    );
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      if (!map.has(s.start)) map.set(s.start, []);
      map.get(s.start)!.push(s);
    }
    return [...map.entries()];
  }, [track, sessions]);

  return (
    <div className="space-y-6">
      <PageHeader title="Programação" subtitle="4 de Setembro, 2026 · evento multi-trilha" icon={CalendarDays} />

      {/* Alerta de conflito de horários (v2) */}
      {conflictIds.size > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-warning-500/40 bg-warning-50 px-4 py-3 text-warning-500">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-body">
            <strong>Conflito de horário</strong> na sua agenda: você favoritou sessões que acontecem
            ao mesmo tempo. Elas estão destacadas abaixo.
          </p>
        </div>
      )}

      {/* Filtros por trilha */}
      <div className="flex flex-wrap gap-2">
        {TRACKS.map((t) => (
          <button
            key={t}
            onClick={() => setTrack(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-body-sm transition-colors",
              track === t ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Timeline agrupada por horário */}
      <div className="space-y-6">
        {grouped.map(([time, items]) => (
          <div key={time} className="flex gap-4">
            {/* Coluna de horário */}
            <div className="w-14 shrink-0 pt-1 text-right">
              <span className="text-h5 text-neutral-900">{time}</span>
            </div>
            {/* Sessões do horário */}
            <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => {
                const conflicted = conflictIds.has(s.id);
                const fav = isFavorite(s.id);
                return (
                  <Card key={s.id} className={cn(conflicted && "border-warning-500 ring-1 ring-warning-500/30")}>
                    <CardBody className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge>
                        {canFavorite && (
                          <button
                            onClick={() => toggle(s.id)}
                            aria-label={fav ? "Remover dos favoritos" : "Adicionar à agenda"}
                            className={cn(
                              "transition-colors",
                              fav ? "text-secondary-500 hover:text-secondary-600" : "text-neutral-400 hover:text-secondary-500"
                            )}
                          >
                            <Star className={cn("h-5 w-5", fav && "fill-current")} />
                          </button>
                        )}
                      </div>
                      <h3 className="text-h4 text-neutral-900">{s.title}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-neutral-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4" /> {s.start}–{s.end}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4" /> {s.room}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mic className="h-4 w-4" /> {s.speaker}
                        </span>
                      </div>
                      {conflicted && (
                        <p className="inline-flex items-center gap-1 text-body-sm text-warning-500">
                          <AlertTriangle className="h-3.5 w-3.5" /> Conflito com outra sessão favoritada
                        </p>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {grouped.length === 0 && (
        <Card>
          <CardBody className="py-8 text-center text-body text-neutral-600">
            Nenhuma sessão para esta trilha.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setTrack("Todas")}>
                Ver todas as trilhas
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
