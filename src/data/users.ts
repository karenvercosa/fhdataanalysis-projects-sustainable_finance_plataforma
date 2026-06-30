import { type Role } from "@/lib/roles";
import { type UserTag } from "@/data/schema";

export type UserStatus = "Ativo" | "Inativo";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tag: UserTag; // selo visual injetável pelo Admin ("—" = sem selo)
  status: UserStatus;
}

// Seed de usuários para o CRUD do admin (protótipo, em memória de sessão).
export const SEED_USERS: AdminUser[] = [
  { id: "u_001", name: "Marina Costa", email: "participante@sf.com", role: "attendee", tag: "—", status: "Ativo" },
  { id: "u_002", name: "João Patrocínio", email: "curador@sf.com", role: "curator", tag: "VIP", status: "Ativo" },
  { id: "u_003", name: "Helena Vasquez", email: "helena@fundco.com", role: "speaker", tag: "Palestrante", status: "Ativo" },
  { id: "u_004", name: "Equipe Credenciamento", email: "operador@sf.com", role: "operator", tag: "Staff", status: "Ativo" },
  { id: "u_005", name: "Bruno Andrade", email: "bruno@agroverde.com", role: "attendee", tag: "—", status: "Inativo" },
  { id: "u_006", name: "Carla Mendes", email: "carla@bankco.com", role: "company", tag: "—", status: "Ativo" },
  { id: "u_007", name: "Admin SF", email: "admin@sf.com", role: "admin", tag: "Staff", status: "Ativo" }
];

export const USER_TAGS: UserTag[] = ["—", "Palestrante", "VIP", "Imprensa", "Staff"];
