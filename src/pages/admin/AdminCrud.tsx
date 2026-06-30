import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Plus, Search, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Modal } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { usePersistentState } from "@/hooks/usePersistentState";

type Tone = "success" | "warning" | "error" | "info" | "neutral" | "primary";

export interface CrudField {
  key: string;
  label: string;
  type?: "text" | "email" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  unique?: boolean;
  inTable?: boolean;
  tones?: Record<string, Tone>; // renderiza como Badge na tabela
  filterable?: boolean;
  colSpan?: 1 | 2;
}

export type CrudRow = { id: string } & Record<string, string>;

export interface CrudConfig {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  storageKey: string;
  entity: string; // "lote", "palestrante", "empresa"
  newLabel: string;
  seed: CrudRow[];
  fields: CrudField[];
  searchKeys: string[];
}

const EMAIL_RE = /\S+@\S+\.\S+/;

export function AdminCrud({ config }: { config: CrudConfig }) {
  const { fields } = config;
  const [rows, setRows] = usePersistentState<CrudRow[]>(config.storageKey, config.seed);
  const [query, setQuery] = useState("");
  const filterField = useMemo(() => fields.find((f) => f.filterable), [fields]);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CrudRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<CrudRow | null>(null);

  const tableFields = fields.filter((f) => f.inTable);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2500);
  };

  const emptyForm = () =>
    Object.fromEntries(
      fields.map((f) => [f.key, f.type === "select" ? f.options?.[0]?.value ?? "" : ""])
    );

  const labelFor = (f: CrudField, value: string) =>
    f.type === "select" ? f.options?.find((o) => o.value === value)?.label ?? value : value;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
  };
  const openEdit = (row: CrudRow) => {
    setEditing(row);
    setForm({ ...row });
    setErrors({});
    setShowForm(true);
  };

  // Validação (Heurística 5): obrigatórios, e-mail e unicidade.
  const validate = () => {
    const e: Record<string, string> = {};
    for (const f of fields) {
      const v = (form[f.key] ?? "").trim();
      if (f.required && !v) e[f.key] = "Campo obrigatório.";
      else if (f.type === "email" && v && !EMAIL_RE.test(v)) e[f.key] = "E-mail inválido.";
      else if (f.unique && v && rows.some((r) => r.id !== editing?.id && (r[f.key] ?? "").toLowerCase() === v.toLowerCase()))
        e[f.key] = "Valor já cadastrado.";
    }
    return e;
  };

  const save = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...form } : r)));
      flash(`✅ ${config.entity} atualizado.`);
    } else {
      setRows((prev) => [{ id: crypto.randomUUID(), ...form } as CrudRow, ...prev]);
      flash(`✅ ${config.entity} criado.`);
    }
    setShowForm(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    setRows((prev) => prev.filter((r) => r.id !== toDelete.id));
    flash(`🗑️ ${config.entity} removido.`);
    setToDelete(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || !filterField || r[filterField.key] === filter) &&
        (!q || config.searchKeys.some((k) => (r[k] ?? "").toLowerCase().includes(q)))
    );
  }, [rows, query, filter, filterField, config.searchKeys]);

  const Icon = config.icon;

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={config.title} subtitle={`${rows.length} ${config.subtitle ?? "registros"}`} icon={Icon} />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          {config.newLabel}
        </Button>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-md bg-success-50 px-4 py-3 text-body text-success-500">
          <CheckCircle2 className="h-5 w-5" /> {toast}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rightSlot={<Search className="h-4 w-4" />}
          />
        </div>
        {filterField && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
          >
            <option value="all">Todos · {filterField.label}</option>
            {filterField.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Lista ({filtered.length})</p>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-body-sm text-neutral-600">
                {tableFields.map((f) => (
                  <th key={f.key} className="px-4 py-2 font-medium">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-neutral-50 text-body">
                  {tableFields.map((f, idx) => (
                    <td key={f.key} className={idx === 0 ? "px-4 py-3 font-medium text-neutral-900" : "px-4 py-3 text-neutral-600"}>
                      {f.tones ? (
                        <Badge tone={f.tones[row[f.key]] ?? "neutral"}>{labelFor(f, row[f.key])}</Badge>
                      ) : (
                        labelFor(f, row[f.key])
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(row)}
                        aria-label={`Editar ${row[fields[0].key]}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-primary-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setToDelete(row)}
                        aria-label={`Excluir ${row[fields[0].key]}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-error-50 hover:text-error-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={tableFields.length + 1} className="px-4 py-8 text-center text-body text-neutral-600">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Modal criar/editar */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? `Editar ${config.entity}` : config.newLabel}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key} className={f.colSpan === 1 ? "" : "col-span-2"}>
              {f.type === "select" ? (
                <div className="space-y-1.5">
                  <label className="block text-h5 text-neutral-900">{f.label}</label>
                  <select
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <Input
                  label={f.label}
                  type={f.type === "email" ? "email" : "text"}
                  placeholder={f.placeholder}
                  value={form[f.key] ?? ""}
                  onChange={(e) => {
                    setForm((s) => ({ ...s, [f.key]: e.target.value }));
                    setErrors((er) => ({ ...er, [f.key]: "" }));
                  }}
                  error={errors[f.key] || undefined}
                />
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal excluir */}
      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`Excluir ${config.entity}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-body text-neutral-600">
          Tem certeza que deseja excluir{" "}
          <strong className="text-neutral-900">{toDelete?.[fields[0].key]}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
