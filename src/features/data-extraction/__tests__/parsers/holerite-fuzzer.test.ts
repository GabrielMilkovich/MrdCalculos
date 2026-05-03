/**
 * Fuzzer determinístico de classify + ZIP de Holerite.
 *
 * Gera RubricaParseada[] sintéticas (em vez de OCR — o parser é
 * layout-específico) e valida invariantes do classify + agregação.
 */
import { describe, expect, it } from "vitest";
import { Rng, pad2 } from "../_fuzzer";
import {
  classifyHolerite,
  aggregateByCategoria,
} from "../../export/per-doc/holerite-classify";
import type { RubricaParseada } from "../../parsers/holerite/types";

const N_CASOS_POR_SEED = 100;
const SEEDS = [1, 42, 1337];

const NOMES = [
  // Vão pra fallback (salario_fixo)
  "SALARIO BASE",
  "ADICIONAL NOTURNO",
  "ADICIONAL PERICULOSIDADE",
  // Hints conhecidos
  "Comissões",
  "DSR(Comissão)",
  "PREMIO ANTECIPADO",
  "MINIMO GARANTIDO",
  "Salário-família",
  // Ignorar
  "INSS",
  "IRRF",
  "Vale Transporte",
  "13º Salário",
  "Multa 40% FGTS",
  "Aviso Prévio Indenizado",
  "FGTS",
  "PIS",
  // Variações com OCR sujo
  "comissoes",
  "Cesta Básica",
  "INTERMEDICA SAUDE",
];

function gerarRubrica(rng: Rng, ordem: number): RubricaParseada {
  const nome = rng.pick(NOMES);
  const isDesconto = rng.bool(0.3);
  const venc = isDesconto ? null : rng.int(100, 5000) + rng.next();
  const desc = isDesconto ? rng.int(50, 500) + rng.next() : null;
  return {
    codigo: `R${pad2(ordem)}`,
    nome,
    valor_vencimento: venc,
    valor_desconto: desc,
    quantidade: null,
    ordem,
  };
}

function gerarHolerite(rng: Rng) {
  const numRubricas = rng.int(3, 25);
  const rubricas: RubricaParseada[] = [];
  for (let i = 0; i < numRubricas; i++) rubricas.push(gerarRubrica(rng, i));
  return {
    competencia: `${pad2(rng.int(1, 13))}/${2020 + rng.int(0, 5)}`,
    layout_usado: "fuzzer",
    warnings: [],
    rubricas,
  };
}

describe("Holerite — fuzzer determinístico (classify + agregação)", () => {
  for (const seed of SEEDS) {
    describe(`seed=${seed} (${N_CASOS_POR_SEED} casos)`, () => {
      it("classify nunca crasha", () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const h = gerarHolerite(rng);
          expect(() => classifyHolerite(h)).not.toThrow();
        }
      });

      it("nomes do classify ⊆ nomes do parser (sem alucinação)", () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const h = gerarHolerite(rng);
          const c = classifyHolerite(h);
          const nomes = new Set(h.rubricas.map((r) => r.nome));
          for (const l of c.linhas) {
            expect(
              nomes.has(l.rubrica.nome),
              `seed=${seed}, caso=${i}: "${l.rubrica.nome}" não está no parser`,
            ).toBe(true);
          }
        }
      });

      it("descontos nunca incluir=true", () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const h = gerarHolerite(rng);
          const c = classifyHolerite(h);
          for (const l of c.linhas) {
            if (l.origem === "desconto") {
              expect(
                l.incluir,
                `seed=${seed}, caso=${i}: desconto "${l.rubrica.nome}" incluir=true`,
              ).toBe(false);
            }
          }
        }
      });

      it("hint ignorar nunca incluir=true", () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const h = gerarHolerite(rng);
          const c = classifyHolerite(h);
          for (const l of c.linhas) {
            if (l.origem === "ignorar_hint") {
              expect(
                l.incluir,
                `seed=${seed}, caso=${i}: ignorar_hint "${l.rubrica.nome}" incluir=true`,
              ).toBe(false);
            }
          }
        }
      });

      it("agregação ≡ soma manual de incluir=true", () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const h = gerarHolerite(rng);
          const c = classifyHolerite(h);
          const agg = aggregateByCategoria(c.linhas);
          const totalAgg = [...agg.values()].reduce(
            (a, b) => a + b.toNumber(),
            0,
          );
          const totalManual = c.linhas
            .filter((l) => l.incluir && l.categoria !== null && l.valorParaCsv > 0)
            .reduce((a, l) => a + l.valorParaCsv, 0);
          expect(totalAgg, `seed=${seed}, caso=${i}`).toBeCloseTo(totalManual, 4);
        }
      });

      it("toda categoria agregada tem ao menos 1 linha contribuinte", () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const h = gerarHolerite(rng);
          const c = classifyHolerite(h);
          const agg = aggregateByCategoria(c.linhas);
          for (const [cat] of agg) {
            const contrib = c.linhas.find(
              (l) => l.categoria === cat && l.incluir && l.valorParaCsv > 0,
            );
            expect(
              contrib,
              `seed=${seed}, caso=${i}: ${cat} tem soma mas sem contribuinte`,
            ).toBeDefined();
          }
        }
      });
    });
  }
});
