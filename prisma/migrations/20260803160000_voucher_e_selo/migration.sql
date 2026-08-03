-- CreateEnum
CREATE TYPE "tipo_voucher" AS ENUM ('gratuito', 'desconto_percentual', 'desconto_valor');

-- CreateTable
CREATE TABLE "voucher" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" VARCHAR(60) NOT NULL,
    "tipo" "tipo_voucher" NOT NULL DEFAULT 'gratuito',
    "valor" DECIMAL(10,2),
    "usos_maximos" INTEGER NOT NULL,
    "usos_feitos" INTEGER NOT NULL DEFAULT 0,
    "empresa_nome" VARCHAR(180) NOT NULL,
    "empresa_cnpj" VARCHAR(18),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voucher_codigo_key" ON "voucher"("codigo");

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN "voucher_id" UUID,
ADD COLUMN "selo" VARCHAR(10);

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
