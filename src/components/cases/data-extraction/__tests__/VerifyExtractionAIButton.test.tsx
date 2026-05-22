// @vitest-environment jsdom
/**
 * Smoke test do botão de verificação IA.
 *
 * Escopo MÍNIMO: confirmar que `supabase.functions.invoke` é chamado
 * com a função correta e os campos esperados do body quando o
 * operador clica em "Iniciar análise" dentro do popover.
 *
 * NÃO cobrimos:
 *   - response parsing (testado em helpers.test.ts via tool_use)
 *   - rendering das sugestões / dialog de skip
 *   - cálculo de confidence — escopo do componente
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { VerifyExtractionAIButton } from "../VerifyExtractionAIButton";

// Mock supabase ANTES de qualquer import indireto do client.
// `vi.mock` é hoisted antes dos imports — usar `vi.hoisted` pra que
// o `mockInvoke` exista quando o factory roda.
const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mockInvoke },
  },
}));

afterEach(() => {
  cleanup();
});

describe("VerifyExtractionAIButton — smoke", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({
      data: {
        suggestions: [],
        discarded_hallucinations: [],
        ai_confidence: 70,
        ai_confidence_raw: 70,
        summary: "mock — sem sugestões",
        model: "claude-sonnet-4-6",
        duration_ms: 100,
      },
      error: null,
    });
  });

  it("invoca verify-extraction-ai com body contendo builder/document_id/score quando IA é chamada", async () => {
    render(
      <VerifyExtractionAIButton
        score={70}
        builder="cartao_ponto"
        documentId="doc-123"
        parsed={{ apuracoes: [] }}
        ocrText={"OCR sintético " + "a".repeat(200)}
        onApplySuggestions={() => {}}
      />,
    );

    // 1. Click no botão "Verificar com IA" (abre popover)
    fireEvent.click(screen.getByRole("button", { name: /Verificar com IA/i }));

    // 2. Click no "Iniciar análise" dentro do popover
    const iniciarBtn = await screen.findByRole("button", {
      name: /Iniciar análise/i,
    });
    fireEvent.click(iniciarBtn);

    // 3. Aguarda invoke ser chamado e verifica o body
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    const [funcName, opts] = mockInvoke.mock.calls[0];
    expect(funcName).toBe("verify-extraction-ai");
    expect(opts?.body).toMatchObject({
      builder: "cartao_ponto",
      document_id: "doc-123",
      score: 70,
    });
  });
});
