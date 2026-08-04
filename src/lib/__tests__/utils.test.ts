import { describe, it, expect } from "vitest";
import { cn, maskCPF, credentialCode, isValidCPF } from "@/lib/utils";

describe("cn", () => {
  it("resolve conflito de utilitário Tailwind mantendo o último", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignora valores falsos vindos de condicionais", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("aceita array e objeto, como o clsx", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });
});

describe("maskCPF", () => {
  it("formata o documento completo", () => {
    expect(maskCPF("12345678901")).toBe("123.456.789-01");
  });

  it("descarta o que passa de 11 dígitos", () => {
    expect(maskCPF("123456789012345")).toBe("123.456.789-01");
  });

  it("formata parcialmente enquanto a pessoa digita", () => {
    expect(maskCPF("123")).toBe("123");
    expect(maskCPF("1234")).toBe("123.4");
    expect(maskCPF("1234567")).toBe("123.456.7");
  });

  it("ignora qualquer caractere não numérico", () => {
    expect(maskCPF("abc123.456-78901xyz")).toBe("123.456.789-01");
  });

  it("devolve vazio para entrada sem dígito", () => {
    expect(maskCPF("")).toBe("");
    expect(maskCPF("---")).toBe("");
  });
});

describe("credentialCode", () => {
  it("preserva o código já emitido em vez de gerar outro", () => {
    expect(credentialCode("attendee", "a@b.com", "SF26-AAA-BBB")).toBe("SF26-AAA-BBB");
  });

  it("é estável — o mesmo e-mail gera sempre o mesmo código", () => {
    expect(credentialCode("attendee", "pessoa@teste.com")).toBe(
      credentialCode("attendee", "pessoa@teste.com"),
    );
  });

  it("usa um prefixo por papel", () => {
    expect(credentialCode("curator", "a@b.com")).toMatch(/^CUR-/);
    expect(credentialCode("speaker", "a@b.com")).toMatch(/^SPK-/);
    expect(credentialCode("attendee", "a@b.com")).toMatch(/^SF26-/);
    expect(credentialCode("admin", "a@b.com")).toMatch(/^SF26-/);
  });

  it("gera blocos de exatamente 3 caracteres", () => {
    const [, um, dois] = credentialCode("attendee", "x@y.com").split("-");
    expect(um).toHaveLength(3);
    expect(dois).toHaveLength(3);
  });

  it("distingue e-mails diferentes", () => {
    expect(credentialCode("attendee", "um@x.com")).not.toBe(
      credentialCode("attendee", "dois@x.com"),
    );
  });

  it("aguenta e-mail vazio sem quebrar", () => {
    expect(credentialCode("attendee", "")).toBe("SF26-000-000");
  });
});

describe("isValidCPF", () => {
  it("aceita documento com dígitos verificadores corretos", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
  });

  it("recusa dígito verificador errado", () => {
    expect(isValidCPF("529.982.247-26")).toBe(false);
  });

  it("recusa tamanho diferente de 11", () => {
    expect(isValidCPF("1234567890")).toBe(false);
    expect(isValidCPF("")).toBe(false);
  });

  it("recusa sequência de dígitos repetidos", () => {
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
  });

  it("cobre o caso em que o resto do cálculo é 10 (vira 0)", () => {
    // O segundo dígito de 111.444.777-35 exercita o ramo `rest === 10`.
    expect(isValidCPF("11144477735")).toBe(true);
  });
});
