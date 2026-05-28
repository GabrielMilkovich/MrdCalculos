import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';

import { extrairTextoLayout } from '../extrair-texto';
import { parseFichaAnotacoes } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/parser';
import { pareceDegradado } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/parece-degradado';
import { adaptarFerias } from '../adapters/to-ferias-parseada';
import { adaptarFaltas } from '../adapters/to-falta-parseada';
import { buildCtpsZipWithReport } from '../../../export/per-doc/ctps-zip';
import { parseFerias } from '../../ferias';
import { parseFaltas } from '../../faltas';

const FIXTURES = resolve(__dirname, '../../../../../../fixtures/ctps');

function loadPdf(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, name, 'ctps.pdf')));
}

/**
 * Espelha a lógica do `case 'ctps'` em per-doc/index.ts pra cobrir o
 * fluxo de export sem precisar mockar Supabase. Testes confirmam:
 *   - V2 sucesso → ZIP com 4 CSVs (dados_contratuais, historico_salarial,
 *     registro_faltas, historico_ferias)
 *   - V2 falha (não ADP-Web, OCR degradado, etc.) → ZIP legacy com 2 CSVs
 *     (ferias + faltas)
 *   - Guard ocr_provider barra Mistral/degradado antes mesmo de tentar V2
 */
function simularCaseCtps(ocrText: string, ocrProvider: string) {
  const podeUsarV2 = ocrProvider === 'pdfjs_geometric';
  if (podeUsarV2) {
    const v2 = parseFichaAnotacoes(ocrText);
    if (v2 && !pareceDegradado(ocrText, v2)) {
      return {
        feriasParsed: adaptarFerias(v2),
        faltasParsed: adaptarFaltas(v2),
        ctpsV2: v2,
      };
    }
  }
  return {
    feriasParsed: parseFerias(ocrText),
    faltasParsed: parseFaltas(ocrText),
    ctpsV2: undefined,
  };
}

describe('Integração export CTPS (Fase 5.1)', () => {
  it('Roque com ocr_provider=pdfjs_geometric → ZIP com 4 CSVs V2', async () => {
    const ocrText = await extrairTextoLayout(loadPdf('roque_guerreiro'));
    const state = simularCaseCtps(ocrText, 'pdfjs_geometric');
    expect(state.ctpsV2).not.toBeUndefined();

    const { blob } = await buildCtpsZipWithReport({
      ferias: state.feriasParsed,
      faltas: state.faltasParsed,
      baseFilename: 'CTPS_roque',
      ctpsV2: state.ctpsV2,
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const files = Object.keys(zip.files).sort();
    expect(files).toEqual([
      'CTPS_roque_dados_contratuais.csv',
      'CTPS_roque_historico_ferias.csv',
      'CTPS_roque_historico_salarial.csv',
      'CTPS_roque_registro_faltas.csv',
    ]);
  });

  it('Izabela ate_2021 com ocr_provider=pdfjs_geometric → ZIP V2 (generalização)', async () => {
    const ocrText = await extrairTextoLayout(loadPdf('izabela_ate_2021'));
    const state = simularCaseCtps(ocrText, 'pdfjs_geometric');
    expect(state.ctpsV2).not.toBeUndefined();
    expect(state.feriasParsed.ferias).toHaveLength(0); // Izabela não tem férias
    expect(state.faltasParsed.faltas).toHaveLength(1); // 1 atestado médico

    const { blob } = await buildCtpsZipWithReport({
      ferias: state.feriasParsed,
      faltas: state.faltasParsed,
      baseFilename: 'CTPS_izabela',
      ctpsV2: state.ctpsV2,
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const dadosContratuais = await zip.file('CTPS_izabela_dados_contratuais.csv')!.async('string');
    expect(dadosContratuais).toContain('DADOS_PESSOAIS;nome;IZABELA C RANGEL DO AMARAL');
    expect(dadosContratuais).toContain('FUNCAO_ATUAL;situacao;Ativo');
  });

  it('Guard ocr_provider: não-pdfjs_geometric NUNCA tenta V2 → fallback legacy', async () => {
    const ocrText = await extrairTextoLayout(loadPdf('roque_guerreiro'));
    // Mesmo com ocrText perfeito (do Roque), provider Mistral força fallback
    const state = simularCaseCtps(ocrText, 'mistral');
    expect(state.ctpsV2).toBeUndefined();

    const { blob } = await buildCtpsZipWithReport({
      ferias: state.feriasParsed,
      faltas: state.faltasParsed,
      baseFilename: 'CTPS_legacy',
      ctpsV2: state.ctpsV2,
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const files = Object.keys(zip.files).sort();
    // Legacy = 2 CSVs (ferias + faltas)
    expect(files).toEqual([
      'CTPS_legacy_faltas.csv',
      'CTPS_legacy_ferias.csv',
    ]);
  });

  it('Texto não-CTPS com provider geometric → V2 retorna null → fallback legacy', async () => {
    const state = simularCaseCtps('Holerite Mensal\nVencimentos: 1000', 'pdfjs_geometric');
    expect(state.ctpsV2).toBeUndefined();

    const { blob } = await buildCtpsZipWithReport({
      ferias: state.feriasParsed,
      faltas: state.faltasParsed,
      baseFilename: 'CTPS_nao',
      ctpsV2: state.ctpsV2,
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const files = Object.keys(zip.files).sort();
    expect(files).toEqual(['CTPS_nao_faltas.csv', 'CTPS_nao_ferias.csv']);
  });

  it('Adapter de ferias agrupa gozo fracionado em uma única FeriasParseada (Roque 2005-2006)', async () => {
    const ocrText = await extrairTextoLayout(loadPdf('roque_guerreiro'));
    const v2 = parseFichaAnotacoes(ocrText)!;
    const feriasParseada = adaptarFerias(v2);
    // 18 entries V2, mas 17 únicos aquisitivos (1 fracionado)
    expect(feriasParseada.ferias).toHaveLength(17);
    const fracionado = feriasParseada.ferias.find((f) => f.relativa === '2005/2006');
    expect(fracionado).not.toBeUndefined();
    expect(fracionado!.gozo1?.inicio).toBe('15/05/2006');
    expect(fracionado!.gozo2?.inicio).toBe('11/09/2006');
  });

  it('Adapter de faltas converte data BR → ISO + mapeia categoria', async () => {
    const ocrText = await extrairTextoLayout(loadPdf('roque_guerreiro'));
    const v2 = parseFichaAnotacoes(ocrText)!;
    const faltasParseada = adaptarFaltas(v2);
    // 12 atestados/aux + 3 suspensões = 15 (demissão excluída por não ter retorno)
    expect(faltasParseada.faltas).toHaveLength(15);
    const atestado = faltasParseada.faltas[0];
    expect(atestado.data_inicio).toBe('2009-03-13'); // BR 13/03/2009 → ISO
    expect(atestado.tipo_afastamento).toBe('atestado');
    expect(atestado.justificada).toBe(true);
  });
});
