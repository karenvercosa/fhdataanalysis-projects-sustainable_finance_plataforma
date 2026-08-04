import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronLeft, Plus, X, Sparkles } from "lucide-react";
import { useInterests } from "@/context/InterestsContext";
import { Button, Card, CardBody, CardHeader, Input, Loader } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";

/**
 * Catálogo de interesses do Admin, gravando na tabela `interesse`.
 *
 * Remover é desativar: quem já escolheu o tema tem uma linha em
 * `usuario_interesse`, e apagar levaria esse histórico junto — justamente o
 * dado que os relatórios vão usar.
 */
export default function InterestsAdmin() {
  const { catalogo, carregado, add, remove } = useInterests();
  const [value, setValue] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const submit = async () => {
    if (!value.trim() || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await add(value);
      setValue("");
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível adicionar o tema.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string) => {
    setErro(null);
    try {
      await remove(id);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível remover o tema.");
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <PageHeader title="Interesses" subtitle={`${catalogo.length} temas na nuvem`} icon={Sparkles} />

      {erro && (
        <div role="alert" className="flex items-center gap-2 rounded-md bg-error-50 px-4 py-3 text-body text-error-500">
          <AlertCircle className="h-5 w-5 shrink-0" /> {erro}
        </div>
      )}

      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Adicionar tema</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-body-sm text-neutral-600">
            Estes temas aparecem na nuvem de interesses do cadastro e do perfil. A escolha de cada
            pessoa fica registrada no banco, para os relatórios de audiência.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Ex.: Taxonomia verde"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={submit}
              disabled={!value.trim() || salvando}
            >
              {salvando ? "Adicionando…" : "Adicionar"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {!carregado && <Loader label="Carregando temas…" />}
            {catalogo.map((tema) => (
              <span
                key={tema.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-3 pr-2 text-body-sm text-primary-700"
              >
                {tema.nome}
                <button
                  onClick={() => excluir(tema.id)}
                  aria-label={`Remover ${tema.nome}`}
                  className="grid h-5 w-5 place-items-center rounded-full text-primary-600 hover:bg-primary-100 hover:text-error-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {carregado && catalogo.length === 0 && (
              <p className="text-body-sm text-neutral-600">Nenhum tema cadastrado ainda.</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
