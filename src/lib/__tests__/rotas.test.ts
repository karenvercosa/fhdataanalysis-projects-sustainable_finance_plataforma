import { describe, it, expect } from "vitest";
import {
  ROTAS_PUBLICAS,
  ROTA_LOGIN,
  ROTA_TROCAR_SENHA,
  ehRequisicaoDeInfraestrutura,
  ehRotaPublica,
  regraDaRota,
} from "@/lib/rotas";

describe("ehRotaPublica", () => {
  it.each([...ROTAS_PUBLICAS])("reconhece %s", (rota) => {
    expect(ehRotaPublica(rota)).toBe(true);
    expect(ehRotaPublica(`${rota}/sub`)).toBe(true);
  });

  it("não confunde prefixo parcial com rota pública", () => {
    expect(ehRotaPublica("/loginfalso")).toBe(false);
    expect(ehRotaPublica("/inicio")).toBe(false);
  });

  it("mantém login e troca de senha públicas", () => {
    expect(ehRotaPublica(ROTA_LOGIN)).toBe(true);
    expect(ehRotaPublica(ROTA_TROCAR_SENHA)).toBe(true);
  });
});

describe("ehRequisicaoDeInfraestrutura", () => {
  it.each(["/api/sessao", "/_next/static/chunk.js", "/_vercel/insights"])(
    "reconhece %s",
    (p) => expect(ehRequisicaoDeInfraestrutura(p)).toBe(true),
  );

  it("reconhece arquivo pelo ponto no ÚLTIMO segmento", () => {
    expect(ehRequisicaoDeInfraestrutura("/favicon.ico")).toBe(true);
    expect(ehRequisicaoDeInfraestrutura("/icons/icon-192.png")).toBe(true);
  });

  it("não trata rota com ponto no meio do caminho como arquivo", () => {
    expect(ehRequisicaoDeInfraestrutura("/v1.0/inicio")).toBe(false);
  });

  it("deixa passar rota normal", () => {
    expect(ehRequisicaoDeInfraestrutura("/inicio")).toBe(false);
  });
});

describe("regraDaRota", () => {
  it("escolhe sempre o prefixo MAIS LONGO que casa", () => {
    // `/admin` e `/admin/...` existem: a regra específica não pode perder.
    expect(regraDaRota("/admin")?.prefixo).toBe("/admin");
    expect(regraDaRota("/programacao")?.capacidade).toBe("view:public-content");
  });

  it("devolve undefined para rota desconhecida", () => {
    expect(regraDaRota("/rota-que-nao-existe")).toBeUndefined();
  });

  it("marca as telas com amostra para o Plano Gratuito", () => {
    expect(regraDaRota("/networking")?.previewGratuito).toBe(true);
    expect(regraDaRota("/credencial")?.previewGratuito).toBe(true);
    expect(regraDaRota("/inicio")?.previewGratuito).toBeUndefined();
  });
});
