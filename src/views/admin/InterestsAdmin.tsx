import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Plus, X, Sparkles } from "lucide-react";
import { useInterests } from "@/context/InterestsContext";
import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";

export default function InterestsAdmin() {
  const { interests, add, remove } = useInterests();
  const [value, setValue] = useState("");

  const submit = () => {
    add(value);
    setValue("");
  };

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <PageHeader title="Interesses" subtitle={`${interests.length} temas na nuvem`} icon={Sparkles} />

      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Adicionar tema</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-body-sm text-neutral-600">
            Estes temas aparecem na nuvem de interesses do onboarding/perfil dos participantes.
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
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={submit} disabled={!value.trim()}>
              Adicionar
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {interests.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-3 pr-2 text-body-sm text-primary-700"
              >
                {tag}
                <button
                  onClick={() => remove(tag)}
                  aria-label={`Remover ${tag}`}
                  className="grid h-5 w-5 place-items-center rounded-full text-primary-600 hover:bg-primary-100 hover:text-error-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
