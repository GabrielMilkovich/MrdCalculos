/**
 * GOLDEN TEST — Rosicléia Pereira Chaves
 * Fonte: Arquivo .PJC real (rosicleia-pereira-chaves.pjc)
 *
 * Valida a integridade do snapshot e a existência de rubricas
 * que são exclusivas deste caso (Intrajornada Art. 71, Multa 477).
 */
import { describe, it, expect } from 'vitest';
import { ROSICLEIA_SNAPSHOT } from '../lib/golden/rosicleia-snapshot';

describe('Golden Test: Rosicléia Pereira Chaves — Validação de Snapshot', () => {
  const s = ROSICLEIA_SNAPSHOT;

  it('deve ter metadados do processo', () => {
    expect(s.meta.reclamante).toBe('ROSICLÉIA PEREIRA CHAVES');
    expect(s.meta.carga_horaria).toBe(220);
    expect(s.meta.sabado_dia_util).toBe(true);
  });

  it('deve conter rubrica INTRAJORNADA (Art. 71)', () => {
    const intrajornada = s.rubricas.find(r => r.codigo === 'INTRAJORNADA');
    expect(intrajornada).toBeDefined();
    expect(intrajornada!.descricao).toContain('INTRAJORNADA');
  });

  it('deve conter reflexos da INTRAJORNADA', () => {
    const reflexos = s.rubricas.filter(r => r.rubrica_principal === 'INTRAJORNADA');
    expect(reflexos.length).toBeGreaterThanOrEqual(3); // 13º, Férias, RSR
  });

  it('deve conter rubrica INTERJORNADAS (Art. 66)', () => {
    const interjornada = s.rubricas.find(r => r.codigo === 'INTERJORNADAS');
    expect(interjornada).toBeDefined();
  });

  it('deve conter MULTA 477 CLT', () => {
    const multa = s.rubricas.find(r => r.codigo === 'MULTA_477');
    expect(multa).toBeDefined();
  });

  it('deve conter FGTS 8% e Multa 40%', () => {
    expect(s.rubricas.find(r => r.codigo === 'FGTS_8')).toBeDefined();
    expect(s.rubricas.find(r => r.codigo === 'MULTA_FGTS_40')).toBeDefined();
  });

  describe('Valores-chave do resultado (Golden Numbers)', () => {
    it('líquido exequente = R$ 247.215,95', () => {
      expect(s.resumo.liquido_exequente).toBe(247215.95);
    });

    it('INSS reclamante = R$ 23.475,40', () => {
      expect(s.resumo.inss_reclamante).toBe(23475.40);
    });

    it('IR = R$ 4.185,26', () => {
      expect(s.resumo.imposto_renda).toBe(4185.26);
    });

    it('total_descontos = INSS + IR', () => {
      expect(s.resumo.total_descontos).toBeCloseTo(
        s.resumo.inss_reclamante + s.resumo.imposto_renda,
        2
      );
    });
  });

  describe('Integridade aritmética das rubricas', () => {
    it('valor_corrigido + juros = total para cada rubrica', () => {
      for (const r of s.rubricas) {
        if (r.total > 0) {
          const esperado = r.valor_corrigido + r.juros;
          expect(Math.abs(esperado - r.total)).toBeLessThanOrEqual(0.01);
        }
      }
    });
  });
});
