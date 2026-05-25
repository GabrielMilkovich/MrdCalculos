import JSZip from 'jszip';
import Decimal from 'decimal.js';
import type { CategoriaSlug, IncidenciaFlags, LinhaHistoricoSalarial } from '../../types';
import { buildHistoricoSalarialCSVWithReport } from '../csv-historico';
import { formatNumeroBR } from '../format-br';
import { sanitizeText } from '../sanitize';
import type { BuildReport } from '../validation';
import { emptyReport } from '../validation';
import type { RubricaEditavel } from '../../../../components/cases/data-extraction/hooks/useFichaFinanceiraReview';
import type { FichaCategoriaSlug } from '../../../../components/cases/data-extraction/ficha-financeira-types';

Decimal.set({ precision: 20 });

type CategoriaMeta = {
  nome_pjecalc: string;
  default_flags: IncidenciaFlags;
};

const CATEGORIAS_NOMES: Record<string, CategoriaMeta> = {
  salario_fixo: { nome_pjecalc: 'Salário Fixo', default_flags: bothInOn() },
  comissao: { nome_pjecalc: 'Comissões', default_flags: bothInOn() },
  dsr: { nome_pjecalc: 'DSR', default_flags: bothInOn() },
  premiacao: { nome_pjecalc: 'Premiações', default_flags: bothInOn() },
  minimo_garantido: { nome_pjecalc: 'Mínimo Garantido', default_flags: bothInOn() },
  salario_familia: { nome_pjecalc: 'Salário-família', default_flags: indenizatoria() },
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
  parserMeta?: {
    fonte: 'deterministic' | 'claude';
    duration_ms?: number;
  };
}

export interface FichaFinanceiraZipResult {
  blob: Blob;
  filename: string;
  resumo: {
    categorias: Array<{
      slug: string;
      nome_pjecalc: string;
      total: Decimal;
      meses: number;
    }>;
    rubricas_incluidas: number;
    rubricas_ignoradas: number;
    competencias_validacao_ok: number;
    competencias_validacao_fora: number;
  };
  reports: Array<{ categoria: string; report: BuildReport }>;
}

function competenciaParserParaCsv(comp: string): string {
  const parts = comp.split('-');
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  return comp;
}

export async function buildFichaFinanceiraZip(
  input: FichaFinanceiraZipInput,
): Promise<FichaFinanceiraZipResult> {
  const zip = new JSZip();
  const reports: Array<{ categoria: string; report: BuildReport }> = [];
  const resumoCategorias: FichaFinanceiraZipResult['resumo']['categorias'] = [];

  const rubricasIncluidas = input.rubricas.filter(
    (r) => r.incluida && r.categoria_atual !== 'ignorar',
  );

  const porCategoria = new Map<string, RubricaEditavel[]>();
  for (const r of rubricasIncluidas) {
    const slug = r.categoria_atual;
    if (!porCategoria.has(slug)) porCategoria.set(slug, []);
    porCategoria.get(slug)!.push(r);
  }

  for (const [slug, rubricasCat] of porCategoria.entries()) {
    const linhasMap = new Map<string, Decimal>();
    for (const r of rubricasCat) {
      for (const v of r.valores_mensais) {
        const compBR = competenciaParserParaCsv(v.competencia);
        const atual = linhasMap.get(compBR) ?? new Decimal(0);
        linhasMap.set(compBR, atual.plus(new Decimal(v.valor)));
      }
    }

    const linhas: LinhaHistoricoSalarial[] = [...linhasMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([competencia, valor]) => ({ competencia, valor }));

    const meta = CATEGORIAS_NOMES[slug];
    const flags: IncidenciaFlags = meta
      ? meta.default_flags
      : derivarFlags(rubricasCat);

    const { csv, report } = buildHistoricoSalarialCSVWithReport(linhas, flags);
    zip.file(`historico_salarial_${slug}.csv`, csv);

    const total = linhas.reduce((acc, l) => {
      const v = l.valor instanceof Decimal ? l.valor : new Decimal(l.valor);
      return acc.plus(v);
    }, new Decimal(0));

    resumoCategorias.push({
      slug,
      nome_pjecalc: meta?.nome_pjecalc ?? slug,
      total,
      meses: linhas.length,
    });
    reports.push({ categoria: slug, report });
  }

  zip.file('auditoria_completa.csv', buildAuditoriaCSV(input.rubricas));
  zip.file('resumo_validacao.txt', buildResumoValidacao(input.validacao));

  const metadata = {
    versao_exporter: '1.0.0',
    gerado_em: new Date().toISOString(),
    ano: input.ano,
    empregador: input.empregador,
    empregado: input.empregado,
    parser_fonte: input.parserMeta?.fonte ?? 'unknown',
    parser_duration_ms: input.parserMeta?.duration_ms,
    totais_por_categoria: resumoCategorias.map((c) => ({
      slug: c.slug,
      nome_pjecalc: c.nome_pjecalc,
      total: c.total.toFixed(2),
      meses: c.meses,
    })),
    validacao: {
      ok: input.validacao.ok,
      resumo: input.validacao.resumo,
    },
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const empSlug = input.empregador.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `ficha_${empSlug}_${input.ano}.zip`;

  return {
    blob,
    filename,
    resumo: {
      categorias: resumoCategorias,
      rubricas_incluidas: rubricasIncluidas.length,
      rubricas_ignoradas: input.rubricas.length - rubricasIncluidas.length,
      competencias_validacao_ok: input.validacao.resumo.competencias_ok,
      competencias_validacao_fora: input.validacao.resumo.competencias_fora,
    },
    reports,
  };
}

function derivarFlags(rubricas: RubricaEditavel[]): IncidenciaFlags {
  let fgts = false;
  let inss = false;
  let inden = false;
  for (const r of rubricas) {
    if (r.incide_fgts) fgts = true;
    if (r.incide_inss) inss = true;
    if (r.natureza_indenizatoria) inden = true;
  }
  return {
    incide_fgts: fgts,
    fgts_recolhido: false,
    incide_inss: inss,
    inss_recolhido: false,
    natureza_indenizatoria: inden,
  };
}

function buildAuditoriaCSV(rubricas: RubricaEditavel[]): string {
  const HEADER =
    'Codigo;Denominacao;Classe;Categoria;Origem;Total_Ano;Incluido;Modificado';
  const rows = rubricas.map((r) => {
    return [
      r.codigo,
      sanitizeText(r.denominacao, 100),
      r.classificacao || '',
      r.categoria_atual,
      r.origem_enriquecimento,
      formatNumeroBR(r.total_ano),
      r.incluida ? 'S' : 'N',
      r.modificada_pelo_operador ? 'S' : 'N',
    ].join(';');
  });
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
