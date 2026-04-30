import type { ZipExportPayload } from '../types';

/**
 * LEIA-ME.txt dinâmico. Lista apenas as categorias que têm dados (linhas > 0)
 * e instrui o usuário a criar os Históricos Salariais correspondentes no
 * PJe-Calc Cidadão antes de importar.
 */
export function buildLeiaMe(payload: ZipExportPayload): string {
  const linhas: string[] = [];
  linhas.push('INSTRUÇÕES DE IMPORTAÇÃO NO PJe-CALC CIDADÃO');
  linhas.push('=============================================');
  linhas.push('');
  linhas.push('Este pacote contém:');
  for (const h of payload.historicoSalarialCSVs) {
    if (h.linhas > 0) linhas.push(`- historico_salarial_${h.slug}.csv (${h.linhas} linhas)`);
  }
  if (payload.feriasCsv && payload.feriasCsv.linhas > 0) {
    linhas.push(`- ferias.csv (${payload.feriasCsv.linhas} períodos)`);
  }
  if (payload.faltasCsv && payload.faltasCsv.linhas > 0) {
    linhas.push(`- faltas.csv (${payload.faltasCsv.linhas} ocorrências)`);
  }
  linhas.push('');
  linhas.push('PASSO 1 — CRIAR OS HISTÓRICOS SALARIAIS NO PJe-CALC');
  linhas.push('');
  linhas.push('Para cada arquivo historico_salarial_*.csv neste ZIP, você precisa');
  linhas.push('PRIMEIRO criar um Histórico Salarial correspondente no PJe-Calc com:');
  linhas.push('- Nome: o nome listado em "NOME PARA CRIAR NO PJE-CALC" abaixo.');
  linhas.push('- Flags de incidência: as listadas em "INCIDÊNCIA CONFIGURADA" abaixo.');
  linhas.push('');
  linhas.push('----------------------------------------------------------');

  for (const h of payload.historicoSalarialCSVs) {
    if (h.linhas === 0) continue;
    linhas.push(`historico_salarial_${h.slug}.csv`);
    linhas.push(`   NOME PARA CRIAR NO PJE-CALC: ${h.nomePjecalc}`);
    if (h.config.natureza_indenizatoria) {
      linhas.push(
        '   INCIDÊNCIA CONFIGURADA: NATUREZA INDENIZATÓRIA — todas flags = N',
      );
    } else {
      const f = (b: boolean) => (b ? 'S' : 'N');
      linhas.push(
        `   INCIDÊNCIA CONFIGURADA: FGTS=${f(h.config.incide_fgts)}, FGTS Recolhido=${f(h.config.fgts_recolhido)}, INSS=${f(h.config.incide_inss)}, INSS Recolhido=${f(h.config.inss_recolhido)}`,
      );
    }
    linhas.push(`   LINHAS NO CSV: ${h.linhas}`);
    linhas.push('');
  }

  linhas.push('----------------------------------------------------------');
  linhas.push('');
  linhas.push('PASSO 2 — IMPORTAR CADA CSV');
  linhas.push('Em cada Histórico Salarial criado, use a função "Importar CSV" e selecione');
  linhas.push('o arquivo correspondente.');
  linhas.push('');

  if (payload.feriasCsv && payload.feriasCsv.linhas > 0) {
    linhas.push('PASSO 3 — FÉRIAS');
    linhas.push('Atenção: o PJe-Calc só aceita o CSV de férias se os PERÍODOS AQUISITIVOS');
    linhas.push('já estiverem cadastrados no cálculo. Crie-os manualmente na aba "Férias"');
    linhas.push('do PJe-Calc antes de importar ferias.csv. O identificador "relativa"');
    linhas.push('(ex: "2023/2024") deve bater exatamente.');
    linhas.push('');
  }

  if (payload.faltasCsv && payload.faltasCsv.linhas > 0) {
    linhas.push('PASSO 4 — FALTAS');
    linhas.push('Importe diretamente faltas.csv na aba "Faltas".');
    linhas.push('');
  }

  linhas.push('ENCODING: UTF-8 (sem BOM)');
  linhas.push('DELIMITADOR: ponto-e-vírgula (;)');
  linhas.push('DECIMAL: vírgula (formato brasileiro)');
  linhas.push(
    `GERADO POR: MRD Calc — ${new Date().toISOString().slice(0, 10)} — caso ${payload.numeroProcesso ?? '(sem número)'}`,
  );

  return linhas.join('\n');
}
