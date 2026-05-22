/**
 * Sprint Verify-AI Claude Fase 4 — testes dos helpers puros extraídos
 * do `verify-extraction-ai/index.ts`.
 *
 * Cobertura por categoria:
 *   - parseAnthropicToolUse (5 cases): caminho feliz + 4 caminhos de erro
 *   - escolherProvider     (4 cases): cada valor válido + fallback
 *
 * O `index.ts` NÃO é testável em vitest direto (importa `serve` do
 * deno.land/std). Por isso os helpers vivem em arquivo separado.
 *
 * Não cobrimos:
 *   - chamada real à API Anthropic (Fase 5 calibração faz)
 *   - validação de schema do input do tool (Claude valida server-side
 *     via `tool_choice`; não temos como testar regressão local)
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_PROVIDER,
  escolherProvider,
  parseAnthropicToolUse,
} from "../helpers";

// ─── parseAnthropicToolUse ────────────────────────────────────────────

describe("parseAnthropicToolUse — caminho feliz", () => {
  it("extrai tool_use emitir_revisao do response.content[]", () => {
    const content = [
      {
        type: "tool_use",
        name: "emitir_revisao",
        input: {
          suggestions: [
            {
              field: "apuracoes[3].data",
              current: "24/11/2003",
              suggested: null,
              reason: "Vazamento de data de admissão.",
            },
          ],
          ai_confidence: 87,
          summary: "1 sugestão de remoção (cabeçalho).",
        },
      },
    ];
    const parsed = parseAnthropicToolUse(content);
    expect(parsed.suggestions).toHaveLength(1);
    expect(parsed.suggestions[0].field).toBe("apuracoes[3].data");
    expect(parsed.suggestions[0].suggested).toBeNull();
    expect(parsed.ai_confidence).toBe(87);
    expect(parsed.summary).toContain("cabeçalho");
  });

  it("encontra tool_use mesmo quando NÃO está na primeira posição", () => {
    // Defesa contra Claude colocar um bloco `text` antes do `tool_use`
    // (acontece quando o modelo "fala" antes de chamar a tool).
    const content = [
      { type: "text", text: "Analisando o OCR..." },
      {
        type: "tool_use",
        name: "emitir_revisao",
        input: {
          suggestions: [],
          ai_confidence: 50,
          summary: "Sem sugestões.",
        },
      },
    ];
    const parsed = parseAnthropicToolUse(content);
    expect(parsed.suggestions).toEqual([]);
    expect(parsed.ai_confidence).toBe(50);
  });
});

describe("parseAnthropicToolUse — caminhos de erro graceful", () => {
  it("content undefined/não-array → erro 'response sem content[]'", () => {
    expect(() => parseAnthropicToolUse(undefined)).toThrow(
      /response sem content\[\]/,
    );
    expect(() => parseAnthropicToolUse(null)).toThrow(
      /response sem content\[\]/,
    );
    expect(() => parseAnthropicToolUse({ content: "errado" })).toThrow(
      /response sem content\[\]/,
    );
  });

  it("content[] vazio → erro 'não retornou tool_use emitir_revisao'", () => {
    expect(() => parseAnthropicToolUse([])).toThrow(
      /não retornou tool_use emitir_revisao/,
    );
  });

  it("tool_use ausente (só texto livre) → erro inclui texto livre no diagnóstico", () => {
    // Cenário real: Claude ignora tool_choice e responde texto comum.
    // Operador precisa ver O QUE Claude disse pra debugar.
    const content = [
      {
        type: "text",
        text: "Não consigo analisar este documento — o OCR parece muito truncado e perdi o contexto das apurações. Sugiro tentar novamente.",
      },
    ];
    expect(() => parseAnthropicToolUse(content)).toThrow(
      /Não consigo analisar este documento/,
    );
  });

  it("tool_use com nome diferente → erro (Claude chamou tool errada)", () => {
    // Defesa hipotética: se no futuro o sistema declarar múltiplas tools,
    // Claude poderia chamar uma errada. Hoje só temos `emitir_revisao`,
    // mas o helper já protege contra isso.
    const content = [
      {
        type: "tool_use",
        name: "ferramenta_errada",
        input: { algo: 123 },
      },
    ];
    expect(() => parseAnthropicToolUse(content)).toThrow(
      /não retornou tool_use emitir_revisao/,
    );
  });

  it("tool_use com input ausente → erro graceful", () => {
    const content = [
      { type: "tool_use", name: "emitir_revisao" /* sem input */ },
    ];
    expect(() => parseAnthropicToolUse(content)).toThrow(
      /não retornou tool_use emitir_revisao/,
    );
  });
});

// ─── escolherProvider ─────────────────────────────────────────────────

describe("escolherProvider — feature flag + fallback", () => {
  it("'anthropic' (string válida) → 'anthropic'", () => {
    expect(escolherProvider("anthropic")).toBe("anthropic");
  });

  it("'openai' (string válida) → 'openai'", () => {
    expect(escolherProvider("openai")).toBe("openai");
  });

  it("string desconhecida → DEFAULT_PROVIDER ('anthropic')", () => {
    expect(escolherProvider("gpt5")).toBe(DEFAULT_PROVIDER);
    expect(escolherProvider("gemini")).toBe(DEFAULT_PROVIDER);
    expect(escolherProvider("")).toBe(DEFAULT_PROVIDER);
    // Sanity: o DEFAULT_PROVIDER é realmente 'anthropic' (espelha a
    // decisão da Sprint — se alguém mudar pra 'openai' por engano,
    // este teste vai te avisar).
    expect(DEFAULT_PROVIDER).toBe("anthropic");
  });

  it("não-string (undefined, number, objeto, null) → DEFAULT_PROVIDER", () => {
    expect(escolherProvider(undefined)).toBe(DEFAULT_PROVIDER);
    expect(escolherProvider(null)).toBe(DEFAULT_PROVIDER);
    expect(escolherProvider(42)).toBe(DEFAULT_PROVIDER);
    expect(escolherProvider({ provider: "anthropic" })).toBe(DEFAULT_PROVIDER);
    expect(escolherProvider(["anthropic"])).toBe(DEFAULT_PROVIDER);
    expect(escolherProvider(true)).toBe(DEFAULT_PROVIDER);
  });
});
