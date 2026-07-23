// =====================================================================
//  MATRIZ GLOBAL DE COTAS — recursos do Perfil Público por cota
//  Fonte única da verdade: o que cada cota (Bronze/Prata/Ouro/…) libera
//  no Perfil Público de Patrocinadores e Curadores. Toda empresa da cota
//  herda a regra automaticamente — não existe exceção por empresa.
//  Todo recurso é ligado/desligado: sem limites numéricos.
// =====================================================================

export interface TierFeatures {
  /** Banner (foto de capa) no topo do perfil público. */
  topBanner: boolean;
  /** Campo "Sobre" no perfil público. */
  about: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showLinkedin: boolean;
  /** Enviar materiais/PDFs para download no perfil. */
  materialUpload: boolean;
  featuredVideo: boolean;
  scheduleMeeting: boolean;
}

export interface TierPlan {
  id: string;
  name: string;
  features: TierFeatures;
}

/** Array (e não mapa) para preservar a ordem das colunas na matriz. */
export type TierMatrix = TierPlan[];

// v2: recursos viraram todos booleanos (saiu limite de caracteres e de materiais).
export const TIER_MATRIX_KEY = "sf_tier_matrix_v2";

type FeatureKey = keyof TierFeatures;

/** Definição das LINHAS da matriz. Todas são toggles. */
export const TIER_FEATURE_ROWS: { key: FeatureKey; label: string; hint?: string }[] = [
  { key: "topBanner", label: "Banner de topo", hint: "Foto de capa no perfil público" },
  { key: "about", label: 'Campo "Sobre"', hint: "Texto de apresentação da empresa" },
  { key: "showPhone", label: "Telefone / WhatsApp direto", hint: "Contato direto no perfil" },
  { key: "showEmail", label: "E-mail corporativo" },
  { key: "showLinkedin", label: "Link do LinkedIn" },
  { key: "materialUpload", label: "Upload de materiais", hint: "PDFs e relatórios para download" },
  { key: "featuredVideo", label: "Vídeo em destaque nos conteúdos" },
  { key: "scheduleMeeting", label: 'Botão "Agendar reunião no estande"' }
];

export const DEFAULT_TIER_MATRIX: TierMatrix = [
  {
    id: "bronze",
    name: "Bronze",
    features: {
      topBanner: false,
      about: true,
      showPhone: false,
      showEmail: true,
      showLinkedin: true,
      materialUpload: false,
      featuredVideo: false,
      scheduleMeeting: false
    }
  },
  {
    id: "prata",
    name: "Prata",
    features: {
      topBanner: true,
      about: true,
      showPhone: false,
      showEmail: true,
      showLinkedin: true,
      materialUpload: true,
      featuredVideo: false,
      scheduleMeeting: true
    }
  },
  {
    id: "ouro",
    name: "Ouro",
    features: {
      topBanner: true,
      about: true,
      showPhone: true,
      showEmail: true,
      showLinkedin: true,
      materialUpload: true,
      featuredVideo: true,
      scheduleMeeting: true
    }
  }
];

/** Fallback quando o usuário não tem cota (ex.: palestrante): tudo liberado. */
export const UNRESTRICTED: TierFeatures = {
  topBanner: true,
  about: true,
  showPhone: true,
  showEmail: true,
  showLinkedin: true,
  materialUpload: true,
  featuredVideo: true,
  scheduleMeeting: true
};
