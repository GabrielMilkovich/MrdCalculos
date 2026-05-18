/**
 * Audit-fix C1 + C2 — testes da ponte case → pjecalc_*.
 *
 * Foco: validar shape dos payloads enviados pelos upserts, garantindo
 * que os 4 campos do Step 5 (indiceCorrecao/juros/multa467/multa477)
 * — antes write-only no DOM — agora chegam ao banco com os valores
 * corretos e mapeados para o vocabulário do engine.
 */

import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  upsertParametros: vi.fn(async () => undefined),
  upsertCorrecaoConfig: vi.fn(async () => undefined),
  upsertMultasConfig: vi.fn(async () => undefined),
  insertHistoricoSalarial: vi.fn(async () => undefined),
}));

vi.mock("../service", () => ({
  upsertParametros: mocks.upsertParametros,
  upsertCorrecaoConfig: mocks.upsertCorrecaoConfig,
  upsertMultasConfig: mocks.upsertMultasConfig,
  insertHistoricoSalarial: mocks.insertHistoricoSalarial,
}));

const { upsertParametros, upsertCorrecaoConfig, upsertMultasConfig, insertHistoricoSalarial } = mocks;

import { seedPjecalcFromCase } from "../seed-from-wizard";

const basePayload = {
  caseId: "case-test",
  uf: "SP",
  cidade: "Sao Paulo",
  dataAdmissao: "2020-01-01",
  dataDemissao: "2024-03-15",
  ajuizamentoData: "2024-06-01",
  salarioInicial: 2500,
  mudancasSalariais: [
    { data: "2022-01-01", valor: 3000 },
    { data: "2023-06-01", valor: 3500 },
  ],
  divisor: 220,
  horasSemanais: 44,
  indiceCorrecao: "selic",
  juros: "1_am",
  multa467: true,
  multa477: true,
};

describe("seedPjecalcFromCase — audit-fix C1+C2", () => {
  beforeEach(() => {
    upsertParametros.mockClear();
    upsertCorrecaoConfig.mockClear();
    upsertMultasConfig.mockClear();
    insertHistoricoSalarial.mockClear();
  });
  afterEach(() => vi.clearAllMocks());

  it("chama os 4 upserts esperados", async () => {
    await seedPjecalcFromCase(basePayload);
    expect(upsertParametros).toHaveBeenCalledTimes(1);
    expect(upsertCorrecaoConfig).toHaveBeenCalledTimes(1);
    expect(upsertMultasConfig).toHaveBeenCalledTimes(1);
    // 1 salário base + 2 mudanças = 3 inserts no histórico
    expect(insertHistoricoSalarial).toHaveBeenCalledTimes(3);
  });

  it("Step 5 — `multa467=true` chega ao banco como apurar_467=true", async () => {
    await seedPjecalcFromCase(basePayload);
    const [caseId, payload] = upsertMultasConfig.mock.calls[0];
    expect(caseId).toBe("case-test");
    expect(payload.apurar_467).toBe(true);
    expect(payload.apurar_477).toBe(true);
  });

  it("Step 5 — `multa467=false` chega ao banco como apurar_467=false", async () => {
    await seedPjecalcFromCase({ ...basePayload, multa467: false, multa477: false });
    const [, payload] = upsertMultasConfig.mock.calls[0];
    expect(payload.apurar_467).toBe(false);
    expect(payload.apurar_477).toBe(false);
  });

  it("Step 5 — `indiceCorrecao=selic` mapeia para SELIC no banco", async () => {
    await seedPjecalcFromCase({ ...basePayload, indiceCorrecao: "selic" });
    const [payload] = upsertCorrecaoConfig.mock.calls[0];
    expect(payload.indice).toBe("SELIC");
  });

  it("Step 5 — `indiceCorrecao=ipca` mapeia para IPCA-E", async () => {
    await seedPjecalcFromCase({ ...basePayload, indiceCorrecao: "ipca" });
    const [payload] = upsertCorrecaoConfig.mock.calls[0];
    expect(payload.indice).toBe("IPCA-E");
  });

  it("Step 5 — `juros=1_am` mapeia para simples_mensal", async () => {
    await seedPjecalcFromCase({ ...basePayload, juros: "1_am" });
    const [payload] = upsertCorrecaoConfig.mock.calls[0];
    expect(payload.juros_tipo).toBe("simples_mensal");
  });

  it("Step 5 — `juros=selic` mapeia para selic", async () => {
    await seedPjecalcFromCase({ ...basePayload, juros: "selic" });
    const [payload] = upsertCorrecaoConfig.mock.calls[0];
    expect(payload.juros_tipo).toBe("selic");
  });

  it("histórico salarial: cria faixas com periodo_fim correto (próxima mudança)", async () => {
    await seedPjecalcFromCase(basePayload);
    const calls = insertHistoricoSalarial.mock.calls.map((c) => c[0]);
    expect(calls[0]).toMatchObject({
      periodo_inicio: "2020-01-01",
      periodo_fim: "2022-01-01",
      valor_informado: 2500,
    });
    expect(calls[1]).toMatchObject({
      periodo_inicio: "2022-01-01",
      periodo_fim: "2023-06-01",
      valor_informado: 3000,
    });
    expect(calls[2]).toMatchObject({
      periodo_inicio: "2023-06-01",
      periodo_fim: "2024-03-15",
      valor_informado: 3500,
    });
  });

  it("parametros — última remuneração = última mudança (ou inicial)", async () => {
    await seedPjecalcFromCase(basePayload);
    const [payload] = upsertParametros.mock.calls[0];
    expect(payload.ultima_remuneracao).toBe(3500);
    expect(payload.maior_remuneracao).toBe(2500);
  });

  it("sem mudanças — última remuneração = salário inicial", async () => {
    await seedPjecalcFromCase({ ...basePayload, mudancasSalariais: [] });
    const [payload] = upsertParametros.mock.calls[0];
    expect(payload.ultima_remuneracao).toBe(2500);
    expect(insertHistoricoSalarial).toHaveBeenCalledTimes(1);
  });
});
