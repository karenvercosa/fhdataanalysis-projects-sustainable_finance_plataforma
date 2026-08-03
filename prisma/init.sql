-- CreateEnum
CREATE TYPE "tipo_pessoa" AS ENUM ('PF', 'PJ');

-- CreateEnum
CREATE TYPE "perfil_usuario" AS ENUM ('admin', 'operador_credenciamento', 'curador', 'startup', 'investidor', 'patrocinador', 'palestrante', 'participante', 'gratuito');
CREATE TYPE "tipo_voucher" AS ENUM ('gratuito', 'desconto_percentual', 'desconto_valor');

-- CreateEnum
CREATE TYPE "status_ingresso" AS ENUM ('reservado', 'pago', 'cancelado', 'estornado');

-- CreateEnum
CREATE TYPE "metodo_checkin" AS ENUM ('qr_code', 'busca_manual');

-- CreateEnum
CREATE TYPE "tipo_cota" AS ENUM ('ouro', 'prata', 'bronze');

-- CreateEnum
CREATE TYPE "status_reuniao" AS ENUM ('solicitada', 'aceita', 'recusada', 'reagendada', 'realizada');

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
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo_pessoa" "tipo_pessoa" NOT NULL DEFAULT 'PF',
    "nome_completo" VARCHAR(180),
    "cpf" VARCHAR(14),
    "razao_social" VARCHAR(180),
    "nome_fantasia" VARCHAR(180),
    "cnpj" VARCHAR(18),
    "email" VARCHAR(180) NOT NULL,
    "senha_hash" TEXT,
    "senha_provisoria_hash" TEXT,
    "voucher_id" UUID,
    "selo" VARCHAR(10),
    "telefone" VARCHAR(20),
    "cargo" VARCHAR(120),
    "empresa_nome" VARCHAR(180),
    "avatar_url" TEXT,
    "bio" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "asaas_customer_id" VARCHAR(50),
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "usuario_perfil" (
    "usuario_id" UUID NOT NULL,
    "perfil" "perfil_usuario" NOT NULL,

    CONSTRAINT "usuario_perfil_pkey" PRIMARY KEY ("usuario_id","perfil")
);

-- CreateTable
CREATE TABLE "evento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(180) NOT NULL,
    "cidade" VARCHAR(120) NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evento_id" UUID NOT NULL,
    "nome" VARCHAR(60) NOT NULL,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trilha" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evento_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,

    CONSTRAINT "trilha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palestra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evento_id" UUID NOT NULL,
    "trilha_id" UUID,
    "titulo" VARCHAR(200) NOT NULL,
    "descricao" TEXT,
    "dia" DATE NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fim" TIME NOT NULL,
    "palco_sala" VARCHAR(80),
    "youtube_url" TEXT,
    "limite_vagas" INTEGER,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palestra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palestra_tag" (
    "palestra_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "palestra_tag_pkey" PRIMARY KEY ("palestra_id","tag_id")
);

-- CreateTable
CREATE TABLE "palestra_palestrante" (
    "palestra_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,

    CONSTRAINT "palestra_palestrante_pkey" PRIMARY KEY ("palestra_id","usuario_id")
);

-- CreateTable
CREATE TABLE "agenda_pessoal" (
    "usuario_id" UUID NOT NULL,
    "palestra_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_pessoal_pkey" PRIMARY KEY ("usuario_id","palestra_id")
);

-- CreateTable
CREATE TABLE "tipo_ingresso" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evento_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "quantidade_total" INTEGER NOT NULL,
    "quantidade_vendida" INTEGER NOT NULL DEFAULT 0,
    "data_inicio_venda" TIMESTAMPTZ NOT NULL,
    "data_fim_venda" TIMESTAMPTZ NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_ingresso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingresso" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo_ingresso_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "qr_code" VARCHAR(64) NOT NULL,
    "status_ingresso" "status_ingresso" NOT NULL DEFAULT 'reservado',
    "valor_pago" DECIMAL(10,2),
    "asaas_payment_id" VARCHAR(80),
    "data_compra" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_pagamento" TIMESTAMPTZ,

    CONSTRAINT "ingresso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credencial" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ingresso_id" UUID NOT NULL,
    "operador_id" UUID,
    "metodo" "metodo_checkin" NOT NULL,
    "data_hora_checkin" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credencial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cota" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evento_id" UUID NOT NULL,
    "tipo_cota" "tipo_cota" NOT NULL,
    "valor" DECIMAL(10,2),
    "beneficios" TEXT,

    CONSTRAINT "cota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrocinador" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "cota_id" UUID NOT NULL,
    "logo_url" TEXT,
    "descricao" TEXT,
    "contato_email" VARCHAR(180),
    "contato_telefone" VARCHAR(20),

    CONSTRAINT "patrocinador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrocinador_material" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patrocinador_id" UUID NOT NULL,
    "nome_arquivo" VARCHAR(200) NOT NULL,
    "tipo_mime" VARCHAR(100) NOT NULL,
    "arquivo" BYTEA NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrocinador_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrocinador_interacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patrocinador_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patrocinador_interacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_startup" (
    "usuario_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "setor" VARCHAR(120),
    "estagio" VARCHAR(40),
    "modelo_negocio" TEXT,
    "metricas" JSONB,
    "objetivo_evento" TEXT,
    "pitch_deck" BYTEA,
    "pitch_deck_nome" VARCHAR(200),

    CONSTRAINT "perfil_startup_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "perfil_investidor" (
    "usuario_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "tese_investimento" TEXT,
    "setores_interesse" JSONB,
    "estagios_interesse" JSONB,
    "ticket_medio" DECIMAL(12,2),
    "portfolio" JSONB,

    CONSTRAINT "perfil_investidor_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "solicitacao_reuniao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evento_id" UUID NOT NULL,
    "solicitante_id" UUID NOT NULL,
    "destinatario_id" UUID NOT NULL,
    "status" "status_reuniao" NOT NULL DEFAULT 'solicitada',
    "data_hora_sugerida" TIMESTAMPTZ,
    "local" VARCHAR(80),
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacao_reuniao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "carga_horaria" DECIMAL(5,2),
    "codigo_validacao" VARCHAR(40) NOT NULL,
    "data_emissao" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivo" BYTEA,

    CONSTRAINT "certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "mensagem" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "usuario_cnpj_key" ON "usuario"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tag_evento_id_nome_key" ON "tag"("evento_id", "nome");

-- CreateIndex
CREATE INDEX "palestra_evento_id_dia_idx" ON "palestra"("evento_id", "dia");

-- CreateIndex
CREATE UNIQUE INDEX "ingresso_qr_code_key" ON "ingresso"("qr_code");

-- CreateIndex
CREATE INDEX "ingresso_usuario_id_idx" ON "ingresso"("usuario_id");

-- CreateIndex
CREATE INDEX "ingresso_status_ingresso_idx" ON "ingresso"("status_ingresso");

-- CreateIndex
CREATE UNIQUE INDEX "credencial_ingresso_id_key" ON "credencial"("ingresso_id");

-- CreateIndex
CREATE UNIQUE INDEX "cota_evento_id_tipo_cota_key" ON "cota"("evento_id", "tipo_cota");

-- CreateIndex
CREATE UNIQUE INDEX "patrocinador_usuario_id_evento_id_key" ON "patrocinador"("usuario_id", "evento_id");

-- CreateIndex
CREATE INDEX "solicitacao_reuniao_status_idx" ON "solicitacao_reuniao"("status");

-- CreateIndex
CREATE UNIQUE INDEX "certificado_codigo_validacao_key" ON "certificado"("codigo_validacao");

-- CreateIndex
CREATE INDEX "notificacao_usuario_id_lida_idx" ON "notificacao"("usuario_id", "lida");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "assinatura_plataforma_asaas_payment_id_idx" ON "assinatura_plataforma"("asaas_payment_id");

-- CreateIndex
CREATE INDEX "assinatura_plataforma_asaas_subscription_id_idx" ON "assinatura_plataforma"("asaas_subscription_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "usuario_perfil" ADD CONSTRAINT "usuario_perfil_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag" ADD CONSTRAINT "tag_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trilha" ADD CONSTRAINT "trilha_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palestra" ADD CONSTRAINT "palestra_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palestra" ADD CONSTRAINT "palestra_trilha_id_fkey" FOREIGN KEY ("trilha_id") REFERENCES "trilha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palestra_tag" ADD CONSTRAINT "palestra_tag_palestra_id_fkey" FOREIGN KEY ("palestra_id") REFERENCES "palestra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palestra_tag" ADD CONSTRAINT "palestra_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palestra_palestrante" ADD CONSTRAINT "palestra_palestrante_palestra_id_fkey" FOREIGN KEY ("palestra_id") REFERENCES "palestra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palestra_palestrante" ADD CONSTRAINT "palestra_palestrante_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_pessoal" ADD CONSTRAINT "agenda_pessoal_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_pessoal" ADD CONSTRAINT "agenda_pessoal_palestra_id_fkey" FOREIGN KEY ("palestra_id") REFERENCES "palestra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_ingresso" ADD CONSTRAINT "tipo_ingresso_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresso" ADD CONSTRAINT "ingresso_tipo_ingresso_id_fkey" FOREIGN KEY ("tipo_ingresso_id") REFERENCES "tipo_ingresso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresso" ADD CONSTRAINT "ingresso_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credencial" ADD CONSTRAINT "credencial_ingresso_id_fkey" FOREIGN KEY ("ingresso_id") REFERENCES "ingresso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credencial" ADD CONSTRAINT "credencial_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cota" ADD CONSTRAINT "cota_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrocinador" ADD CONSTRAINT "patrocinador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrocinador" ADD CONSTRAINT "patrocinador_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrocinador" ADD CONSTRAINT "patrocinador_cota_id_fkey" FOREIGN KEY ("cota_id") REFERENCES "cota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrocinador_material" ADD CONSTRAINT "patrocinador_material_patrocinador_id_fkey" FOREIGN KEY ("patrocinador_id") REFERENCES "patrocinador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrocinador_interacao" ADD CONSTRAINT "patrocinador_interacao_patrocinador_id_fkey" FOREIGN KEY ("patrocinador_id") REFERENCES "patrocinador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrocinador_interacao" ADD CONSTRAINT "patrocinador_interacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_startup" ADD CONSTRAINT "perfil_startup_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_startup" ADD CONSTRAINT "perfil_startup_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_investidor" ADD CONSTRAINT "perfil_investidor_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_investidor" ADD CONSTRAINT "perfil_investidor_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_reuniao" ADD CONSTRAINT "solicitacao_reuniao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_reuniao" ADD CONSTRAINT "solicitacao_reuniao_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_reuniao" ADD CONSTRAINT "solicitacao_reuniao_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificado" ADD CONSTRAINT "certificado_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificado" ADD CONSTRAINT "certificado_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinatura_plataforma" ADD CONSTRAINT "assinatura_plataforma_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

