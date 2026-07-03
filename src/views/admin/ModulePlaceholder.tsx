import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Construction } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";

// Rótulos dos módulos do admin ainda não implementados (slug → nome).
const MODULE_LABELS: Record<string, string> = {
  // Todos os módulos do admin já têm tela própria; placeholder é fallback genérico.
};

export default function ModulePlaceholder() {
  const { module = "" } = useParams();
  const label = MODULE_LABELS[module] ?? "Módulo";

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>
      <PageHeader title={label} subtitle="Gestão administrativa" icon={Construction} />
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-600">
            <Construction className="h-7 w-7" />
          </div>
          <h2 className="text-h3 text-neutral-900">Módulo em construção</h2>
          <p className="max-w-md text-body text-neutral-600">
            O CRUD de <strong>{label}</strong> seguirá o mesmo padrão do módulo de Usuários
            (tabela, busca, filtros e formulários em modal). Já está mapeado no roadmap do MVP.
          </p>
          <Link to="/admin/usuarios">
            <Button variant="outline">Ver módulo de Usuários (pronto)</Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
