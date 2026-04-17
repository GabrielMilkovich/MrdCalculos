/**
 * Testes do cálculo de INSS — `Inss.apurarInss` (port 1:1 do Java)
 * e do adapter `InssModuloAdapter` (mostrar o fix `com_correcao_trabalhista`).
 *
 * Referência das faixas 2025: Portaria MPS/MF 6/2025.
 */
import { describe, it, expect, vi } from 'vitest';
import Decimal from 'decimal.js';
import { Inss } from '../dominio/calculo/inss/inss';
import { InssModuloAdapter } from '../../modulos/inss-modulo-adapter';
import { CaracteristicaDaVerbaEnum } from '../constantes/enums';
import type { PjeCSConfig, PjeINSSFaixaRow } from '../../engine-types';

// Tabela INSS 2025 (Portaria MPS/MF 6/2025) — no formato usado pelo static helper.
const FAIXAS_2025 = [
  { ate: 1518.0, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 4190.83, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];

// Tabela alíquota única pré-EC 103/2019 (2019)
const FAIXAS_2019 = [
  { ate: 1751.81, aliquota: 0.08 },
  { ate: 2919.72, aliquota: 0.09 },
  { ate: 5839.45, aliquota: 0.11 },
];

describe('Inss.apurarInss — cálculo progressivo 1:1', () => {
  it('1. INSS progressivo faixa 1 — R$ 1.000 → 7,5% × 1000 = R$ 75,00', () => {
    const v = Inss.apurarInss(new Decimal(1000), FAIXAS_2025);
    expect(v.toNumber()).toBe(75);
  });

  it('2. INSS progressivo 4 faixas combinadas — R$ 5.000 → R$ 509,59', () => {
    // 1518 × 7.5 + 1275.88 × 9 + 1396.95 × 12 + 809.17 × 14
    //   = 113.85 + 114.8292 + 167.634 + 113.2838
    //   ≈ 509.60 (tolerância por arredondamento HALF_EVEN termo-a-termo)
    const v = Inss.apurarInss(new Decimal(5000), FAIXAS_2025);
    expect(v.toNumber()).toBeCloseTo(509.6, 1);
  });

  it('3. INSS no teto — R$ 10.000 é limitado ao teto R$ 8.157,41 → R$ 951,63', () => {
    const v = Inss.apurarInss(new Decimal(10000), FAIXAS_2025, false, true);
    expect(v.toNumber()).toBeCloseTo(951.63, 1);
  });

  it('4. Edge: base negativa retorna 0', () => {
    expect(Inss.apurarInss(new Decimal(-500), FAIXAS_2025).toNumber()).toBe(0);
    expect(Inss.apurarInss(new Decimal(0), FAIXAS_2025).toNumber()).toBe(0);
  });

  it('5. Pré-EC 103/2019 — alíquota única R$ 1.500 em 2019 → 8% × 1500 = R$ 120', () => {
    const v = Inss.apurarInss(new Decimal(1500), FAIXAS_2019, /*aliquotaUnica=*/true);
    expect(v.toNumber()).toBe(120);
  });

  it('6. Progressivo com base exatamente no teto — R$ 8.157,41 → INSS máximo', () => {
    // No teto: mesmo resultado com ou sem limitarTeto
    const comTeto = Inss.apurarInss(new Decimal(8157.41), FAIXAS_2025, false, true);
    const semTeto = Inss.apurarInss(new Decimal(8157.41), FAIXAS_2025, false, false);
    expect(comTeto.toNumber()).toBeCloseTo(951.63, 1);
    expect(semTeto.toNumber()).toBeCloseTo(951.63, 1);
  });
});

describe('InssModuloAdapter — 13º com teto separado', () => {
  function makeVerba(comp: string, devido: number, is13: boolean, indiceAcum?: number) {
    const [y, m] = comp.split('-').map(Number);
    const oc = {
      getDataInicial: () => new Date(y, m - 1, 1),
      getDiferenca: () => new Decimal(devido),
      getDiferencaCorrigida: () => (indiceAcum ? new Decimal(devido).times(indiceAcum) : null),
    };
    return {
      getIncidenciaINSS: () => true,
      getCaracteristica: () =>
        is13 ? CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO : CaracteristicaDaVerbaEnum.VERBA_SALARIAL,
      getOcorrenciasAtivas: () => [oc],
    } as never;
  }

  function baseCs(overrides: Partial<PjeCSConfig> = {}): PjeCSConfig {
    return {
      apurar_segurado: true,
      cobrar_reclamante: true,
      cs_sobre_salarios_pagos: false,
      aliquota_segurado_tipo: 'empregado',
      limitar_teto: true,
      apurar_empresa: false,
      apurar_sat: false,
      apurar_terceiros: false,
      aliquota_empregador_tipo: 'fixa',
      aliquota_empresa_fixa: 20,
      aliquota_sat_fixa: 2,
      aliquota_terceiros_fixa: 5.8,
      periodos_simples: [],
      ...overrides,
    };
  }

  const FAIXAS_DB: PjeINSSFaixaRow[] = [
    { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 1, valor_ate: 1518.0, aliquota: 0.075 },
    { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 2, valor_ate: 2793.88, aliquota: 0.09 },
    { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 3, valor_ate: 4190.83, aliquota: 0.12 },
    { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 4, valor_ate: 8157.41, aliquota: 0.14 },
  ];

  it('7. 13º é apurado com teto próprio e somado ao INSS mensal (bases separadas)', () => {
    // Competência 2025-06: base normal R$ 4.000 (faixas 1–3 parciais) + base 13º R$ 4.000.
    // Cada base passa pelo progressivo independentemente. Se fosse somada, ultrapassaria
    // a 4ª faixa e o imposto seria maior.
    const verbas = [makeVerba('2025-06', 4000, false), makeVerba('2025-06', 4000, true)];
    const adapter = new InssModuloAdapter(verbas, baseCs(), FAIXAS_DB);
    adapter.liquidar();

    // INSS(4000) com progressivo 2025 ≈ 113.85 + 114.83 + 144.73 = 373.41
    //   faixa3 parcial: (4000-2793.88)*12% = 1206.12*12 = 144.7344 ≈ 144.73
    const inss4000 = 373.41;
    expect(adapter.totalSegurado).toBeCloseTo(inss4000 * 2, 0);
  });

  it('8. Com correção trabalhista — base corrigida > nominal → INSS maior', () => {
    // Nominal R$ 1.000 × indice 2.0 → base efetiva R$ 2.000.
    // INSS(1000) = 75. INSS(2000) = 113.85 + 482 × 9% = 113.85 + 43.38 = 157.23
    const verbas = [makeVerba('2025-06', 1000, false, 2.0)];

    const semCorrecao = new InssModuloAdapter(verbas, baseCs({ com_correcao_trabalhista: false }), FAIXAS_DB);
    semCorrecao.liquidar();

    const comCorrecao = new InssModuloAdapter(verbas, baseCs({ com_correcao_trabalhista: true }), FAIXAS_DB);
    comCorrecao.liquidar();

    expect(semCorrecao.totalSegurado).toBeCloseTo(75, 1);
    expect(comCorrecao.totalSegurado).toBeGreaterThan(semCorrecao.totalSegurado);
    expect(comCorrecao.totalSegurado).toBeCloseTo(157.23, 0);
  });

  it('9. Apuração mensal separada — cada competência tem sua faixa', () => {
    // Duas competências com R$ 1.000 cada: INSS = 75 + 75 = 150 (NÃO tributa cumulativo)
    const verbas = [makeVerba('2025-06', 1000, false), makeVerba('2025-07', 1000, false)];
    const adapter = new InssModuloAdapter(verbas, baseCs(), FAIXAS_DB);
    adapter.liquidar();
    expect(adapter.totalSegurado).toBeCloseTo(150, 0);
    expect(adapter.seguradoDevidos).toHaveLength(2);
  });

  it('10. Fallback: indice ausente com correção trabalhista → usa nominal', () => {
    // Sem setar indiceAcum: getDiferencaCorrigida() retorna null → fallback para getDiferenca()
    const verbas = [makeVerba('2025-06', 1000, false /* sem indice */)];
    const adapter = new InssModuloAdapter(verbas, baseCs({ com_correcao_trabalhista: true }), FAIXAS_DB);
    adapter.liquidar();
    expect(adapter.totalSegurado).toBeCloseTo(75, 1); // = INSS(1000) nominal
  });
});

describe('Inss.apurarInss — contrato do método', () => {
  it('11. Atualização SELIC pós-liquidação (Lei 9.430/96) — TODO: atualizar_inss_selic', () => {
    // Sinaliza que o flag `atualizar_inss_selic` existe mas não altera apurarInss
    // diretamente — a atualização SELIC é feita FORA do port `apurarInss`.
    // Garante idempotência: chamar várias vezes retorna o mesmo valor.
    const a = Inss.apurarInss(new Decimal(3000), FAIXAS_2025);
    const b = Inss.apurarInss(new Decimal(3000), FAIXAS_2025);
    expect(a.toNumber()).toBe(b.toNumber());
  });
});
