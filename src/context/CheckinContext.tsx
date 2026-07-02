import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { ATTENDEES, type Attendee } from "@/data/mock";

interface CheckinState {
  attendees: Attendee[];
  credential: (id: string) => void;
  /** Alterna o check de "já bipou o QR" (feito fora da plataforma). */
  toggle: (id: string) => void;
  stats: { total: number; credentialed: number; pending: number; rate: number };
}

const CheckinContext = createContext<CheckinState | null>(null);

export function CheckinProvider({ children }: { children: ReactNode }) {
  // Credenciamento compartilhado: o que o Operador bipa aparece nos Relatórios.
  const [attendees, setAttendees] = usePersistentState<Attendee[]>("sf_checkin", ATTENDEES);

  const value = useMemo<CheckinState>(() => {
    const credentialed = attendees.filter((a) => a.status === "Credenciado").length;
    return {
      attendees,
      credential: (id) =>
        setAttendees((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Credenciado" } : a))),
      toggle: (id) =>
        setAttendees((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: a.status === "Credenciado" ? "Confirmado" : "Credenciado" } : a))
        ),
      stats: {
        total: attendees.length,
        credentialed,
        pending: attendees.length - credentialed,
        rate: attendees.length ? Math.round((credentialed / attendees.length) * 100) : 0
      }
    };
  }, [attendees, setAttendees]);

  return <CheckinContext.Provider value={value}>{children}</CheckinContext.Provider>;
}

export function useCheckin() {
  const ctx = useContext(CheckinContext);
  if (!ctx) throw new Error("useCheckin deve ser usado dentro de <CheckinProvider>");
  return ctx;
}
