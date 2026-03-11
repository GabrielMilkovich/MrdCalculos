/**
 * GOLDEN TEST — Rosicléia Pereira Chaves vs Grupo Casas Bahia S.A.
 * Fonte: Relatório PDF oficial do PJe-Calc Cidadão v2.13.2
 * Processo: 0010736-65.2025.5.03.0140 | Cálculo: 577
 * Liquidado em 28/08/2025
 *
 * Valida integridade do snapshot contra o relatório PDF real,
 * incluindo valores corrigidos, juros e totais de todas as rubricas.
 */
import { describe, it, expect } from 'vitest';
import { ROSICLEIA_SNAPSHOT } from '../lib/golden/rosicleia-snapshot';

describe('Golden Test: Rosicléia Pereira Chaves — Validação contra PDF Oficial', () => {
  const s = ROSICLEIA_SNAPSHOT;

  describe('Metadados do processo', () => {
    it('deve ter processo, partes e datas corretas', () => {
      expect(s.meta.processo).toBe('0010736-65.2025.5.03.0140');
      expect(s.meta.reclamante).toBe('ROSICLEIA PEREIRA CHAVES');
      expect(s.meta.reclamado).toBe('GRUPO CASAS BAHIA S.A.');
      expect(s.meta.admissao).toBe('2018-06-06');
      expect(s.meta.demissao).toBe('2024-07-04');
      expect(s.meta.ajuizamento).toBe('2024-08-07');
      expect(s.meta.data_liquidacao).toBe('2025-08-31');
      expect(s.meta.pje_calc_version).toBe('2.13.2');
    });

    it('deve ter período de cálculo correto', () => {
      expect(s.meta.inicio_calculo).toBe('2019-08-07');
      expect(s.meta.termino_calculo).toBe('2024-07-04');
    });

    it('deve ter parâmetros de configuração corretos', () => {
      expect(s.meta.carga_horaria).toBe(220);
      expect(s.meta.sabado_dia_util).toBe(true);
      expect(s.meta.projeta_aviso).toBe(true);
      expect(s.meta.estado).toBe('MG');
      expect(s.meta.municipio).toBe('BELO HORIZONTE');
      expect(s.meta.maior_remuneracao).toBe(3000);
      expect(s.meta.prescricao_quinquenal).toBe(false);
    });

    it('deve ter regime de correção em 3 fases', () => {
      expect(s.meta.correcao_fases).toHaveLength(3);
      expect(s.meta.correcao_fases[0].indice).toBe('IPCA-E');
      expect(s.meta.correcao_fases[1].indice).toBe('Sem Correção');
      expect(s.meta.correcao_fases[2].indice).toBe('IPCA');
    });

    it('deve ter regime de juros em 3 fases', () => {
      expect(s.meta.juros_fases).toHaveLength(3);
      expect(s.meta.juros_fases[0].tipo).toBe('TRD');
      expect(s.meta.juros_fases[1].tipo).toBe('SELIC');
      expect(s.meta.juros_fases[2].tipo).toBe('Taxa Legal');
    });
  });

  describe('Faltas e Férias', () => {
    it('deve ter 1 falta (licença maternidade)', () => {
      expect(s.faltas).toHaveLength(1);
      expect(s.faltas[0].justificativa).toBe('LICENÇA MATERNIDADE');
      expect(s.faltas[0].inicio).toBe('2023-01-16');
      expect(s.faltas[0].fim).toBe('2023-07-14');
    });

    it('deve ter 6 períodos de férias (5 gozadas + 1 indenizada)', () => {
      expect(s.ferias).toHaveLength(6);
      expect(s.ferias.filter(f => f.situacao === 'GOZADAS')).toHaveLength(5);
      expect(s.ferias.filter(f => f.situacao === 'INDENIZADAS')).toHaveLength(1);
    });
  });

  describe('Rubricas principais — valores corrigidos do PDF', () => {
    it('DIF. COMISSÕES CANCELADAS: corrigido=8729.46, juros=757.61, total=9487.07', () => {
      const r = s.rubricas.find(r => r.codigo === 'DIF_COMISSOES_CANCELADAS')!;
      expect(r.valor_corrigido).toBe(8729.46);
      expect(r.juros).toBe(757.61);
      expect(r.total).toBe(9487.07);
    });

    it('DIF. COMISSÕES PARCELADAS: corrigido=43996.80, juros=3818.36, total=47815.16', () => {
      const r = s.rubricas.find(r => r.codigo === 'DIF_COMISSOES_PARCELADAS')!;
      expect(r.valor_corrigido).toBe(43996.80);
      expect(r.juros).toBe(3818.36);
      expect(r.total).toBe(47815.16);
    });

    it('PRÊMIO ESTÍMULO: corrigido=56008.60, juros=4860.85, total=60869.45', () => {
      const r = s.rubricas.find(r => r.codigo === 'PREMIO_ESTIMULO')!;
      expect(r.valor_corrigido).toBe(56008.60);
      expect(r.juros).toBe(4860.85);
      expect(r.total).toBe(60869.45);
    });

    it('FERIADOS LABORADOS: corrigido=5340.73, juros=453.33, total=5794.06', () => {
      const r = s.rubricas.find(r => r.codigo === 'FERIADOS_LABORADOS')!;
      expect(r.valor_corrigido).toBe(5340.73);
      expect(r.juros).toBe(453.33);
      expect(r.total).toBe(5794.06);
    });

    it('HORAS EXTRAS: corrigido=29724.94, juros=2609.46, total=32334.40', () => {
      const r = s.rubricas.find(r => r.codigo === 'HORAS_EXTRAS')!;
      expect(r.valor_corrigido).toBe(29724.94);
      expect(r.juros).toBe(2609.46);
      expect(r.total).toBe(32334.40);
    });

    it('RSR COMISSIONISTA: corrigido=10020.90, juros=830.89, total=10851.79', () => {
      const r = s.rubricas.find(r => r.codigo === 'RSR_COMISSIONISTA')!;
      expect(r.valor_corrigido).toBe(10020.90);
      expect(r.juros).toBe(830.89);
      expect(r.total).toBe(10851.79);
    });

    it('INTERJORNADAS: corrigido=522.44, juros=47.78, total=570.22', () => {
      const r = s.rubricas.find(r => r.codigo === 'INTERJORNADAS')!;
      expect(r.valor_corrigido).toBe(522.44);
      expect(r.juros).toBe(47.78);
      expect(r.total).toBe(570.22);
    });

    it('INTRAJORNADA: corrigido=8469.93, juros=750.10, total=9220.03', () => {
      const r = s.rubricas.find(r => r.codigo === 'INTRAJORNADA')!;
      expect(r.valor_corrigido).toBe(8469.93);
      expect(r.juros).toBe(750.10);
      expect(r.total).toBe(9220.03);
    });
  });

  describe('Contagem de reflexos por tipo', () => {
    it('6 reflexos de 13º salário', () => {
      expect(s.rubricas.filter(r => r.tipo === 'REFLEXO_13')).toHaveLength(6);
    });

    it('6 reflexos de aviso prévio', () => {
      expect(s.rubricas.filter(r => r.tipo === 'REFLEXO_AP')).toHaveLength(6);
    });

    it('6 reflexos de férias', () => {
      expect(s.rubricas.filter(r => r.tipo === 'REFLEXO_FERIAS')).toHaveLength(6);
    });

    it('4 reflexos de RSR', () => {
      expect(s.rubricas.filter(r => r.tipo === 'REFLEXO_RSR')).toHaveLength(4);
    });
  });

  describe('FGTS como rubrica do bruto', () => {
    it('FGTS 8%: corrigido=13060.11, juros=1229.44, total=14289.55', () => {
      const r = s.rubricas.find(r => r.codigo === 'FGTS_8')!;
      expect(r).toBeDefined();
      expect(r.valor_corrigido).toBe(13060.11);
      expect(r.juros).toBe(1229.44);
      expect(r.total).toBe(14289.55);
    });

    it('MULTA FGTS 40%: corrigido=5210.03, juros=348.20, total=5558.23', () => {
      const r = s.rubricas.find(r => r.codigo === 'MULTA_FGTS_40')!;
      expect(r).toBeDefined();
      expect(r.valor_corrigido).toBe(5210.03);
      expect(r.juros).toBe(348.20);
      expect(r.total).toBe(5558.23);
    });
  });

  describe('Valores-chave do resultado (Golden Numbers)', () => {
    it('bruto total = R$ 268.869,31', () => {
      expect(s.resumo.bruto_total).toBe(268869.31);
    });

    it('total valor corrigido = R$ 247.549,59', () => {
      expect(s.resumo.total_valor_corrigido).toBe(247549.59);
    });

    it('total juros = R$ 21.319,72', () => {
      expect(s.resumo.total_juros).toBe(21319.72);
    });

    it('líquido exequente = R$ 247.215,95', () => {
      expect(s.resumo.liquido_exequente).toBe(247215.95);
    });

    it('FGTS total = R$ 19.847,78', () => {
      expect(s.resumo.fgts_total).toBe(19847.78);
    });

    it('CS total = R$ 76.699,95', () => {
      expect(s.resumo.cs_total).toBe(76699.95);
    });

    it('IR = R$ 4.185,26', () => {
      expect(s.resumo.imposto_renda).toBe(4185.26);
    });

    it('Total descontos = R$ 21.653,36', () => {
      expect(s.resumo.total_descontos).toBe(21653.36);
    });

    it('Honorários = R$ 26.886,93 (MARCOS ROBERTO DIAS)', () => {
      expect(s.resumo.honorarios_valor).toBe(26886.93);
      expect(s.resumo.honorarios_nome).toBe('MARCOS ROBERTO DIAS');
    });

    it('Total devido pelo reclamado = R$ 354.988,09', () => {
      expect(s.resumo.total_reclamado).toBe(354988.09);
    });

    it('Percentual remuneratório = 88,39%', () => {
      expect(s.meta.percentual_remuneratorio).toBe(88.39);
    });
  });

  describe('Consistência interna do snapshot', () => {
    it('soma dos totais das rubricas deve igualar bruto_total', () => {
      const soma = s.rubricas.reduce((acc, r) => acc + r.total, 0);
      expect(Math.abs(soma - s.resumo.bruto_total)).toBeLessThan(0.02);
    });

    it('soma dos valor_corrigido deve igualar total_valor_corrigido', () => {
      const soma = s.rubricas.reduce((acc, r) => acc + r.valor_corrigido, 0);
      expect(Math.abs(soma - s.resumo.total_valor_corrigido)).toBeLessThan(0.02);
    });

    it('soma dos juros deve igualar total_juros', () => {
      const soma = s.rubricas.reduce((acc, r) => acc + r.juros, 0);
      expect(Math.abs(soma - s.resumo.total_juros)).toBeLessThan(0.02);
    });

    it('total = valor_corrigido + juros para cada rubrica', () => {
      for (const r of s.rubricas) {
        expect(Math.abs(r.total - (r.valor_corrigido + r.juros))).toBeLessThan(0.02);
      }
    });
  });
});
