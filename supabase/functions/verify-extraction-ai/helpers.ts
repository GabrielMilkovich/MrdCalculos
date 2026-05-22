/**
 * Sprint Verify-AI Claude (2026-05-22) — helpers puros extraídos do
 * `index.ts` pra serem testáveis em vitest (Node).
 *
 * O `index.ts` importa `serve` do `deno.land/std`, o que impede testar
 * o arquivo inteiro fora do runtime Deno. Toda lógica que NÃO depende
 * de `Deno.*` mora aqui — função pura, fácil de cobrir.
 *
 * Cobre:
 *   - `escolherProvider(raw)`: feature flag + fallback pro default
 *   - `parseAnthropicToolUse(content)`: extrai o bloco `tool_use` do
 *     response Anthropic, com erro graceful (não crash) quando Claude
 *     ignora `tool_choice` e responde texto livre
 */

export type AiProvider = "openai" | "anthropic";

export const AI_PROVIDERS_VALIDOS: AiProvider[] = ["openai", "anthropic"];

/**
 * Default da Sprint Verify-AI Claude. Cliente pode forçar 'openai'
 * via body do request (rollback emergencial). Trocar este default
 * tem que ser uma decisão consciente — em produção, calibração
 * registra qual provider rodou em cada extração.
 */
export const DEFAULT_PROVIDER: AiProvider = "anthropic";

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
 * Feature flag — escolhe provider baseado no `ai_provider` cru do body.
 * Defesa contra typo do cliente: provider inválido (string desconhecida,
 * número, undefined, etc) cai pro DEFAULT_PROVIDER em vez de erro 400.
 *
 * Decisão de design: defaultar > rejeitar. Sprint Verify-AI Claude
 * quer migrar transparentemente — cliente que esqueceu de passar
 * `ai_provider` não deve quebrar.
 */
export function escolherProvider(aiProviderRaw: unknown): AiProvider {
  if (
    typeof aiProviderRaw === "string" &&
    (AI_PROVIDERS_VALIDOS as string[]).includes(aiProviderRaw)
  ) {
    return aiProviderRaw as AiProvider;
  }
  return DEFAULT_PROVIDER;
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
