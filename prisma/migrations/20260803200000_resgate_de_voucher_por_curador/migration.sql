-- CreateEnum
CREATE TYPE "status_resgate_voucher" AS ENUM ('pendente', 'aprovado', 'negado');

-- AlterTable: curador/patrocinador responsável pelo voucher.
ALTER TABLE "voucher" ADD COLUMN "curador_id" UUID;

CREATE INDEX "voucher_curador_id_idx" ON "voucher"("curador_id");

ALTER TABLE "voucher" ADD CONSTRAINT "voucher_curador_id_fkey"
  FOREIGN KEY ("curador_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: o pedido de resgate e a decisão do curador.
CREATE TABLE "voucher_resgate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "status" "status_resgate_voucher" NOT NULL DEFAULT 'pendente',
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidido_em" TIMESTAMPTZ,

    CONSTRAINT "voucher_resgate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voucher_resgate_voucher_id_usuario_id_key"
  ON "voucher_resgate"("voucher_id", "usuario_id");

CREATE INDEX "voucher_resgate_status_idx" ON "voucher_resgate"("status");

ALTER TABLE "voucher_resgate" ADD CONSTRAINT "voucher_resgate_voucher_id_fkey"
  FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "voucher_resgate" ADD CONSTRAINT "voucher_resgate_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Histórico dos resgates que já existiam: eram todos de vouchers
-- institucionais (sem curador), então entram já aprovados.
INSERT INTO "voucher_resgate" ("voucher_id", "usuario_id", "status", "decidido_em")
SELECT u."voucher_id", u."id", 'aprovado', now()
FROM "usuario" u
WHERE u."voucher_id" IS NOT NULL
ON CONFLICT ("voucher_id", "usuario_id") DO NOTHING;

-- RLS: a tabela nova precisa entrar explicitamente na superfície da aplicação.
-- Sem isto, `sf_app` recebe "permission denied" nela — é o deny-by-default da
-- migração `20260803180000_rls_role_de_aplicacao` funcionando.
GRANT SELECT, INSERT, UPDATE, DELETE ON public."voucher_resgate" TO sf_app;
ALTER TABLE public."voucher_resgate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."voucher_resgate" FORCE ROW LEVEL SECURITY;
CREATE POLICY "voucher_resgate_app" ON public."voucher_resgate"
  FOR ALL TO sf_app USING (true) WITH CHECK (true);
