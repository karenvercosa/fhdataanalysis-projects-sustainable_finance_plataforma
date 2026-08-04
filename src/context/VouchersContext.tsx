import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { VOUCHERS } from "@/data/catalog";
import { type Voucher } from "@/data/schema";

interface VouchersState {
  vouchers: Voucher[];
  getByCode: (code: string) => Voucher | undefined;
  remaining: (v: Voucher) => number;
  /** Resgata 1 uso (respeita o limite definido pelo Admin). */
  redeem: (id: string) => void;
  /**
   * Compra em lote/avulso: o curador informa o código do voucher. Se já existir
   * um voucher dele com esse código, soma os convites; senão cria um novo.
   * Código em branco gera um automático.
   */
  createBatch: (ownerId: string, quantity: number, code?: string) => Voucher;
  /** Ativa/desativa um voucher (dono pode revogar/restaurar o acesso). */
  toggleActive: (id: string) => void;
}

const block = () => crypto.randomUUID().slice(0, 4).toUpperCase();

const VouchersContext = createContext<VouchersState | null>(null);

// Atualizadores puros no topo do módulo: dentro do `useMemo` cada um empilhava
// cinco níveis de closure (SonarQube S2004).
function resgatarUso(prev: Voucher[], id: string): Voucher[] {
  return prev.map((v) =>
    v.id === id && v.usedCount < v.maxUses ? { ...v, usedCount: v.usedCount + 1 } : v
  );
}

function substituirVoucher(prev: Voucher[], atualizado: Voucher): Voucher[] {
  return prev.map((v) => (v.id === atualizado.id ? atualizado : v));
}

function alternarAtivo(prev: Voucher[], id: string): Voucher[] {
  return prev.map((v) => (v.id === id ? { ...v, active: !v.active } : v));
}

export function VouchersProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [vouchers, setVouchers] = usePersistentState<Voucher[]>("sf_vouchers_live", VOUCHERS);

  const value = useMemo<VouchersState>(
    () => ({
      vouchers,
      getByCode: (code) =>
        vouchers.find((v) => v.active && v.code.toLowerCase() === code.trim().toLowerCase()),
      remaining: (v) => v.maxUses - v.usedCount,
      redeem: (id) => setVouchers((prev) => resgatarUso(prev, id)),
      createBatch: (ownerId, quantity, code) => {
        const trimmed = (code ?? "").trim();
        // Reaproveita um voucher do curador com o mesmo código (soma convites).
        const existing = trimmed
          ? vouchers.find(
              (v) => v.ownerType === "curator" && v.ownerId === ownerId && v.code.toLowerCase() === trimmed.toLowerCase()
            )
          : undefined;
        if (existing) {
          const updated: Voucher = { ...existing, maxUses: existing.maxUses + quantity, active: true };
          setVouchers((prev) => substituirVoucher(prev, updated));
          return updated;
        }
        const voucher: Voucher = {
          id: crypto.randomUUID(),
          code: trimmed || `CUR-${block()}-${block()}`,
          kind: "free",
          value: 0,
          maxUses: quantity,
          usedCount: 0,
          ownerType: "curator",
          ownerId,
          active: true
        };
        setVouchers((prev) => [...prev, voucher]);
        return voucher;
      },
      toggleActive: (id) => setVouchers((prev) => alternarAtivo(prev, id))
    }),
    [vouchers, setVouchers]
  );

  return <VouchersContext.Provider value={value}>{children}</VouchersContext.Provider>;
}

export function useVouchers() {
  const ctx = useContext(VouchersContext);
  if (!ctx) throw new Error("useVouchers deve ser usado dentro de <VouchersProvider>");
  return ctx;
}
