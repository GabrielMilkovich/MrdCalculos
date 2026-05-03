/**
 * Gera o ZIP final do holerite a partir das linhas classificadas e
 * confirmadas pelo usuário no `HoleritePreviewDialog`.
 *
 * Produz:
 *   - 1 CSV por categoria com soma > 0 (`historico_salarial_<slug>.csv`)
 *   - 1 LEIA-ME.txt com instruções de import passo-a-passo
 *
 * Cada CSV é um "Histórico Salarial" separado no PJe-Calc — usuário cria
 * um Histórico Salarial por categoria (ex: "Comissões", "DSR", "Premiações")
 * e usa "Importar CSV" naquele Histórico específico para carregar o arquivo
 * correspondente.
 *
 * Spec dos CSVs: ver `csv-historico.ts` (formato confirmado via JAR
 * decompilado em pjecalc-fonte/).
 */

import JSZip from 'jszip';
import Decimal from 'decimal.js';
import type { CategoriaSlug, IncidenciaFlags } from '../../types';
import { buildHistoricoSalarialCSV } from '../csv-historico';
import { formatNumeroBR } from '../format-br';
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
  buckets: Map<CategoriaSlug, Decimal>,
): string {
  const lines: string[] = [];
  lines.push(`HOLERITE — competência ${classificacao.competencia}`);
  lines.push(`Layout detectado: ${classificacao.layout_usado}`);
  lines.push('');
  lines.push('COMO IMPORTAR NO PJe-CALC CIDADÃO');
  lines.push('==================================');
  lines.push('');
  lines.push('Cada arquivo deste ZIP corresponde a UM Histórico Salarial');
  lines.push('separado no PJe-Calc. Para cada CSV:');
  lines.push('');
  lines.push('  1) No menu Cálculo → Históricos Salariais → Adicionar.');
  lines.push('  2) Dê o nome sugerido abaixo (ex.: "Comissões").');
  lines.push('  3) Salve o Histórico Salarial.');
  lines.push('  4) Abra o Histórico criado.');
  lines.push('  5) Clique em "Importar CSV" e selecione o arquivo correspondente.');
  lines.push('');

  if (buckets.size === 0) {
    lines.push('Nenhum CSV gerado — todas as rubricas foram excluídas no preview.');
  } else {
    lines.push('ARQUIVOS NESTE ZIP');
    lines.push('------------------');
    for (const [slug, soma] of buckets) {
      const meta = CATEGORIAS_NOMES[slug];
      lines.push('');
      lines.push(`* historico_salarial_${slug}.csv`);
      lines.push(`    Histórico Salarial a criar:  ${meta.nome_pjecalc}`);
      lines.push(`    Soma da competência:         R$ ${formatNumeroBR(soma)}`);
      const f = meta.default_flags;
      if (f.natureza_indenizatoria) {
        lines.push(`    Flags sugeridas:             Natureza indenizatória (FGTS=N, INSS=N)`);
      } else {
        lines.push(
          `    Flags sugeridas:             FGTS=${f.incide_fgts ? 'S' : 'N'}, INSS=${f.incide_inss ? 'S' : 'N'} (recolhidos = N)`,
        );
      }
    }
  }

  lines.push('');
  lines.push('FORMATO DOS CSVs (informativo)');
  lines.push('------------------------------');
  lines.push('  Encoding: UTF-8 (sem BOM)');
  lines.push('  Delimitador: ponto-e-vírgula (;)');
  lines.push('  Decimal: vírgula brasileira (1234,56)');
  lines.push('  Booleanos: S/N');
  lines.push('  Competência: MM/AAAA');
  lines.push('  Colunas: Competencia;Valor;IncideFGTS;RecolhidoFGTS;IncideINSS;RecolhidoINSS');
  lines.push('');
  lines.push('Compatível com PJe-Calc Cidadão 2.5.6+ (incluindo 2.15.1).');

  if (classificacao.warnings.length > 0) {
    lines.push('');
    lines.push('AVISOS DO PARSER DO HOLERITE');
    lines.push('----------------------------');
    for (const w of classificacao.warnings) lines.push(`  - ${w}`);
  }
  return lines.join('\r\n');
}
