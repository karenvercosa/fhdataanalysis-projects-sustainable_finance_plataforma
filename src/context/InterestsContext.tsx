import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { api } from "@/lib/admin-api";
import { type Interesse } from "@/types";

interface InterestsState {
  /** Catálogo completo, com id — o id é o que vira vínculo no banco. */
  catalogo: Interesse[];
  /** Só os nomes, para quem só precisa exibir a nuvem. */
  interests: string[];
  add: (name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** `false` enquanto a primeira leitura do servidor não chegou. */
  carregado: boolean;
}

const InterestsContext = createContext<InterestsState | null>(null);

/**
 * Catálogo de interesses vindo do banco.
 *
 * Saiu do `localStorage` porque o interesse é dado de negócio: é ele que
 * responde "quantos participantes se interessam por crédito de carbono?".
 * Guardado no navegador, cada pessoa via um catálogo diferente e nada disso
 * chegava a um relatório.
 *
 * O catálogo é público para quem está logado; criar e remover exige
 * `manage:platform` — a API é quem decide isso.
 */
export function InterestsProvider({ children }: { children: ReactNode }) {
  const [catalogo, setCatalogo] = useState<Interesse[]>([]);
  const [carregado, setCarregado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { interesses } = await api.get<{ interesses: Interesse[] }>("/api/interesses");
      setCatalogo(interesses);
    } catch {
      // Sem sessão (login/cadastro) ou rede fora: nuvem vazia, sem quebrar a tela.
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const value = useMemo<InterestsState>(
    () => ({
      catalogo,
      carregado,
      interests: catalogo.map((i) => i.nome),
      add: async (name) => {
        const nome = name.trim();
        if (!nome) return;
        const { interesse } = await api.post<{ interesse: Interesse }>("/api/interesses", { nome });
        setCatalogo((prev) =>
          prev.some((i) => i.id === interesse.id) ? prev : [...prev, interesse]
        );
      },
      remove: async (id) => {
        await api.remove(`/api/interesses/${id}`);
        setCatalogo((prev) => prev.filter((i) => i.id !== id));
      }
    }),
    [catalogo, carregado]
  );

  return <InterestsContext.Provider value={value}>{children}</InterestsContext.Provider>;
}

export function useInterests() {
  const ctx = useContext(InterestsContext);
  if (!ctx) throw new Error("useInterests deve ser usado dentro de <InterestsProvider>");
  return ctx;
}
