-- Perfil público: os campos que faltavam para a tela do curador/patrocinador
-- funcionar sem depender do `localStorage`. Bio, avatar, cargo, empresa e
-- telefone já existiam em `usuario`.
ALTER TABLE "usuario" ADD COLUMN "linkedin_url" TEXT,
ADD COLUMN "capa_url" TEXT;

-- CreateTable: catálogo de interesses do Admin.
CREATE TABLE "interesse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(80) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interesse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "interesse_nome_key" ON "interesse"("nome");

-- CreateTable: os temas escolhidos por cada pessoa (base dos dashboards).
CREATE TABLE "usuario_interesse" (
    "usuario_id" UUID NOT NULL,
    "interesse_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_interesse_pkey" PRIMARY KEY ("usuario_id","interesse_id")
);

CREATE INDEX "usuario_interesse_interesse_id_idx" ON "usuario_interesse"("interesse_id");

ALTER TABLE "usuario_interesse" ADD CONSTRAINT "usuario_interesse_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "usuario_interesse" ADD CONSTRAINT "usuario_interesse_interesse_id_fkey"
  FOREIGN KEY ("interesse_id") REFERENCES "interesse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: matriz de cotas de patrocínio.
CREATE TABLE "cota_plataforma" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(40) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "recursos" JSONB NOT NULL,
    "atualizado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cota_plataforma_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cota_plataforma_nome_key" ON "cota_plataforma"("nome");

-- Semente das três cotas, com os mesmos recursos que eram o padrão em código.
-- Sem isto a plataforma sobe com a matriz vazia e ninguém teria recurso algum.
INSERT INTO "cota_plataforma" ("nome", "ordem", "recursos") VALUES
  ('Bronze', 0, '{"topBanner":false,"about":true,"showPhone":false,"showEmail":true,"showLinkedin":true,"materialUpload":false,"featuredVideo":false,"scheduleMeeting":false}'),
  ('Prata',  1, '{"topBanner":true,"about":true,"showPhone":false,"showEmail":true,"showLinkedin":true,"materialUpload":true,"featuredVideo":false,"scheduleMeeting":true}'),
  ('Ouro',   2, '{"topBanner":true,"about":true,"showPhone":true,"showEmail":true,"showLinkedin":true,"materialUpload":true,"featuredVideo":true,"scheduleMeeting":true}')
ON CONFLICT ("nome") DO NOTHING;

-- Semente do catálogo de interesses, igual à nuvem que já aparecia no cadastro.
INSERT INTO "interesse" ("nome", "ordem") VALUES
  ('ESG', 0),
  ('Crédito de carbono', 1),
  ('Green bonds', 2),
  ('Fintech', 3),
  ('Investimento de impacto', 4),
  ('Energia renovável', 5),
  ('Agronegócio sustentável', 6),
  ('Governança', 7),
  ('Regulação', 8),
  ('Net zero', 9),
  ('Biodiversidade', 10),
  ('Economia circular', 11)
ON CONFLICT ("nome") DO NOTHING;

-- RLS: as tabelas novas entram na superfície da aplicação. Sem isto o role
-- `sf_app` recebe "permission denied" nelas — é o deny-by-default da migração
-- `20260803180000_rls_role_de_aplicacao` funcionando.
DO $$
DECLARE
  tabelas text[] := ARRAY['interesse', 'usuario_interesse', 'cota_plataforma'];
  t text;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO sf_app', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_app', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO sf_app USING (true) WITH CHECK (true)',
      t || '_app', t
    );
  END LOOP;
END
$$;
