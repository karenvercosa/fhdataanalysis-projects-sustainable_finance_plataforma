import { HardHat, type LucideIcon } from "lucide-react";
import { Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";

/**
 * Aba que ainda não está pronta.
 *
 * Ocupa o lugar de uma tela em desenvolvimento sem apagar nada: a rota
 * continua existindo, o menu continua levando até ela, e quem chega entende
 * que o vazio é intencional — em vez de achar que a página quebrou.
 *
 * A tela original NÃO deve ser removida ao aplicar este componente: basta
 * deixar de renderizá-la, para o trabalho já feito continuar disponível
 * quando a aba voltar.
 *
 *   <Route path="/networking" element={<AbaEmConstrucao titulo="Networking" />} />
 */
export function AbaEmConstrucao({
  titulo,
  descricao = "Estamos preparando esta área. Em breve ela estará disponível por aqui.",
  icon = HardHat,
}: Readonly<{
  titulo: string;
  /** Substitui o texto padrão quando houver algo mais específico a dizer. */
  descricao?: string;
  /** Ícone do cabeçalho — por padrão, o capacete de obra. */
  icon?: LucideIcon;
}>) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={titulo} subtitle="Em construção" icon={icon} />

      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-warning-50 text-warning-500">
            <HardHat className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-h3 text-neutral-900">Aba em construção</h2>
            <p className="mx-auto max-w-md text-body text-neutral-600">{descricao}</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
