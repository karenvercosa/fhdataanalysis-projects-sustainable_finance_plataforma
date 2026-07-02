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
  /** Compra em lote: gera um voucher com N convites para o curador distribuir. */
  createBatch: (ownerId: string, quantity: number) => Voucher;
}

const block = () => crypto.randomUUID().slice(0, 4).toUpperCase();

const VouchersContext = createContext<VouchersState | null>(null);

export function VouchersProvider({ children }: { children: ReactNode }) {
  const [vouchers, setVouchers] = usePersistentState<Voucher[]>("sf_vouchers_live", VOUCHERS);

  const value = useMemo<VouchersState>(
    () => ({
      vouchers,
      getByCode: (code) =>
        vouchers.find((v) => v.active && v.code.toLowerCase() === code.trim().toLowerCase()),
      remaining: (v) => v.maxUses - v.usedCount,
      redeem: (id) =>
        setVouchers((prev) =>
          prev.map((v) => (v.id === id && v.usedCount < v.maxUses ? { ...v, usedCount: v.usedCount + 1 } : v))
        ),
      createBatch: (ownerId, quantity) => {
        const voucher: Voucher = {
          id: crypto.randomUUID(),
          code: `CUR-${block()}-${block()}`,
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
      }
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
