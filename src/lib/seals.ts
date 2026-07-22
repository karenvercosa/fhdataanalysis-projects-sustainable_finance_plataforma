// =====================================================================
//  SELOS DE IDENTIDADE — quem é quem no evento
//  Diferente do selo de COTA (Ouro/Prata/Bronze), que mede patrocínio,
//  estes selos identificam o PAPEL da pessoa e são visíveis a todos.
// =====================================================================
import { type Role } from "@/lib/roles";

export type SealKind = "Palestrante" | "Curador" | "Patrocinador";

/** Curador pessoa física × patrocinador (empresa) — ambos usam o papel `curator`. */
export type SponsorKind = "Curador" | "Patrocinador";

interface SealStyle {
  label: string;
  /** Tag colorida. */
  badge: string;
  /** Anel ao redor da foto. */
  ring: string;
  /** Ponto/realce sólido, para legendas. */
  dot: string;
}

export const SEAL: Record<SealKind, SealStyle> = {
  Palestrante: {
    label: "Palestrante",
    badge: "bg-info-50 text-info-500 ring-1 ring-info-500/30",
    ring: "ring-2 ring-info-500 ring-offset-2 ring-offset-white",
    dot: "bg-info-500"
  },
  Curador: {
    label: "Curador",
    badge: "bg-secondary-50 text-secondary-600 ring-1 ring-secondary-500/40",
    ring: "ring-2 ring-secondary-500 ring-offset-2 ring-offset-white",
    dot: "bg-secondary-500"
  },
  // Violeta: o DS não tem um 4º tom livre (azul e âmbar já estão em uso, e
  // vermelho significa erro). Fica distinto do verde da marca de propósito.
  Patrocinador: {
    label: "Patrocinador",
    badge: "bg-[#F1ECFB] text-[#5B3FBF] ring-1 ring-[#6D4AC4]/30",
    ring: "ring-2 ring-[#6D4AC4] ring-offset-2 ring-offset-white",
    dot: "bg-[#6D4AC4]"
  }
};

export const ALL_SEALS = Object.keys(SEAL) as SealKind[];

/**
 * Selo de um usuário. Só palestrantes e curadores/patrocinadores têm selo —
 * participantes, operador e admin circulam sem identificação especial.
 */
export function sealForRole(role: Role, sponsorKind?: SponsorKind): SealKind | undefined {
  if (role === "speaker") return "Palestrante";
  if (role === "curator") return sponsorKind ?? "Patrocinador";
  return undefined;
}

/** Pessoa física assina como curador; CNPJ, como patrocinador. */
export function sponsorKindOf(personType: "PF" | "CNPJ"): SponsorKind {
  return personType === "PF" ? "Curador" : "Patrocinador";
}
