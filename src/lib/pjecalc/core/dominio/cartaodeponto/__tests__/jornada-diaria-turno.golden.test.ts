/**
 * JornadaDiaria.Turno — getQuantidadeHorasTrabalhadas (Fase 4)
 *
 * Porte 1-a-1 de JornadaDiaria.Turno.java:211-213.
 * O método é alias de `getDuracaoMillis()` quando diurnas e noturnas não
 * se sobrepõem — a decomposição completa via `calcularQuantidadeHorasDiurnas`
 * depende de refatoração do Turno para usar `Date` (em vez de `Decimal`),
 * postergada para sessão futura (ver comentário inline na classe).
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { Turno } from '../jornada-diaria';

describe('Turno.getQuantidadeHorasTrabalhadas', () => {
  it('turno diurno 08:00-17:00 → 9h em millis', () => {
    const entrada = new Decimal(8 * 3600 * 1000);
    const saida = new Decimal(17 * 3600 * 1000);
    const t = new Turno(entrada, saida);
    expect(t.getQuantidadeHorasTrabalhadas().toString()).toBe(String(9 * 3600 * 1000));
  });

  it('turno curto 10:00-12:00 → 2h', () => {
    const entrada = new Decimal(10 * 3600 * 1000);
    const saida = new Decimal(12 * 3600 * 1000);
    const t = new Turno(entrada, saida);
    expect(t.getQuantidadeHorasTrabalhadas().toString()).toBe(String(2 * 3600 * 1000));
  });

  it('turno zero 08:00-08:00 → 0', () => {
    const entrada = new Decimal(8 * 3600 * 1000);
    const t = new Turno(entrada, entrada);
    expect(t.getQuantidadeHorasTrabalhadas().toString()).toBe('0');
  });

  it('coincide com getDuracaoMillis (identidade algébrica)', () => {
    const t = new Turno(new Decimal(32400000), new Decimal(43200000));
    expect(t.getQuantidadeHorasTrabalhadas().toString())
      .toBe(t.getDuracaoMillis().toString());
  });
});
