import { describe, it, expect } from "vitest";
import { caminhoInternoSeguro } from "@/lib/safe-redirect";

describe("caminhoInternoSeguro", () => {
  it("aceita caminho interno simples", () => {
    expect(caminhoInternoSeguro("/inicio")).toBe("/inicio");
    expect(caminhoInternoSeguro("/admin/usuarios?x=1")).toBe("/admin/usuarios?x=1");
  });

  it("cai no padrão quando não há destino", () => {
    expect(caminhoInternoSeguro(null, "/login")).toBe("/login");
    expect(caminhoInternoSeguro(undefined, "/login")).toBe("/login");
    expect(caminhoInternoSeguro("", "/login")).toBe("/login");
  });

  // Cada um destes o navegador resolveria como OUTRA origem.
  it.each([
    "https://evil.com",
    "http://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/%2fevil.com",
    "/%5cevil.com",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "evil.com",
  ])("recusa %s", (destino) => {
    expect(caminhoInternoSeguro(destino, "/inicio")).toBe("/inicio");
  });

  it("recusa mesmo com caracteres de controle no meio", () => {
    // O navegador ignora \t e \n ao resolver a URL: `/\t/evil.com` vira `//evil.com`.
    expect(caminhoInternoSeguro("/\t/evil.com", "/inicio")).toBe("/inicio");
    expect(caminhoInternoSeguro("/\n/evil.com", "/inicio")).toBe("/inicio");
    expect(caminhoInternoSeguro(" //evil.com", "/inicio")).toBe("/inicio");
  });

  it("é insensível a maiúsculas no percent-encoding", () => {
    expect(caminhoInternoSeguro("/%2Fevil.com", "/inicio")).toBe("/inicio");
    expect(caminhoInternoSeguro("/%5Cevil.com", "/inicio")).toBe("/inicio");
  });
});
