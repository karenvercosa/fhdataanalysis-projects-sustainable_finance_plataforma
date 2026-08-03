import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronLeft, Plus, Search, Pencil, Trash2, Percent, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Loader, Modal } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { api } from "@/lib/admin-api";
import { apenasCnpj, cnpjCompleto, formatarCnpj } from "@/lib/cnpj";
import { TIPO_VOUCHER_LABEL, TipoVoucher, type UsuarioAdmin, type VoucherAdmin } from "@/types";

const TIPOS = Object.values(TipoVoucher);

const TIPO_TONE: Record<TipoVoucher, "success" | "info" | "secondary"> = {
  gratuito: "success",
  desconto_percentual: "info",
  desconto_valor: "secondary",
};

const EMPTY_FORM = {
  codigo: "",
  tipo: TipoVoucher.gratuito as TipoVoucher,
  valor: "",
  usosMaximos: "100",
  empresaNome: "",
  empresaCnpj: "",
  curadorId: "",
  ativo: true,
};

/** "50%" ou "R$ 100,00" — o gratuito não tem valor a mostrar. */
function descreveValor(v: VoucherAdmin): string {
  if (v.tipo === TipoVoucher.gratuito || v.valor === null) return "—";
  if (v.tipo === TipoVoucher.descontoPercentual) return `${v.valor}%`;
  return v.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * CRUD de vouchers do Admin — gravando na tabela `voucher` do Postgres.
 *
 * O voucher é o convite corporativo: quem se cadastra na plataforma informando
 * o código passa a pertencer à empresa dona dele. Por isso a empresa é campo
 * obrigatório aqui — é ela que o cadastro copia para o perfil da pessoa.
 */
export default function VouchersAdmin() {
  const [vouchers, setVouchers] = useState<VoucherAdmin[]>([]);
  const [curadores, setCuradores] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [editing, setEditing] = useState<VoucherAdmin | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [toDelete, setToDelete] = useState<VoucherAdmin | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLista(null);
    try {
      // Os curadores vêm da mesma lista de usuários: é quem pode ser dono de
      // um voucher e aparecer com ele no próprio painel.
      const [dados, contas] = await Promise.all([
        api.get<{ vouchers: VoucherAdmin[] }>("/api/admin/vouchers"),
        api.get<{ usuarios: UsuarioAdmin[] }>("/api/admin/usuarios"),
      ]);
      setVouchers(dados.vouchers);
      setCuradores(contas.usuarios.filter((u) => u.role === "curator"));
    } catch (e: any) {
      setErroLista(e?.message ?? "Não foi possível carregar os vouchers.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vouchers;
    return vouchers.filter(
      (v) => v.codigo.toLowerCase().includes(q) || v.empresaNome.toLowerCase().includes(q),
    );
  }, [vouchers, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (v: VoucherAdmin) => {
    setEditing(v);
    setForm({
      codigo: v.codigo,
      tipo: v.tipo,
      valor: v.valor === null ? "" : String(v.valor),
      usosMaximos: String(v.usosMaximos),
      empresaNome: v.empresaNome,
      empresaCnpj: v.empresaCnpj ?? "",
      curadorId: v.curadorId ?? "",
      ativo: v.ativo,
    });
    setFormError(null);
    setShowForm(true);
  };

  const precisaValor = form.tipo !== TipoVoucher.gratuito;
  // O CNPJ é opcional; se começou a ser digitado, precisa ficar completo.
  const cnpjOk = !apenasCnpj(form.empresaCnpj) || cnpjCompleto(form.empresaCnpj);
  const canSave =
    form.codigo.trim().length > 0 &&
    form.empresaNome.trim().length > 0 &&
    Number(form.usosMaximos) >= 1 &&
    cnpjOk &&
    (!precisaValor || Number(form.valor) > 0) &&
    !salvando;

  const save = async () => {
    if (!canSave) return;
    setSalvando(true);
    setFormError(null);

    const corpo = {
      codigo: form.codigo,
      tipo: form.tipo,
      valor: precisaValor ? Number(form.valor) : null,
      usosMaximos: Number(form.usosMaximos),
      empresaNome: form.empresaNome,
      empresaCnpj: form.empresaCnpj,
      curadorId: form.curadorId,
      ativo: form.ativo,
    };

    try {
      if (editing) {
        const { voucher } = await api.patch<{ voucher: VoucherAdmin }>(
          `/api/admin/vouchers/${editing.id}`,
          corpo,
        );
        setVouchers((prev) => prev.map((v) => (v.id === voucher.id ? voucher : v)));
        flash(`✅ Voucher ${voucher.codigo} atualizado.`);
      } else {
        const { voucher } = await api.post<{ voucher: VoucherAdmin }>("/api/admin/vouchers", corpo);
        setVouchers((prev) => [voucher, ...prev]);
        flash(`✅ Voucher ${voucher.codigo} criado para ${voucher.empresaNome}.`);
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
      await api.remove(`/api/admin/vouchers/${toDelete.id}`);
      setVouchers((prev) => prev.filter((v) => v.id !== toDelete.id));
      flash(`🗑️ Voucher ${toDelete.codigo} removido.`);
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
        <PageHeader title="Vouchers" subtitle={`${vouchers.length} vouchers cadastrados`} icon={Percent} />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Novo voucher
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

      <Input
        placeholder="Buscar por código ou empresa…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rightSlot={<Search className="h-4 w-4" />}
      />

      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Lista ({filtered.length})</p>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-body-sm text-neutral-600">
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Valor</th>
                <th className="px-4 py-2 font-medium">Usos</th>
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-neutral-50 text-body">
                  <td className="px-4 py-3 font-medium text-neutral-900">{v.codigo}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TIPO_TONE[v.tipo]}>{TIPO_VOUCHER_LABEL[v.tipo]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{descreveValor(v)}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {v.usosFeitos} / {v.usosMaximos}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {v.empresaNome}
                    {v.empresaCnpj && (
                      <span className="ml-2 font-mono text-body-sm text-neutral-400">{v.empresaCnpj}</span>
                    )}
                    {v.curadorId && (
                      <span className="ml-2 text-body-sm text-primary-600">
                        · {curadores.find((c) => c.id === v.curadorId)?.nome ?? "curador"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={v.ativo ? "success" : "neutral"}>{v.ativo ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(v)}
                        aria-label={`Editar ${v.codigo}`}
                        className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-primary-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setToDelete(v)}
                        aria-label={`Excluir ${v.codigo}`}
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
                    <Loader label="Carregando vouchers…" />
                  </td>
                </tr>
              )}
              {!carregando && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-body text-neutral-600">
                    Nenhum voucher cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Editar voucher" : "Novo voucher"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={!canSave}>
              {salvando ? "Salvando…" : editing ? "Salvar" : "Criar"}
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
            label="Código"
            placeholder="Ex.: VERDE2026"
            value={form.codigo}
            onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
            hint="É o código que a pessoa digita no cadastro. Gravado sempre em maiúsculas."
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoVoucher }))}
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_VOUCHER_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={form.tipo === TipoVoucher.descontoPercentual ? "Desconto (%)" : "Desconto (R$)"}
              type="number"
              min={0}
              placeholder="0"
              value={form.valor}
              disabled={!precisaValor}
              onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
            />
          </div>

          <Input
            label="Usos máximos"
            type="number"
            min={1}
            placeholder="Ex.: 100"
            value={form.usosMaximos}
            onChange={(e) => setForm((f) => ({ ...f, usosMaximos: e.target.value }))}
            hint={
              editing
                ? `Já resgatado ${editing.usosFeitos} vez(es) — o limite não pode ficar abaixo disso.`
                : undefined
            }
          />

          <Input
            label="Empresa dona do voucher"
            placeholder="Ex.: AgroVerde"
            value={form.empresaNome}
            onChange={(e) => setForm((f) => ({ ...f, empresaNome: e.target.value }))}
            hint="Quem se cadastrar com este código fica vinculado a esta empresa."
          />

          <Input
            label="CNPJ da empresa"
            placeholder="AB.CDE.FGH/IJKL-01"
            inputMode="text"
            autoCapitalize="characters"
            value={form.empresaCnpj}
            // A máscara é aplicada a cada tecla: o campo aceita letras nas 12
            // primeiras posições (CNPJ alfanumérico) e só dígitos nas duas
            // últimas, e já sai formatado.
            onChange={(e) => setForm((f) => ({ ...f, empresaCnpj: formatarCnpj(e.target.value) }))}
            error={cnpjOk ? undefined : "CNPJ incompleto — são 14 posições."}
            success={cnpjCompleto(form.empresaCnpj)}
            hint="Opcional. Aceita letras: desde 2026 o CNPJ é alfanumérico nas 12 primeiras posições."
          />

          <div className="space-y-1.5">
            <label className="block text-h5 text-neutral-900">Curador / patrocinador</label>
            <select
              value={form.curadorId}
              onChange={(e) => setForm((f) => ({ ...f, curadorId: e.target.value }))}
              className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
            >
              <option value="">Nenhum — voucher institucional</option>
              {curadores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.email})
                </option>
              ))}
            </select>
            <p className="text-body-sm text-neutral-600">
              {form.curadorId
                ? "O voucher aparece no painel dele, e cada resgate espera a liberação dele."
                : "Sem curador, o resgate é liberado na hora do cadastro."}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-h5 text-neutral-900">Status</label>
            <select
              value={form.ativo ? "Ativo" : "Inativo"}
              onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.value === "Ativo" }))}
              className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900"
            >
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Excluir voucher"
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
          Tem certeza que deseja excluir <strong className="text-neutral-900">{toDelete?.codigo}</strong>?
          {toDelete && toDelete.usosFeitos > 0 && (
            <>
              {" "}
              Ele já foi resgatado <strong>{toDelete.usosFeitos} vez(es)</strong>: quem se cadastrou
              continua com a empresa, mas o vínculo com o voucher se perde. Para apenas parar de
              aceitá-lo, mude o status para <strong>Inativo</strong>.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
