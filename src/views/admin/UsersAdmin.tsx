import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronLeft, Plus, Search, Pencil, Trash2, Users, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Loader, Modal } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { api } from "@/lib/admin-api";
import { type UsuarioAdmin } from "@/types";

const ROLES = Object.keys(ROLE_LABEL) as Role[];

/** Selos disponíveis. String vazia = sem selo (grava `null` no banco). */
const SELOS = ["", "Ouro", "Prata", "Bronze"] as const;
type Selo = (typeof SELOS)[number];

const EMPTY_FORM = { nome: "", email: "", role: "guest" as Role, selo: "" as Selo, ativo: true };

// Selo/cota só se aplica a Curador/Patrocinador e Palestrante.
const canHaveSeal = (role: Role) => role === "curator" || role === "speaker";
const TAG_TONE: Record<string, "warning" | "info" | "neutral"> = {
  Ouro: "warning",
  Prata: "info",
  Bronze: "neutral",
};

/**
 * CRUD de usuários do Admin — gravando na tabela `usuario` do Postgres.
 *
 * Criar aqui é o mesmo que se cadastrar pela tela pública: a conta nasce com
 * credencial no Better Auth e recebe por e-mail a senha provisória com o botão
 * de criar a senha definitiva. A diferença é o perfil, que o Admin escolhe em
 * vez de sair sempre como Plano Gratuito.
 */
/** Rótulo do botão de salvar conforme o estado (era ternário aninhado). */
function rotuloDoBotaoSalvar(salvando: boolean, editando: boolean): string {
  if (salvando) return "Salvando…";
  return editando ? "Salvar" : "Criar";
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [toast, setToast] = useState<string | null>(null);

  // Modal de criar/editar
  const [editing, setEditing] = useState<UsuarioAdmin | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Modal de exclusão
  const [toDelete, setToDelete] = useState<UsuarioAdmin | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLista(null);
    try {
      const { usuarios } = await api.get<{ usuarios: UsuarioAdmin[] }>("/api/admin/usuarios");
      setUsers(usuarios);
    } catch (e: any) {
      setErroLista(e?.message ?? "Não foi possível carregar os usuários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === "all" || u.role === roleFilter) &&
        (!q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, query, roleFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (u: UsuarioAdmin) => {
    setEditing(u);
    setForm({
      nome: u.nome,
      email: u.email,
      role: u.role,
      selo: (u.selo ?? "") as Selo,
      ativo: u.ativo,
    });
    setFormError(null);
    setShowForm(true);
  };

  const validEmail = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(form.email.trim());
  const canSave = form.nome.trim().length >= 2 && validEmail && !salvando;

  const save = async () => {
    if (!canSave) return;
    setSalvando(true);
    setFormError(null);

    try {
      if (editing) {
        const { usuario } = await api.patch<{ usuario: UsuarioAdmin }>(
          `/api/admin/usuarios/${editing.id}`,
          form,
        );
        setUsers((prev) => prev.map((u) => (u.id === usuario.id ? usuario : u)));
        flash(`✅ ${usuario.nome} atualizado(a).`);
      } else {
        const { usuario, emailEnviado } = await api.post<{
          usuario: UsuarioAdmin;
          emailEnviado: boolean;
        }>("/api/admin/usuarios", form);
        setUsers((prev) => [usuario, ...prev]);
        flash(
          emailEnviado
            ? `✅ ${usuario.nome} criado(a). O convite de acesso foi enviado para ${usuario.email}.`
            : `⚠️ ${usuario.nome} criado(a), mas o e-mail de acesso não pôde ser enviado.`,
        );
      }
      setShowForm(false);
    } catch (e: any) {
      setFormError(e?.message ?? "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setExcluindo(true);
    try {
      await api.remove(`/api/admin/usuarios/${toDelete.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== toDelete.id));
      flash(`🗑️ ${toDelete.nome} removido(a).`);
      setToDelete(null);
    } catch (e: any) {
      flash(`⚠️ ${e?.message ?? "Não foi possível excluir."}`);
    } finally {
      setExcluindo(false);
    }
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
          <CheckCircle2 className="h-5 w-5 shrink-0" /> {toast}
        </div>
      )}

      {erroLista && (
        <div role="alert" className="flex items-center gap-2 rounded-md bg-error-50 px-4 py-3 text-body text-error-500">
          <AlertCircle className="h-5 w-5 shrink-0" /> {erroLista}
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
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-body-sm text-neutral-600">
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Perfil</th>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Selo</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-neutral-50 text-body">
                  <td className="px-4 py-3 font-medium text-neutral-900">{u.nome}</td>
                  <td className="px-4 py-3 text-neutral-600">{u.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {u.empresaNome ?? <span className="text-neutral-400">—</span>}
                    {/* O voucher é o que ligou a pessoa a essa empresa. */}
                    {u.voucher && (
                      <span className="ml-2 text-body-sm text-neutral-400">via {u.voucher}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canHaveSeal(u.role) && u.selo ? (
                      <Badge tone={TAG_TONE[u.selo] ?? "neutral"}>{u.selo}</Badge>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        aria-label={`Editar ${u.nome}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-primary-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setToDelete(u)}
                        aria-label={`Excluir ${u.nome}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-error-50 hover:text-error-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {carregando && (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <Loader label="Carregando usuários…" />
                  </td>
                </tr>
              )}
              {!carregando && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-body text-neutral-600">
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
              {rotuloDoBotaoSalvar(salvando, Boolean(editing))}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError && (
            <div role="alert" className="flex items-center gap-2 rounded-md bg-error-50 px-3 py-2 text-body-sm text-error-500">
              <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
            </div>
          )}

          <Input
            label="Nome completo"
            placeholder="Digite o nome…"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="email@dominio.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            success={validEmail}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="usuario-perfil" className="block text-h5 text-neutral-900">
                Perfil
              </label>
              <select
                id="usuario-perfil"
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
              <label htmlFor="usuario-status" className="block text-h5 text-neutral-900">
                Status
              </label>
              <select
                id="usuario-status"
                value={form.ativo ? "Ativo" : "Inativo"}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.value === "Ativo" }))}
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>
          {/* Selo/cota (Ouro/Prata/Bronze). Na lista, só é exibido para
              Curador/Patrocinador e Palestrante. */}
          <div className="space-y-1.5">
            <label htmlFor="usuario-selo" className="block text-h5 text-neutral-900">
              Selo / Cota
            </label>
            <select
              id="usuario-selo"
              value={form.selo}
              onChange={(e) => setForm((f) => ({ ...f, selo: e.target.value as Selo }))}
              className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
            >
              {SELOS.map((s) => (
                <option key={s || "sem"} value={s}>
                  {s || "Sem selo"}
                </option>
              ))}
            </select>
            {!canHaveSeal(form.role) && form.selo && (
              <p className="text-body-sm text-neutral-500">
                O selo só aparece na lista para perfis Curador/Patrocinador ou Palestrante.
              </p>
            )}
          </div>

          {!editing && (
            <p className="rounded-md bg-neutral-50 px-3 py-2 text-body-sm text-neutral-600">
              A senha não é definida aqui: a pessoa recebe por e-mail uma senha provisória e o
              botão para criar a definitiva.
            </p>
          )}
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
            <Button variant="danger" onClick={confirmDelete} disabled={excluindo}>
              {excluindo ? "Excluindo…" : "Excluir"}
            </Button>
          </>
        }
      >
        <p className="text-body text-neutral-600">
          Tem certeza que deseja excluir <strong className="text-neutral-900">{toDelete?.nome}</strong>?
          A conta, o acesso e o histórico de sessões são apagados. Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
