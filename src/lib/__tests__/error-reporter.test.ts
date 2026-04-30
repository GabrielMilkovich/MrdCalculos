/**
 * Testes do reporter global de erros.
 * Cobertura:
 *  - reportError chama logger.error com source previsível
 *  - reportError exibe toast.error
 *  - reportError não lança quando supabase falha
 *  - copyToClipboard usa navigator.clipboard quando disponível
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks ANTES dos imports do SUT.
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock("@/lib/supabase-untyped", () => ({
  fromUntyped: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })),
}));

import { reportError, copyToClipboard } from "../error-reporter";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

describe("error-reporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reportError dispara toast.error e logger.error", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await reportError({
      message: "boom",
      stack: "stack-trace",
      source: "manual",
      route: "/x",
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [logMsg] = errorSpy.mock.calls[0];
    expect(logMsg).toContain("[manual]");
    expect(logMsg).toContain("boom");
  });

  it("reportError nunca lança mesmo se internamente falhar", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => {
      throw new Error("logger explodiu");
    });

    await expect(
      reportError({ message: "x", source: "manual" }),
    ).resolves.toBeUndefined();
  });

  it("copyToClipboard usa navigator.clipboard quando disponível", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    copyToClipboard("hello");
    expect(writeText).toHaveBeenCalledWith("hello");
  });
});
