import { useMemo, useState } from "react";
import { Map as MapIcon, MapPin, Plus, Minus, Clock, Mic, Users, X, Locate } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionsContext";
import { Badge, Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { PreviewLock } from "@/components/PreviewLock";
import { TRACK_TONE } from "@/data/mock";
import { cn } from "@/lib/utils";

type ZoneType = "palco" | "sala" | "stand" | "servico";

interface Spot {
  id: string;
  name: string;
  type: ZoneType;
  x: number; // posição do pin em % da largura da imagem
  y: number; // posição do pin em % da altura da imagem
  room?: string; // vincula às sessões (quando é palco/sala)
  desc?: string; // usado quando não há sessões
}

// Pontos sobre a planta do evento. `room` casa com o campo room das sessões.
const SPOTS: Spot[] = [
  { id: "palco", name: "Palco Principal", type: "palco", x: 52, y: 20, room: "Palco Principal" },
  { id: "salaA", name: "Sala A", type: "sala", x: 25, y: 26, room: "Sala A" },
  { id: "salaB", name: "Sala B", type: "sala", x: 25, y: 57, room: "Sala B" },
  { id: "salaC", name: "Sala C", type: "sala", x: 87, y: 37, room: "Sala C" },
  { id: "stands", name: "Área de Stands", type: "stand", x: 52, y: 60, desc: "Lounge central, stands de patrocinadores e networking." },
  { id: "food", name: "Praça de Alimentação", type: "servico", x: 88, y: 47, desc: "Café, almoço e coffee breaks ao longo do dia." },
  { id: "cred", name: "Credenciamento", type: "servico", x: 52, y: 85, desc: "Entrada, retirada de credencial e suporte." }
];

const MAP_URL = "/event-map.png";

const PIN_COLOR: Record<ZoneType, string> = {
  palco: "#1E8E5A",
  sala: "#2F80ED",
  stand: "#E6A100",
  servico: "#616E7C"
};
const TYPE_LABEL: Record<ZoneType, string> = { palco: "Palco", sala: "Sala", stand: "Stands", servico: "Serviços" };
const TYPE_TONE = { palco: "success", sala: "info", stand: "warning", servico: "neutral" } as const;

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;

export default function MapPage() {
  const { can } = useAuth();
  const locked = !can("view:event-map");
  const { sessions } = useSessions();

  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = SPOTS.find((s) => s.id === selectedId) ?? null;

  // Sessões do ponto selecionado (ordenadas por horário).
  const spotSessions = useMemo(() => {
    if (!selected?.room) return [];
    return sessions
      .filter((s) => s.room === selected.room)
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [selected, sessions]);

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)));

  const body = (
    <div className="space-y-4">
      <PageHeader title="Mapa do evento" subtitle="Explore a planta, use o zoom e toque nos pins para ver o que acontece em cada local" icon={MapIcon} />

      {/* Legenda */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(TYPE_LABEL) as ZoneType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 text-body-sm text-neutral-600">
            <span className="h-3 w-3 rounded-full" style={{ background: PIN_COLOR[t] }} />
            {TYPE_LABEL[t]}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        {/* Mapa (planta) com zoom/pan */}
        <Card className="overflow-hidden">
          <div className="relative">
            {/* Controles de zoom */}
            <div className="absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-pop">
              <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX} aria-label="Aproximar"
                className="grid h-9 w-9 place-items-center text-neutral-700 hover:bg-neutral-100 disabled:opacity-40">
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} aria-label="Afastar"
                className="grid h-9 w-9 place-items-center border-t border-neutral-200 text-neutral-700 hover:bg-neutral-100 disabled:opacity-40">
                <Minus className="h-4 w-4" />
              </button>
              <button onClick={() => setZoom(1)} disabled={zoom === 1} aria-label="Redefinir zoom"
                className="grid h-9 w-9 place-items-center border-t border-neutral-200 text-neutral-700 hover:bg-neutral-100 disabled:opacity-40">
                <Locate className="h-4 w-4" />
              </button>
            </div>
            <span className="absolute left-3 top-3 z-20 rounded-md bg-black/55 px-2 py-1 text-body-sm font-medium text-white">
              {Math.round(zoom * 100)}%
            </span>

            {/* Área rolável (pan quando ampliado) */}
            <div className="max-h-[460px] overflow-auto bg-white md:max-h-[560px]">
              <div style={{ width: `${zoom * 100}%` }} className="relative transition-[width] duration-200">
                <img src={MAP_URL} alt="Planta do evento" className="block w-full select-none" draggable={false} />

                {/* PINS clicáveis sobre a planta */}
                {SPOTS.map((s) => {
                  const active = s.id === selectedId;
                  const color = PIN_COLOR[s.type];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      aria-label={s.name}
                      style={{ left: `${s.x}%`, top: `${s.y}%` }}
                      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                    >
                      <span
                        className={cn(
                          "grid place-items-center rounded-full border-2 border-white shadow-md transition-all",
                          active ? "h-9 w-9 ring-4 ring-white/60" : "h-7 w-7 group-hover:h-8 group-hover:w-8"
                        )}
                        style={{ background: color }}
                      >
                        <MapPin className="h-4 w-4 text-white" />
                      </span>
                      <span
                        className={cn(
                          "pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-800 shadow transition-opacity",
                          active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        style={{ border: `1.5px solid ${color}` }}
                      >
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Detalhe do ponto: o que está acontecendo ali */}
        <Card className="h-fit">
          <CardBody className="space-y-3">
            {!selected ? (
              <div className="space-y-2 py-6 text-center">
                <MapPin className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="text-body text-neutral-600">Toque em um <strong>pin</strong> no mapa para ver o que está acontecendo naquele local.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Badge tone={TYPE_TONE[selected.type]}>{TYPE_LABEL[selected.type]}</Badge>
                    <h2 className="flex items-center gap-2 text-h3 text-neutral-900">
                      <MapPin className="h-5 w-5" style={{ color: PIN_COLOR[selected.type] }} /> {selected.name}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedId(null)} aria-label="Fechar detalhe"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {selected.room ? (
                  spotSessions.length > 0 ? (
                    <ul className="space-y-2">
                      {spotSessions.map((s) => (
                        <li key={s.id} className="rounded-md border border-neutral-100 bg-neutral-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-body-sm font-medium text-neutral-700">
                              <Clock className="h-3.5 w-3.5" /> {s.start}–{s.end}
                            </span>
                            <Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge>
                          </div>
                          <p className="mt-1 text-body font-medium text-neutral-900">{s.title}</p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-neutral-600">
                            <span className="inline-flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> {s.speaker}</span>
                            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {s.capacity} vagas</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-body-sm text-neutral-600">Nenhuma sessão programada para este local.</p>
                  )
                ) : (
                  <p className="text-body text-neutral-600">{selected.desc}</p>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );

  return locked ? (
    <PreviewLock blur message="Este é o mapa do evento. Aproxime, explore os pins e veja o que acontece em cada local ao adquirir seu ingresso.">
      {body}
    </PreviewLock>
  ) : (
    body
  );
}
