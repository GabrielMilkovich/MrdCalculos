/**
 * IRPF — testes unitários do fluxo `liquidarComDados` (API legacy V3)
 * e do IrpfModuloAdapter (Art. 12-A RRA + tributação exclusiva/separada).
 *
 * Referências:
 *  - Lei 7.713/88 art. 12-A (RRA)
 *  - IN RFB 1500/2014 art. 14 (13° exclusivo)
 *  - Tabela progressiva 2024/2025 (HISTORICO_FAIXAS_IR + DEFAULT_FAIXAS_IR)
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { Irpf, type FaixaDeIrpf } from '../dominio/calculo/irpf/irpf';
import { IrpfModuloAdapter } from '../../modulos/irpf-modulo-adapter';
import { InssModuloAdapter } from '../../modulos/inss-modulo-adapter';
import type { PjeIRConfig, PjeHonorariosConfig, PjeCSConfig } from '../../engine-types';
import { CaracteristicaDaVerbaEnum } from '../constantes/enums';
import { VerbaDeCalculo } from '../dominio/verbacalculo/verba-de-calculo';
import { OcorrenciaDeVerba } from '../dominio/ocorrenciaverba/ocorrencia-de-verba';

Decimal.set({ precision: 20 });

// Tabela 2025 oficial (Portaria MPS/MF nº 6/2025)
const FAIXAS_2025: FaixaDeIrpf[] = [
  { ate: new Decimal(2259.20), aliquota: new Decimal(0), deducao: new Decimal(0) },
  { ate: new Decimal(2826.65), aliquota: new Decimal(0.075), deducao: new Decimal(169.44) },
  { ate: new Decimal(3751.05), aliquota: new Decimal(0.15), deducao: new Decimal(381.44) },
  { ate: new Decimal(4664.68), aliquota: new Decimal(0.225), deducao: new Decimal(662.77) },
  { ate: new Decimal(99999999), aliquota: new Decimal(0.275), deducao: new Decimal(896.00) },
];

const IR_CONFIG_BASE: PjeIRConfig = {
  apurar: true,
  incidir_sobre_juros: false,
  cobrar_reclamado: false,
  tributacao_exclusiva_13: false,
  tributacao_separada_ferias: false,
  deduzir_cs: true,
  deduzir_prev_privada: false,
  deduzir_pensao: false,
  deduzir_honorarios: false,
  aposentado_65: false,
  dependentes: 0,
};

const CS_CONFIG_BASE: PjeCSConfig = {
  apurar_segurado: false,
  cobrar_reclamante: false,
  cs_sobre_salarios_pagos: false,
  aliquota_segurado_tipo: 'empregado',
  limitar_teto: true,
  apurar_empresa: false,
  apurar_sat: false,
  apurar_terceiros: false,
  aliquota_empregador_tipo: 'atividade',
  aliquota_empresa_fixa: 20,
  aliquota_sat_fixa: 0,
  aliquota_terceiros_fixa: 0,
  periodos_simples: [],
};

const HON_CONFIG: PjeHonorariosConfig = {
  apurar_sucumbenciais: false,
  percentual_sucumbenciais: 0,
  base_sucumbenciais: 'condenacao',
  apurar_contratuais: false,
  percentual_contratuais: 0,
};

function makeVerba(
  caracteristica: CaracteristicaDaVerbaEnum,
  comps: { comp: string; valor: number }[],
  incidirIRPF = true,
): VerbaDeCalculo {
  const vc = new VerbaDeCalculo();
  vc.setCaracteristica(caracteristica);
  vc.setIncidenciaIRPF(incidirIRPF);
  vc.setAtivo(true);
  const ocs: OcorrenciaDeVerba[] = [];
  for (const { comp, valor } of comps) {
    const oc = new OcorrenciaDeVerba();
    const [y, m] = comp.split('-').map(Number);
    oc.setDataInicial(new Date(y, m - 1, 1));
    oc.setDataFinal(new Date(y, m - 1, 28));
    oc.setDevido(new Decimal(valor));
    oc.setPago(new Decimal(0));
    oc.setAtivo(true);
    // Define índice acumulado = 1 → getDiferencaCorrigida retorna diferença × 1
    oc.setIndiceAcumulado(new Decimal(1));
    // Ref circular para permitir getDiferenca (verifica zeraValorNegativo)
    (oc as unknown as { verbaDeCalculo: VerbaDeCalculo }).verbaDeCalculo = vc;
    ocs.push(oc);
  }
  vc.setOcorrencias(ocs);
  return vc;
}

describe('Irpf.liquidarComDados — Art. 12-A RRA (legacy API V3)', () => {
  it('1. IR normal progressivo — R$ 5k/mês, 1 mês → tabela 2025', () => {
    const irpf = new Irpf();
    irpf.setFaixas(FAIXAS_2025);
    irpf.setDeduzirCS(true);
    // R$ 5k sem dedução: 5000 × 0.275 − 896 = 1375 − 896 = 479
    irpf.liquidarComDados(new Decimal(5000), new Decimal(0), 1);
    expect(irpf.getImpostoDevido().toNumber()).toBeCloseTo(479.0, 1);
    expect(irpf.getMesesRRA()).toBe(1);
  });

  it('2. Art. 12-A RRA — R$ 60k total em 24 meses → faixa por NM', () => {
    // mensal = 60k/24 = 2500 → faixa 2 (≤ 2826.65)
    // IR = 60000 × 0.075 − 169.44 × 24 = 4500 − 4066.56 = 433.44
    const irpf = new Irpf();
    irpf.setFaixas(FAIXAS_2025);
    irpf.setDeduzirCS(false);
    irpf.liquidarComDados(new Decimal(60000), new Decimal(0), 24);
    expect(irpf.getImpostoDevido().toNumber()).toBeCloseTo(433.44, 1);
    expect(irpf.getMesesRRA()).toBe(24);
  });

  it('3. Com dedução CS — R$ 60k, CS R$ 5k, 24 meses', () => {
    // baseTrib = 60000 - 5000 = 55000; mensal = 2291.67 → faixa 2
    // IR = 55000 × 0.075 − 169.44 × 24 = 4125 − 4066.56 = 58.44
    const irpf = new Irpf();
    irpf.setFaixas(FAIXAS_2025);
    irpf.setDeduzirCS(true);
    irpf.liquidarComDados(new Decimal(60000), new Decimal(5000), 24);
    expect(irpf.getImpostoDevido().toNumber()).toBeCloseTo(58.44, 1);
  });

  it('4. Dependentes × NM — 2 deps, R$ 80k, 24 meses', () => {
    // deducaoDep = 2 × 189.59 × 24 = 9100.32
    // baseTrib = 80000 - 9100.32 = 70899.68; mensal = 2954.15 → faixa 3
    // IR = 70899.68 × 0.15 − 381.44 × 24 = 10634.95 − 9154.56 = 1480.39
    const irpf = new Irpf();
    irpf.setFaixas(FAIXAS_2025);
    irpf.setDeduzirCS(true);
    irpf.setDependentes(2);
    irpf.setDeducaoDependente(new Decimal(189.59));
    irpf.liquidarComDados(new Decimal(80000), new Decimal(0), 24);
    expect(irpf.getImpostoDevido().toNumber()).toBeCloseTo(1480.39, 1);
  });

  it('5. Base ≤ isenção × NM → IR = 0', () => {
    // baseTrib = 45000; mensal = 1875 → faixa 1 (isenta) → IR = 0
    const irpf = new Irpf();
    irpf.setFaixas(FAIXAS_2025);
    irpf.setDeduzirCS(true);
    irpf.liquidarComDados(new Decimal(45000), new Decimal(0), 24);
    expect(irpf.getImpostoDevido().toNumber()).toBe(0);
  });

  it('6. Sem faixas configuradas → IR = 0 (clamp)', () => {
    const irpf = new Irpf();
    irpf.setFaixas([]);
    irpf.setDeduzirCS(true);
    irpf.liquidarComDados(new Decimal(50000), new Decimal(0), 12);
    expect(irpf.getImpostoDevido().toNumber()).toBe(0);
  });

  it('7. Faixa 3 clássico — R$ 72k em 24 meses, sem deduções', () => {
    // mensal = 3000 → faixa 3
    // IR = 72000 × 0.15 − 381.44 × 24 = 10800 − 9154.56 = 1645.44
    const irpf = new Irpf();
    irpf.setFaixas(FAIXAS_2025);
    irpf.setDeduzirCS(false);
    irpf.liquidarComDados(new Decimal(72000), new Decimal(0), 24);
    expect(irpf.getImpostoDevido().toNumber()).toBeCloseTo(1645.44, 1);
  });
});

describe('IrpfModuloAdapter — integração com engine V3', () => {
  function setup(
    verbas: VerbaDeCalculo[],
    irConfig: PjeIRConfig,
    dataLiq = '2025-12-01',
  ) {
    const inss = new InssModuloAdapter(verbas, CS_CONFIG_BASE, []);
    inss.liquidar(new Date(dataLiq));
    const adapter = new IrpfModuloAdapter(verbas, irConfig, [], HON_CONFIG, inss, dataLiq);
    adapter.liquidar(new Date(dataLiq));
    return adapter;
  }

  it('8. Base coletada de verbas COMUM → IR > 0', () => {
    // 24 meses × R$ 3000 = R$ 72000; sem 13/férias/deduções.
    // PARITY ALVO 2: dataLiq agora é considerado para NM (Lei 7.713/88 art 12-A).
    // Para evitar dependência da data fixture (que estende NM além do span de
    // verbas e empurra a base para faixa isenta), uso dataLiq na própria
    // última competência → mesesRRA = 24 (span puro, comportamento original).
    const comps = Array.from({ length: 24 }, (_, i) => {
      const y = 2023 + Math.floor(i / 12);
      const m = (i % 12) + 1;
      return { comp: `${y}-${String(m).padStart(2, '0')}`, valor: 3000 };
    });
    const vc = makeVerba(CaracteristicaDaVerbaEnum.COMUM, comps);
    const adapter = setup([vc], { ...IR_CONFIG_BASE, deduzir_cs: false }, '2024-12-01');
    expect(adapter.impostoDevido).toBeGreaterThan(0);
    expect(adapter.mesesRRA).toBe(24);
    expect(adapter.metodo).toBe('art_12a_rra');
    expect(adapter.baseCalculo).toBeCloseTo(72000, 0);
  });

  it('9. 13° em tributação exclusiva — isolado do normal (por ano)', () => {
    const comps13 = [
      { comp: '2024-12', valor: 4000 },
      { comp: '2025-12', valor: 4000 },
    ];
    const vcNormal = makeVerba(
      CaracteristicaDaVerbaEnum.COMUM,
      [{ comp: '2025-06', valor: 3000 }],
    );
    const vc13 = makeVerba(CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO, comps13);
    const adapter = setup([vcNormal, vc13], {
      ...IR_CONFIG_BASE,
      tributacao_exclusiva_13: true,
      deduzir_cs: false,
    });
    expect(adapter.ir13Exclusivo).toBeGreaterThanOrEqual(0);
    // IR 13° por ano: 4000 cada — cai na 4ª faixa (2826.65 < 4000 <= 4664.68)
    // 4000 × 0.225 − 662.77 = 900 − 662.77 = 237.23 por ano × 2 anos = 474.46
    expect(adapter.ir13Exclusivo).toBeCloseTo(474.46, 1);
  });

  it('10. Férias em tributação separada — NM = nº competências de férias', () => {
    const vcFerias = makeVerba(
      CaracteristicaDaVerbaEnum.FERIAS,
      [{ comp: '2025-01', valor: 3500 }, { comp: '2025-07', valor: 3500 }],
    );
    const vcNormal = makeVerba(
      CaracteristicaDaVerbaEnum.COMUM,
      [{ comp: '2025-06', valor: 3000 }],
    );
    const adapter = setup([vcNormal, vcFerias], {
      ...IR_CONFIG_BASE,
      tributacao_separada_ferias: true,
      deduzir_cs: false,
    });
    // 2 comps férias, base=7000, NM=2. mensal=3500 → faixa 3
    // IR = 7000 × 0.15 − 381.44 × 2 = 1050 − 762.88 = 287.12
    expect(adapter.irFeriasSeparado).toBeCloseTo(287.12, 1);
  });

  it('11. Aposentado 65+ — dedução adicional = 1ª faixa × NM', () => {
    const comps = Array.from({ length: 24 }, (_, i) => {
      const y = 2023 + Math.floor(i / 12);
      const m = (i % 12) + 1;
      return { comp: `${y}-${String(m).padStart(2, '0')}`, valor: 3000 };
    });
    const vc = makeVerba(CaracteristicaDaVerbaEnum.COMUM, comps);
    const adapter = setup([vc], {
      ...IR_CONFIG_BASE,
      aposentado_65: true,
      deduzir_cs: false,
    });
    // deducao aposentado = 2259.20 × 24 = 54220.80
    // baseTrib = 72000 - 54220.80 = 17779.20; mensal = 740.80 → faixa 1 → IR=0
    expect(adapter.impostoDevido).toBe(0);
  });

  it('12. Dependentes (RRA × NM) — reduz base tributável', () => {
    const comps = Array.from({ length: 24 }, (_, i) => {
      const y = 2023 + Math.floor(i / 12);
      const m = (i % 12) + 1;
      return { comp: `${y}-${String(m).padStart(2, '0')}`, valor: 3500 };
    });
    const vc = makeVerba(CaracteristicaDaVerbaEnum.COMUM, comps);
    const adapterSemDep = setup([vc], { ...IR_CONFIG_BASE, deduzir_cs: false });
    const adapterComDep = setup(
      [makeVerba(CaracteristicaDaVerbaEnum.COMUM, comps)],
      { ...IR_CONFIG_BASE, deduzir_cs: false, dependentes: 2 },
    );
    expect(adapterComDep.impostoDevido).toBeLessThan(adapterSemDep.impostoDevido);
  });

  it('13. Apurar=false → zera tudo', () => {
    const vc = makeVerba(
      CaracteristicaDaVerbaEnum.COMUM,
      [{ comp: '2025-06', valor: 5000 }],
    );
    const adapter = setup([vc], { ...IR_CONFIG_BASE, apurar: false });
    expect(adapter.impostoDevido).toBe(0);
    expect(adapter.baseCalculo).toBe(0);
  });
});
