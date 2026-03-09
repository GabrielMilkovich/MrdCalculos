/**
 * GOLDEN TEST — Rosicléia Pereira Chaves vs Grupo Casas Bahia S.A.
 * Fonte: Arquivo .PJC real (rosicleia-pereira-chaves.pjc)
 * PJe-Calc v2.13.2
 *
 * Valida a integridade do snapshot e a existência de rubricas
 * exclusivas deste caso (Intrajornada Art. 71, Multa 477, Dif. Comissões).
 */
import { describe, it, expect } from 'vitest';
import { ROSICLEIA_SNAPSHOT } from '../lib/golden/rosicleia-snapshot';

describe('Golden Test: Rosicléia Pereira Chaves — Validação de Snapshot', () => {
  const s = ROSICLEIA_SNAPSHOT;

  it('deve ter metadados corretos do processo', () => {
    expect(s.meta.reclamante).toBe('ROSICLEIA PEREIRA CHAVES');
    expect(s.meta.reclamado).toBe('GRUPO CASAS BAHIA S.A.');
    expect(s.meta.carga_horaria).toBe(220);
    expect(s.meta.sabado_dia_util).toBe(true);
    expect(s.meta.admissao).toBe('2018-06-06');
    expect(s.meta.demissao).toBe('2024-07-04');
    expect(s.meta.pje_calc_version).toBe('2.13.2');
  });

  it('deve ter 0 faltas', () => {
    expect(s.faltas).toHaveLength(0);
  });

  it('deve ter 6 períodos de férias (5 gozadas + 1 indenizada)', () => {
    expect(s.ferias).toHaveLength(6);
    expect(s.ferias.filter(f => f.situacao === 'GOZADAS')).toHaveLength(5);
    expect(s.ferias.filter(f => f.situacao === 'INDENIZADAS')).toHaveLength(1);
  });

  it('deve conter 8 rubricas principais', () => {
    const principais = s.rubricas.filter(r => r.tipo === 'PRINCIPAL');
    expect(principais).toHaveLength(8);
  });

  it('deve conter rubrica INTRAJORNADA (Art. 71) com devido=6881.91', () => {
    const intrajornada = s.rubricas.find(r => r.codigo === 'INTRAJORNADA');
    expect(intrajornada).toBeDefined();
    expect(intrajornada!.total).toBe(6881.91);
  });

  it('deve conter reflexos da INTRAJORNADA (13º)', () => {
    const reflexo = s.rubricas.find(r => r.codigo === '13_INTRAJORNADA');
    expect(reflexo).toBeDefined();
    expect(reflexo!.total).toBe(6881.91);
  });

  it('deve conter rubrica INTERJORNADAS (Art. 66) com devido=392.05', () => {
    const interjornada = s.rubricas.find(r => r.codigo === 'INTERJORNADAS');
    expect(interjornada).toBeDefined();
    expect(interjornada!.total).toBe(392.05);
  });

  it('deve conter DIF. COMISSÕES CANCELADAS e PARCELADAS', () => {
    expect(s.rubricas.find(r => r.codigo === 'DIF_COMISSOES_CANCELADAS')!.total).toBe(7191.89);
    expect(s.rubricas.find(r => r.codigo === 'DIF_COMISSOES_PARCELADAS')!.total).toBe(36247.16);
  });

  it('deve conter PRÊMIO ESTÍMULO com devido=46143.22', () => {
    expect(s.rubricas.find(r => r.codigo === 'PREMIO_ESTIMULO')!.total).toBe(46143.22);
  });

  it('deve conter HORAS EXTRAS com devido=24247.17', () => {
    expect(s.rubricas.find(r => r.codigo === 'HORAS_EXTRAS')!.total).toBe(24247.17);
  });

  it('RSR COMISSIONISTA = diferença (devido - pago) = 8090.68', () => {
    expect(s.rubricas.find(r => r.codigo === 'RSR_COMISSIONISTA')!.total).toBe(8090.68);
  });

  describe('Valores-chave do resultado (Golden Numbers)', () => {
    it('líquido exequente = R$ 247.215,95', () => {
      expect(s.resumo.liquido_exequente).toBe(247215.95);
    });

    it('INSS reclamante = R$ 23.475,40', () => {
      expect(s.resumo.inss_reclamante).toBe(23475.40);
    });

    it('INSS reclamado = R$ 53.224,55', () => {
      expect(s.resumo.inss_reclamado).toBe(53224.55);
    });

    it('IR = R$ 4.185,26', () => {
      expect(s.resumo.imposto_renda).toBe(4185.26);
    });

    it('Honorários = R$ 26.886,93 (MARCOS ROBERTO DIAS)', () => {
      expect(s.resumo.honorarios_valor).toBe(26886.93);
      expect(s.resumo.honorarios_nome).toBe('MARCOS ROBERTO DIAS');
    });

    it('Custas = R$ 0,00', () => {
      expect(s.resumo.custas).toBe(0);
    });
  });

  describe('Contagem de reflexos por tipo', () => {
    it('8 reflexos de 13º salário', () => {
      expect(s.rubricas.filter(r => r.tipo === 'REFLEXO_13')).toHaveLength(8);
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
});
