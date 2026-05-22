/**
 * Helpers puros extraídos do `verify-extraction-ai/index.ts` pra serem
 * testáveis em vitest (Node).
 *
 * O `index.ts` importa `serve` do `deno.land/std`, o que impede testar
 * o arquivo inteiro fora do runtime Deno. Toda lógica que NÃO depende
 * de `Deno.*` mora aqui — função pura, fácil de cobrir.
 *
 * Cobertura: `parseAnthropicToolUse(content)` extrai o bloco `tool_use`
 * do response Anthropic, com erro graceful (não crash) quando Claude
 * ignora `tool_choice` e responde texto livre.
 */

export interface Suggestion {
  field: string;
  current: unknown;
  suggested: unknown;
  reason: string;
}

export interface IAResponseParsed {
  suggestions: Suggestion[];
  ai_confidence: number;
  summary: string;
}

/**
 * Extrai o bloco `tool_use` chamando `emitir_revisao` do response
 * Anthropic. Defesa em profundidade contra Claude:
 *   - retornar `content` ausente/não-array (resposta malformada)
 *   - ignorar `tool_choice` e mandar só texto livre
 *   - chamar uma tool errada (não esperado com `tool_choice` forçado,
 *     mas defesa caso o contrato mude)
 *
 * Quando falha, throw com mensagem diagnóstica incluindo os primeiros
 * 300 chars de qualquer texto livre que Claude tenha enviado — vai
 * ser ouro pra debug em produção.
 */
export function parseAnthropicToolUse(
  jsonContent: unknown,
): IAResponseParsed {
  if (!Array.isArray(jsonContent)) {
    throw new Error("Anthropic retornou response sem content[]");
  }
  const blocks = jsonContent as Array<{
    type: string;
    name?: string;
    input?: unknown;
    text?: string;
  }>;
  const toolUseBlock = blocks.find(
    (b) => b.type === "tool_use" && b.name === "emitir_revisao",
  );
  if (!toolUseBlock || !toolUseBlock.input) {
    const textoLivre = blocks
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join(" ")
      .slice(0, 300);
    throw new Error(
      `Anthropic não retornou tool_use emitir_revisao. Texto livre (se houver): "${textoLivre}"`,
    );
  }
  return toolUseBlock.input as IAResponseParsed;
}
