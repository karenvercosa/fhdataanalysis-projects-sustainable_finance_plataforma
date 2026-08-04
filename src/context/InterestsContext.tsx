import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { api } from "@/lib/admin-api";
import { useAuth } from "@/context/AuthContext";
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
  /**
   * Carrega o catálogo se ele ainda não veio.
   *
   * Existe para as telas PÚBLICAS que mostram a nuvem de temas — o cadastro. O
   * provider vive na raiz da SPA, então sem isto ele buscaria o catálogo até
   * na tela de login, onde ninguém precisa dele.
   */
  garantirCarregado: () => void;
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
 * A leitura do catálogo é pública (o cadastro precisa dela); criar e remover
 * exigem `manage:platform` — a API é quem decide isso.
 *
 * A busca NÃO acontece em toda tela: quem está autenticado carrega ao entrar,
 * e as telas públicas que usam a nuvem pedem por `garantirCarregado()`. Sem
 * isso, a tela de login disparava uma requisição que ninguém ia usar.
 */
export function InterestsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [catalogo, setCatalogo] = useState<Interesse[]>([]);
  const [carregado, setCarregado] = useState(false);
  // Guarda contra requisições repetidas: o StrictMode remonta os efeitos em
  // desenvolvimento, e `garantirCarregado` pode ser chamado por mais de uma tela.
  const buscando = useRef(false);

  const carregar = useCallback(async () => {
    if (buscando.current) return;
    buscando.current = true;
    try {
      const { interesses } = await api.get<{ interesses: Interesse[] }>("/api/interesses");
      setCatalogo(interesses);
    } catch {
      // Rede fora: nuvem vazia, sem quebrar a tela.
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void carregar();
  }, [isAuthenticated, carregar]);

  const value = useMemo<InterestsState>(
    () => ({
      catalogo,
      carregado,
      garantirCarregado: () => {
        if (!carregado) void carregar();
      },
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
    [catalogo, carregado, carregar]
  );

  return <InterestsContext.Provider value={value}>{children}</InterestsContext.Provider>;
}

export function useInterests() {
  const ctx = useContext(InterestsContext);
  if (!ctx) throw new Error("useInterests deve ser usado dentro de <InterestsProvider>");
  return ctx;
}
