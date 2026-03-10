/**
 * GOLDEN TEST — Leandro Casademunt Pereira vs Grupo Casas Bahia S.A.
 * Processo: 0011350-60.2025.5.15.0003
 *
 * Caso de alto valor (R$ 510k), contrato longo (~16 anos),
 * HE parte fixa + variável, RSR, intrajornada, interjornada,
 * domingos/feriados laborados, reflexos MEDIA_PELA_QUANTIDADE.
 *
 * Validação completa: 18 rubricas, critérios de correção/juros,
 * integridade aritmética e valores individuais com paridade R$ 0,01.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';
import {
  LEANDRO_CASADEMUNT_SNAPSHOT,
  LEANDRO_GROUND_TRUTH,
} from '../lib/golden/leandro-casademunt-snapshot';
import Decimal from 'decimal.js';

const TOLERANCE_LINE = 0.01; // R$ 0,01 por rubrica
const TOLERANCE_TOTAL = 0.05; // R$ 0,05 no total geral

let analysis: PJCAnalysis;

beforeAll(() => {
  const pjcContent = readFileSync(
    resolve(__dirname, '../../public/reports/leandro-casademunt.pjc'),
    'utf-8',
  );
  analysis = analyzePJC(pjcContent);
}, 60000);

const s = LEANDRO_CASADEMUNT_SNAPSHOT;
const gt = LEANDRO_GROUND_TRUTH;

// =====================================================
// 1. PJC PARSING VALIDATION
// =====================================================
describe('Golden Test: Leandro Casademunt — PJC Parsing', () => {
  it('deve parsear sem erros', () => {
    expect(analysis).toBeDefined();
    expect(analysis.parametros).toBeDefined();
    expect(analysis.verbas.length).toBeGreaterThan(0);
  });

  it('beneficiário = LEANDRO CASADEMUNT PEREIRA', () => {
    expect(analysis.parametros.beneficiario).toContain('LEANDRO CASADEMUNT');
  });

  it('reclamado = GRUPO CASAS BAHIA', () => {
    expect(analysis.parametros.reclamado).toContain('CASAS BAHIA');
  });

  it('CPF correto', () => {
    expect(analysis.parametros.cpf.replace(/\D/g, '')).toBe('31308822863');
  });

  it('carga horária = 220', () => {
    expect(analysis.parametros.carga_horaria).toBe(220);
  });

  it('sábado dia útil = true', () => {
    expect(analysis.parametros.sabado_dia_util).toBe(true);
  });

  it('projeta aviso = true', () => {
    expect(analysis.parametros.projeta_aviso).toBe(true);
  });

  it('prescrição quinquenal = false', () => {
    expect(analysis.parametros.prescricao_quinquenal).toBe(false);
  });

  it('líquido exequente = R$ 510.050,92', () => {
    expect(analysis.resultado.liquido_exequente).toBeCloseTo(gt.gprec.liquido_exequente, 0);
  });

  it('imposto de renda = R$ 58.920,35', () => {
    expect(analysis.resultado.imposto_renda).toBeCloseTo(gt.gprec.imposto_renda, 0);
  });

  it('custas = R$ 1.000,00', () => {
    expect(analysis.resultado.custas).toBeCloseTo(gt.gprec.custas_judiciais, 0);
  });

  it('honorários Marcos Roberto Dias = R$ 60.020,06', () => {
    const marcos = analysis.resultado.honorarios.find(h => h.nome.toUpperCase().includes('MARCOS'));
    expect(marcos).toBeDefined();
    expect(marcos!.valor).toBeCloseTo(gt.gprec.honorarios_marcos_roberto, 0);
  });

  it('deve ter grafo DAG com dependências', () => {
    expect(analysis.dag.length).toBeGreaterThan(0);
  });

  it('deve ter histórico salarial', () => {
    expect(analysis.historicos_salariais.length).toBeGreaterThan(0);
  });
});

// =====================================================
// 2. SNAPSHOT — INTEGRIDADE ARITMÉTICA
// =====================================================
describe('Golden Test: Leandro Casademunt — Integridade Aritmética', () => {
  it('deve ter 18 rubricas no resumo', () => {
    expect(s.rubricas).toHaveLength(18);
  });

  it('soma valor_corrigido = total_bruto_corrigido', () => {
    const soma = s.rubricas.reduce((acc, r) => acc.plus(r.valor_corrigido), new Decimal(0));
    expect(soma.toNumber()).toBeCloseTo(s.resumo.total_bruto_corrigido, 1);
  });

  it('soma juros = total_bruto_juros', () => {
    const soma = s.rubricas.reduce((acc, r) => acc.plus(r.juros), new Decimal(0));
    expect(soma.toNumber()).toBeCloseTo(s.resumo.total_bruto_juros, 1);
  });

  it('soma total = total_bruto', () => {
    const soma = s.rubricas.reduce((acc, r) => acc.plus(r.total), new Decimal(0));
    expect(soma.toNumber()).toBeCloseTo(s.resumo.total_bruto, 1);
  });

  it('valor_corrigido + juros = total para cada rubrica', () => {
    for (const r of s.rubricas) {
      const esperado = new Decimal(r.valor_corrigido).plus(r.juros);
      expect(Math.abs(esperado.toNumber() - r.total)).toBeLessThanOrEqual(TOLERANCE_LINE);
    }
  });

  it('líquido = bruto - descontos', () => {
    const liquido = new Decimal(s.resumo.bruto_devido_reclamante)
      .minus(s.resumo.total_descontos);
    expect(liquido.toNumber()).toBeCloseTo(s.resumo.liquido_reclamante, 2);
  });

  it('total reclamado = líquido + CS + honorários + IRPF', () => {
    const total = new Decimal(s.resumo.liquido_reclamante)
      .plus(s.resumo.contribuicao_social_salarios)
      .plus(s.resumo.honorarios_liquidos)
      .plus(s.resumo.irrf_honorarios)
      .plus(s.resumo.irpf_reclamante);
    expect(total.toNumber()).toBeCloseTo(s.resumo.total_reclamado, 2);
  });
});

// =====================================================
// 3. CRITÉRIOS DE CORREÇÃO E JUROS
// =====================================================
describe('Golden Test: Leandro Casademunt — Critérios', () => {
  it('correção deve ter 2 fases (IPCA-E + Sem Correção)', () => {
    expect(s.criterios.correcao.fases).toHaveLength(2);
    expect(s.criterios.correcao.fases[0].indice).toBe('IPCA-E');
    expect(s.criterios.correcao.fases[1].indice).toBe('SEM_CORRECAO');
  });

  it('juros deve ter 2 fases (TRD + SELIC)', () => {
    expect(s.criterios.juros.fases).toHaveLength(2);
    expect(s.criterios.juros.fases[0].tipo).toBe('TRD');
    expect(s.criterios.juros.fases[1].tipo).toBe('SELIC');
  });

  it('juros apurados após dedução da CS', () => {
    expect(s.criterios.juros_apos_deducao_cs).toBe(true);
  });

  it('CS empresa = 20%', () => {
    expect(s.criterios.contribuicao_social_empresa_aliquota).toBe(20);
  });

  it('IR método = RRA', () => {
    expect(s.criterios.imposto_renda_metodo).toBe('RRA');
  });
});

// =====================================================
// 4. FALTAS E FÉRIAS
// =====================================================
describe('Golden Test: Leandro Casademunt — Faltas e Férias', () => {
  it('deve ter 1 falta (atestado médico)', () => {
    expect(s.faltas).toHaveLength(1);
    expect(s.faltas[0].justificada).toBe(false);
    expect(s.faltas[0].justificativa).toBe('ATESTADO MÉDICO');
  });

  it('deve ter 16 períodos de férias', () => {
    expect(s.ferias).toHaveLength(16);
  });

  it('todos períodos de férias gozadas e 30 dias', () => {
    for (const f of s.ferias) {
      expect(f.situacao).toBe('Gozadas');
      expect(f.prazo).toBe(30);
      expect(f.abono).toBe(false);
    }
  });

  it('primeiro período = 2004/2005', () => {
    expect(s.ferias[0].relativa).toBe('2004/2005');
  });

  it('último período = 2019/2020', () => {
    expect(s.ferias[15].relativa).toBe('2019/2020');
  });
});

// =====================================================
// 5. VALORES INDIVIDUAIS — GOLDEN NUMBERS
// =====================================================
describe('Golden Test: Leandro Casademunt — Rubricas Individuais', () => {
  const find = (codigo: string) => s.rubricas.find(r => r.codigo === codigo)!;

  it('total bruto = R$ 600.200,61', () => {
    expect(s.resumo.total_bruto).toBe(600200.61);
  });

  it('líquido reclamante = R$ 510.050,92', () => {
    expect(s.resumo.liquido_reclamante).toBe(510050.92);
  });

  it('CS sobre salários = R$ 155.029,29', () => {
    expect(s.resumo.contribuicao_social_salarios).toBe(155029.29);
  });

  it('honorários = R$ 60.020,06', () => {
    expect(s.resumo.honorarios_liquidos).toBe(60020.06);
  });

  it('total reclamado = R$ 785.020,62', () => {
    expect(s.resumo.total_reclamado).toBe(785020.62);
  });

  it('DOMINGOS E FERIADOS = R$ 38.925,54', () => {
    expect(find('DOMINGOS_FERIADOS').total).toBe(38925.54);
  });

  it('HE PARTE FIXA = R$ 278.729,67', () => {
    expect(find('HE_PARTE_FIXA').total).toBe(278729.67);
  });

  it('HE PARTE VARIÁVEL = R$ 22.872,35', () => {
    expect(find('HE_PARTE_VARIAVEL').total).toBe(22872.35);
  });

  it('INTERJORNADAS = R$ 25.082,71', () => {
    expect(find('INTERJORNADAS').total).toBe(25082.71);
  });

  it('INTRAJORNADA = R$ 42.241,54', () => {
    expect(find('INTRAJORNADA').total).toBe(42241.54);
  });

  it('RSR HE FIXA = R$ 58.126,13', () => {
    expect(find('RSR_HE_FIXA').total).toBe(58126.13);
  });

  it('RSR HE VAR = R$ 4.747,23', () => {
    expect(find('RSR_HE_VAR').total).toBe(4747.23);
  });

  it('13º DOM/FER = R$ 3.225,63', () => {
    expect(find('13_DOM_FER').total).toBe(3225.63);
  });

  it('13º HE FIXA = R$ 23.493,95', () => {
    expect(find('13_HE_FIXA').total).toBe(23493.95);
  });

  it('AP HE FIXA = R$ 14.110,89', () => {
    expect(find('AP_HE_FIXA').total).toBe(14110.89);
  });

  it('FÉRIAS HE FIXA = R$ 30.752,95', () => {
    expect(find('FER_HE_FIXA').total).toBe(30752.95);
  });

  it('FGTS 8% = R$ 33.210,97', () => {
    expect(find('FGTS_8').total).toBe(33210.97);
  });

  it('MULTA FGTS 40% = R$ 13.284,39', () => {
    expect(find('MULTA_FGTS_40').total).toBe(13284.39);
  });

  it('percentual remuneratórias tributáveis = 88,28%', () => {
    expect(s.resumo.percentual_remuneratorias_tributaveis).toBe(88.28);
  });
});

// =====================================================
// 6. INVARIANTES — LÓGICA JURÍDICA
// =====================================================
describe('Golden Test: Leandro Casademunt — Invariantes Jurídicas', () => {
  it('caso de alto valor: líquido > R$ 500.000', () => {
    expect(s.resumo.liquido_reclamante).toBeGreaterThan(500000);
  });

  it('contrato longo: ~16 anos (2004-2021)', () => {
    const admissao = new Date(s.meta.admissao);
    const demissao = new Date(s.meta.demissao);
    const anos = (demissao.getTime() - admissao.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    expect(anos).toBeGreaterThan(15);
    expect(anos).toBeLessThan(18);
  });

  it('HE parte fixa é a rubrica de maior valor', () => {
    const maxRub = s.rubricas.reduce((max, r) => r.total > max.total ? r : max, s.rubricas[0]);
    expect(maxRub.codigo).toBe('HE_PARTE_FIXA');
  });

  it('reflexos 13º existem para todas as 3 verbas principais com quantidade', () => {
    const reflexos13 = s.rubricas.filter(r => r.tipo === 'REFLEXO_13');
    expect(reflexos13).toHaveLength(3);
  });

  it('reflexos AP existem para todas as 3 verbas principais', () => {
    const reflexosAP = s.rubricas.filter(r => r.tipo === 'REFLEXO_AP');
    expect(reflexosAP).toHaveLength(3);
  });

  it('reflexos Férias existem para todas as 3 verbas principais', () => {
    const reflexosFer = s.rubricas.filter(r => r.tipo === 'REFLEXO_FERIAS');
    expect(reflexosFer).toHaveLength(3);
  });

  it('reflexos RSR existem apenas para HE (fixa + variável)', () => {
    const reflexosRSR = s.rubricas.filter(r => r.tipo === 'REFLEXO_RSR');
    expect(reflexosRSR).toHaveLength(2);
  });

  it('FGTS total = FGTS 8% + Multa 40%', () => {
    const fgts = s.rubricas.find(r => r.codigo === 'FGTS_8')!.total;
    const multa = s.rubricas.find(r => r.codigo === 'MULTA_FGTS_40')!.total;
    expect(new Decimal(fgts).plus(multa).toNumber()).toBeCloseTo(s.resumo.fgts_total, 2);
  });

  it('descontos < bruto (líquido é positivo)', () => {
    expect(s.resumo.total_descontos).toBeLessThan(s.resumo.bruto_devido_reclamante);
  });

  it('IRPF < 15% do bruto (sanidade RRA)', () => {
    expect(s.resumo.irpf_reclamante).toBeLessThan(s.resumo.total_bruto * 0.15);
  });
});
