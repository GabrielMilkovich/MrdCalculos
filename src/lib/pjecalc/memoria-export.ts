/**
 * Export memória de cálculo em JSON estruturado para auditoria.
 */
import type { MemoriaCalculo, LinhaMemoriaCalculo } from './engine-types';

export function exportarMemoriaJSON(memoria: MemoriaCalculo): string {
  return JSON.stringify({
    cabecalho: {
      processo: memoria.processo,
      reclamante: memoria.reclamante,
      reclamado: memoria.reclamado,
      data_admissao: memoria.data_admissao,
      data_demissao: memoria.data_demissao,
      data_liquidacao: memoria.data_liquidacao,
      data_geracao: memoria.data_geracao,
    },
    totais: memoria.totais,
    verbas: agruparLinhasPorVerba(memoria.linhas),
    warnings: memoria.warnings,
    indices: memoria.indices_status,
  }, null, 2);
}

function agruparLinhasPorVerba(linhas: LinhaMemoriaCalculo[]): Record<string, {
  nome: string;
  total_devido: number;
  total_corrigido: number;
  total_juros: number;
  total_final: number;
  ocorrencias: number;
}> {
  const grupos: Record<string, {
    nome: string;
    total_devido: number;
    total_corrigido: number;
    total_juros: number;
    total_final: number;
    ocorrencias: number;
  }> = {};

  for (const linha of linhas) {
    if (!grupos[linha.verba_id]) {
      grupos[linha.verba_id] = {
        nome: linha.verba_nome,
        total_devido: 0, total_corrigido: 0, total_juros: 0, total_final: 0, ocorrencias: 0,
      };
    }
    const g = grupos[linha.verba_id];
    g.total_devido += linha.diferenca;
    g.total_corrigido += linha.valor_corrigido;
    g.total_juros += linha.valor_juros;
    g.total_final += linha.valor_final;
    g.ocorrencias++;
  }

  return grupos;
}
