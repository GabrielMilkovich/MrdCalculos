import { describe, it, expect } from 'vitest';
import {
  detectarBatidasImpares,
  detectarProblemaRelogio,
  detectarAlertas,
  contarBatidas,
} from '../alertas-apuracao';

describe('contarBatidas', () => {
  it('conta slots não-vazios', () => {
    expect(contarBatidas([{ e: '08:00', s: '12:00' }, { e: '13:00', s: '17:00' }])).toBe(4);
    expect(contarBatidas([{ e: '08:00', s: '' }])).toBe(1);
    expect(contarBatidas([{ e: '08:00', s: '12:00' }, { e: '13:00', s: '' }])).toBe(3);
    expect(contarBatidas([])).toBe(0);
  });

  it('ignora strings só com espaços', () => {
    expect(contarBatidas([{ e: '  ', s: '12:00' }])).toBe(1);
  });
});

describe('detectarBatidasImpares', () => {
  it('0 batidas → null', () => {
    expect(detectarBatidasImpares([])).toBeNull();
  });

  it('2 batidas → null', () => {
    expect(detectarBatidasImpares([{ e: '08:00', s: '17:00' }])).toBeNull();
  });

  it('4 batidas → null', () => {
    expect(detectarBatidasImpares([{ e: '08:00', s: '12:00' }, { e: '13:00', s: '17:00' }])).toBeNull();
  });

  it('1 batida → alerta', () => {
    const a = detectarBatidasImpares([{ e: '08:00', s: '' }])!;
    expect(a.tipo).toBe('BATIDAS_IMPARES');
    expect(a.severidade).toBe('warning');
    expect(a.detalhes?.batidas_count).toBe(1);
  });

  it('3 batidas → alerta', () => {
    const a = detectarBatidasImpares([{ e: '08:00', s: '12:00' }, { e: '13:00', s: '' }])!;
    expect(a.tipo).toBe('BATIDAS_IMPARES');
    expect(a.detalhes?.batidas_count).toBe(3);
  });

  it('5 batidas → alerta', () => {
    const m = [{ e: '08:00', s: '10:00' }, { e: '10:30', s: '12:00' }, { e: '13:00', s: '' }];
    expect(detectarBatidasImpares(m)!.detalhes?.batidas_count).toBe(5);
  });

  it('6 batidas → null', () => {
    const m = [{ e: '08:00', s: '10:00' }, { e: '10:30', s: '12:00' }, { e: '13:00', s: '17:00' }];
    expect(detectarBatidasImpares(m)).toBeNull();
  });
});

describe('detectarProblemaRelogio', () => {
  it.each([
    'Problemas Relogio',
    'PROBLEMAS RELÓGIO',
    'Relogio Quebrado',
    'Relógio Quebrado',
    'Relogio com Defeito',
    'Relógio com defeito no setor',
    'Rel. Quebrado',
    'REL.QUEBRADO no dia',
    'Sem Marcação do Relógio',
    'Lançamento Manual de Ponto pelo gestor',
  ])('detecta padrão: %s', (texto) => {
    const a = detectarProblemaRelogio([texto]);
    expect(a).not.toBeNull();
    expect(a!.tipo).toBe('RELOGIO_QUEBRADO');
  });

  it('texto neutro → null', () => {
    expect(detectarProblemaRelogio(['Horas Trabalhadas: 8:48'])).toBeNull();
    expect(detectarProblemaRelogio(['Banco de Horas Acumulado'])).toBeNull();
    expect(detectarProblemaRelogio([null, undefined, ''])).toBeNull();
  });

  it('preenche detalhes.padrao', () => {
    const a = detectarProblemaRelogio(['Problemas Relogio no dia 15'])!;
    expect(a.detalhes?.padrao).toBe('Problemas Relógio');
  });

  it('casa em qualquer texto passado', () => {
    const a = detectarProblemaRelogio([null, 'ok', 'Relógio Quebrado'])!;
    expect(a.detalhes?.padrao).toBe('Relógio Quebrado');
  });
});

describe('detectarAlertas (combinado)', () => {
  it('3 batidas + problema relógio → 2 alertas', () => {
    const m = [{ e: '08:00', s: '12:00' }, { e: '13:00', s: '' }];
    const alertas = detectarAlertas(m, ['Problemas Relogio']);
    expect(alertas).toHaveLength(2);
    expect(alertas.map(a => a.tipo).sort()).toEqual(['BATIDAS_IMPARES', 'RELOGIO_QUEBRADO']);
  });

  it('dia normal → array vazio', () => {
    const m = [{ e: '08:00', s: '12:00' }, { e: '13:00', s: '17:00' }];
    expect(detectarAlertas(m, ['Horas Trab 8:00'])).toEqual([]);
  });
});
