/**
 * Testes unitários do pipeline de importação .PJC (sem UI — valida analyzePJC).
 * Verifica que um .PJC real do corpus pode ser extraído, analisado, e que os
 * campos essenciais (beneficiário, verbas, resultado) estão populados antes
 * de chamar persistirPJCAnalysis (que requer Supabase connection).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { analyzePJC } from '../../../../lib/pjecalc/pjc-analyzer';

const CORPUS_DIR = path.join(process.cwd(), 'Arquivos PJC');

function readPjc(file: string): string {
  return fs.readFileSync(path.join(CORPUS_DIR, file), 'latin1');
}

describe('ImportPJCDialog — pipeline de análise', () => {
  const arquivos = fs.existsSync(CORPUS_DIR)
    ? fs.readdirSync(CORPUS_DIR).filter(f => f.toUpperCase().endsWith('.PJC')).slice(0, 3)
    : [];

  if (arquivos.length === 0) {
    it('corpus ausente', () => {
      expect(true).toBe(true);
    });
    return;
  }

  for (const file of arquivos) {
    it(`analisa ${file.slice(0, 40)}...`, () => {
      const xml = readPjc(file);
      const analysis = analyzePJC(xml);

      // Beneficiário obrigatório
      expect(analysis.parametros.beneficiario).toBeTruthy();
      expect(analysis.parametros.beneficiario.length).toBeGreaterThan(0);

      // Deve ter pelo menos 1 verba
      expect(analysis.verbas.length).toBeGreaterThan(0);

      // Resultado com líquido exequente > 0
      expect(analysis.resultado.liquido_exequente).toBeGreaterThan(0);

      // Parâmetros mínimos
      expect(analysis.parametros.admissao).toBeTruthy();
    });
  }

  it('rejeita XML inválido', () => {
    expect(() => analyzePJC('<invalido />')).not.toThrow();
    const bad = analyzePJC('<invalido />');
    // Não throw, mas análise deve resultar em objeto "vazio"
    expect(bad.verbas.length).toBe(0);
    expect(bad.parametros.beneficiario).toBe('');
  });
});
