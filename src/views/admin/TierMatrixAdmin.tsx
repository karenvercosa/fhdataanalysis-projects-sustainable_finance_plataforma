import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Layers, RotateCcw, Save, CheckCircle2, Info } from "lucide-react";
import { Button, Card, CardBody, Switch } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { useTierMatrix } from "@/context/TierMatrixContext";
import {
  DEFAULT_TIER_MATRIX,
  TIER_FEATURE_ROWS,
  type TierFeatures,
  type TierMatrix
} from "@/data/tierMatrix";
import { CONNECTIONS } from "@/data/networking";
import { cn } from "@/lib/utils";

/** Quantas empresas herdam cada cota — deixa o impacto da mudança concreto. */
function companiesInTier(tierName: string) {
  return CONNECTIONS.filter((c) => c.kind === "company" && c.tier === tierName).length;
}

export default function TierMatrixAdmin() {
  const { matrix, save, reset } = useTierMatrix();
  // Rascunho local: nada é aplicado até o Admin salvar.
  const [draft, setDraft] = useState<TierMatrix>(matrix);
  const [toast, setToast] = useState<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(matrix), [draft, matrix]);

  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2500);
  };

  const patch = (tierId: string, key: keyof TierFeatures, value: boolean) =>
    setDraft((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, features: { ...t.features, [key]: value } } : t))
    );

  const rename = (tierId: string, name: string) =>
    setDraft((prev) => prev.map((t) => (t.id === tierId ? { ...t, name } : t)));

  const onSave = () => {
    save(draft);
    notify("Matriz de cotas salva. Todas as empresas herdaram as novas regras.");
  };

  const onReset = () => {
    reset();
    setDraft(DEFAULT_TIER_MATRIX);
    notify("Matriz restaurada para o padrão.");
  };

  return (
    <div className="space-y-4 pb-24">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Cotas de patrocínio"
          subtitle="Defina o que cada cota libera no Perfil Público de patrocinadores e curadores"
          icon={Layers}
        />
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={onReset}>
            Restaurar padrão
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md bg-info-50 px-4 py-3 text-body-sm text-info-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        A regra é global e vale por cota: ao salvar, <strong>todas as empresas daquela cota</strong> herdam
        a alteração. Não há exceção por empresa.
      </div>

      {/* MATRIZ — linhas: recursos · colunas: cotas */}
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="sticky left-0 z-10 bg-white px-4 py-3 text-body-sm font-medium text-neutral-600">
                  Recurso do Perfil Público
                </th>
                {draft.map((t) => (
                  <th key={t.id} className="min-w-[150px] px-3 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <input
                        value={t.name}
                        onChange={(e) => rename(t.id, e.target.value)}
                        aria-label={`Nome da cota ${t.name}`}
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-center text-h5 text-neutral-900 hover:border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                      <span className="text-body-sm font-normal text-neutral-500">
                        {companiesInTier(t.name)} empresa(s)
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIER_FEATURE_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-neutral-100 last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3">
                    <p className="text-body font-medium text-neutral-900">{row.label}</p>
                    {row.hint && <p className="text-body-sm text-neutral-500">{row.hint}</p>}
                  </td>

                  {draft.map((t) => {
                    const value = t.features[row.key];
                    return (
                      <td key={t.id} className="px-3 py-3 align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={value}
                            onChange={(next) => patch(t.id, row.key, next)}
                            label={`${row.label} — cota ${t.name}`}
                          />
                          {/* Estado legível em texto, não só pela cor */}
                          <span
                            className={cn(
                              "text-body-sm",
                              value ? "font-medium text-primary-600" : "text-neutral-400"
                            )}
                          >
                            {value ? "Habilitado" : "Desabilitado"}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Barra de ação fixa — o Admin nunca perde o "Salvar" de vista */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm text-neutral-600">
            {dirty ? "Você tem alterações não salvas." : "Todas as alterações estão salvas."}
          </p>
          <div className="flex gap-2">
            {dirty && (
              <Button variant="ghost" onClick={() => setDraft(matrix)}>
                Descartar
              </Button>
            )}
            <Button disabled={!dirty} leftIcon={<Save className="h-4 w-4" />} onClick={onSave}>
              Salvar alterações
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmação */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-md bg-success-50 px-4 py-3 text-body text-success-500 shadow-pop"
        >
          <CheckCircle2 className="h-5 w-5" /> {toast}
        </div>
      )}
    </div>
  );
}
