/**
 * Paridade entre auto-detect (cliente) e auto-detect (edge function).
 *
 * AUDIT #7: as duas implementações vivem em arquivos separados:
 *   - cliente: src/features/data-extraction/classification/auto-detect-tipo.ts
 *   - edge:    supabase/functions/ocr-document/index.ts (autoDetectTipoExtracaoEdge)
 *
 * Refatorar para um único shared module exige reorganização Deno↔TS que
 * não cabe nesta wave. Em vez disso, esse teste compara o "fingerprint"
 * das duas implementações: extrai os padrões regex serializados de cada
 * um e falha quando divergem.
 *
 * Quando refatorar para shared, este teste pode ser apagado — até lá,
 * é o guard-rail mínimo para evitar a divergência silenciosa apontada
 * no audit.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CLIENT_PATH = join(
  __dirname,
  "../../classification/auto-detect-tipo.ts",
);
const EDGE_PATH = join(
  __dirname,
  "../../../../../supabase/functions/ocr-document/index.ts",
);

/** Extrai regex literais de um arquivo TS (sem avaliar o código). */
function extractRegexFingerprint(src: string): Set<string> {
  // Match /.../flags em contexto de propriedade `pattern:`.
  const matches = src.match(/pattern:\s*\/[^/]+\/[gimsuy]*/g) || [];
  return new Set(matches.map((m) => m.replace(/\s+/g, "")));
}

describe("auto-detect-tipo — paridade cliente↔edge function (AUDIT #7)", () => {
  it("Conjunto de padrões regex é idêntico entre as duas implementações", () => {
    const clientSrc = readFileSync(CLIENT_PATH, "utf-8");
    const edgeSrc = readFileSync(EDGE_PATH, "utf-8");

    const clientPatterns = extractRegexFingerprint(clientSrc);
    const edgePatterns = extractRegexFingerprint(edgeSrc);

    const soNoCliente = [...clientPatterns].filter((p) => !edgePatterns.has(p));
    const soNoEdge = [...edgePatterns].filter((p) => !clientPatterns.has(p));

    if (soNoCliente.length > 0 || soNoEdge.length > 0) {
      // Mensagem de erro deliberadamente verbosa — quando isso falha, o
      // desenvolvedor precisa entender exatamente qual regex divergiu e
      // em qual lado para fazer o sync manual.
      const erro = [
        "Auto-detect divergiu entre cliente e edge function.",
        `Padrões só no cliente (${soNoCliente.length}):`,
        ...soNoCliente.map((p) => `  ${p}`),
        `Padrões só no edge (${soNoEdge.length}):`,
        ...soNoEdge.map((p) => `  ${p}`),
        "",
        "Solução: sincronizar manualmente até o refator extrair tudo para _shared/.",
      ].join("\n");
      throw new Error(erro);
    }

    expect(soNoCliente).toEqual([]);
    expect(soNoEdge).toEqual([]);
  });

  it("Limites de pontuação são idênticos (>=6 mínimo, >=12 alta)", () => {
    const clientSrc = readFileSync(CLIENT_PATH, "utf-8");
    const edgeSrc = readFileSync(EDGE_PATH, "utf-8");

    // Procurar o limiar mínimo (6) e o limiar de alta confiança (12).
    expect(clientSrc).toMatch(/<\s*6\b|\.pontos\s*<\s*6/);
    expect(edgeSrc).toMatch(/<\s*6\b|\.pontos\s*<\s*6/);
    expect(clientSrc).toMatch(/>=?\s*12\b/);
    expect(edgeSrc).toMatch(/>=?\s*12\b/);
  });
});
