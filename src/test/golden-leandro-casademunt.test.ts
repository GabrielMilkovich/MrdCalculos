/**
 * GOLDEN TEST — Leandro Casademunt Pereira vs Grupo Casas Bahia S.A.
 * Processo: 0011350-60.2025.5.15.0003
 *
 * Caso de alto valor (R$ 510k), contrato longo (~16 anos),
 * Domingos e Feriados Laborados com quantidade do calendário,
 * Reflexos MEDIA_PELA_QUANTIDADE, IR RRA significativo.
 *
 * Valida o parser PJC e os totais contra o ground truth.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';
import { LEANDRO_GROUND_TRUTH } from '../lib/golden/leandro-casademunt-snapshot';

let analysis: PJCAnalysis;

beforeAll(() => {
  const pjcContent = readFileSync(
    resolve(__dirname, '../../public/reports/leandro-casademunt.pjc'),
    'utf-8',
  );
  analysis = analyzePJC(pjcContent);
}, 60000);

describe('Golden Test: Leandro Casademunt — PJC Parsing', () => {
  const gt = LEANDRO_GROUND_TRUTH;

  it('deve parsear sem erros', () => {
    expect(analysis).toBeDefined();
    expect(analysis.parametros).toBeDefined();
    expect(analysis.verbas.length).toBeGreaterThan(0);
  });

  describe('Parâmetros do contrato', () => {
    it('beneficiário = LEANDRO CASADEMUNT PEREIRA', () => {
      expect(analysis.parametros.beneficiario).toContain('LEANDRO CASADEMUNT');
    });

    it('reclamado = GRUPO CASAS BAHIA', () => {
      expect(analysis.parametros.reclamado).toContain('CASAS BAHIA');
    });

    it('CPF = 313.088.228-63', () => {
      const cpfClean = analysis.parametros.cpf.replace(/\D/g, '');
      expect(cpfClean).toBe('31308822863');
    });

    it('CNPJ = 33.041.260/0001-64', () => {
      expect(analysis.parametros.cnpj).toContain('33041260000164');
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

    it('regime = INTEGRAL', () => {
      expect(analysis.parametros.regime).toBe('INTEGRAL');
    });

    it('versão do sistema = 2.13.0', () => {
      expect(analysis.parametros.versao_sistema).toBe('2.13.0');
    });

    it('datas de admissão e demissão presentes', () => {
      expect(analysis.parametros.admissao).toBeTruthy();
      expect(analysis.parametros.demissao).toBeTruthy();
    });
  });

  describe('Resultados financeiros (Ground Truth)', () => {
    it('líquido exequente = R$ 510.050,92', () => {
      expect(analysis.resultado.liquido_exequente).toBeCloseTo(gt.gprec.liquido_exequente, 0);
    });

    it('INSS reclamante (dadosEstruturados) = R$ 46.218,89', () => {
      expect(analysis.resultado.inss_reclamante).toBeCloseTo(gt.estruturado.inss_reclamante, 0);
    });

    it('INSS reclamado (dadosEstruturados) = R$ 108.810,40', () => {
      expect(analysis.resultado.inss_reclamado).toBeCloseTo(gt.estruturado.inss_reclamado, 0);
    });

    it('imposto de renda = R$ 58.920,35', () => {
      expect(analysis.resultado.imposto_renda).toBeCloseTo(gt.gprec.imposto_renda, 0);
    });

    it('custas = R$ 1.000,00', () => {
      expect(analysis.resultado.custas).toBeCloseTo(gt.gprec.custas_judiciais, 0);
    });

    it('FGTS depósito = R$ 0', () => {
      expect(analysis.resultado.fgts_deposito).toBe(0);
    });
  });

  describe('Honorários', () => {
    it('deve ter honorários para Marcos Roberto Dias', () => {
      expect(analysis.resultado.honorarios.length).toBeGreaterThan(0);
      const marcos = analysis.resultado.honorarios.find(h =>
        h.nome.toUpperCase().includes('MARCOS'),
      );
      expect(marcos).toBeDefined();
      if (marcos) {
        expect(marcos.valor).toBeCloseTo(gt.gprec.honorarios_marcos_roberto, 0);
      }
    });
  });

  describe('Verbas', () => {
    it('deve ter múltiplas verbas', () => {
      expect(analysis.verbas.length).toBeGreaterThanOrEqual(2);
    });

    it('deve conter DOMINGOS E FERIADOS LABORADOS', () => {
      const domFer = analysis.verbas.find(v =>
        v.nome.toUpperCase().includes('DOMINGOS') && v.nome.toUpperCase().includes('FERIADOS'),
      );
      expect(domFer).toBeDefined();
      if (domFer) {
        expect(domFer.tipo).toBe('Calculada');
        expect(domFer.variacao).toBe('VARIAVEL');
        expect(domFer.formula.divisor.valor).toBe(30);
        expect(domFer.formula.multiplicador.valor).toBe(2);
      }
    });

    it('deve conter 13º SALÁRIO reflexo com MEDIA_PELA_QUANTIDADE', () => {
      const reflexo13 = analysis.verbas.find(
        v => v.tipo === 'Reflexo' && v.nome.toUpperCase().includes('13'),
      );
      expect(reflexo13).toBeDefined();
      if (reflexo13) {
        expect(reflexo13.comportamento_reflexo).toBe('MEDIA_PELA_QUANTIDADE');
      }
    });
  });

  describe('DAG de dependências', () => {
    it('deve extrair grafo de dependências', () => {
      expect(analysis.dag.length).toBeGreaterThan(0);
    });

    it('reflexo 13º deve depender de verba principal', () => {
      const reflexo13 = analysis.dag.find(d => d.nome.toUpperCase().includes('13'));
      if (reflexo13) {
        expect(reflexo13.depende_de.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Histórico salarial', () => {
    it('deve ter entradas de histórico salarial', () => {
      expect(analysis.historicos_salariais.length).toBeGreaterThan(0);
    });
  });

  describe('Invariantes matemáticas', () => {
    it('líquido deve ser > 0', () => {
      expect(analysis.resultado.liquido_exequente).toBeGreaterThan(0);
    });

    it('INSS reclamante deve ser < líquido', () => {
      expect(analysis.resultado.inss_reclamante).toBeLessThan(
        analysis.resultado.liquido_exequente,
      );
    });

    it('IR deve ser < líquido', () => {
      expect(analysis.resultado.imposto_renda).toBeLessThan(
        analysis.resultado.liquido_exequente,
      );
    });

    it('caso de alto valor: líquido > R$ 500.000', () => {
      expect(analysis.resultado.liquido_exequente).toBeGreaterThan(500000);
    });

    it('contrato longo: admissão ~2004, demissão ~2021', () => {
      expect(analysis.parametros.admissao).toContain('2004');
      expect(analysis.parametros.demissao).toContain('2021');
    });
  });
});
