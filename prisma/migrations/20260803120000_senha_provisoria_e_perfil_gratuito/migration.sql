-- Perfil de entrada da plataforma. Toda conta nova (formulário ou Google)
-- nasce com ele; equivale ao Plano Gratuito (`guest`) no RBAC.
ALTER TYPE "perfil_usuario" ADD VALUE IF NOT EXISTS 'gratuito';

-- Hash da senha provisória enviada por e-mail. Enquanto estiver preenchido, a
-- conta ainda está no primeiro acesso e a plataforma exige a troca da senha.
ALTER TABLE "usuario" ADD COLUMN "senha_provisoria_hash" TEXT;

-- Até esta migração não existia fluxo de troca de senha na plataforma: toda
-- senha gravada é, por definição, a provisória enviada no cadastro. A exceção
-- é o administrador semeado por `prisma/seed.ts`, cuja senha vem do ambiente.
UPDATE "usuario" u
SET "senha_provisoria_hash" = u."senha_hash"
WHERE u."senha_hash" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "usuario_perfil" p
    WHERE p."usuario_id" = u."id"
      AND p."perfil" = 'admin'
  );
