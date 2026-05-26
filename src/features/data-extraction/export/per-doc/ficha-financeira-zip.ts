import JSZip from 'jszip';
import Decimal from 'decimal.js';
import type { IncidenciaFlags, LinhaHistoricoSalarial } from '../../types';
import { buildHistoricoSalarialCSVWithReport } from '../csv-historico';
import { formatNumeroBR } from '../format-br';
import { sanitizeText } from '../sanitize';
import type { BuildReport } from '../validation';
import type { RubricaEditavel } from '../../../../components/cases/data-extraction/hooks/useFichaFinanceiraReview';
import {
  classificarRubrica,
  ORDEM_GRUPOS_CSV,
  type GrupoExportCSV,
  type ClassificacaoResultado,
} from './grupos-planilha-dsr';

Decimal.set({ precision: 20 });

function flagsPadrao(): IncidenciaFlags {
  return {
    incide_fgts: true,
    fgts_recolhido: false,
    incide_inss: true,
    inss_recolhido: false,
    natureza_indenizatoria: false,
  };
}

export interface FichaFinanceiraZipInput {
  ano: number;
  empregador: string;
  empregado: string;
  rubricas: RubricaEditavel[];
  validacao: {
    ok: boolean;
    competencias: Array<{
      competencia: string;
      total_extraido: number;
      total_pdf: number | null;
      delta_abs: number;
      delta_pct: number;
      status: 'ok' | 'fora_tolerancia' | 'total_pdf_ausente';
    }>;
    resumo: {
      total_competencias: number;
      competencias_ok: number;
      competencias_fora: number;
      competencias_sem_total: number;
      pior_delta_pct: number;
    };
  };
  parserMeta?: { fonte: 'deterministic' | 'claude'; duration_ms?: number };
}

export interface FichaFinanceiraZipResult {
  blob: Blob;
  filename: string;
  resumo: {
    grupos: Array<{
      slug: GrupoExportCSV;
      nome_pjecalc: string;
      total: Decimal;
      meses: number;
    }>;
    rubricas_incluidas: number;
    rubricas_desconsideradas: number;
    rubricas_excluidas_pelo_operador: number;
    competencias_validacao_ok: number;
    competencias_validacao_fora: number;
    classificacoes_baixa_confianca: number;
  };
  reports: Array<{ grupo: GrupoExportCSV; report: BuildReport }>;
}

function competenciaParserParaCsv(comp: string): string {
  const parts = comp.split('-');
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  return comp;
}

function ordemCompetencia(comp: string): number {
  const parts = comp.split('/');
  if (parts.length !== 2) return 0;
  const m = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(y)) return 0;
  return y * 12 + m;
}

type RubricaClassificada = RubricaEditavel & {
  grupo_export: GrupoExportCSV;
  classificacao_planilha: ClassificacaoResultado;
};

export async function buildFichaFinanceiraZip(
  input: FichaFinanceiraZipInput,
): Promise<FichaFinanceiraZipResult> {
  const zip = new JSZip();
  const reports: Array<{ grupo: GrupoExportCSV; report: BuildReport }> = [];
  const resumoGrupos: FichaFinanceiraZipResult['resumo']['grupos'] = [];

  // Classifica cada rubrica em UM grupo da planilha.
  // Override do operador (incluida=false ou categoria_atual=='ignorar')
  // sobrescreve pra 'desconsiderado'.
  const classificadas: RubricaClassificada[] = input.rubricas.map((r) => {
    const overrideExclusao = !r.incluida || r.categoria_atual === 'ignorar';
    const classificacao = overrideExclusao
      ? {
          grupo: 'desconsiderado' as GrupoExportCSV,
          confianca: 'alta' as const,
          metodo: 'codigo' as const,
          motivo: 'Excluído pelo operador na UI de revisão.',
        }
      : classificarRubrica(r.codigo, r.denominacao);
    return { ...r, grupo_export: classificacao.grupo, classificacao_planilha: classificacao };
  });

  const excluidasOperador = classificadas.filter(
    (r) => !r.incluida || r.categoria_atual === 'ignorar',
  ).length;
  const baixaConfianca = classificadas.filter(
    (r) =>
      r.classificacao_planilha.confianca === 'baixa' &&
      r.grupo_export !== 'desconsiderado',
  ).length;

  for (const { slug, prefixo, nome_pjecalc } of ORDEM_GRUPOS_CSV) {
    const rubricasGrupo = classificadas.filter((r) => r.grupo_export === slug);
    if (rubricasGrupo.length === 0) continue;

    const linhasMap = new Map<string, Decimal>();
    for (const r of rubricasGrupo) {
      for (const v of r.valores_mensais) {
        const compBR = competenciaParserParaCsv(v.competencia);
        const atual = linhasMap.get(compBR) ?? new Decimal(0);
        linhasMap.set(compBR, atual.plus(new Decimal(v.valor)));
      }
    }
    if (linhasMap.size === 0) continue;

    const linhas: LinhaHistoricoSalarial[] = [...linhasMap.entries()]
      .sort(([a], [b]) => ordemCompetencia(a) - ordemCompetencia(b))
      .map(([competencia, valor]) => ({ competencia, valor }));

    const { csv, report } = buildHistoricoSalarialCSVWithReport(linhas, flagsPadrao());
    zip.file(`${prefixo}_${slug}.csv`, csv);

    const total = linhas.reduce((acc, l) => {
      const v = l.valor instanceof Decimal ? l.valor : new Decimal(l.valor);
      return acc.plus(v);
    }, new Decimal(0));

    resumoGrupos.push({ slug, nome_pjecalc, total, meses: linhas.length });
    reports.push({ grupo: slug, report });
  }

  zip.file('auditoria_completa.csv', buildAuditoriaCSV(classificadas));

  const desconsideradas = classificadas.filter(
    (r) =>
      r.grupo_export === 'desconsiderado' &&
      r.incluida &&
      r.categoria_atual !== 'ignorar',
  );
  if (desconsideradas.length > 0) {
    zip.file('auditoria_desconsideradas.csv', buildDesconsideradasCSV(desconsideradas));
  }

  zip.file('resumo_validacao.txt', buildResumoValidacao(input.validacao));

  const metadata = {
    versao_exporter: '2.0.0-planilha-dsr',
    gerado_em: new Date().toISOString(),
    ano: input.ano,
    empregador: input.empregador,
    empregado: input.empregado,
    parser_fonte: input.parserMeta?.fonte ?? 'unknown',
    parser_duration_ms: input.parserMeta?.duration_ms,
    classificacao_taxonomia: 'planilha-comissao-dsr-mrd-v1',
    totais_por_grupo: resumoGrupos.map((g) => ({
      slug: g.slug,
      nome_pjecalc: g.nome_pjecalc,
      total: g.total.toFixed(2),
      meses: g.meses,
    })),
    contagem_desconsideradas: desconsideradas.length,
    contagem_excluidas_pelo_operador: excluidasOperador,
    contagem_classificacao_baixa_confianca: baixaConfianca,
    validacao: { ok: input.validacao.ok, resumo: input.validacao.resumo },
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const empSlug = input.empregador.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `ficha_${empSlug}_${input.ano}.zip`;

  return {
    blob,
    filename,
    resumo: {
      grupos: resumoGrupos,
      rubricas_incluidas: classificadas.filter((r) => r.grupo_export !== 'desconsiderado').length,
      rubricas_desconsideradas: desconsideradas.length,
      rubricas_excluidas_pelo_operador: excluidasOperador,
      competencias_validacao_ok: input.validacao.resumo.competencias_ok,
      competencias_validacao_fora: input.validacao.resumo.competencias_fora,
      classificacoes_baixa_confianca: baixaConfianca,
    },
    reports,
  };
}

function buildAuditoriaCSV(rubricas: RubricaClassificada[]): string {
  const HEADER =
    'Codigo;Denominacao;Classe_Doc;Categoria_UI;Grupo_Export;Confianca;Metodo;Origem;Total_Ano;Incluido;Modificado';
  const rows = rubricas.map((r) =>
    [
      r.codigo,
      sanitizeText(r.denominacao, 100),
      (r as unknown as { classificacao_doc?: string }).classificacao_doc ?? '',
      r.categoria_atual,
      r.grupo_export,
      r.classificacao_planilha.confianca,
      r.classificacao_planilha.metodo,
      r.origem_enriquecimento,
      formatNumeroBR(r.total_ano),
      r.incluida ? 'S' : 'N',
      r.modificada_pelo_operador ? 'S' : 'N',
    ].join(';'),
  );
  return [HEADER, ...rows].join('\r\n') + '\r\n';
}

function buildDesconsideradasCSV(rubricas: RubricaClassificada[]): string {
  const HEADER = 'Codigo;Denominacao;Motivo_Desconsiderado;Total_Ano';
  const rows = rubricas.map((r) =>
    [
      r.codigo,
      sanitizeText(r.denominacao, 100),
      sanitizeText(r.classificacao_planilha.motivo, 200),
      formatNumeroBR(r.total_ano),
    ].join(';'),
  );
  return [HEADER, ...rows].join('\r\n') + '\r\n';
}

function buildResumoValidacao(v: FichaFinanceiraZipInput['validacao']): string {
  const linhas: string[] = [];
  linhas.push(`Resultado: ${v.ok ? 'OK' : 'FORA DE TOLERÂNCIA'}`);
  linhas.push(`Total de competências: ${v.resumo.total_competencias}`);
  linhas.push(`Competências OK: ${v.resumo.competencias_ok}`);
  linhas.push(`Competências fora: ${v.resumo.competencias_fora}`);
  linhas.push(`Competências sem total no PDF: ${v.resumo.competencias_sem_total}`);
  linhas.push(`Pior delta: ${v.resumo.pior_delta_pct.toFixed(2)}%`);
  linhas.push('');
  if (!v.ok) {
    linhas.push('=== COMPETÊNCIAS FORA DE TOLERÂNCIA ===');
    for (const c of v.competencias) {
      if (c.status !== 'fora_tolerancia') continue;
      linhas.push(
        `${c.competencia}: extraído R$ ${c.total_extraido.toFixed(2)}, ` +
          `PDF R$ ${c.total_pdf?.toFixed(2) ?? 'ausente'}, ` +
          `delta ${c.delta_pct.toFixed(2)}%`,
      );
    }
  }
  return linhas.join('\r\n') + '\r\n';
}
