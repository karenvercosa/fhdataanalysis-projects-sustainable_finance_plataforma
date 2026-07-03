import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Plus, Search, Pencil, Trash2, CalendarDays, Clock, MapPin, Mic, Users } from "lucide-react";
import { Badge, Button, Card, CardBody, Input, Modal } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { useSessions, type SessionInput } from "@/context/SessionsContext";
import { TRACK_TONE, toMinutes, type Session } from "@/data/mock";
import { SPEAKERS } from "@/data/catalog";
import { cn } from "@/lib/utils";

type TrackFilter = "Todas" | Session["track"];
const TRACK_FILTERS: TrackFilter[] = ["Todas", "ESG", "Investimentos", "Inovação"];
const TRACKS: Session["track"][] = ["ESG", "Investimentos", "Inovação"];
const EMPTY: SessionInput = { title: "", track: "ESG", room: "", start: "09:00", end: "09:45", speaker: "", capacity: 100 };

export default function SessionsAdmin() {
  const { sessions, add, update, remove } = useSessions();
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<TrackFilter>("Todas");
  const [toast, setToast] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState<SessionInput>(EMPTY);
  const [toDelete, setToDelete] = useState<Session | null>(null);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2500);
  };

  // Filtra por trilha + busca e agrupa por horário de início (timeline).
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = sessions
      .filter((s) => track === "Todas" || s.track === track)
      .filter((s) => !q || s.title.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q))
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      if (!map.has(s.start)) map.set(s.start, []);
      map.get(s.start)!.push(s);
    }
    return [...map.entries()];
  }, [sessions, query, track]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };
  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({ title: s.title, track: s.track, room: s.room, start: s.start, end: s.end, speaker: s.speaker, capacity: s.capacity });
    setShowForm(true);
  };

  const canSave = form.title.trim() && /^\d{2}:\d{2}$/.test(form.start) && /^\d{2}:\d{2}$/.test(form.end);

  const save = () => {
    if (!canSave) return;
    if (editing) {
      update(editing.id, form);
      flash("✅ Sessão atualizada.");
    } else {
      add(form);
      flash("✅ Sessão criada.");
    }
    setShowForm(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    remove(toDelete.id);
    flash("🗑️ Sessão removida.");
    setToDelete(null);
  };

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Programação" subtitle={`${sessions.length} sessões — linha do tempo e gestão (reflete na agenda do app)`} icon={CalendarDays} />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nova sessão
        </Button>
      </div>

      {toast && (
        <div className="rounded-md bg-success-50 px-4 py-3 text-body text-success-500">{toast}</div>
      )}

      <Input placeholder="Buscar por título ou palestrante…" value={query}
        onChange={(e) => setQuery(e.target.value)} rightSlot={<Search className="h-4 w-4" />} className="lg:max-w-md" />

      {/* Filtros por trilha */}
      <div className="flex flex-wrap gap-2">
        {TRACK_FILTERS.map((t) => (
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

      {/* Timeline agrupada por horário — cada sessão traz ações de gestão */}
      <div className="space-y-6">
        {grouped.map(([time, items]) => (
          <div key={time} className="flex gap-4">
            <div className="w-14 shrink-0 pt-1 text-right">
              <span className="text-h5 text-neutral-900">{time}</span>
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => (
                <Card key={s.id}>
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(s)} aria-label={`Editar ${s.title}`}
                          className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-primary-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setToDelete(s)} aria-label={`Excluir ${s.title}`}
                          className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-error-50 hover:text-error-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                    <Badge tone="info">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {s.capacity} vagas
                      </span>
                    </Badge>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <Card>
            <CardBody className="py-8 text-center text-body text-neutral-600">
              Nenhuma sessão encontrada.
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={openCreate}>
                  Adicionar a primeira sessão
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Modal criar/editar */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Editar sessão" : "Nova sessão"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!canSave}>{editing ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Título" placeholder="Título da sessão" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Trilha</label>
              <select value={form.track} onChange={(e) => setForm((f) => ({ ...f, track: e.target.value as Session["track"] }))}
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900">
                {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Sala" placeholder="Ex.: Palco Principal" value={form.room}
              onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Início (HH:mm)" placeholder="09:00" value={form.start}
              onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
            <Input label="Término (HH:mm)" placeholder="09:45" value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
            <Input label="Vagas totais" type="number" min={0} placeholder="100" value={String(form.capacity)}
              onChange={(e) => setForm((f) => ({ ...f, capacity: Math.max(0, Number(e.target.value) || 0) }))} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-h5 text-neutral-900">Palestrante</label>
            <input list="speakers-list" value={form.speaker}
              onChange={(e) => setForm((f) => ({ ...f, speaker: e.target.value }))}
              placeholder="Vincule um palestrante"
              className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
            <datalist id="speakers-list">
              {SPEAKERS.map((sp) => <option key={sp.id} value={sp.name} />)}
            </datalist>
          </div>
        </div>
      </Modal>

      {/* Modal excluir */}
      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Excluir sessão"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmDelete}>Excluir</Button>
          </>
        }
      >
        <p className="text-body text-neutral-600">
          Excluir <strong className="text-neutral-900">{toDelete?.title}</strong>? Isso remove a sessão da agenda do app.
        </p>
      </Modal>
    </div>
  );
}
