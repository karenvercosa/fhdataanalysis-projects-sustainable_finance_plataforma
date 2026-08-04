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
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_TIER_MATRIX,
  UNRESTRICTED,
  type TierFeatures,
  type TierMatrix
} from "@/data/tierMatrix";

interface TierMatrixState {
  matrix: TierMatrix;
  /** Grava a matriz inteira — usado pelo "Salvar alterações" do Admin. */
  save: (next: TierMatrix) => Promise<void>;
  reset: () => Promise<void>;
  /** Recursos liberados para uma cota. Sem cota → sem restrição. */
  featuresOf: (tier?: string) => TierFeatures;
  /** `false` enquanto a primeira leitura do servidor não chegou. */
  carregada: boolean;
}

const TierMatrixContext = createContext<TierMatrixState | null>(null);

/**
 * Matriz de cotas vinda do banco.
 *
 * Antes ela vivia no `localStorage`: o Admin marcava um recurso e aquilo valia
 * só no navegador dele — nenhum patrocinador via a mudança. Agora a fonte é a
 * tabela `cota_plataforma`, então o que o Admin liga vale para todo mundo.
 *
 * O padrão em código (`DEFAULT_TIER_MATRIX`) segue como estado inicial, para a
 * tela ter o que renderizar no primeiro quadro e não piscar sem cotas enquanto
 * a resposta não chega.
 *
 * A busca só acontece com sessão: a matriz decide o que aparece no perfil de
 * quem está dentro do app, e não tem uso nas telas públicas. Sem essa condição
 * o provider chamava `/api/cotas` já na tela de login, onde a resposta só podia
 * ser 401.
 */
export function TierMatrixProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [matrix, setMatrix] = useState<TierMatrix>(DEFAULT_TIER_MATRIX);
  const [carregada, setCarregada] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { matriz } = await api.get<{ matriz: TierMatrix }>("/api/cotas");
      if (matriz.length) setMatrix(matriz);
    } catch {
      // Rede fora: segue com o padrão em código.
    } finally {
      setCarregada(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void carregar();
  }, [isAuthenticated, carregar]);

  const value = useMemo<TierMatrixState>(
    () => ({
      matrix,
      carregada,
      save: async (next) => {
        const { matriz } = await api.put<{ matriz: TierMatrix }>("/api/cotas", { matriz: next });
        setMatrix(matriz);
      },
      reset: async () => {
        const { matriz } = await api.put<{ matriz: TierMatrix }>("/api/cotas", {
          // Preserva os ids atuais: repor os padrões é sobre os RECURSOS, não
          // sobre recriar as cotas (que são referenciadas por nome no selo).
          matriz: matrix.map((cota, i) => ({
            ...cota,
            features: DEFAULT_TIER_MATRIX[i]?.features ?? cota.features
          }))
        });
        setMatrix(matriz);
      },
      featuresOf: (tier) => matrix.find((t) => t.name === tier)?.features ?? UNRESTRICTED
    }),
    [matrix, carregada]
  );

  return <TierMatrixContext.Provider value={value}>{children}</TierMatrixContext.Provider>;
}

export function useTierMatrix() {
  const ctx = useContext(TierMatrixContext);
  if (!ctx) throw new Error("useTierMatrix deve ser usado dentro de <TierMatrixProvider>");
  return ctx;
}
