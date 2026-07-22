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

/**
 * Assinatura curta do DEFAULT_MATRIX. A chave de storage deriva dela, então
 * qualquer mudança nos padrões invalida sozinha a matriz salva no navegador —
 * antes era preciso lembrar de incrementar a versão à mão, e esquecer disso
 * deixava usuários com permissões antigas em cache.
 */
function assinatura(m: Matrix): string {
  const texto = (Object.keys(m) as Role[])
    .sort()
    .map((r) => `${r}:${[...m[r]].sort().join(",")}`)
    .join("|");
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (Math.imul(31, h) + texto.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const PERMISSIONS_KEY = `sf_permissions_${assinatura(DEFAULT_MATRIX)}`;

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // Matriz RBAC editável e persistente (controlada pelo Admin).
  const [matrix, setMatrix] = usePersistentState<Matrix>(PERMISSIONS_KEY, DEFAULT_MATRIX);

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
