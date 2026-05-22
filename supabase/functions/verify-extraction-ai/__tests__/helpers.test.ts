/**
 * Testes do parser de tool_use do Anthropic, isolado do `index.ts`
 * (que importa `serve` do deno.land/std e não roda em vitest).
 *
 * Cobertura: parseAnthropicToolUse (7 cases) — caminho feliz +
 * 6 caminhos de erro (content malformado, tool_use ausente, etc).
 *
 * Não cobrimos:
 *   - chamada real à API Anthropic
 *   - validação do schema do input do tool (Anthropic valida server-side
 *     via `tool_choice`; não temos como testar regressão local)
 */

import { describe, it, expect } from "vitest";
import { parseAnthropicToolUse } from "../helpers";

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
