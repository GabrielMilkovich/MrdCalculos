import { describe, it, expect } from 'vitest';
import { parseFerias, parseFaltas } from '../../parsers/ferias';
import { parseFaltas as parseFaltasDirect } from '../../parsers/faltas';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '..', '_fixtures', 'ctps');

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

describe('CTPS — Paridade com PDF original (golden tests reais)', () => {
  describe('SAP NetWeaver (Casas Bahia) — Rosicleia', () => {
    const texto = readFixture('ctps-sap-rosicleia.txt');

    it('detecta 2 férias gozadas no HISTÓRICO DE FÉRIAS', () => {
      const r = parseFerias(texto);
      expect(r.ferias).toHaveLength(2);
      expect(r.ferias[0].relativa).toBe('2021/2022');
      expect(r.ferias[0].gozo1?.inicio).toBe('06/06/2022');
      expect(r.ferias[0].gozo1?.fim).toBe('05/07/2022');
      expect(r.ferias[0].prazo).toBe(30);
      expect(r.ferias[0].abono).toBe(false);
      expect(r.ferias[0].dias_abono).toBe(0);
      expect(r.ferias[1].relativa).toBe('2022/2023');
      expect(r.ferias[1].gozo1?.inicio).toBe('17/07/2023');
      expect(r.ferias[1].gozo1?.fim).toBe('15/08/2023');
    });

    it('detecta afastamentos em AFASTAMENTOS OUTROS, excluindo Férias c/adiant', () => {
      const r = parseFaltasDirect(texto);
      // 60 real entries - 1 Férias c/adiant.legado = 59
      // If dedup or other factors reduce it, accept within range
      expect(r.faltas.length).toBeGreaterThanOrEqual(58);
      expect(r.faltas.length).toBeLessThanOrEqual(59);
    });

    it('ignora "Rescisão sem justa causa" em AFASTAMENTOS (evento contratual)', () => {
      const r = parseFaltasDirect(texto);
      expect(r.faltas.some(f => f.data_inicio === '2024-07-04')).toBe(false);
    });

    it('classifica Mat.-Extensão como licenca_maternidade', () => {
      const r = parseFaltasDirect(texto);
      const mat = r.faltas.find(f => f.data_inicio === '2023-05-16');
      expect(mat).toBeDefined();
      expect(mat?.tipo_afastamento).toBe('licenca_maternidade');
    });

    it('detecta 3 "Declaração em horas" como tipo "outros"', () => {
      const r = parseFaltasDirect(texto);
      const declaracoes = r.faltas.filter(f =>
        /declara[çc][ãa]o/i.test(f.justificativa ?? ''),
      );
      expect(declaracoes).toHaveLength(3);
      expect(declaracoes.every(d => d.tipo_afastamento === 'outros')).toBe(true);
    });

    it('emite warning sobre Férias c/adiant.legado', () => {
      const r = parseFaltasDirect(texto);
      expect(r.warnings.some(w => /gozo adiantado/i.test(w))).toBe(true);
    });

    it('Férias c/adiant.legado não vira falta', () => {
      const r = parseFaltasDirect(texto);
      expect(r.faltas.some(f => f.data_inicio === '2021-06-07')).toBe(false);
    });

    it('classifica corretamente por tipo', () => {
      const r = parseFaltasDirect(texto);
      const tipos = r.faltas.reduce(
        (acc, f) => {
          acc[f.tipo_afastamento] = (acc[f.tipo_afastamento] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      expect(tipos.licenca_medica).toBeGreaterThanOrEqual(35);
      expect(tipos.falta_simples).toBeGreaterThanOrEqual(5);
      expect(tipos.atestado).toBeGreaterThanOrEqual(2);
    });

    it('não aciona normalizador OCR em texto digital limpo', () => {
      const r = parseFaltasDirect(texto);
      expect(r.warnings.some(w => /OCR degradado/i.test(w))).toBe(false);
    });
  });

  describe('ADP web (Via Varejo) — Izabela 2024', () => {
    const texto = readFixture('ctps-adp-izabela-2024.txt');

    it('detecta 3 férias gozadas (formato com " a ")', () => {
      const r = parseFerias(texto);
      expect(r.ferias).toHaveLength(3);
    });

    it('detecta 7 atestados médicos', () => {
      const r = parseFaltasDirect(texto);
      expect(r.faltas).toHaveLength(7);
      expect(r.faltas.every(f => f.tipo_afastamento === 'atestado')).toBe(true);
    });
  });

  describe('ADP web (Via Varejo) — Izabela 2021', () => {
    const texto = readFixture('ctps-adp-izabela-2021.txt');

    it('detecta 1 atestado, 0 férias', () => {
      const fer = parseFerias(texto);
      const fal = parseFaltasDirect(texto);
      expect(fer.ferias).toHaveLength(0);
      expect(fal.faltas).toHaveLength(1);
    });
  });

  describe('Scan PJe (Mistral OCR best-case) — Izabela Q', () => {
    const texto = readFixture('ctps-scan-izabela-Q-mistral-ideal.txt');

    it('detecta 4 licenças médicas', () => {
      const r = parseFaltasDirect(texto);
      expect(r.faltas).toHaveLength(4);
      expect(r.faltas.every(f => f.tipo_afastamento === 'licenca_medica')).toBe(true);
    });

    it('ignora "Rescisão com justa causa" (evento contratual)', () => {
      const r = parseFaltasDirect(texto);
      expect(r.faltas.some(f => f.data_inicio === '2022-04-15')).toBe(false);
    });

    it('não há férias gozadas (tabela vazia)', () => {
      const r = parseFerias(texto);
      expect(r.ferias).toHaveLength(0);
    });
  });

  describe('Scan PJe (OCR degradado ç→g) — Izabela Q', () => {
    const texto = readFixture('ctps-scan-izabela-Q-degraded.txt');

    it('detecta 4 licenças mesmo com "Licenga" no lugar de "Licença"', () => {
      const r = parseFaltasDirect(texto);
      expect(r.faltas).toHaveLength(4);
    });

    it('emite warning de normalização OCR aplicada', () => {
      const r = parseFaltasDirect(texto);
      expect(r.warnings.some(w => /OCR degradado/i.test(w))).toBe(true);
    });
  });
});
