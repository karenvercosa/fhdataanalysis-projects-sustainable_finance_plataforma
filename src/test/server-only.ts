/**
 * Substituto de `server-only` nos testes.
 *
 * O pacote real lança ao ser importado fora de um Server Component, o que
 * derrubaria qualquer teste de rota de API — justamente os módulos marcados
 * com ele. A proteção continua valendo no build do Next; aqui ela só sai do
 * caminho.
 */
export {};
