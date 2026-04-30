// Validação JSON da resposta da LLM. Sem zod (Deno nem sempre tem peer
// disponível) — validador minimalista feito à mão. Se a resposta não bate,
// extracao_status=failed e o usuário re-extrai ou cria rubricas manuais.

export type HoleriteRow = {
  codigo: string | null;
  nome: string;
  valor_vencimento: number | null;
  valor_desconto: number | null;
  quantidade: number | null;
};

export type HoleriteResponse = {
  competencia: string;
  rubricas: HoleriteRow[];
};

export type GozoPeriodoJSON = {
  inicio: string;
  fim: string;
  dobra: boolean;
};

export type FeriasRow = {
  relativa: string;
  prazo: number;
  situacao: 'G' | 'GP' | 'NG' | 'I' | 'P';
  dobra_geral: boolean;
  abono: boolean;
  dias_abono: number;
  gozo1: GozoPeriodoJSON | null;
  gozo2: GozoPeriodoJSON | null;
  gozo3: GozoPeriodoJSON | null;
};

export type FeriasResponse = { ferias: FeriasRow[] };

export type FaltaRow = {
  data_inicio: string; // dd/MM/yyyy
  data_fim: string;
  justificada: boolean;
  reiniciar_periodo_aquisitivo: boolean;
  justificativa?: string | null;
};

export type FaltasResponse = { faltas: FaltaRow[] };

const COMPETENCIA_RE = /^\d{2}\/\d{4}$/;
const DATA_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const SITUACAO_VALUES = new Set(['G', 'GP', 'NG', 'I', 'P']);

export function parseHolerite(raw: unknown): HoleriteResponse | null {
  if (!isObj(raw)) return null;
  const competencia = raw.competencia;
  if (typeof competencia !== 'string' || !COMPETENCIA_RE.test(competencia)) return null;
  if (!Array.isArray(raw.rubricas)) return null;

  const rubricas: HoleriteRow[] = [];
  for (const r of raw.rubricas) {
    if (!isObj(r)) continue;
    const nome = r.nome;
    if (typeof nome !== 'string' || nome.trim().length === 0) continue;
    rubricas.push({
      codigo: typeof r.codigo === 'string' ? r.codigo : null,
      nome,
      valor_vencimento: numOrNull(r.valor_vencimento),
      valor_desconto: numOrNull(r.valor_desconto),
      quantidade: numOrNull(r.quantidade),
    });
  }
  return { competencia, rubricas };
}

export function parseFerias(raw: unknown): FeriasResponse | null {
  if (!isObj(raw) || !Array.isArray(raw.ferias)) return null;
  const ferias: FeriasRow[] = [];
  for (const f of raw.ferias) {
    if (!isObj(f)) continue;
    if (typeof f.relativa !== 'string' || f.relativa.trim().length === 0) continue;
    if (typeof f.prazo !== 'number' || f.prazo <= 0) continue;
    if (typeof f.situacao !== 'string' || !SITUACAO_VALUES.has(f.situacao)) continue;
    ferias.push({
      relativa: f.relativa,
      prazo: f.prazo | 0,
      situacao: f.situacao as FeriasRow['situacao'],
      dobra_geral: !!f.dobra_geral,
      abono: !!f.abono,
      dias_abono: typeof f.dias_abono === 'number' ? f.dias_abono | 0 : 0,
      gozo1: parseGozo(f.gozo1),
      gozo2: parseGozo(f.gozo2),
      gozo3: parseGozo(f.gozo3),
    });
  }
  return { ferias };
}

export function parseFaltas(raw: unknown): FaltasResponse | null {
  if (!isObj(raw) || !Array.isArray(raw.faltas)) return null;
  const faltas: FaltaRow[] = [];
  for (const f of raw.faltas) {
    if (!isObj(f)) continue;
    if (typeof f.data_inicio !== 'string' || !DATA_RE.test(f.data_inicio)) continue;
    if (typeof f.data_fim !== 'string' || !DATA_RE.test(f.data_fim)) continue;
    if (typeof f.justificada !== 'boolean') continue;
    faltas.push({
      data_inicio: f.data_inicio,
      data_fim: f.data_fim,
      justificada: f.justificada,
      reiniciar_periodo_aquisitivo: !!f.reiniciar_periodo_aquisitivo,
      justificativa: typeof f.justificativa === 'string' ? f.justificativa : null,
    });
  }
  return { faltas };
}

function parseGozo(g: unknown): GozoPeriodoJSON | null {
  if (!isObj(g)) return null;
  if (typeof g.inicio !== 'string' || !DATA_RE.test(g.inicio)) return null;
  if (typeof g.fim !== 'string' || !DATA_RE.test(g.fim)) return null;
  return { inicio: g.inicio, fim: g.fim, dobra: !!g.dobra };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
