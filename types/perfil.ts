/**
 * Perfil público, como trafega entre a API e a tela.
 *
 * Espelha as colunas de `usuario` mais os temas escolhidos em
 * `usuario_interesse`. Antes tudo isto vivia num objeto no `localStorage`, o
 * que significava que o perfil "público" só existia no navegador do dono.
 */
export interface PerfilPublico {
  /** Somente leitura: o nome vem do cadastro. */
  nome: string;
  /** Somente leitura: é a chave de login, não se troca por aqui. */
  email: string;
  cargo: string;
  empresa: string;
  telefone: string;
  bio: string;
  linkedin: string;
  /** Data URL da foto de perfil. Vazio = sem foto. */
  foto: string;
  /** Data URL da foto de capa (banner do perfil público). */
  capa: string;
  interesseIds: string[];
}

/** Um tema do catálogo de interesses. */
export interface Interesse {
  id: string;
  nome: string;
}
