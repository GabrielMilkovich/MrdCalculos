/**
 * Gera o ZIP final do holerite a partir das linhas já classificadas e
 * confirmadas pelo usuário no `HoleritePreviewDialog`.
 *
 * Produz:
 *   - 1 CSV por categoria com soma > 0 (`historico_salarial_<slug>.csv`)
 *   - 1 LEIA-ME.txt com instruções de import no PJe-Calc Cidadão
 *
 * Formato dos CSVs: o mesmo do builder existente (`buildHistoricoSalarialCSV`)
 * — Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido.
 */

import JSZip from 'jszip';
import type { CategoriaSlug, IncidenciaFlags } from '../../types';
import { buildHistoricoSalarialCSV } from '../csv-historico';
import type { ClassificacaoHolerite } from './holerite-classify';
import { aggregateByCategoria } from './holerite-classify';

type CategoriaMeta = {
  nome_pjecalc: string;
  default_flags: IncidenciaFlags;
};

const CATEGORIAS_NOMES: Record<CategoriaSlug, CategoriaMeta> = {
  salario_fixo: {
    nome_pjecalc: 'Salário Fixo',
    default_flags: bothInOn(),
  },
  comissao: {
    nome_pjecalc: 'Comissões',
    default_flags: bothInOn(),
  },
  dsr: {
    nome_pjecalc: 'DSR',
    default_flags: bothInOn(),
  },
  premiacao: {
    nome_pjecalc: 'Premiações',
    default_flags: bothInOn(),
  },
  minimo_garantido: {
    nome_pjecalc: 'Mínimo Garantido',
    default_flags: bothInOn(),
  },
  salario_familia: {
    nome_pjecalc: 'Salário-família',
    default_flags: indenizatoria(),
  },
};

function bothInOn(): IncidenciaFlags {
  return {
    incide_fgts: true,
    fgts_recolhido: false,
    incide_inss: true,
    inss_recolhido: false,
    natureza_indenizatoria: false,
  };
}

function indenizatoria(): IncidenciaFlags {
  return {
    incide_fgts: false,
    fgts_recolhido: false,
    incide_inss: false,
    inss_recolhido: false,
    natureza_indenizatoria: true,
  };
}

export async function buildHoleriteZip(
  classificacao: ClassificacaoHolerite,
): Promise<Blob> {
  const buckets = aggregateByCategoria(classificacao.linhas);

  const zip = new JSZip();
  for (const [slug, soma] of buckets) {
    const meta = CATEGORIAS_NOMES[slug];
    const csv = buildHistoricoSalarialCSV(
      [{ competencia: classificacao.competencia, valor: soma }],
      meta.default_flags,
    );
    zip.file(`historico_salarial_${slug}.csv`, csv);
  }

  zip.file('LEIA-ME.txt', buildReadme(classificacao, buckets));
  return zip.generateAsync({ type: 'blob' });
}

function buildReadme(
  classificacao: ClassificacaoHolerite,
  buckets: Map<CategoriaSlug, number>,
): string {
  const lines: string[] = [];
  lines.push(`Holerite — competência ${classificacao.competencia}`);
  lines.push(`Layout detectado: ${classificacao.layout_usado}`);
  lines.push('');
  lines.push('COMO IMPORTAR NO PJe-CALC CIDADÃO:');
  lines.push('1. Crie um Histórico Salarial com o nome correspondente ao arquivo.');
  lines.push('2. Use "Importar CSV" e selecione o arquivo deste ZIP.');
  lines.push('');

  if (buckets.size === 0) {
    lines.push('Nenhum CSV gerado — todas as rubricas foram excluídas no preview.');
  } else {
    lines.push('CSVs incluídos:');
    for (const [slug, soma] of buckets) {
      const meta = CATEGORIAS_NOMES[slug];
      lines.push(
        `  - historico_salarial_${slug}.csv → criar Histórico "${meta.nome_pjecalc}" (R$ ${soma.toFixed(2)})`,
      );
    }
  }

  if (classificacao.warnings.length > 0) {
    lines.push('');
    lines.push('Avisos do parser:');
    for (const w of classificacao.warnings) lines.push(`  - ${w}`);
  }
  return lines.join('\n');
}
