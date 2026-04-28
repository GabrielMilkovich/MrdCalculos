/**
 * Tipos do harness de golden tests — Port PJe-Calc (Fase 0).
 *
 * Fixture = caso congelado capturado de um .pjc real ou de execução
 * do PJe-Calc v2.15.1. Runner compara outputs do engine portado contra esses
 * valores com tolerâncias por campo.
 *
 * Ver: docs/PORT-PJECALC-PLAN.md §5 (Metodologia de testes).
 */

/**
 * Tipos primitivos de entrada/saída de uma fixture.
 * Valores monetários são sempre string (serializados com `Decimal.toFixed(2)`).
 */
export type GoldenScalar = string | number | boolean | null;
export type GoldenValue = GoldenScalar | GoldenValue[] | { [k: string]: GoldenValue };

/**
 * Origem da fixture — rastreabilidade.
 */
export interface GoldenOrigin {
  /** Arquivo .pjc fonte, caminho relativo a public/reports/ ou identificador sintético. */
  pjc?: string;
  /** Versão do PJe-Calc que gerou os valores esperados. */
  pjecalcVersion?: string;
  /** Método Java coberto pela fixture (para golden de método), ex: "Fgts.calcularSaldoFgts". */
  javaMethod?: string;
  /** Timestamp ISO de captura da fixture. */
  capturedAt?: string;
  /** Observação livre sobre o caso (ex: "contrato com aviso prévio indenizado"). */
  notes?: string;
}

/**
 * Tolerância por campo (apenas para campos numéricos/monetários).
 * Se ambos presentes, usa-se o mais permissivo (o que aceitar mais variação).
 */
export interface GoldenTolerance {
  /** Tolerância absoluta em reais (default 0.01 para moeda, 1e-10 para índices). */
  absolute?: number;
  /** Tolerância relativa (fração: 0.0001 = 0,01%). */
  relative?: number;
}

/**
 * Campo esperado em uma fixture. `tolerance` é opcional — se omitido, usa default do runner.
 */
export interface GoldenExpectedField {
  /** Valor esperado — string para moeda (ex: "1234.56"). */
  value: GoldenScalar;
  /** Tolerância aplicada na comparação. Se omitido, default do runner. */
  tolerance?: GoldenTolerance;
}

/**
 * Fixture completa.
 *
 * Duas formas de representar o esperado:
 *   a) `expected` flat: { "liquido": { value: "12345.67" }, ... }
 *   b) Aninhado livre (serializado JSON) em `expected` como GoldenValue.
 *
 * Recomenda-se (a) para golden de método; (b) quando comparar outputs complexos do engine.
 */
export interface GoldenFixture {
  /** Identificador estável da fixture. Ex: "fgts-001-contrato-3anos". */
  id: string;
  /** Descrição humana curta. */
  description: string;
  /** Origem dos dados esperados. */
  origin: GoldenOrigin;
  /**
   * Inputs do cálculo, na forma que o engine portado consome.
   * Durante o port, o shape deste objeto evolui com as fases.
   */
  inputs: GoldenValue;
  /** Valores esperados após execução do engine. */
  expected: { [k: string]: GoldenExpectedField } | GoldenValue;
  /** Tolerância default aplicada a todos os campos monetários (quando ausente na fixture). */
  defaultMonetaryTolerance?: GoldenTolerance;
  /** Tolerância default aplicada a todos os campos de índice (quando ausente na fixture). */
  defaultIndexTolerance?: GoldenTolerance;
  /**
   * Módulo ao qual a fixture pertence. Casa com a key das feature flags
   * (`isPortedEnabled(module)`). Ex: "IRPF", "INSS", "FGTS", "CARTAO", etc.
   * Se ausente, a fixture roda sempre (independente de flags).
   */
  module?: string;
}

/**
 * Diferença de um campo específico.
 */
export interface GoldenFieldDiff {
  /** Caminho do campo na fixture (ex: "verbas[3].valorDevido"). */
  path: string;
  expected: GoldenScalar;
  actual: GoldenScalar;
  /** true se, mesmo que valores sejam diferentes, a diferença caiba na tolerância. */
  withinTolerance: boolean;
  /** Magnitude da diferença para campos numéricos. */
  absoluteDiff?: number;
  relativeDiff?: number;
  /** Tolerância efetivamente aplicada. */
  toleranceApplied?: GoldenTolerance;
}

/**
 * Relatório de execução de uma fixture.
 */
export interface GoldenResult {
  fixtureId: string;
  passed: boolean;
  /** true = fixture rodou e foi comparada; false = fixture foi pulada por feature flag. */
  executed: boolean;
  /** Motivo de skip, se aplicável. */
  skipReason?: string;
  /** Todos os campos comparados. */
  diffs: GoldenFieldDiff[];
  /** Diferenças fora de tolerância (subset de diffs). */
  failures: GoldenFieldDiff[];
  /** Tempo de execução em ms. */
  durationMs?: number;
}

/**
 * Função que um test-suite fornece ao runner: recebe inputs, retorna outputs reais do engine portado.
 */
export type GoldenEngine<TInputs = GoldenValue, TOutputs = GoldenValue> =
  (inputs: TInputs) => Promise<TOutputs> | TOutputs;
