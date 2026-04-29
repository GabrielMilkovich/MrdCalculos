/**
 * =====================================================
 * End-to-End — Validacao dos 10 modulos "Em estudo" → habilitados
 * =====================================================
 *
 * Cada teste roda o engine v3 (ou modulo isolado) com a sub-flag
 * habilitada e assercoes numericas concretas que comprovam que a
 * flag ESTA WIRED ao calculo (nao apenas exposta na UI).
 *
 * Modulos validados:
 *   1.  IR.incidir_sobre_juros        (Lei 8.541/92 art. 46)
 *   2.  IR.cobrar_reclamado           (paridade c/ CS.cobrar_reclamante)
 *   3.  IR.tributacao_exclusiva_13    (IN RFB 1500/2014 art. 14)
 *   4.  IR.tributacao_separada_ferias (Lei 7.713/88 art. 7)
 *   5.  IR.RRA Lei 7.713/88 art.12-A  (divisao por NM)
 *   6.  Honor IRPF                    (apurar_ir item)
 *   7.  Equiparacao Salarial          (Sumula 6 TST + Art. 461 CLT)
 *   8.  Estabilidade                  (gestante/CIPA/acidente)
 *   9.  Faltas Reinicia Ferias        (Art. 130-A CLT)
 *  10.  PrevPriv tetoMensal/modoJuros (Art. 6 LC 109/2001)
 *
 * Os testes referenciam suites existentes (irpf-rra-flags,
 * audit-field-to-engine, equiparacao-salarial, estabilidade-engine,
 * ferias-reinicia, previdencia-privada-teto-juros) e fornecem 1
 * caso minimo por modulo, evitando duplicacao.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { createEngine, makeVerba, makeIrConfig, makeIRFaixas } from './helpers';
import type { PjeVerba } from '../engine-types';
import { EquiparacaoSalarialModule } from '../verba-modules/equiparacao-salarial';
import { calcularIndenizacaoConsolidada, calcularDataFim } from '../verba-modules/estabilidade';
import { calcularInicioPeriodoAquisitivo } from '../verba-modules/ferias';
import {
  PrevidenciaPrivada,
  type AliquotaDePrevidenciaPrivada,
  type CalculoPrevPrivInput,
  type VerbaPrevPrivInput,
} from '../core/dominio/calculo/previdenciaprivada/previdencia-privada';

// ── Faixas IR genericas (2024) — base para todos os testes IR
const FAIXAS_IR_2024 = makeIRFaixas([
  { ate: 2259.20, aliquota: 0,    deducao: 0       },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15,  deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Number.POSITIVE_INFINITY, aliquota: 0.275, deducao: 896.00 },
]);

// ── Helper: verba de 12 meses com base alta (forca IR > 0) ──
function verbaMensal12(): PjeVerba[] {
  return [
    makeVerba({
      id: 'v1',
      nome: 'Horas Extras',
      caracteristica: 'comum',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
      incidencias: { fgts: false, irpf: true, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
      ocorrencias_precomputadas: Array.from({ length: 12 }, (_, i) => ({
        competencia: `2023-${String(i + 1).padStart(2, '0')}`,
        base: 5000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: false,
        devido: 5000, pago: 0,
      })),
    }),
  ];
}

describe('Em-estudo END-TO-END — 10 modulos habilitados', () => {
  // ────────────────────────────────────────────────────────────
  // 1) IR.incidir_sobre_juros
  // ────────────────────────────────────────────────────────────
  it('Modulo 1 — IR.incidir_sobre_juros=true aumenta imposto_devido', () => {
    const off = createEngine({
      verbas: verbaMensal12(),
      irConfig: makeIrConfig({ apurar: true, incidir_sobre_juros: false, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();
    const on = createEngine({
      verbas: verbaMensal12(),
      irConfig: makeIrConfig({ apurar: true, incidir_sobre_juros: true, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();

    expect(off.imposto_renda.imposto_devido).toBeGreaterThan(0);
    expect(on.imposto_renda.imposto_devido).toBeGreaterThan(off.imposto_renda.imposto_devido);
  });

  // ────────────────────────────────────────────────────────────
  // 2) IR.cobrar_reclamado → ir_retido = 0 (mas apurado > 0)
  // ────────────────────────────────────────────────────────────
  it('Modulo 2 — IR.cobrar_reclamado=true zera ir_retido (mantem imposto_devido)', () => {
    const off = createEngine({
      verbas: verbaMensal12(),
      irConfig: makeIrConfig({ apurar: true, cobrar_reclamado: false, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();
    const on = createEngine({
      verbas: verbaMensal12(),
      irConfig: makeIrConfig({ apurar: true, cobrar_reclamado: true, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();

    expect(off.resumo.ir_retido).toBeGreaterThan(0);
    expect(on.resumo.ir_retido).toBe(0);
    // Imposto continua sendo apurado/reportado (so muda quem paga)
    expect(on.imposto_renda.imposto_devido).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────
  // 3) IR.tributacao_exclusiva_13 (13o à parte)
  // ────────────────────────────────────────────────────────────
  it('Modulo 3 — tributacao_exclusiva_13=true tributa 13o em separado', () => {
    const verba13: PjeVerba[] = [
      makeVerba({
        id: 'v13', nome: '13o Salario', caracteristica: 'decimo_terceiro_salario',
        periodo_inicio: '2023-12-01', periodo_fim: '2023-12-31',
        incidencias: { fgts: false, irpf: true, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
        ocorrencias_precomputadas: [{
          competencia: '2023-12', base: 6000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: false,
          devido: 6000, pago: 0,
        }],
      }),
    ];
    const on = createEngine({
      verbas: verba13,
      irConfig: makeIrConfig({ apurar: true, tributacao_exclusiva_13: true, deduzir_cs: false, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();

    // Quando exclusiva_13=true, ir13Exclusivo deve ser preenchido (> 0)
    expect(on.imposto_renda.ir_13_exclusivo).toBeGreaterThan(0);
    expect(on.imposto_renda.imposto_devido).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────
  // 4) IR.tributacao_separada_ferias (ferias à parte)
  // ────────────────────────────────────────────────────────────
  it('Modulo 4 — tributacao_separada_ferias=true tributa ferias em separado', () => {
    const verbaFerias: PjeVerba[] = [
      makeVerba({
        id: 'vf', nome: 'Ferias', caracteristica: 'ferias',
        periodo_inicio: '2023-07-01', periodo_fim: '2023-07-31',
        dobrar_valor_devido: true, // dobra para garantir parcela tributavel
        incidencias: { fgts: false, irpf: true, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
        ocorrencias_precomputadas: [{
          competencia: '2023-07', base: 8000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: true,
          devido: 8000, pago: 0,
        }],
      }),
    ];
    const off = createEngine({
      verbas: verbaFerias,
      irConfig: makeIrConfig({ apurar: true, tributacao_separada_ferias: false, deduzir_cs: false, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();
    const on = createEngine({
      verbas: verbaFerias,
      irConfig: makeIrConfig({ apurar: true, tributacao_separada_ferias: true, deduzir_cs: false, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();

    // Quando separada, ir_ferias_separado e preenchido; quando false, fica 0
    expect(on.imposto_renda.ir_ferias_separado).toBeGreaterThan(0);
    expect(off.imposto_renda.ir_ferias_separado).toBe(0);
  });

  // ────────────────────────────────────────────────────────────
  // 5) IR RRA Lei 7.713/88 art.12-A → metodo=art_12a_rra com NM>1
  // ────────────────────────────────────────────────────────────
  it('Modulo 5 — RRA com 12 meses → metodo=art_12a_rra e meses_rra=12', () => {
    const r = createEngine({
      verbas: verbaMensal12(),
      irConfig: makeIrConfig({ apurar: true, apurar_rra: true, deduzir_cs: false, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();

    expect(r.imposto_renda.metodo).toBe('art_12a_rra');
    expect(r.imposto_renda.meses_rra).toBe(12);
    expect(r.imposto_renda.imposto_devido).toBeGreaterThanOrEqual(0);
  });

  // ────────────────────────────────────────────────────────────
  // 6) Honor IRPF — flag apurar_ir em multas/honorarios verbas
  // ────────────────────────────────────────────────────────────
  it('Modulo 6 — Honor com apurar_ir=true marca incidencia IRPF na verba', () => {
    // Validamos via tipo do core: ParcelasAtualizaveisHonorario aceita
    // setApurarIrpf(true). O orchestrator:910 propaga m.apurar_ir → incidencias.irpf.
    // Aqui asseguramos que uma verba com incidencia irpf=true (proxy do honorario
    // com apurar_ir=true) entra na base do IR e gera imposto.
    const verbaHonor: PjeVerba[] = [
      makeVerba({
        id: 'vh', nome: 'Honorarios Sucumbenciais', caracteristica: 'comum',
        periodo_inicio: '2023-12-01', periodo_fim: '2023-12-31',
        incidencias: { fgts: false, irpf: true, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
        ocorrencias_precomputadas: [{
          competencia: '2023-12', base: 10000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: false,
          devido: 10000, pago: 0,
        }],
      }),
    ];
    const semIr = createEngine({
      verbas: [{ ...verbaHonor[0], incidencias: { ...verbaHonor[0].incidencias, irpf: false } }],
      irConfig: makeIrConfig({ apurar: true, deduzir_cs: false, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();
    const comIr = createEngine({
      verbas: verbaHonor,
      irConfig: makeIrConfig({ apurar: true, deduzir_cs: false, dependentes: 0 }),
      faixasIRDB: FAIXAS_IR_2024,
    }).liquidar();

    expect(semIr.imposto_renda.imposto_devido).toBe(0);
    expect(comIr.imposto_renda.imposto_devido).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────
  // 7) Equiparacao Salarial — Sumula 6 TST + Art. 461 CLT
  // ────────────────────────────────────────────────────────────
  it('Modulo 7 — Equiparacao: paradigma 5000 - empregado 3000 = 2000', () => {
    const mod = new EquiparacaoSalarialModule();
    const ctx = {
      caseId: 'eq-eet',
      competencia: '2023-06',
      periodo: { inicio: '2023-01-01', fim: '2023-12-31' },
      admissao: '2020-01-01',
      demissao: '2023-12-31',
      historicos: [
        {
          id: 'h-emp', nome: 'Salario Empregado',
          periodo_inicio: '2023-01-01', periodo_fim: '2023-12-31',
          tipo_valor: 'informado' as const, valor_informado: 3000,
          incidencia_fgts: true, incidencia_cs: true,
          fgts_recolhido: false, cs_recolhida: false,
          ocorrencias: [{ id: 'oc-e', historico_id: 'h-emp', competencia: '2023-06', valor: 3000, tipo: 'informado' as const }],
        },
        {
          id: 'h-par', nome: 'Salario Paradigma',
          periodo_inicio: '2023-01-01', periodo_fim: '2023-12-31',
          tipo_valor: 'informado' as const, valor_informado: 5000,
          incidencia_fgts: true, incidencia_cs: true,
          fgts_recolhido: false, cs_recolhida: false,
          ocorrencias: [{ id: 'oc-p', historico_id: 'h-par', competencia: '2023-06', valor: 5000, tipo: 'informado' as const }],
        },
      ],
      cartaoPonto: [],
      faltas: [],
      ferias: [],
      calendario: { diasUteis: 22, repousos: 8, feriados: 1, diasNoMes: 30 },
      cargaHoraria: 220,
      sabadoDiaUtil: false,
      zerarNegativo: true,
      resultadosAnteriores: new Map(),
    };
    const verba = makeVerba({
      base_calculo: { historicos: ['h-emp', 'h-par'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      multiplicador: 1, divisor_informado: 1, quantidade_informada: 1,
    });
    const inputs = mod.resolveInputs(ctx, verba);
    const resultado = mod.applyFormula(inputs, verba);
    expect(inputs.base).toBe(2000);
    expect(resultado).toBe(2000);
  });

  // ────────────────────────────────────────────────────────────
  // 8) Estabilidade — gestante/CIPA/acidente
  // ────────────────────────────────────────────────────────────
  it('Modulo 8 — Estabilidade gestante: data fim +5 meses, indenizacao numerica', () => {
    expect(calcularDataFim('GESTANTE', '2024-06-15')).toBe('2024-11-15');
    // Salario 3000 x 5 meses x FATOR (~1.476) ≈ 22 140
    const ind = calcularIndenizacaoConsolidada(3000, 5);
    expect(ind.toNumber()).toBeGreaterThan(22000);
    expect(ind.toNumber()).toBeLessThan(22300);
    // Estabilidade CIPA: 12 meses
    expect(calcularDataFim('CIPA', '2024-01-31')).toBe('2025-01-31');
  });

  // ────────────────────────────────────────────────────────────
  // 9) Faltas Reinicia Ferias — Art. 130-A CLT
  // ────────────────────────────────────────────────────────────
  it('Modulo 9 — Falta com reinicia=true avanca inicio do periodo aquisitivo', () => {
    const r = calcularInicioPeriodoAquisitivo('2020-01-01', [
      { id: 'fr', data_inicial: '2022-03-01', data_final: '2022-03-05', justificada: false, reinicia: true },
    ]);
    expect(r.inicio).toBe('2022-03-06');
    expect(r.reiniciado).toBe(true);
    expect(r.faltaQueReiniciou).toBe('fr');
  });

  // ────────────────────────────────────────────────────────────
  // 10) PrevPriv tetoMensal + modoJuros
  // ────────────────────────────────────────────────────────────
  it('Modulo 10 — PrevPriv: teto 5000 clampa base 8000; modoJuros=nenhum zera juros', () => {
    const aliq: AliquotaDePrevidenciaPrivada = {
      dataInicioPeriodo: new Date('2023-01-01T00:00:00Z'),
      dataTerminoPeriodo: new Date('2023-01-31T00:00:00Z'),
      aliquota: new Decimal('10'),
    };
    const verbaInput: VerbaPrevPrivInput = {
      competencia: '2023-01-15',
      ativo: true,
      diferencaParaCalculoDasIncidencias: new Decimal('8000'),
    };
    const input: CalculoPrevPrivInput = {
      verbasIncidentes: [verbaInput],
      dataDeLiquidacao: new Date('2024-01-01T00:00:00Z'),
      indicesAcumulados: {},
      opcaoIndiceCorrecao: 'UTILIZAR_INDICE_TRABALHISTA',
      tetoMensal: new Decimal('5000'),
      taxaJurosPorCompetencia: { '2023-01': new Decimal('10') },
      modoJuros: 'nenhum',
    };
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas([aliq]);
    prev.liquidarComDados(input);

    const oc = prev.getOcorrencias()[0];
    expect(oc.valorBase.toString()).toBe('5000');
    expect(oc.taxaDeJuros.toString()).toBe('0');
    expect(prev.getValorTotalDevido().toString()).toBe('500'); // 5000 * 10%
    expect(prev.getValorTotalDeJuros().toString()).toBe('0');
  });
});
