import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { type Role, type Capability } from "@/lib/roles";
import { usePermissions } from "@/context/PermissionsContext";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  ticketCode?: string; // presente quando há ingresso ativo
  curatorVoucher?: string; // empresa/curador: prefixo do voucher
  isPaid?: boolean; // adquiriu ingresso (pago ou resgate via voucher)
  /** Só o ingresso Presencial (voucher) gera credencial; Online é digital. */
  hasCredential?: boolean;
}

interface LoginResult {
  ok: boolean;
  error?: string;
  role?: Role;
}

export interface Phase1Data {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface AuthState {
  user: CurrentUser;
  isAuthenticated: boolean;
  login: (email: string, password: string) => LoginResult;
  /** Onboarding Fase 1: cria conta de Participante Não Pago (acesso ao streaming). */
  registerGuest: (data: Phase1Data) => void;
  /** Login/cadastro social (Google) — entra como Não Pago (simulado). */
  loginWithGoogle: () => void;
  /** Fase 2: conclui o checkout → libera a plataforma. `credential` (Presencial) gera a credencial. */
  completeCheckout: (opts?: { credential?: boolean }) => void;
  logout: () => void;
  /** Troca de papel — usado no protótipo para demonstrar os 7 fluxos. */
  setRole: (role: Role) => void;
  can: (cap: Capability) => boolean;
}

// Contas de demonstração. Em produção, validação acontece no backend (JWT/Asaas).
export const DEMO_ACCOUNTS: Record<string, CurrentUser> = {
  "participante@sf.com": {
    id: "u_001", name: "Marina Costa", email: "participante@sf.com",
    role: "attendee", ticketCode: "SF26-7F3A-91KD", curatorVoucher: "VERDE2026"
  },
  "curador@sf.com": {
    id: "u_002", name: "João Patrocínio", email: "curador@sf.com",
    role: "curator", curatorVoucher: "VERDE2026"
  },
  "operador@sf.com": {
    id: "u_003", name: "Equipe Credenciamento", email: "operador@sf.com", role: "operator"
  },
  "admin@sf.com": {
    id: "u_004", name: "Admin SF", email: "admin@sf.com", role: "admin"
  }
};

const STORAGE_KEY = "sf_session_email";
const FALLBACK_USER = DEMO_ACCOUNTS["participante@sf.com"];

function readStored(): CurrentUser | null {
  try {
    const email = localStorage.getItem(STORAGE_KEY);
    return email ? DEMO_ACCOUNTS[email] ?? null : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [user, setUser] = useState<CurrentUser>(stored ?? FALLBACK_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!stored);
  const permissions = usePermissions(); // matriz RBAC editável

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated,
      login: (email, password) => {
        const key = email.trim().toLowerCase();
        const account = DEMO_ACCOUNTS[key];
        // Prevenção de erros (Heurística 5): valida credenciais antes de entrar.
        if (!account) return { ok: false, error: "Conta não encontrada. Use uma conta de teste." };
        if (password.trim().length < 4) return { ok: false, error: "Senha deve ter ao menos 4 caracteres." };
        try {
          localStorage.setItem(STORAGE_KEY, key);
        } catch {
          /* ignora indisponibilidade de storage */
        }
        setUser(account);
        setIsAuthenticated(true);
        return { ok: true, role: account.role };
      },
      registerGuest: (data) => {
        // Fase 1 — atrito mínimo: só dados essenciais; entra como Não Pago.
        const guest: CurrentUser = {
          id: crypto.randomUUID(),
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email.trim().toLowerCase(),
          role: "guest"
        };
        setUser(guest);
        setIsAuthenticated(true);
      },
      loginWithGoogle: () => {
        // Simulação de OAuth Google → entra como Participante Não Pago.
        setUser({
          id: crypto.randomUUID(),
          name: "Usuário Google",
          email: "voce@gmail.com",
          role: "guest"
        });
        setIsAuthenticated(true);
      },
      completeCheckout: (opts) => {
        // Libera toda a plataforma. Presencial (voucher) também gera credencial.
        const credential = opts?.credential ?? true;
        const block = () => crypto.randomUUID().slice(0, 4).toUpperCase();
        setUser((u) => ({
          ...u,
          role: u.role === "guest" ? "attendee" : u.role,
          isPaid: true,
          hasCredential: credential,
          ticketCode: credential ? u.ticketCode ?? `SF26-${block()}-${block()}` : undefined
        }));
      },
      logout: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
        setIsAuthenticated(false);
        setUser(FALLBACK_USER);
      },
      setRole: (role) => setUser((u) => ({ ...u, role })),
      can: (cap) => permissions.can(user.role, cap)
    }),
    [user, isAuthenticated, permissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
