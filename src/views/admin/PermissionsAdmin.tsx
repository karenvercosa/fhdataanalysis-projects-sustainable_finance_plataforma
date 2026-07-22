import { Link } from "react-router-dom";
import { ChevronLeft, ShieldCheck, RotateCcw } from "lucide-react";
import { Button, Card, CardBody, Checkbox } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { usePermissions } from "@/context/PermissionsContext";
import { ROLE_LABEL, CAPABILITY_LABEL, ALL_CAPABILITIES, type Role } from "@/lib/roles";

const ROLES = Object.keys(ROLE_LABEL) as Role[];

export default function PermissionsAdmin() {
  const { matrix, toggle, reset } = usePermissions();

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Permissões" subtitle="Matriz RBAC — altera o acesso no app em tempo real" icon={ShieldCheck} />
        <Button variant="outline" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={reset}>
          Restaurar padrão
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-warning-50 px-4 py-3 text-body-sm text-warning-500">
        Alterações aqui afetam imediatamente rotas, menus e ações de todos os usuários do perfil.
      </div>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-body-sm text-neutral-600">
                <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium">Capacidade</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-3 py-3 text-center font-medium">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_CAPABILITIES.map((cap) => (
                <tr key={cap} className="border-b border-neutral-50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-body font-medium text-neutral-900">
                    {CAPABILITY_LABEL[cap]}
                  </td>
                  {ROLES.map((role) => {
                    const checked = matrix[role]?.includes(cap) ?? false;
                    // Trava de segurança: não permite remover a gestão do Admin (evita lockout).
                    const locked = role === "admin" && cap === "manage:platform";
                    return (
                      <td key={role} className="px-3 py-3 text-center">
                        <Checkbox
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggle(role, cap)}
                          label={<span className="sr-only">{`${ROLE_LABEL[role]} — ${CAPABILITY_LABEL[cap]}`}</span>}
                          className="justify-center"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
