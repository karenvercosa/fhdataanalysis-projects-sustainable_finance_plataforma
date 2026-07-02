import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { DEFAULT_MATRIX, type Role, type Capability } from "@/lib/roles";

type Matrix = Record<Role, Capability[]>;

interface PermissionsState {
  matrix: Matrix;
  can: (role: Role, cap: Capability) => boolean;
  toggle: (role: Role, cap: Capability) => void;
  reset: () => void;
}

const PermissionsContext = createContext<PermissionsState | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // Matriz RBAC editável e persistente (controlada pelo Admin em /admin/permissoes).
  // A chave é versionada: ao adicionar novas capacidades ao DEFAULT_MATRIX,
  // incremente o sufixo para invalidar matrizes antigas salvas no navegador.
  const [matrix, setMatrix] = usePersistentState<Matrix>("sf_permissions_v4", DEFAULT_MATRIX);

  const value = useMemo<PermissionsState>(
    () => ({
      matrix,
      can: (role, cap) => matrix[role]?.includes(cap) ?? false,
      toggle: (role, cap) =>
        setMatrix((prev) => {
          const caps = prev[role] ?? [];
          const next = caps.includes(cap) ? caps.filter((c) => c !== cap) : [...caps, cap];
          return { ...prev, [role]: next };
        }),
      reset: () => setMatrix(DEFAULT_MATRIX)
    }),
    [matrix, setMatrix]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions deve ser usado dentro de <PermissionsProvider>");
  return ctx;
}
