import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Plus, Search, Pencil, Trash2, CalendarDays } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Modal } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { useSessions, type SessionInput } from "@/context/SessionsContext";
import { TRACK_TONE, toMinutes, type Session } from "@/data/mock";
import { SPEAKERS } from "@/data/catalog";

const TRACKS: Session["track"][] = ["ESG", "Investimentos", "Inovação"];
const EMPTY: SessionInput = { title: "", track: "ESG", room: "", start: "09:00", end: "09:45", speaker: "" };

export default function SessionsAdmin() {
  const { sessions, add, update, remove } = useSessions();
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState<SessionInput>(EMPTY);
  const [toDelete, setToDelete] = useState<Session | null>(null);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2500);
  };

  const ordered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...sessions]
      .filter((s) => !q || s.title.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q))
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  }, [sessions, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };
  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({ title: s.title, track: s.track, room: s.room, start: s.start, end: s.end, speaker: s.speaker });
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
        <PageHeader title="Programação" subtitle={`${sessions.length} sessões — refletem na agenda do app`} icon={CalendarDays} />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nova sessão
        </Button>
      </div>

      {toast && (
        <div className="rounded-md bg-success-50 px-4 py-3 text-body text-success-500">{toast}</div>
      )}

      <Input placeholder="Buscar por título ou palestrante…" value={query}
        onChange={(e) => setQuery(e.target.value)} rightSlot={<Search className="h-4 w-4" />} className="lg:max-w-md" />

      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Sessões ({ordered.length})</p>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-body-sm text-neutral-600">
                <th className="px-4 py-2 font-medium">Horário</th>
                <th className="px-4 py-2 font-medium">Sessão</th>
                <th className="px-4 py-2 font-medium">Trilha</th>
                <th className="px-4 py-2 font-medium">Sala</th>
                <th className="px-4 py-2 font-medium">Palestrante</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((s) => (
                <tr key={s.id} className="border-b border-neutral-50 text-body">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-body-sm text-neutral-600">{s.start}–{s.end}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{s.title}</td>
                  <td className="px-4 py-3"><Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge></td>
                  <td className="px-4 py-3 text-neutral-600">{s.room}</td>
                  <td className="px-4 py-3 text-neutral-600">{s.speaker}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(s)} aria-label={`Editar ${s.title}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-primary-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setToDelete(s)} aria-label={`Excluir ${s.title}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-error-50 hover:text-error-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ordered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-body text-neutral-600">Nenhuma sessão encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

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
          <div className="grid grid-cols-2 gap-3">
            <Input label="Início (HH:mm)" placeholder="09:00" value={form.start}
              onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
            <Input label="Término (HH:mm)" placeholder="09:45" value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
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
