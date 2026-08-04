"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import { usePermissions } from "@/context/PermissionsContext";
import {
  type Capability,
  type CurrentUser,
  type LoginResult,
  type Role,
  type SessaoCliente,
} from "@/types";

export type { CurrentUser } from "@/types";

interface AuthState {
  user: CurrentUser;
  isAuthenticated: boolean;
  /**
   * Papel REAL do usuário, como o servidor resolveu. Difere de `user.role`
   * enquanto o Admin estiver usando o seletor de perfil do protótipo.
   */
  roleServidor: Role;
  /** Primeiro acesso pendente: a senha ainda é a provisória do e-mail. */
  senhaProvisoria: boolean;
  /**
   * Login por e-mail/senha (Better Auth). `lembrar` decide se o cookie de
   * sessão é persistente ou morre ao fechar o navegador.
   */
  login: (email: string, password: string, lembrar?: boolean) => Promise<LoginResult>;
  /** Login/cadastro social (Google) — redireciona para o provedor. */
  loginWithGoogle: (callbackURL?: string) => Promise<void>;
  /** Fase 2: conclui o checkout → libera a plataforma. `credential` (Presencial) gera a credencial. */
  completeCheckout: (opts?: { credential?: boolean }) => void;
  logout: () => Promise<void>;
  /** Exclui a conta do usuário: apaga os dados pessoais e encerra a sessão. */
  deleteAccount: () => Promise<void>;
  /** Troca de papel — usado no protótipo para demonstrar os fluxos (só visual). */
  setRole: (role: Role) => void;
  can: (cap: Capability) => boolean;
  /** Relê `/api/sessao` — usado depois de login, checkout ou troca de perfil. */
  recarregarSessao: () => Promise<void>;
}

/**
 * Usuário exibido enquanto não há sessão. Não concede nada: sem capacidades
 * vindas do servidor, nenhuma rota protegida abre.
 */
const USUARIO_ANONIMO: CurrentUser = {
  id: "",
  name: "",
  email: "",
  role: "guest",
};

/**
 * Dados pessoais apagados junto com a conta. Não inclui catálogos do evento
 * (sessões, vouchers, permissões), que pertencem à organização.
 */
const PERSONAL_KEYS = [
  "sf_profile",
  "sf_favorites",
  "sf_participation",
  "sf_connection_favorites",
  "sf_preinscricoes",
  "sf_leads_parceria",
  "sf_tier_upgrade_request",
  "sf_tier_panel_expanded"
];

const AuthContext = createContext<AuthState | null>(null);

/**
 * Estado de autenticação da SPA.
 *
 * A sessão NÃO é mais inventada no navegador: ela chega pronta do Server
 * Component que autorizou a rota (`sessao`) e pode ser reconferida a qualquer
 * momento em `/api/sessao`. Papel e capacidades vêm da tabela
 * `usuario_perfil` — o `localStorage` deixou de ter voz nisso.
 */
export function AuthProvider({
  children,
  sessao,
}: Readonly<{ children: ReactNode; sessao: SessaoCliente | null }>) {
  const [user, setUser] = useState<CurrentUser>(sessao?.user ?? USUARIO_ANONIMO);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!sessao);
  // Capacidades concedidas pelo servidor para o papel real do usuário.
  const [capabilities, setCapabilities] = useState<Capability[]>(sessao?.capabilities ?? []);
  // Papel real, para saber se o seletor de demonstração está ativo.
  const [roleServidor, setRoleServidor] = useState<Role>(sessao?.user.role ?? "guest");
  const [senhaProvisoria, setSenhaProvisoria] = useState<boolean>(
    sessao?.senhaProvisoria ?? false,
  );

  const permissions = usePermissions(); // matriz RBAC editável (só experiência)

  const aplicarSessao = useCallback((dados: SessaoCliente | null) => {
    setUser(dados?.user ?? USUARIO_ANONIMO);
    setIsAuthenticated(!!dados);
    setCapabilities(dados?.capabilities ?? []);
    setRoleServidor(dados?.user.role ?? "guest");
    setSenhaProvisoria(dados?.senhaProvisoria ?? false);
  }, []);

  const recarregarSessao = useCallback(async () => {
    try {
      const resp = await fetch("/api/sessao", { cache: "no-store" });
      const dados = await resp.json();
      aplicarSessao(dados?.user ? (dados as SessaoCliente) : null);
    } catch {
      /* rede indisponível — mantém o estado atual */
    }
  }, [aplicarSessao]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated,
      roleServidor,
      senhaProvisoria,

      login: async (email, password, lembrar = false) => {
        const { error } = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
          // "Lembrar de mim": com `false` o Better Auth grava um cookie de
          // sessão, que o navegador descarta ao fechar; com `true` o cookie
          // é persistente e vale até `session.expiresIn`.
          rememberMe: lembrar,
        });

        if (error) {
          // Mensagem genérica de propósito: dizer "e-mail não existe" entrega
          // a um atacante quais endereços estão cadastrados.
          return { ok: false, error: "E-mail ou senha inválidos." };
        }

        // O papel vem do servidor, nunca da resposta do login.
        const resp = await fetch("/api/sessao", { cache: "no-store" });
        const dados = await resp.json();
        if (!dados?.user) return { ok: false, error: "Não foi possível carregar a sessão." };

        const sessaoNova = dados as SessaoCliente;
        aplicarSessao(sessaoNova);
        return {
          ok: true,
          role: sessaoNova.user.role,
          tipoConta: sessaoNova.user.tipoConta,
          precisaTrocarSenha: Boolean(sessaoNova.senhaProvisoria),
        };
      },

      loginWithGoogle: async (callbackURL = "/inicio") => {
        await authClient.signIn.social({ provider: "google", callbackURL });
      },

      completeCheckout: (opts) => {
        // Simulação local do checkout (Asaas ainda não integrado nesta tela).
        // Libera a plataforma; Presencial (voucher) também gera credencial.
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

      logout: async () => {
        await authClient.signOut();
        aplicarSessao(null);
        // Recarrega pelo servidor para o middleware reavaliar a rota e nada da
        // sessão anterior sobreviver na memória da SPA.
        window.location.assign("/login");
      },

      deleteAccount: async () => {
        try {
          PERSONAL_KEYS.forEach((k) => localStorage.removeItem(k));
        } catch {
          /* storage indisponível — segue para o logout mesmo assim */
        }
        await authClient.signOut();
        aplicarSessao(null);
        window.location.assign("/login");
      },

      setRole: (role) => setUser((u) => ({ ...u, role })),

      can: (cap) => {
        // Seletor de papel do protótipo: enquanto o papel exibido é diferente
        // do real, a UI segue a matriz editável do Admin. Isso muda só o que
        // aparece na tela — o servidor continua decidindo pelo papel real.
        if (user.role !== roleServidor) return permissions.can(user.role, cap);
        return capabilities.includes(cap);
      },

      recarregarSessao
    }),
    [
      user,
      isAuthenticated,
      capabilities,
      roleServidor,
      senhaProvisoria,
      permissions,
      aplicarSessao,
      recarregarSessao
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
