import { describe, it, expect, vi } from "vitest";

const createAuthClient = vi.fn(() => ({ signIn: vi.fn() }));
vi.mock("better-auth/react", () => ({ createAuthClient: (...a: unknown[]) => createAuthClient(...a) }));

const { authClient } = await import("@/lib/auth-client");

describe("authClient", () => {
  it("é criado sem `baseURL` — a origem vem do navegador, não do build", () => {
    expect(createAuthClient).toHaveBeenCalledTimes(1);
    expect(createAuthClient.mock.calls[0][0]).toBeUndefined();
  });

  it("expõe o cliente para as telas", () => {
    expect(authClient).toBeDefined();
  });
});
