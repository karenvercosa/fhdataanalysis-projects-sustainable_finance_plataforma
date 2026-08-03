-- DropIndex
DROP INDEX "usuario_cpf_key";

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "asaas_customer_id" VARCHAR(50),
ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voucher" VARCHAR(60),
ALTER COLUMN "tipo_pessoa" SET DEFAULT 'PF',
ALTER COLUMN "senha_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "sponsor_contacts" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "telefone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unread',

    CONSTRAINT "sponsor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "hero_texto" TEXT NOT NULL,
    "hero_botao_label" TEXT NOT NULL,
    "hero_botao_href" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "subtitulo_ingressos" TEXT NOT NULL,
    "evento_texto_esquerda" TEXT NOT NULL,
    "evento_texto_direita" TEXT NOT NULL,
    "subtitulo_trilhas" TEXT NOT NULL,
    "subtitulo_apoiadores" TEXT NOT NULL,
    "subtitulo_patrocinar" TEXT NOT NULL,
    "rodape_texto" TEXT NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_content" (
    "id" SERIAL NOT NULL,
    "lang" VARCHAR(5) NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_page_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speakers" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "foto_url" TEXT,
    "bio" TEXT,
    "linkedin_url" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boxes" (
    "id" SERIAL NOT NULL,
    "linhas" TEXT[],
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "linhas" TEXT[],
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_trilhas" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "itens" TEXT[],
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "site_trilhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivos" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "linhas" TEXT[],
    "image_url" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "motivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apoiadores" (
    "id" SERIAL NOT NULL,
    "grupo" TEXT NOT NULL DEFAULT 'INSTITUCIONAL',
    "kind" TEXT NOT NULL DEFAULT 'image',
    "nome" TEXT NOT NULL,
    "logo_url" TEXT,
    "website_url" TEXT,
    "strong" TEXT,
    "texto" TEXT,
    "width" INTEGER,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "apoiadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_members" (
    "id" SERIAL NOT NULL,
    "grupo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresa" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "committee_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinatura_plataforma" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "asaas_subscription_id" VARCHAR(50),
    "asaas_payment_id" VARCHAR(50),
    "billing_type" VARCHAR(20) NOT NULL,
    "internacional" BOOLEAN NOT NULL DEFAULT false,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinatura_plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_content_lang_key" ON "landing_page_content"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "assinatura_plataforma_asaas_payment_id_idx" ON "assinatura_plataforma"("asaas_payment_id");

-- CreateIndex
CREATE INDEX "assinatura_plataforma_asaas_subscription_id_idx" ON "assinatura_plataforma"("asaas_subscription_id");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinatura_plataforma" ADD CONSTRAINT "assinatura_plataforma_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
