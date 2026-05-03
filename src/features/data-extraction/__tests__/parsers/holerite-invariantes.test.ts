/**
 * Invariantes universais OCR → Parser → Classify → ZIP de Holerite.
 *
 *   I1 — Sem rubrica fantasma: nome do classify ⊆ rubricas do parser.
 *   I2 — Soma agregada == soma das `valorParaCsv` das linhas `incluir=true`.
 *   I3 — Cada categoria com soma > 0 tem ao menos 1 linha contribuindo.
 *   I4 — Nenhuma rubrica de desconto vai pro CSV (incluir=false).
 *   I5 — Hint "sugerir_ignorar" sempre resulta em incluir=false.
 *   I6 — Sem hint → categoria=salario_fixo (fallback explícito).
 *   I7 — Para fixtures com expected.csv: bate byte-a-byte (já coberto pelo
 *        fixture-bank).
 */
import { describe, expect, it } from "vitest";
import { loadFixtures } from "../_fixtures/_loader";
import { parseHolerite } from "../../parsers/holerite/index";
import {
  classifyHolerite,
  aggregateByCategoria,
} from "../../export/per-doc/holerite-classify";

describe("Holerite — invariantes universais (todas fixtures)", () => {
  const fixtures = loadFixtures("holerite");

  if (fixtures.length === 0) {
    it.skip("nenhuma fixture cadastrada", () => {});
    return;
  }

  for (const f of fixtures) {
    describe(`fixture: ${f.id}`, () => {
      const parsed = parseHolerite(f.ocr);
      const classified = classifyHolerite(parsed);

      it("I1: nomes do classify ⊆ nomes do parser", () => {
        const nomesParser = new Set(parsed.rubricas.map((r) => r.nome));
        for (const l of classified.linhas) {
          expect(
            nomesParser.has(l.rubrica.nome),
            `Rubrica "${l.rubrica.nome}" no classify mas não no parser`,
          ).toBe(true);
        }
      });

      it("I2: soma agregada == soma manual de incluir=true", () => {
        const aggregated = aggregateByCategoria(classified.linhas);
        const totalAgg = [...aggregated.values()].reduce(
          (a, b) => a + b.toNumber(),
          0,
        );
        const totalManual = classified.linhas
          .filter((l) => l.incluir && l.categoria !== null && l.valorParaCsv > 0)
          .reduce((a, l) => a + l.valorParaCsv, 0);
        expect(totalAgg).toBeCloseTo(totalManual, 4);
      });

      it("I3: categoria agregada > 0 tem linha contribuinte", () => {
        const aggregated = aggregateByCategoria(classified.linhas);
        for (const [cat] of aggregated) {
          const contrib = classified.linhas.find(
            (l) => l.categoria === cat && l.incluir && l.valorParaCsv > 0,
          );
          expect(
            contrib,
            `Categoria ${cat} tem soma mas nenhuma linha contribui`,
          ).toBeDefined();
        }
      });

      it("I4: rubricas de desconto nunca incluir=true", () => {
        for (const l of classified.linhas) {
          if (l.origem === "desconto") {
            expect(
              l.incluir,
              `Linha desconto "${l.rubrica.nome}" marcada como incluir`,
            ).toBe(false);
          }
        }
      });

      it("I5: origem=ignorar_hint sempre incluir=false", () => {
        for (const l of classified.linhas) {
          if (l.origem === "ignorar_hint") {
            expect(
              l.incluir,
              `Hint ignorar mas incluir=true: "${l.rubrica.nome}"`,
            ).toBe(false);
          }
        }
      });

      it("I6: origem=fallback → categoria=salario_fixo", () => {
        for (const l of classified.linhas) {
          if (l.origem === "fallback") {
            expect(l.categoria, `fallback com categoria errada: "${l.rubrica.nome}"`).toBe(
              "salario_fixo",
            );
          }
        }
      });
    });
  }
});
