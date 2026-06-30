import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { type Capability } from "@/lib/roles";

/**
 * Protege rotas por capacidade (não por papel). Sem permissão:
 * redireciona para a trava de conteúdo (Heurística 9: recuperação clara).
 */
export function RoleGuard({
  capability,
  children,
  redirectTo = "/conteudos"
}: {
  capability: Capability;
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { can } = useAuth();
  if (!can(capability)) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
