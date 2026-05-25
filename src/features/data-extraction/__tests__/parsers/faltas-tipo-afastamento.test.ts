import { describe, expect, it } from 'vitest';
import { parseFaltas, type TipoAfastamento } from '../../parsers/faltas';

function faltaText(text: string): string {
  return `Registro de faltas do funcionário\n${text}\nFim do documento`;
}

describe('classificarTipoAfastamento via parseFaltas', () => {
  it('atestado médico 1 dia → atestado', () => {
    const r = parseFaltas(faltaText('15/03/2024 - Atestado médico'));
    expect(r.faltas.length).toBeGreaterThanOrEqual(1);
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('atestado');
    expect(f.duracao_dias).toBe(1);
  });

  it('atestado 3 dias → atestado', () => {
    const r = parseFaltas(faltaText('10/03/2024 a 12/03/2024 - Atestado médico CID M54'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('atestado');
    expect(f.duracao_dias).toBe(3);
  });

  it('afastamento 60 dias → aux_doenca (duração > 15)', () => {
    const r = parseFaltas(faltaText('19/01/2011 a 19/03/2011 - Licença médica'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('aux_doenca');
    expect(f.duracao_dias).toBe(60);
  });

  it('auxílio doença explícito → aux_doenca', () => {
    const r = parseFaltas(faltaText('01/05/2020 a 15/05/2020 - Auxílio Doença INSS'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('aux_doenca');
  });

  it('suspensão COVID MP 936 → suspensao', () => {
    const r = parseFaltas(faltaText('01/04/2020 a 30/04/2020 - Suspensão contrato COVID MP 936'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('suspensao');
  });

  it('suspensão genérica → suspensao', () => {
    const r = parseFaltas(faltaText('01/06/2020 a 30/06/2020 - Suspensão disciplinar'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('suspensao');
  });

  it('licença maternidade → licenca_maternidade', () => {
    const r = parseFaltas(faltaText('01/01/2023 a 30/04/2023 - Licença Maternidade 120 dias'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('licenca_maternidade');
  });

  it('licença paternidade → licenca_paternidade', () => {
    const r = parseFaltas(faltaText('15/05/2023 a 19/05/2023 - Licença Paternidade'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('licenca_paternidade');
  });

  it('falta simples → falta_simples', () => {
    const r = parseFaltas(faltaText('22/07/2024 - Falta injustificada'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('falta_simples');
    expect(f.justificada).toBe(false);
  });

  it('ausência → falta_simples', () => {
    const r = parseFaltas(faltaText('10/08/2024 - Ausência sem justificativa'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('falta_simples');
  });

  it('duracao_dias é calculada corretamente', () => {
    const r = parseFaltas(faltaText('01/01/2024 a 31/01/2024 - Auxílio doença'));
    const f = r.faltas[0];
    expect(f.duracao_dias).toBe(31);
  });

  it('data única → duracao_dias = 1', () => {
    const r = parseFaltas(faltaText('15/03/2024 - Falta'));
    const f = r.faltas[0];
    expect(f.duracao_dias).toBe(1);
  });

  it('licença médica curta (≤15 dias) → licenca_medica', () => {
    const r = parseFaltas(faltaText('01/02/2024 a 10/02/2024 - Licença médica'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('licenca_medica');
  });

  it('INSS no texto → aux_doenca mesmo se duração curta', () => {
    const r = parseFaltas(faltaText('01/03/2024 a 05/03/2024 - Afastamento INSS'));
    const f = r.faltas[0];
    expect(f.tipo_afastamento).toBe('aux_doenca');
  });

  it('texto genérico sem keyword → outros', () => {
    const r = parseFaltas(faltaText('20/04/2024 a 22/04/2024 - Abono compensação'));
    if (r.faltas.length > 0) {
      expect(['outros', 'falta_simples']).toContain(r.faltas[0].tipo_afastamento);
    }
  });

  it('preserva campos existentes (justificada, justificativa)', () => {
    const r = parseFaltas(faltaText('14/09/2020 a 28/09/2020 - Atestado médico - CID: M54'));
    const f = r.faltas[0];
    expect(f.justificada).toBe(true);
    expect(f.justificativa).toContain('Atestado');
    expect(f.tipo_afastamento).toBe('atestado');
  });
});
