import { vi } from "vitest";

/**
 * Prisma falso para os testes das rotas de API.
 *
 * As rotas importam o cliente como singleton (`@/lib/prisma`), então o caminho
 * limpo de substituí-lo é `vi.mock` sobre esse módulo. Este helper monta um
 * objeto com os mesmos métodos que as rotas usam, todos como `vi.fn()`, e
 * repassa o `$transaction`:
 *
 *  - forma de callback (`$transaction(async tx => ...)`) recebe o próprio mock,
 *    para o código dentro da transação enxergar os mesmos métodos;
 *  - forma de array (`$transaction([...])`) resolve as promessas.
 */
export type PrismaFalso = ReturnType<typeof criarPrismaFalso>;

const MODELOS = [
  "usuario",
  "usuarioPerfil",
  "usuarioInteresse",
  "interesse",
  "voucher",
  "voucherResgate",
  "cotaPlataforma",
  "assinaturaPlataforma",
  "account",
  "session",
  "verification",
  "landingPageContent",
] as const;

const METODOS = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findMany",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "groupBy",
] as const;

export function criarPrismaFalso() {
  const cliente: any = {};

  for (const modelo of MODELOS) {
    cliente[modelo] = {};
    for (const metodo of METODOS) {
      cliente[modelo][metodo] = vi.fn();
    }
  }

  cliente.$transaction = vi.fn(async (arg: any) =>
    typeof arg === "function" ? arg(cliente) : Promise.all(arg),
  );
  cliente.$queryRawUnsafe = vi.fn();
  cliente.$executeRawUnsafe = vi.fn();
  cliente.$disconnect = vi.fn();

  return cliente;
}

/** Zera o histórico de chamadas sem perder as implementações registradas. */
export function limparPrismaFalso(cliente: PrismaFalso) {
  for (const modelo of MODELOS) {
    for (const metodo of METODOS) {
      cliente[modelo][metodo].mockReset();
    }
  }
  cliente.$transaction.mockClear();
}
