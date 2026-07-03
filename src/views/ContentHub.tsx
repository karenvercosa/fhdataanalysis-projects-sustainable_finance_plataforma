import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, BookOpen, Video, Mic, FileText, FileBarChart, Download, Crown, Mic2, Building2, CalendarDays, Plus, Upload, CheckCircle2, Pencil } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Button, Card, CardBody, Input, Modal } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { useSessions } from "@/context/SessionsContext";
import { cn } from "@/lib/utils";
import { CONTENTS, getSpeaker, getCurator, getSessionTitle } from "@/data/catalog";
import { CONNECTIONS } from "@/data/networking";
import { type Content, type ContentFormat } from "@/data/schema";
import { BRAND_KEY, BRAND_SEED, BRAND_FORMATS, SPEAKER_OPTIONS, PANEL_OPTIONS, BRAND_COMPANIES, type BrandContent, type BrandFormat } from "@/data/brandContent";

type Filter = "Todos" | Content["phase"] | "Meus materiais";

const ICON: Record<ContentFormat, React.ComponentType<{ className?: string }>> = {
  "E-book": BookOpen,
  "Vídeo": Video,
  Podcast: Mic,
  Relatório: FileBarChart,
  PDF: FileText
};
const BRAND_ICON: Record<BrandFormat, React.ComponentType<{ className?: string }>> = {
  "E-book": BookOpen,
  Podcast: Mic,
  "Vídeo": Video,
  Artigo: FileText
};

export default function ContentHub() {
  const { can, user } = useAuth();
  const navigate = useNavigate();
  const canDownload = can("download:content"); // TRAVA do "Não Pago"
  const isCurator = user.role === "curator";
  const isSpeaker = user.role === "speaker"; // palestrante insere material como o curador
  const isAdmin = user.role === "admin"; // admin também insere conteúdo (como o curador)
  const canCreate = isCurator || isSpeaker || isAdmin;
  // Dono dos próprios materiais: curador fixo (cur_1); palestrante/admin pelo e-mail.
  const myOwnerId = isCurator ? "cur_1" : isSpeaker ? `spk:${user.email}` : isAdmin ? `adm:${user.email}` : "";
  const [filter, setFilter] = useState<Filter>("Todos");
  // Conteúdos publicados por curadores/palestrantes (aparecem na Seção de Conteúdos).
  const [brand, setBrand] = usePersistentState<BrandContent[]>(BRAND_KEY, BRAND_SEED);

  // Palestrante: painéis em que ele palestra e a empresa dele (preenchidos auto).
  const { sessions } = useSessions();
  const myPanels = useMemo(() => {
    if (!isSpeaker) return [];
    const named = sessions.filter((s) => s.speaker === user.name);
    const src = named.length ? named : sessions[0] ? [sessions[0]] : [];
    return src.map((s) => s.title);
  }, [isSpeaker, sessions, user.name]);
  const myCompany = useMemo(
    () => CONNECTIONS.find((c) => c.kind === "person" && c.name === user.name)?.company ?? "",
    [user.name]
  );

  // Novo conteúdo: curador escolhe tudo; palestrante já vem com o próprio nome/empresa.
  const newContent = (): Omit<BrandContent, "id"> =>
    isSpeaker
      ? { title: "", format: "E-book", speaker: user.name, company: myCompany, panel: myPanels[0] ?? "", fileName: undefined, ownerId: myOwnerId }
      : { title: "", format: "E-book", speaker: "", company: "", panel: "", fileName: undefined, ownerId: myOwnerId };

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // null = criação
  const [form, setForm] = useState(newContent);
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setForm((f) => ({ ...f, fileName: file.name }));
  };
  const openCreate = () => {
    setEditId(null);
    setForm(newContent());
    setShowForm(true);
  };
  const openEdit = (c: BrandContent) => {
    setEditId(c.id);
    const { id: _id, ...rest } = c;
    setForm({ speaker: "", company: "", panel: "", ...rest });
    setShowForm(true);
  };
  const saveBrand = () => {
    if (!form.title.trim()) return;
    if (editId) {
      setBrand((prev) => prev.map((c) => (c.id === editId ? { id: editId, ...form } : c)));
    } else {
      setBrand((prev) => [{ id: crypto.randomUUID(), ...form }, ...prev]);
    }
    setShowForm(false);
  };

  // Catálogo (por fase) + cards de marca. "Meus materiais" mostra só os meus.
  const isMineFilter = filter === "Meus materiais";
  const catalogList = isMineFilter ? [] : CONTENTS.filter((c) => filter === "Todos" || c.phase === filter);
  const brandList = isMineFilter ? brand.filter((c) => c.ownerId === myOwnerId) : brand;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Conteúdos para download" subtitle="Relatórios, vídeos on-demand, e-books e PDFs (Acesso ao Conhecimento)" icon={BookOpen} />
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            {isSpeaker ? "Novo material" : "Novo conteúdo"}
          </Button>
        )}
      </div>

      {/* Banner de upgrade — trava de download (Não Pago) */}
      {!canDownload && (
        <Card className="border-secondary-500 bg-secondary-400/15">
          <CardBody className="flex items-center gap-3">
            <Crown className="h-6 w-6 shrink-0 text-secondary-600" />
            <div className="flex-1">
              <p className="text-h4 text-neutral-900">Veja o que você poderá baixar</p>
              <p className="text-body-sm text-neutral-600">
                O <strong>download</strong> destes materiais exige um ingresso. O streaming ao vivo
                continua livre na aba <strong>Streaming</strong>.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate("/ingressos")}>
              Adquirir ingresso
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {([
          "Todos",
          "Pré-evento",
          "Pós-evento",
          ...(canCreate ? (["Meus materiais"] as const) : [])
        ] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full px-3 py-1 text-body-sm transition-colors " +
              (filter === f ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600")
            }
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {catalogList.map((c) => {
          const Icon = ICON[c.format];
          const downloadLocked = c.premium && !canDownload;
          const speaker = getSpeaker(c.speakerIds[0]);
          const curator = getCurator(c.curatorIds[0]);
          return (
            <li key={c.id}>
              <Card className="flex h-full flex-col">
                <CardBody className="flex flex-1 flex-col gap-3">
                  {/* Cabeçalho */}
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-neutral-900">{c.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-body-sm text-neutral-600">{c.format} · {c.phase}</span>
                      </div>
                    </div>
                  </div>

                  {/* Associação coesa: Sessão × Palestrante × Curador */}
                  <div className="space-y-1 rounded-md bg-neutral-50 p-2.5 text-body-sm text-neutral-600">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{getSessionTitle(c.sessionIds[0])}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mic2 className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{speaker?.name ?? "—"}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{curator?.name ?? "—"}</span>
                    </p>
                  </div>

                  {/* Ação: download (Acesso ao Conhecimento) com trava p/ Não Pago */}
                  <div className="mt-auto">
                    {downloadLocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        leftIcon={<Lock className="h-4 w-4" />}
                        onClick={() => navigate("/ingressos")}
                      >
                        Bloqueado — Adquirir ingresso
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" fullWidth leftIcon={<Download className="h-4 w-4" />}>
                        Baixar
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            </li>
          );
        })}

        {/* Conteúdos de marca criados por curadores/palestrantes */}
        {brandList.map((c) => {
          const Icon = BRAND_ICON[c.format];
          const downloadLocked = !canDownload;
          const mine = canCreate && !!myOwnerId && c.ownerId === myOwnerId; // conteúdo do próprio usuário
          return (
            <li key={c.id}>
              <Card className="flex h-full flex-col">
                <CardBody className="flex flex-1 flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-neutral-900">{c.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-body-sm text-neutral-600">{c.format}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 rounded-md bg-neutral-50 p-2.5 text-body-sm text-neutral-600">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{c.panel || "—"}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mic2 className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{c.speaker || "—"}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{c.company || "—"}</span>
                    </p>
                  </div>
                  <div className="mt-auto flex gap-2">
                    {downloadLocked ? (
                      <Button variant="outline" size="sm" fullWidth leftIcon={<Lock className="h-4 w-4" />} onClick={() => navigate("/ingressos")}>
                        Bloqueado — Adquirir ingresso
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" fullWidth leftIcon={<Download className="h-4 w-4" />}>
                        Baixar
                      </Button>
                    )}
                    {mine && (
                      <Button variant="outline" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(c)}>
                        Editar
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>

      {isMineFilter && brandList.length === 0 && (
        <Card>
          <CardBody className="py-8 text-center text-body text-neutral-600">
            Você ainda não publicou materiais. Use <strong>{isSpeaker ? "Novo material" : "Novo conteúdo"}</strong> para adicionar.
          </CardBody>
        </Card>
      )}

      {/* Modal de criação/edição (curador e palestrante gerenciam seus materiais) */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? (isSpeaker ? "Editar material" : "Editar conteúdo") : isSpeaker ? "Novo material" : "Novo conteúdo"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={saveBrand} disabled={!form.title.trim()}>{editId ? "Salvar" : "Publicar"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Título" placeholder="Nome do material" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="space-y-1.5">
            <label className="block text-h5 text-neutral-900">Formato</label>
            <select value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as BrandFormat }))}
              className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900">
              {BRAND_FORMATS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {/* Associações. Curador escolhe painel/palestrante/empresa. Palestrante
              só escolhe o painel em que palestrou; palestrante e empresa são dele. */}
          <div className="space-y-3 rounded-md bg-neutral-50 p-3">
            <p className="text-h5 text-neutral-900">Associações{!isSpeaker && <span className="font-normal text-neutral-500"> (opcional)</span>}</p>
            <div className="space-y-1.5">
              <label className="block text-body-sm text-neutral-700">Painel{isSpeaker && " (em que você palestra)"}</label>
              <select value={form.panel} onChange={(e) => setForm((f) => ({ ...f, panel: e.target.value }))}
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900">
                {!isSpeaker && <option value="">— Nenhum —</option>}
                {(isSpeaker ? myPanels : PANEL_OPTIONS).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {isSpeaker ? (
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField label="Palestrante" value={form.speaker || "—"} />
                <ReadOnlyField label="Empresa" value={form.company || "—"} />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="block text-body-sm text-neutral-700">Palestrante</label>
                  <select value={form.speaker} onChange={(e) => setForm((f) => ({ ...f, speaker: e.target.value }))}
                    className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900">
                    <option value="">— Nenhum —</option>
                    {SPEAKER_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-body-sm text-neutral-700">Empresa</label>
                  <select value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900">
                    <option value="">— Nenhuma —</option>
                    {BRAND_COMPANIES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          {/* Podcast/Vídeo: link. E-book/Artigo: upload de arquivo. */}
          {form.format === "Podcast" || form.format === "Vídeo" ? (
            <Input
              label="Link"
              placeholder="https://…"
              value={form.link ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            />
          ) : (
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Arquivo</label>
              <div className="flex flex-wrap items-center gap-2">
                <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-body-sm text-neutral-700 hover:bg-neutral-50")}>
                  <Upload className="h-4 w-4" /> {form.fileName ? "Trocar arquivo" : "Enviar arquivo"}
                  <input type="file" className="hidden" onChange={onFile} />
                </label>
                {form.fileName && (
                  <span className="inline-flex items-center gap-1 text-body-sm text-success-500">
                    <CheckCircle2 className="h-4 w-4" /> {form.fileName}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

/** Campo somente-leitura (palestrante/empresa preenchidos automaticamente). */
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-body-sm text-neutral-700">{label}</label>
      <div className="flex h-10 items-center rounded-md border border-neutral-200 bg-neutral-100 px-3 text-body text-neutral-700">
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
