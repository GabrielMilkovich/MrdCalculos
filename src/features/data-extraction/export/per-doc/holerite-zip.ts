/**
 * Gera o ZIP final do holerite a partir das linhas classificadas e
 * confirmadas pelo usuário no `HoleritePreviewDialog`.
 *
 * Produz:
 *   - 1 CSV por categoria com soma > 0 (`historico_salarial_<slug>.csv`)
 *   - 1 `auditoria_completa.csv` com a trilha completa de classificação
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
import {
  buildHistoricoSalarialCSV,
  buildHistoricoSalarialCSVWithReport,
} from '../csv-historico';
import { formatNumeroBR } from '../format-br';
import { sanitizeText } from '../sanitize';
import type { BuildReport } from '../validation';
import { emptyReport } from '../validation';
import type { ClassificacaoHolerite, LinhaClassificada } from './holerite-classify';
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
  return (await buildHoleriteZipWithReport(classificacao)).blob;
}

/**
 * Agrega o ZIP final + um BuildReport unificado que lista TUDO que sai
 * (linhas geradas) e TUDO que NÃO sai (rubricas com categoria null mas
 * valor positivo, rubricas desmarcadas pelo operador, descontos puros).
 *
 * O report alimenta o `CsvBuildReportPanel` antes do download — operador
 * vê explicitamente qualquer perda de dado entre a tela e o ZIP final.
 */
export async function buildHoleriteZipWithReport(
  classificacao: ClassificacaoHolerite,
): Promise<{ blob: Blob; report: BuildReport }> {
  const report = emptyReport();
  const buckets = aggregateByCategoria(classificacao.linhas);

  // Paridade declarativa: campos do parsed que NÃO chegam aos CSVs oficiais
  // do PJe-Calc (vão só pro auditoria_completa.csv). Registrar é honesto —
  // operador vê na UI e sabe que precisa abrir o auditoria pra essas infos.
  report.camposNaoExportados!.push(
    {
      campo: 'rubrica.codigo',
      motivo: 'Histórico Salarial PJe-Calc não tem coluna Codigo — disponível em auditoria_completa.csv.',
    },
    {
      campo: 'rubrica.nome',
      motivo: 'Histórico Salarial PJe-Calc agrega por categoria (sem nome individual) — auditoria_completa.csv preserva nome de cada rubrica.',
    },
    {
      campo: 'rubrica.quantidade',
      motivo: 'Histórico Salarial PJe-Calc não tem coluna Quantidade — disponível em auditoria_completa.csv.',
    },
  );

  // Soma das rubricas sem categoria atribuída — vão pra um CSV separado
  // pra que NENHUMA rubrica com valor positivo seja perdida do ZIP.
  let somaNaoClassificadas = new Decimal(0);
  const itensNaoClassificadas: Array<{ nome: string; valor: number }> = [];

  classificacao.linhas.forEach((l, i) => {
    if (l.origem === 'desconto') {
      // Descontos são by design — não rejeição, registra como ajuste.
      return;
    }
    if (l.origem === 'ignorar_hint') {
      report.linhasAjustadas.push({
        idx: i,
        ajuste: `Rubrica "${l.rubrica.nome}" ignorada por hint (não-remuneratória).`,
      });
      return;
    }
    if (l.valorParaCsv <= 0) return;
    if (l.categoria === null) {
      // Em vez de rejeitar (silenciar do ZIP), agrega num bucket especial
      // "nao_classificadas". Operador decide depois em qual Histórico
      // Salarial mover. Paridade preservada — nada some.
      if (l.incluir) {
        somaNaoClassificadas = somaNaoClassificadas.plus(l.valorParaCsv);
        itensNaoClassificadas.push({
          nome: l.rubrica.nome,
          valor: l.valorParaCsv,
        });
        report.linhasAjustadas.push({
          idx: i,
          ajuste: `Rubrica "${l.rubrica.nome}" (R$ ${formatNumeroBR(new Decimal(l.valorParaCsv))}) sem categoria — incluída em "historico_salarial_nao_classificadas.csv" para revisão manual.`,
        });
      } else {
        report.linhasAjustadas.push({
          idx: i,
          ajuste: `Rubrica "${l.rubrica.nome}" (R$ ${formatNumeroBR(new Decimal(l.valorParaCsv))}) sem categoria e desmarcada pelo operador — não entra no CSV.`,
        });
      }
      return;
    }
    if (!l.incluir) {
      report.linhasAjustadas.push({
        idx: i,
        ajuste: `Rubrica "${l.rubrica.nome}" (R$ ${formatNumeroBR(new Decimal(l.valorParaCsv))}) desmarcada pelo operador — não entra no CSV.`,
      });
    }
  });

  // Conta linhas geradas = total de competências por bucket.
  const zip = new JSZip();
  for (const [slug, soma] of buckets) {
    const meta = CATEGORIAS_NOMES[slug];
    const { csv, report: subReport } = buildHistoricoSalarialCSVWithReport(
      [{ competencia: classificacao.competencia, valor: soma }],
      meta.default_flags,
    );
    zip.file(`historico_salarial_${slug}.csv`, csv);
    report.linhasGeradas += subReport.linhasGeradas;
    // Propaga warnings dos subgrupos com prefixo identificando o bucket.
    for (const w of subReport.warnings) {
      report.warnings.push(`[${meta.nome_pjecalc}] ${w}`);
    }
    for (const r of subReport.linhasRejeitadas) {
      report.linhasRejeitadas.push({
        idx: r.idx,
        motivo: `[${meta.nome_pjecalc}] ${r.motivo}`,
        conteudo: r.conteudo,
      });
    }
  }

  // CSV especial das rubricas sem categoria — preserva paridade. Operador
  // importa como Histórico Salarial novo no PJe-Calc OU revisa o que pertence
  // a quais buckets antes de importar.
  if (somaNaoClassificadas.gt(0)) {
    const { csv, report: subReport } = buildHistoricoSalarialCSVWithReport(
      [{ competencia: classificacao.competencia, valor: somaNaoClassificadas }],
      bothInOn(),
    );
    zip.file('historico_salarial_nao_classificadas.csv', csv);
    report.linhasGeradas += subReport.linhasGeradas;
    for (const w of subReport.warnings) {
      report.warnings.push(`[Não classificadas] ${w}`);
    }
    report.warnings.push(
      `${itensNaoClassificadas.length} rubrica(s) sem categoria atribuída — somadas em "historico_salarial_nao_classificadas.csv" (R$ ${formatNumeroBR(somaNaoClassificadas)}). Revise manualmente antes de importar no PJe-Calc.`,
    );
  }

  // CSV de auditoria — TODAS as rubricas com classificação atribuída.
  // Não importa para o PJe-Calc; serve para o operador (ou cliente) revisar
  // depois "o que entrou em cada bucket" e "o que foi descartado".
  zip.file('auditoria_completa.csv', buildAuditoriaCSV(classificacao));

  if (buckets.size === 0) {
    report.warnings.push(
      'Nenhum CSV de histórico salarial gerado — todas as rubricas foram excluídas ou estão sem categoria.',
    );
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, report };
}

/**
 * CSV de AUDITORIA — não é importado pelo PJe-Calc. É uma planilha-trilha:
 * todas as rubricas extraídas com a categoria atribuída, valor que entrou
 * no CSV oficial, e razão da escolha (hint, fallback, desconto, ignorado).
 *
 * Colunas:
 *   Ordem; Codigo; Nome; Vencimento; Desconto; Quantidade;
 *   Categoria; Valor_para_CSV; Origem_classificacao; Incluido
 *
 * Não tem aspas (formato simples), encoding UTF-8, decimal vírgula BR.
 * Linhas com nome contendo `;` ou `"` são sanitizadas via `sanitizeText`.
 */
function buildAuditoriaCSV(classificacao: ClassificacaoHolerite): string {
  const HEADER =
    'Ordem;Codigo;Nome;Vencimento;Desconto;Quantidade;Categoria;Valor_no_CSV;Origem;Incluido';
  const rows = classificacao.linhas.map((l) => formatLinhaAuditoria(l));
  return [HEADER, ...rows].join('\r\n') + '\r\n';
}

function formatLinhaAuditoria(l: LinhaClassificada): string {
  const r = l.rubrica;
  const v = (n: number | null): string =>
    n === null ? '' : formatNumeroBR(new Decimal(n));
  // Quantidade pode trazer fração de hora (0,925) ou taxa (1,375) com 3-4
  // casas — auditoria preserva precisão (4 casas) em vez de capar em 2.
  const qtd = (n: number | null): string =>
    n === null ? '' : formatNumeroBR(new Decimal(n), 4).replace(/,?0+$/, (m) => (m.startsWith(',') ? '' : m));
  const cat =
    l.categoria === null
      ? l.origem === 'desconto'
        ? '(desconto)'
        : l.origem === 'ignorar_hint'
          ? '(ignorado por hint)'
          : '(ignorado)'
      : l.categoria;
  return [
    String(r.ordem),
    sanitizeText(r.codigo, 20),
    sanitizeText(r.nome, 80),
    v(r.valor_vencimento),
    v(r.valor_desconto),
    qtd(r.quantidade),
    cat,
    formatNumeroBR(new Decimal(l.valorParaCsv)),
    l.origem,
    l.incluir ? 'S' : 'N',
  ].join(';');
}

