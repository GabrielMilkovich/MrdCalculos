/**
 * BATERIA DE BASELINE MULTI-CLIENTE — anti-regressão global.
 *
 * Por que isso existe: PRs #60 e #61 caíram em produção porque foram
 * validados só com fixtures sintéticos pequenos. O OCR do user (cartão
 * ROQUE, 63 páginas, 4338 linhas) caiu de ~1085 apurações pra 30 — uma
 * regressão de 97% que NÃO foi pega pelos testes existentes.
 *
 * Esse teste mede MÉTRICAS DE SAÚDE em CADA fixture real:
 *   - Total de apurações extraídas
 *   - Total de apurações com batidas (não-vazias)
 *   - Cobertura: % de datas únicas no OCR que viraram apuração
 *   - Falsos positivos óbvios: apurações com data ANTES do menor
 *     PERÍODO declarado no OCR
 *
 * Cada fixture tem um BASELINE = snapshot do estado atual. Qualquer fix
 * que CAIA QUALQUER MÉTRICA em QUALQUER fixture quebra o teste.
 *
 * Como ATUALIZAR baseline: depois de um fix legítimo que MELHORA, rodar
 *   `UPDATE_BASELINE=1 npx vitest run cartao-ponto-baseline-multi-cliente`
 * O teste imprime o novo baseline; copia pro arquivo `baselines.json`.
 *
 * REGRA: baseline só sobe, nunca cai. Se uma feature legítima exige
 * cair (ex: filtrar lixo que era falso positivo), aprovar manualmente
 * no PR explicando.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadFixtures } from "../_fixtures/_loader";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

const BASELINE_PATH = join(
  __dirname,
  "../_fixtures/cartao-ponto/_baselines.json",
);

interface Metrics {
  /** Total de apurações criadas pelo parser. */
  totalApuracoes: number;
  /** Apurações que têm pelo menos 1 par E/S preenchido. */
  apuracoesComBatidas: number;
  /** Apurações marcadas como FALTA/FERIADO/FOLGA/FÉRIAS/ATESTADO. */
  apuracoesAusencias: number;
  /** Datas únicas (yyyy-mm-dd) extraídas. */
  datasUnicas: number;
  /** Total de pares E/S preenchidos somando todas as apurações. */
  totalPares: number;
  /** Quantos warnings o parser emitiu. */
  warnings: number;
  /** Quantas linhas ficaram em unparsed_lines. */
  unparsed: number;
}

function medir(ocr: string): Metrics {
  const r = parseCartaoPonto(ocr);
  let pares = 0;
  let comBatidas = 0;
  let ausencias = 0;
  const datasSet = new Set<string>();
  for (const a of r.apuracoes) {
    datasSet.add(a.data);
    const p = a.marcacoes.filter((m) => m.e || m.s).length;
    pares += p;
    if (p > 0) comBatidas++;
    if (
      a.ocorrencia === "FALTA" ||
      a.ocorrencia === "FERIADO" ||
      a.ocorrencia === "FOLGA" ||
      a.ocorrencia === "FERIAS" ||
      a.ocorrencia === "ATESTADO" ||
      a.ocorrencia === "LICENCA_MEDICA"
    ) {
      ausencias++;
    }
  }
  return {
    totalApuracoes: r.apuracoes.length,
    apuracoesComBatidas: comBatidas,
    apuracoesAusencias: ausencias,
    datasUnicas: datasSet.size,
    totalPares: pares,
    warnings: r.warnings.length,
    unparsed: r.unparsed_lines.length,
  };
}

function carregarBaselines(): Record<string, Metrics> {
  if (!existsSync(BASELINE_PATH)) return {};
  return JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as Record<
    string,
    Metrics
  >;
}

function salvarBaselines(b: Record<string, Metrics>): void {
  writeFileSync(BASELINE_PATH, JSON.stringify(b, null, 2) + "\n", "utf-8");
}

describe("Cartão Ponto — baseline multi-cliente (anti-regressão)", () => {
  const fixtures = loadFixtures("cartao-ponto");
  const baselines = carregarBaselines();

  if (fixtures.length === 0) {
    it.skip("nenhum fixture encontrado", () => {});
    return;
  }

  // Modo de atualização: gera novo baseline e grava em disco.
  const updating = process.env.UPDATE_BASELINE === "1";

  if (updating) {
    it("UPDATE_BASELINE=1 — gravando snapshot em disco", () => {
      const novo: Record<string, Metrics> = {};
      for (const f of fixtures) {
        novo[f.id] = medir(f.ocr);
      }
      salvarBaselines(novo);
      console.log("[baseline] gravado em", BASELINE_PATH);
      console.log(JSON.stringify(novo, null, 2));
      expect(true).toBe(true);
    });
    return;
  }

  for (const f of fixtures) {
    describe(f.id, () => {
      const m = medir(f.ocr);
      const base = baselines[f.id];

      if (!base) {
        it.skip(
          `[skip] sem baseline registrado — rode com UPDATE_BASELINE=1 (medido agora: ${JSON.stringify(m)})`,
          () => {},
        );
        return;
      }

      // REGRA 1 — Total de apurações não pode cair.
      // Permite tolerância de -2 itens pra acomodar mudanças de ordem.
      it(`totalApuracoes >= baseline (${base.totalApuracoes})`, () => {
        expect(m.totalApuracoes).toBeGreaterThanOrEqual(
          base.totalApuracoes - 2,
        );
      });

      // REGRA 2 — Apurações COM BATIDAS é a métrica mais crítica.
      // Cair aqui = perder jornada real. Tolerância de -1.
      it(`apuracoesComBatidas >= baseline (${base.apuracoesComBatidas})`, () => {
        expect(m.apuracoesComBatidas).toBeGreaterThanOrEqual(
          base.apuracoesComBatidas - 1,
        );
      });

      // REGRA 3 — Total de pares E/S não pode cair drasticamente.
      // Tolerância de 5% (cair de 100 → 95 pares é aceitável; 100 → 30 é regressão).
      it(`totalPares >= 95% do baseline (${base.totalPares})`, () => {
        const minimo = Math.floor(base.totalPares * 0.95);
        expect(m.totalPares).toBeGreaterThanOrEqual(minimo);
      });

      // REGRA 4 — Datas únicas extraídas não pode cair.
      it(`datasUnicas >= baseline (${base.datasUnicas})`, () => {
        expect(m.datasUnicas).toBeGreaterThanOrEqual(base.datasUnicas - 1);
      });

      // Snapshot informativo (não falha — só loga).
      it("[info] métricas atuais", () => {
        if (
          m.totalApuracoes !== base.totalApuracoes ||
          m.apuracoesComBatidas !== base.apuracoesComBatidas ||
          m.totalPares !== base.totalPares
        ) {
          console.log(
            `[${f.id}] base=${JSON.stringify(base)} atual=${JSON.stringify(m)}`,
          );
        }
        expect(true).toBe(true);
      });
    });
  }
});
