-- =====================================================================
--  RLS — Row Level Security com role de aplicação
-- =====================================================================
--
--  A aplicação deixa de conectar como dono das tabelas e passa a usar o
--  role `sf_app`. Isso é o que faz o RLS existir de verdade: no Postgres o
--  DONO IGNORA as políticas, então enquanto a app conectasse como `sfuser`
--  qualquer política seria decorativa.
--
--  O modelo é DENY BY DEFAULT: `sf_app` só enxerga as tabelas listadas
--  abaixo, que recebem GRANT e uma política explícita. Tabela nova nasce
--  inacessível à aplicação até alguém conceder — inclusive
--  `_prisma_migrations`, que a app não tem por que ler.
--
--  `FORCE ROW LEVEL SECURITY` faz as políticas valerem até para o dono, de
--  modo que uma conexão que volte a usar `sfuser` por engano não passe a
--  ignorar o RLS silenciosamente.
--
--  As políticas são `USING (true)`: a autorização por usuário continua no
--  servidor (`exigirCapacidade` / `getSessaoServidor`). O que o RLS entrega
--  aqui é contenção — uma consulta injetada ou um bug de query não alcançam
--  nada além do que foi explicitamente concedido.
--
--  A SENHA do role NÃO fica aqui: o role nasce sem login, e
--  `scripts/db-app-role.mjs` define `LOGIN PASSWORD` a partir de
--  `APP_DB_PASSWORD`. Migração versionada não é lugar de segredo.
-- =====================================================================

-- Role da aplicação. Idempotente: a migração roda em bancos que já o tenham.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sf_app') THEN
    CREATE ROLE sf_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO sf_app;

-- Sequências das tabelas com id serial (conteúdo do site). Sem isto o INSERT
-- falha ao tentar puxar o próximo valor.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sf_app;

DO $$
DECLARE
  -- Tabelas que a aplicação usa. O que não estiver aqui fica inacessível a
  -- `sf_app` — é este array que define a superfície do banco exposta à app.
  tabelas text[] := ARRAY[
    -- Conteúdo do site / landing page
    'sponsor_contacts', 'site_content', 'landing_page_content', 'speakers',
    'boxes', 'stats', 'site_trilhas', 'motivos', 'apoiadores',
    'committee_members',
    -- Plataforma
    'usuario', 'usuario_perfil', 'voucher', 'evento', 'tag', 'trilha',
    'palestra', 'palestra_tag', 'palestra_palestrante', 'agenda_pessoal',
    'tipo_ingresso', 'ingresso', 'credencial', 'cota', 'patrocinador',
    'patrocinador_material', 'patrocinador_interacao', 'perfil_startup',
    'perfil_investidor', 'solicitacao_reuniao', 'certificado', 'notificacao',
    'assinatura_plataforma',
    -- Better Auth
    'account', 'session', 'verification'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO sf_app', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

      -- `DROP ... IF EXISTS` antes de criar mantém a migração repetível.
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_app', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO sf_app USING (true) WITH CHECK (true)',
        t || '_app', t
      );
    END IF;
  END LOOP;
END
$$;

-- O histórico de migrações é do dono, não da aplicação: sem GRANT e com RLS
-- ligado, `sf_app` não lê nem escreve nele.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  ) THEN
    REVOKE ALL ON public."_prisma_migrations" FROM sf_app;
    ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
