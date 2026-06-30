import { useMemo, useState } from "react";
import { Radio, Play, Clock, MapPin, Mic2, Tv } from "lucide-react";
import { Badge, Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { useSessions } from "@/context/SessionsContext";
import { TRACK_TONE, toMinutes, type Session } from "@/data/mock";
import { cn } from "@/lib/utils";

export default function StreamingPage() {
  const { sessions } = useSessions();

  // "Ao vivo agora": faixa de horário com mais sessões simultâneas (evidencia
  // as trilhas paralelas). Empate → horário mais cedo.
  const { live, upcoming } = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    if (sorted.length === 0) return { live: [] as Session[], upcoming: [] as Session[] };
    const byStart = new Map<string, Session[]>();
    for (const s of sorted) {
      if (!byStart.has(s.start)) byStart.set(s.start, []);
      byStart.get(s.start)!.push(s);
    }
    let liveStart = sorted[0].start;
    for (const [start, group] of byStart) {
      if (group.length > (byStart.get(liveStart)?.length ?? 0)) liveStart = start;
    }
    return {
      live: byStart.get(liveStart) ?? [],
      upcoming: sorted.filter((s) => s.start !== liveStart)
    };
  }, [sessions]);

  const [selectedId, setSelectedId] = useState(live[0]?.id);
  const selected = live.find((s) => s.id === selectedId) ?? live[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Ao vivo" subtitle="Assista aos painéis em tempo real" icon={Tv} />

      {!selected ? (
        <Card>
          <CardBody className="py-10 text-center text-body text-neutral-600">
            Nenhuma transmissão no momento.
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Player in-platform */}
          <Card className="overflow-hidden">
            <div className="relative flex aspect-video items-center justify-center bg-primary-ink text-white">
              <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_30%_30%,#1E8E5A,transparent_60%)]" />
              <button className="z-10 grid h-16 w-16 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25">
                <Play className="h-7 w-7" />
              </button>
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-error-500 px-3 py-1 text-body-sm font-medium">
                <Radio className="h-4 w-4" /> AO VIVO
              </div>
            </div>
            <CardBody className="space-y-2">
              <Badge tone={TRACK_TONE[selected.track]}>{selected.track}</Badge>
              <h2 className="text-h3 text-neutral-900">{selected.title}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-neutral-600">
                <span className="inline-flex items-center gap-1"><Mic2 className="h-4 w-4" /> {selected.speaker}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {selected.room}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {selected.start}–{selected.end}</span>
              </div>
            </CardBody>
          </Card>

          {/* Trilhas paralelas acontecendo agora */}
          {live.length > 1 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-h4 text-neutral-900">
                <Radio className="h-5 w-5 text-error-500" /> Acontecendo agora ({live.length} trilhas)
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {live.map((s) => (
                  <button key={s.id} onClick={() => setSelectedId(s.id)} className="text-left">
                    <Card className={cn("h-full transition", s.id === selected.id ? "border-primary-500 ring-1 ring-primary-200" : "hover:shadow-pop")}>
                      <CardBody className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge>
                          {s.id === selected.id && <span className="text-body-sm font-medium text-primary-600">Assistindo</span>}
                        </div>
                        <p className="text-body font-medium text-neutral-900">{s.title}</p>
                        <p className="text-body-sm text-neutral-600">{s.room} · {s.speaker}</p>
                      </CardBody>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* A seguir */}
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-h4 text-neutral-900">A seguir</h3>
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <li key={s.id}>
                    <Card>
                      <CardBody className="flex items-center gap-3">
                        <div className="w-14 shrink-0 text-center font-mono text-body-sm text-neutral-600">{s.start}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body font-medium text-neutral-900">{s.title}</p>
                          <p className="text-body-sm text-neutral-600">{s.room} · {s.speaker}</p>
                        </div>
                        <Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge>
                      </CardBody>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
