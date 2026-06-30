import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Plus, Search, Pencil, Trash2, Users, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Modal } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { SEED_USERS, USER_TAGS, type AdminUser, type UserStatus } from "@/data/users";
import { type UserTag } from "@/data/schema";
import { usePersistentState } from "@/hooks/usePersistentState";

const ROLES = Object.keys(ROLE_LABEL) as Role[];
const EMPTY_FORM = { name: "", email: "", role: "attendee" as Role, tag: "—" as UserTag, status: "Ativo" as UserStatus };

export default function UsersAdmin() {
  // Persiste as alterações do CRUD entre sessões/refresh.
  const [users, setUsers] = usePersistentState<AdminUser[]>("sf_users", SEED_USERS);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [toast, setToast] = useState<string | null>(null);

  // Modal de criar/editar
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [emailError, setEmailError] = useState<string | undefined>();

  // Modal de exclusão
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === "all" || u.role === roleFilter) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, query, roleFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setEmailError(undefined);
    setShowForm(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, role: u.role, tag: u.tag, status: u.status });
    setEmailError(undefined);
    setShowForm(true);
  };

  const validEmail = /\S+@\S+\.\S+/.test(form.email);
  const canSave = form.name.trim().length >= 2 && validEmail;

  const save = () => {
    // Prevenção de erros (Heurística 5): e-mail único e válido.
    const dup = users.some(
      (u) => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== editing?.id
    );
    if (dup) {
      setEmailError("Já existe um usuário com este e-mail.");
      return;
    }
    if (editing) {
      setUsers((prev) => prev.map((u) => (u.id === editing.id ? { ...editing, ...form } : u)));
      flash(`✅ ${form.name} atualizado(a).`);
    } else {
      const id = crypto.randomUUID();
      setUsers((prev) => [{ id, ...form }, ...prev]);
      flash(`✅ ${form.name} criado(a).`);
    }
    setShowForm(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    setUsers((prev) => prev.filter((u) => u.id !== toDelete.id));
    flash(`🗑️ ${toDelete.name} removido(a).`);
    setToDelete(null);
  };

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Usuários" subtitle={`${users.length} contas cadastradas`} icon={Users} />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Novo usuário
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
            placeholder="Buscar por nome ou e-mail…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rightSlot={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
          className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
        >
          <option value="all">Todos os perfis</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
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
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Perfil</th>
                <th className="px-4 py-2 font-medium">Selo</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-neutral-50 text-body">
                  <td className="px-4 py-3 font-medium text-neutral-900">{u.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{u.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3">
                    {u.tag && u.tag !== "—" ? (
                      <Badge tone="primary">{u.tag}</Badge>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === "Ativo" ? "success" : "neutral"}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        aria-label={`Editar ${u.name}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-primary-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setToDelete(u)}
                        aria-label={`Excluir ${u.name}`}
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
                  <td colSpan={6} className="px-4 py-8 text-center text-body text-neutral-600">
                    Nenhum usuário encontrado.
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
        title={editing ? "Editar usuário" : "Novo usuário"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!canSave}>
              {editing ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nome completo"
            placeholder="Digite o nome…"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="email@dominio.com"
            value={form.email}
            onChange={(e) => {
              setForm((f) => ({ ...f, email: e.target.value }));
              setEmailError(undefined);
            }}
            error={emailError}
            success={validEmail && !emailError}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Perfil</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as UserStatus }))}
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>
          {/* Selo/Tag injetável pelo Admin (diferencial visual, ex.: Palestrante) */}
          <div className="space-y-1.5">
            <label className="block text-h5 text-neutral-900">Selo / Tag</label>
            <select
              value={form.tag}
              onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value as UserTag }))}
              className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
            >
              {USER_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t === "—" ? "Sem selo" : t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal excluir */}
      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Excluir usuário"
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
          Tem certeza que deseja excluir <strong className="text-neutral-900">{toDelete?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
