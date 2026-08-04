import { describe, it, expect, vi } from "vitest";

const handler = vi.fn(async () => new Response("ok"));
vi.mock("@/lib/auth", () => ({ auth: { handler } }));

const toNextJsHandler = vi.fn(() => ({ GET: handler, POST: handler }));
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: (...a: unknown[]) => toNextJsHandler(...a),
}));

const rota = await import("@/app/api/auth/[...all]/route");

describe("/api/auth/[...all]", () => {
  it("delega GET e POST ao handler do Better Auth", () => {
    expect(toNextJsHandler).toHaveBeenCalledWith(handler);
    expect(rota.GET).toBe(handler);
    expect(rota.POST).toBe(handler);
  });
});
