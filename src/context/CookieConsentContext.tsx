import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";

export const COOKIE_CONSENT_KEY = "sf_cookie_consent";

export interface CookiePrefs {
  /** Sempre true: sem eles a plataforma não funciona. */
  necessarios: true;
  analytics: boolean;
  marketing: boolean;
  /** Data da decisão — evidência de consentimento exigida pela LGPD. */
  decididoEm: string;
}

interface CookieConsentState {
  prefs: CookiePrefs | null;
  /** Ainda não decidiu — o banner precisa aparecer. */
  pendente: boolean;
  aceitarTodos: () => void;
  salvar: (p: { analytics: boolean; marketing: boolean }) => void;
  /** Reabre a decisão (link "Preferências de cookies"). */
  revisar: () => void;
  painelAberto: boolean;
  abrirPainel: () => void;
  fecharPainel: () => void;
}

const CookieConsentContext = createContext<CookieConsentState | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = usePersistentState<CookiePrefs | null>(COOKIE_CONSENT_KEY, null);
  const [painelAberto, setPainelAberto] = useState(false);

  const value = useMemo<CookieConsentState>(() => {
    const registrar = (analytics: boolean, marketing: boolean) =>
      setPrefs({
        necessarios: true,
        analytics,
        marketing,
        decididoEm: new Date().toISOString()
      });

    return {
      prefs,
      pendente: prefs === null,
      aceitarTodos: () => registrar(true, true),
      salvar: ({ analytics, marketing }) => registrar(analytics, marketing),
      revisar: () => setPrefs(null),
      painelAberto,
      abrirPainel: () => setPainelAberto(true),
      fecharPainel: () => setPainelAberto(false)
    };
  }, [prefs, setPrefs, painelAberto]);

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent deve ser usado dentro de <CookieConsentProvider>");
  return ctx;
}
