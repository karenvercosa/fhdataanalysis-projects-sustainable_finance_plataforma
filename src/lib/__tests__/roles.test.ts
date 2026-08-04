import { describe, it, expect } from "vitest";
import {
  ALL_CAPABILITIES,
  DEFAULT_MATRIX,
  HOME_BY_ROLE,
  ROLE_LABEL,
  can,
  destinoPorTipoConta,
} from "@/lib/roles";
import { type Role } from "@/types";

const PAPEIS = Object.keys(ROLE_LABEL) as Role[];

describe("matriz de capacidades", () => {
  it("define capacidades para todos os papéis", () => {
    for (const papel of PAPEIS) expect(DEFAULT_MATRIX[papel]).toBeDefined();
  });

  it("só concede capacidades que existem", () => {
    for (const papel of PAPEIS) {
      for (const cap of DEFAULT_MATRIX[papel]) expect(ALL_CAPABILITIES).toContain(cap);
    }
  });

  it("reserva a gestão da plataforma ao admin", () => {
    const comGestao = PAPEIS.filter((p) => can(p, "manage:platform"));
    expect(comGestao).toEqual(["admin"]);
  });

  it("não dá download de conteúdo ao Plano Gratuito", () => {
    expect(can("guest", "download:content")).toBe(false);
    expect(can("attendee", "download:content")).toBe(true);
  });

  it("não dá credencial a quem opera o evento", () => {
    expect(can("operator", "view:ticket-qr")).toBe(false);
  });

  it("devolve false para papel desconhecido", () => {
    expect(can("inexistente" as Role, "view:streaming")).toBe(false);
  });
});

describe("destinoPorTipoConta", () => {
  it("manda o Plano Gratuito para a home, mesmo com papel operacional", () => {
    expect(destinoPorTipoConta("admin", "gratuito")).toBe(HOME_BY_ROLE.guest);
    expect(destinoPorTipoConta("curator", "gratuito")).toBe("/inicio");
  });

  it("manda o assinante para o painel do papel dele", () => {
    expect(destinoPorTipoConta("curator", "assinante")).toBe("/curador");
    expect(destinoPorTipoConta("operator", "assinante")).toBe("/operacao");
    expect(destinoPorTipoConta("admin", "assinante")).toBe("/admin");
    expect(destinoPorTipoConta("attendee", "assinante")).toBe("/inicio");
  });
});
