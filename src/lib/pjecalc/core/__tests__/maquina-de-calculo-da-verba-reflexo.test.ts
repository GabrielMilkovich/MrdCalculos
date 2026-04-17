/**
 * Testes de MaquinaDeCalculoDaVerbaReflexo (Fase 11).
 *
 * Cobre:
 *  - calcularDevidoOcorrencia (13º VALOR_MENSAL / MEDIA / férias / aviso)
 *  - obterBaseReflexo (PERIODO_AQUISITIVO, base variável, DOZE_MESES_ANTERIORES)
 *  - aplicarFracaoDeMes (MANTER / INTEGRALIZAR / DESPREZAR / DESPREZAR_MENOR_QUE_15_DIAS)
 *
 * Objetivo: garantir que não há duplicação de reflexo (13º sobre X com o MESMO
 * valor de X), recalculando via base × multiplicador / divisor.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { MaquinaDeCalculoDaVerbaReflexo, type ReflexoContext } from '../dominio/verbacalculo/maquina-de-calculo-da-verba-reflexo';
import { Reflexo } from '../dominio/verbacalculo/reflexo';
import { VerbaDeCalculo } from '../dominio/verbacalculo/verba-de-calculo';
import { OcorrenciaDeVerba } from '../dominio/ocorrenciaverba/ocorrencia-de-verba';
import {
  ComportamentoDoReflexoEnumFull,
  PeriodoDaMediaDoReflexoEnum,
  TratamentoDaFracaoDeMesDoReflexoEnum,
} from '../constantes/enums';

// ─────────────────────── Helpers ───────────────────────

/**
 * Cria um `VerbaDeCalculo` com uma lista de ocorrências mensais, cada uma
 * com `base = valoresPorMes[i]`. Os meses são consecutivos a partir de `inicio`.
 */
function verbaComBases(inicio: Date, valoresPorMes: number[]): VerbaDeCalculo {
  const v = new VerbaDeCalculo();
  const ocs: OcorrenciaDeVerba[] = valoresPorMes.map((valor, idx) => {
    const di = new Date(inicio.getFullYear(), inicio.getMonth() + idx, 1);
    const df = new Date(inicio.getFullYear(), inicio.getMonth() + idx + 1, 0);
    const oc = new OcorrenciaDeVerba();
    oc.setDataInicial(di);
    oc.setDataFinal(df);
    oc.setBase(new Decimal(valor));
    oc.setAtivo(true);
    return oc;
  });
  v.setOcorrencias(ocs);
  return v;
}

/** Cria uma OcorrenciaDeVerba para o reflexo (mês cheio). */
function ocorrenciaMensal(
  ano: number,
  mes: number, // 0-indexed
  divisor: number,
  multiplicador: number,
): OcorrenciaDeVerba {
  const oc = new OcorrenciaDeVerba();
  const di = new Date(ano, mes, 1);
  const df = new Date(ano, mes + 1, 0);
  oc.setDataInicial(di);
  oc.setDataFinal(df);
  oc.setDivisor(new Decimal(divisor));
  oc.setMultiplicador(new Decimal(multiplicador));
  oc.setQuantidade(new Decimal(1));
  return oc;
}

function ctxPadrao(overrides: Partial<ReflexoContext> = {}): ReflexoContext {
  return {
    dataAdmissao: new Date(2023, 0, 1),
    dataDemissao: new Date(2024, 11, 31),
    dataLiquidacao: new Date(2025, 0, 31),
    ...overrides,
  };
}

// ─────────────────────── Suite ───────────────────────

describe('MaquinaDeCalculoDaVerbaReflexo — calcularDevidoOcorrencia', () => {
  it('1. 13º VALOR_MENSAL: base 1200/mês, 12 meses → cada mês 1200/12=100', () => {
    const reflexo = new Reflexo();
    reflexo.setComportamentoDoReflexo(ComportamentoDoReflexoEnumFull.VALOR_MENSAL);
    reflexo.setTratamentoDaFracaoDeMesDoReflexo(TratamentoDaFracaoDeMesDoReflexoEnum.MANTER);

    const inicio = new Date(2024, 0, 1);
    const baseRef = [verbaComBases(inicio, Array(12).fill(1200))];

    const ctx = ctxPadrao({
      dataAdmissao: new Date(2024, 0, 1),
      dataDemissao: new Date(2024, 11, 31),
    });

    for (let m = 0; m < 12; m++) {
      // Reflexo 13º: divisor=12, multiplicador=1 → devido = 1200 * 1/12 = 100
      const oc = ocorrenciaMensal(2024, m, 12, 1);
      const devido = MaquinaDeCalculoDaVerbaReflexo.calcularDevidoOcorrencia(
        reflexo, oc, baseRef, ctx,
      );
      expect(devido.toFixed(2)).toBe('100.00');
    }
  });

  it('2. 13º MEDIA período_aquisitivo: média anual / 12', () => {
    const reflexo = new Reflexo();
    reflexo.setComportamentoDoReflexo(ComportamentoDoReflexoEnumFull.MEDIA_PELO_VALOR);
    reflexo.setPeriodoMediaReflexo(PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO);

    const inicio = new Date(2024, 0, 1);
    // Bases variadas; média = (1000*6 + 1500*6)/12 = 1250
    const bases = [1000, 1000, 1000, 1000, 1000, 1000, 1500, 1500, 1500, 1500, 1500, 1500];
    const baseRef = [verbaComBases(inicio, bases)];

    const ctx = ctxPadrao({
      periodoAquisitivoInicio: new Date(2024, 0, 1),
      periodoAquisitivoFim: new Date(2024, 11, 31),
    });

    // Reflexo 13º: div=12, mult=1 → devido = 1250 / 12 ≈ 104.17
    const oc = ocorrenciaMensal(2024, 11, 12, 1);
    const devido = MaquinaDeCalculoDaVerbaReflexo.calcularDevidoOcorrencia(
      reflexo, oc, baseRef, ctx,
    );
    expect(devido.toDecimalPlaces(2).toFixed(2)).toBe('104.17');
  });

  it('3. 13º com base VARIÁVEL (MEDIA): usa média, não o último mês', () => {
    const reflexo = new Reflexo();
    reflexo.setComportamentoDoReflexo(ComportamentoDoReflexoEnumFull.MEDIA_PELO_VALOR);
    reflexo.setPeriodoMediaReflexo(PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO);

    const inicio = new Date(2024, 0, 1);
    // Bases: último mês é 2400; média é 1300. O reflexo deve usar 1300, não 2400.
    const bases = [1000, 1100, 1200, 1300, 1200, 1100, 1000, 1100, 1200, 1300, 1200, 2400];
    const somaEsperada = bases.reduce((a, b) => a + b, 0);
    const mediaEsperada = somaEsperada / 12; // = 1341.67 aprox.
    const baseRef = [verbaComBases(inicio, bases)];

    const ctx = ctxPadrao({
      periodoAquisitivoInicio: new Date(2024, 0, 1),
      periodoAquisitivoFim: new Date(2024, 11, 31),
    });

    const oc = ocorrenciaMensal(2024, 11, 12, 1);
    const devido = MaquinaDeCalculoDaVerbaReflexo.calcularDevidoOcorrencia(
      reflexo, oc, baseRef, ctx,
    );
    const esperado = new Decimal(mediaEsperada).dividedBy(12).toDecimalPlaces(2).toFixed(2);
    expect(devido.toDecimalPlaces(2).toFixed(2)).toBe(esperado);
    // Sanidade: não é 2400/12 = 200 (seria duplicação)
    expect(devido.toDecimalPlaces(2).toFixed(2)).not.toBe('200.00');
  });

  it('4. Férias 1/3 sobre base 1200 → 400 de adicional', () => {
    const reflexo = new Reflexo();
    reflexo.setComportamentoDoReflexo(ComportamentoDoReflexoEnumFull.VALOR_MENSAL);

    const inicio = new Date(2024, 0, 1);
    const baseRef = [verbaComBases(inicio, Array(12).fill(1200))];
    const ctx = ctxPadrao({
      dataAdmissao: new Date(2024, 0, 1),
      dataDemissao: new Date(2024, 11, 31),
    });

    // 1/3: divisor=3, multiplicador=1 → 1200 * 1/3 = 400
    const oc = ocorrenciaMensal(2024, 5, 3, 1);
    const devido = MaquinaDeCalculoDaVerbaReflexo.calcularDevidoOcorrencia(
      reflexo, oc, baseRef, ctx,
    );
    expect(devido.toFixed(2)).toBe('400.00');
  });

  it('5. Aviso prévio indenizado (1 salário): devido = base', () => {
    const reflexo = new Reflexo();
    reflexo.setComportamentoDoReflexo(ComportamentoDoReflexoEnumFull.VALOR_MENSAL);

    const inicio = new Date(2024, 0, 1);
    const baseRef = [verbaComBases(inicio, Array(12).fill(1800))];
    const ctx = ctxPadrao({
      dataAdmissao: new Date(2024, 0, 1),
      dataDemissao: new Date(2024, 11, 31),
    });

    // div=1, mult=1, qtd=1 → devido = 1800
    const oc = ocorrenciaMensal(2024, 11, 1, 1);
    const devido = MaquinaDeCalculoDaVerbaReflexo.calcularDevidoOcorrencia(
      reflexo, oc, baseRef, ctx,
    );
    expect(devido.toFixed(2)).toBe('1800.00');
  });
});

describe('MaquinaDeCalculoDaVerbaReflexo — aplicarFracaoDeMes', () => {
  it('6. MANTER em 15/30 dias → 0.5', () => {
    const fator = MaquinaDeCalculoDaVerbaReflexo.aplicarFracaoDeMes(
      15, 30, TratamentoDaFracaoDeMesDoReflexoEnum.MANTER,
    );
    expect(fator.toFixed(4)).toBe('0.5000');
  });

  it('7. DESPREZAR_MENOR_QUE_15_DIAS em 20/30 dias → 1.0 (ARREDONDAR)', () => {
    const fator = MaquinaDeCalculoDaVerbaReflexo.aplicarFracaoDeMes(
      20, 30, TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR_MENOR_QUE_15_DIAS,
    );
    expect(fator.toFixed(4)).toBe('1.0000');
  });

  it('7b. DESPREZAR_MENOR_QUE_15_DIAS em 10/30 dias → 0', () => {
    const fator = MaquinaDeCalculoDaVerbaReflexo.aplicarFracaoDeMes(
      10, 30, TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR_MENOR_QUE_15_DIAS,
    );
    expect(fator.toFixed(4)).toBe('0.0000');
  });

  it('8. DESPREZAR em 15/30 dias → 0 (só conta se mês inteiro)', () => {
    const fator = MaquinaDeCalculoDaVerbaReflexo.aplicarFracaoDeMes(
      15, 30, TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR,
    );
    expect(fator.toFixed(4)).toBe('0.0000');
  });

  it('8b. DESPREZAR em 30/30 dias → 1 (mês inteiro vale)', () => {
    const fator = MaquinaDeCalculoDaVerbaReflexo.aplicarFracaoDeMes(
      30, 30, TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR,
    );
    expect(fator.toFixed(4)).toBe('1.0000');
  });

  it('9. INTEGRALIZAR em 1/30 dias → 1 (qualquer dia integraliza o avo)', () => {
    const fator = MaquinaDeCalculoDaVerbaReflexo.aplicarFracaoDeMes(
      1, 30, TratamentoDaFracaoDeMesDoReflexoEnum.INTEGRALIZAR,
    );
    expect(fator.toFixed(4)).toBe('1.0000');
  });
});

describe('MaquinaDeCalculoDaVerbaReflexo — obterBaseReflexo', () => {
  it('10. DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA: exclui competência atual', () => {
    const reflexo = new Reflexo();
    reflexo.setComportamentoDoReflexo(ComportamentoDoReflexoEnumFull.MEDIA_PELO_VALOR);
    reflexo.setPeriodoMediaReflexo(
      PeriodoDaMediaDoReflexoEnum.DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA,
    );

    // Bases de jan/2023 a dez/2024 (24 meses): todos 1000, exceto dez/2024 = 9999
    const bases: number[] = Array(24).fill(1000);
    bases[23] = 9999; // dez/2024 — a competência corrente
    const baseRef = [verbaComBases(new Date(2023, 0, 1), bases)];

    const ctx = ctxPadrao({
      dataAdmissao: new Date(2023, 0, 1),
      dataDemissao: new Date(2024, 11, 31),
    });

    // Competência dez/2024: janela = dez/2023..nov/2024 (12 meses, todos 1000)
    const base = MaquinaDeCalculoDaVerbaReflexo.obterBaseReflexo(
      reflexo, new Date(2024, 11, 1), baseRef, ctx,
    );
    expect(base.toFixed(2)).toBe('1000.00');
  });

  it('11. VALOR_MENSAL soma múltiplas verbas-base na MESMA competência', () => {
    const reflexo = new Reflexo();
    reflexo.setComportamentoDoReflexo(ComportamentoDoReflexoEnumFull.VALOR_MENSAL);

    const inicio = new Date(2024, 0, 1);
    const v1 = verbaComBases(inicio, [500, 500, 500]); // HE
    const v2 = verbaComBases(inicio, [200, 200, 200]); // Adic. Not.
    const ctx = ctxPadrao();

    const base = MaquinaDeCalculoDaVerbaReflexo.obterBaseReflexo(
      reflexo, new Date(2024, 1, 1), [v1, v2], ctx,
    );
    expect(base.toFixed(2)).toBe('700.00');
  });
});
