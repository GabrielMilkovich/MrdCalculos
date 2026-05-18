// =====================================================
// FASE 2 — Anti-alucinação compartilhada (extract-rubricas-ai)
// =====================================================
// Lógica de verificação substring com variantes BR. Mantida em
// `_shared/` para:
//   1. Ser importada pelo edge function Deno (extract-rubricas-ai/index.ts)
//   2. Ser testada por Vitest no runtime Node sem deno test
// Sem imports Deno-only — TS puro.
// =====================================================

export interface RubricaExtracted {
  codigo: string | null;
  nome: string;
  valor_vencimento: number | null;
  valor_desconto: number | null;
  quantidade: number | null;
}

export interface TotalizadoresExtracted {
  bruto: number | null;
  descontos: number | null;
  liquido: number | null;
}

export interface ExtractedPayload {
  competencia: string | null;
  rubricas: RubricaExtracted[];
  totalizadores: TotalizadoresExtracted;
}

export interface DiscardedHallucination {
  field: string;
  suggested: string;
  reason: string;
}

/**
 * Gera as formas que um número monetário pode aparecer no OCR BR.
 *
 * Para `1234.56` retorna:
 *   ["1.234,56", "1234,56", "r$ 1.234,56", "r$1.234,56", "1234.56", "1234"]
 *
 * Todas em lowercase porque o caller normaliza o OCR para lowercase antes.
 */
export function gerarVariantesBR(n: number): string[] {
  if (!Number.isFinite(n)) return [];
  const abs = Math.abs(n);
  const fixed2 = abs.toFixed(2); // "1234.56"
  const [parteInt, parteDec] = fixed2.split(".");
  const comMilhar = parteInt.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const formatBR = `${comMilhar},${parteDec}`;
  const formatBRsemMilhar = `${parteInt},${parteDec}`;

  const variantes = new Set<string>();
  variantes.add(formatBR.toLowerCase());
  variantes.add(formatBRsemMilhar.toLowerCase());
  variantes.add(`r$ ${formatBR}`.toLowerCase());
  variantes.add(`r$${formatBR}`.toLowerCase());
  variantes.add(`r$ ${formatBRsemMilhar}`.toLowerCase());
  variantes.add(fixed2.toLowerCase());
  if (Number.isInteger(n)) {
    variantes.add(String(Math.trunc(abs)));
  }
  return [...variantes];
}

/**
 * Verifica se `valor` aparece literalmente no OCR. Para números, testa
 * variantes BR comuns. Para strings, substring direto (case-insensitive,
 * espaços normalizados).
 *
 * @param valor             valor a buscar (string, number, ou null)
 * @param ocrNormalizado   OCR já normalizado: lowercase + espaços colapsados
 */
export function valorAparecemNoOcr(
  valor: unknown,
  ocrNormalizado: string,
): boolean {
  if (valor === null || valor === undefined) return true;

  if (typeof valor === "string") {
    const s = valor.trim().toLowerCase().replace(/\s+/g, " ");
    if (s === "") return true;
    return ocrNormalizado.includes(s);
  }

  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) return false;
    const variantes = gerarVariantesBR(valor);
    return variantes.some((v) => ocrNormalizado.includes(v));
  }

  return false;
}

/**
 * Competência MM/yyyy aceita também MM-yyyy, MM.yyyy, MM/yy, mes por
 * extenso ("ago/2024", "Agosto de 2024").
 */
export function competenciaAparecemNoOcr(
  comp: string,
  ocrNormalizado: string,
): boolean {
  if (!comp) return false;
  const m = comp.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return ocrNormalizado.includes(comp.toLowerCase());
  const mm = m[1];
  const yyyy = m[2];
  const yy = yyyy.slice(2);
  const meses = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  const mesNome = meses[parseInt(mm, 10) - 1];
  const variantes = [
    `${mm}/${yyyy}`,
    `${mm}-${yyyy}`,
    `${mm}.${yyyy}`,
    `${mm}/${yy}`,
    mesNome ? `${mesNome}/${yyyy}` : "",
    mesNome ? `${mesNome}/${yy}` : "",
    mesNome ? `${mesNome} ${yyyy}` : "",
    mesNome ? `${mesNome} de ${yyyy}` : "",
  ].filter((v) => v.length > 0);
  return variantes.some((v) => ocrNormalizado.includes(v.toLowerCase()));
}

/**
 * Normaliza o OCR para comparação: lowercase + espaços colapsados.
 * Apenas helper para o caller — exporta para que testes possam normalizar
 * de forma consistente com o produção.
 */
export function normalizarOcr(ocr: string): string {
  return ocr.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Aplica anti-alucinação ao payload do LLM. Retorna `extracted` limpo
 * (sem valores não-substring) + lista de `discarded` (cada item com field
 * path + razão explicativa).
 *
 * Comportamento:
 *   - Competência fora do OCR → competencia=null + discarded.
 *   - Rubrica.nome fora do OCR → rubrica inteira descartada.
 *   - Rubrica.valor_vencimento OU .valor_desconto fora do OCR → o campo
 *     vira null. Se ambos null após verificação → rubrica inteira descartada.
 *   - Totalizador fora do OCR → vira null + discarded.
 */
export function aplicarAntiAlucinacao(
  payload: ExtractedPayload,
  ocrText: string,
): { extracted: ExtractedPayload; discarded: DiscardedHallucination[] } {
  const ocrN = normalizarOcr(ocrText);
  const discarded: DiscardedHallucination[] = [];

  // Competência.
  let competencia: string | null = payload.competencia;
  if (competencia && !competenciaAparecemNoOcr(competencia, ocrN)) {
    discarded.push({
      field: "competencia",
      suggested: competencia,
      reason: "Competência não encontrada no OCR (com variantes mes/yy, por extenso, separadores)",
    });
    competencia = null;
  }

  // Rubricas.
  const rubricas: RubricaExtracted[] = [];
  for (let i = 0; i < payload.rubricas.length; i++) {
    const r = payload.rubricas[i];
    if (!valorAparecemNoOcr(r.nome, ocrN)) {
      discarded.push({
        field: `rubricas[${i}].nome`,
        suggested: r.nome,
        reason: "Nome da rubrica não encontrado no OCR",
      });
      continue;
    }
    let valVenc: number | null = r.valor_vencimento;
    let valDesc: number | null = r.valor_desconto;
    if (valVenc !== null && !valorAparecemNoOcr(valVenc, ocrN)) {
      discarded.push({
        field: `rubricas[${i}].valor_vencimento`,
        suggested: String(valVenc),
        reason: `Valor ${valVenc} (rubrica "${r.nome}") não encontrado no OCR em nenhuma variante BR`,
      });
      valVenc = null;
    }
    if (valDesc !== null && !valorAparecemNoOcr(valDesc, ocrN)) {
      discarded.push({
        field: `rubricas[${i}].valor_desconto`,
        suggested: String(valDesc),
        reason: `Valor ${valDesc} (rubrica "${r.nome}") não encontrado no OCR em nenhuma variante BR`,
      });
      valDesc = null;
    }
    if (valVenc === null && valDesc === null) {
      discarded.push({
        field: `rubricas[${i}]`,
        suggested: r.nome,
        reason: "Rubrica sem valor verificável — descartada inteira",
      });
      continue;
    }
    rubricas.push({
      codigo: r.codigo,
      nome: r.nome,
      valor_vencimento: valVenc,
      valor_desconto: valDesc,
      quantidade:
        r.quantidade !== null && !valorAparecemNoOcr(r.quantidade, ocrN)
          ? null
          : r.quantidade,
    });
  }

  // Totalizadores.
  const tot: TotalizadoresExtracted = { bruto: null, descontos: null, liquido: null };
  for (const k of ["bruto", "descontos", "liquido"] as const) {
    const v = payload.totalizadores[k];
    if (v === null) continue;
    if (valorAparecemNoOcr(v, ocrN)) {
      tot[k] = v;
    } else {
      discarded.push({
        field: `totalizadores.${k}`,
        suggested: String(v),
        reason: `Totalizador ${k}=${v} não encontrado no OCR`,
      });
    }
  }

  return {
    extracted: { competencia, rubricas, totalizadores: tot },
    discarded,
  };
}
