/**
 * Validação anti-alucinação puramente determinística — verifica que toda
 * data/hora mencionada no output do LLM existe no OCR original.
 *
 * Separado de `client.ts` (que puxa supabase) para ser testável em Node
 * sem mockar localStorage.
 *
 * IMPORTANTE — anti-alucinação CONTEXTUAL:
 *   Cartão-ponto não verifica apenas "essa hora existe NO OCR" (vulnerabilidade:
 *   IA pode pegar 22:00 do dia 5 e plantar no dia 16). Em vez disso, para cada
 *   apuração, exige que cada hora apareça em ALGUMA das linhas do OCR onde
 *   a DATA daquela apuração também aparece — uma janela contextual.
 *
 *   Holerite não verifica apenas "alguma palavra >3 chars existe" (IA inventa
 *   "INSS PATRONAL" sobre "INSS Empregado"). Em vez disso, exige similaridade
 *   Levenshtein ≥75% entre o nome da rubrica e alguma janela de palavras
 *   contíguas do OCR.
 */
import type {
  CartaoPontoLLMOutput,
  FeriasLLMOutput,
  FaltasLLMOutput,
  HoleriteLLMOutput,
  LLMTipoDoc,
} from "./schemas";

export interface LLMExtractionError {
  code: "auth" | "schema" | "alucinacao" | "rede" | "openai" | "interna";
  message: string;
  detalhes?: unknown;
}

export class LLMExtractError extends Error {
  constructor(public payload: LLMExtractionError) {
    super(payload.message);
    this.name = "LLMExtractError";
  }
}

const RE_DATA_BR = /\b\d{2}\/\d{2}\/\d{4}\b/g;
const RE_DATA_ISO = /\b\d{4}-\d{2}-\d{2}\b/g;
const RE_HORA = /\b\d{1,2}:\d{2}\b/g;

function dataBRToIso(d: string): string {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function dataIsoToBR(d: string): string {
  const [yyyy, mm, dd] = d.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Para cada data ISO, devolve o Set de horas HH:MM que aparecem em alguma
 * linha do OCR contendo essa data (BR ou ISO). Linhas-continuação imediatas
 * (sem outra data entre elas) também são consideradas — o OCR às vezes parte
 * uma linha de tabela em duas e horários sobram na linha seguinte.
 *
 * A expansão para vizinhas PARA quando encontra outra data, evitando que
 * 22:00 do dia 15 vaze como hora válida do dia 14 (cross-day attack).
 */
function indexarHorasPorData(ocr: string): Map<string, Set<string>> {
  const linhas = ocr.split(/\r?\n/);
  // Regex sem /g pra usar `.test()` sem efeito colateral em lastIndex.
  const reDataBRLinha = /\b\d{2}\/\d{2}\/\d{4}\b/;
  const reDataIsoLinha = /\b\d{4}-\d{2}-\d{2}\b/;
  const linhaTemData: boolean[] = linhas.map(
    (l) => reDataBRLinha.test(l) || reDataIsoLinha.test(l),
  );

  const linhasComData: Map<string, number[]> = new Map();
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    for (const m of l.matchAll(RE_DATA_BR)) {
      const iso = dataBRToIso(m[0]);
      if (!linhasComData.has(iso)) linhasComData.set(iso, []);
      linhasComData.get(iso)!.push(i);
    }
    for (const m of l.matchAll(RE_DATA_ISO)) {
      const iso = m[0];
      if (!linhasComData.has(iso)) linhasComData.set(iso, []);
      linhasComData.get(iso)!.push(i);
    }
  }

  const horasNaLinha: string[][] = linhas.map((l) => {
    const out: string[] = [];
    for (const m of l.matchAll(RE_HORA)) {
      const [hh, mm] = m[0].split(":");
      const hi = parseInt(hh, 10);
      const mi = parseInt(mm, 10);
      if (hi >= 0 && hi <= 23 && mi >= 0 && mi <= 59) {
        out.push(`${hh.padStart(2, "0")}:${mm}`);
      }
    }
    return out;
  });

  const out = new Map<string, Set<string>>();
  for (const [data, idxs] of linhasComData.entries()) {
    const set = new Set<string>();
    for (const idx of idxs) {
      // Adiciona horas da própria linha
      for (const h of horasNaLinha[idx]) set.add(h);
      // Expande para baixo até a próxima linha com data
      for (let j = idx + 1; j < linhas.length; j++) {
        if (linhaTemData[j]) break;
        for (const h of horasNaLinha[j]) set.add(h);
      }
      // NÃO expande para cima — apuração começa NA linha com data; horas
      // anteriores pertencem ao dia anterior (se houver) ou ao cabeçalho.
    }
    out.set(data, set);
  }
  return out;
}

/**
 * Distância de Levenshtein entre duas strings. Usa programação dinâmica
 * com matriz de tamanho (m+1)×(n+1).
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1, // inserção
        prev[j] + 1, // remoção
        prev[j - 1] + cost, // substituição
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica se `nome` aparece no OCR com similaridade Levenshtein ≥ `minSim`
 * (default 0.75). Estratégia em camadas (mais barato → mais caro):
 *   1. Match exato por substring no OCR normalizado (O(n)).
 *   2. Janela deslizante por NÚMERO DE PALAVRAS (não chars): tenta janelas
 *      de (k-1, k, k+1) palavras onde k = palavras do nome. Para cada janela,
 *      calcula similaridade Levenshtein.
 *
 * Conservador o suficiente para passar variações OCR ("CONTRIB. SINDICAL" vs
 * "Contribuição Sindical") e estrito o suficiente para rejeitar invenções
 * próximas ("INSS Empregado" no OCR vs "INSS Patronal" inventado pela IA).
 */
function nomeApareceFuzzy(
  nome: string,
  ocrNorm: string,
  minSim = 0.75,
): boolean {
  if (nome.length < 3) return true;
  // Camada 1: match exato (otimização rápida).
  if (ocrNorm.includes(nome)) return true;
  // Camada 2: janela deslizante por palavras.
  const palavrasNome = nome.split(/\s+/).filter((p) => p.length > 0);
  if (palavrasNome.length === 0) return true;
  const palavrasOcr = ocrNorm.split(/\s+/).filter((p) => p.length > 0);
  const k = palavrasNome.length;
  const tamanhos = k === 1 ? [1] : [k - 1, k, k + 1];
  for (const tam of tamanhos) {
    if (tam <= 0 || tam > palavrasOcr.length) continue;
    for (let i = 0; i + tam <= palavrasOcr.length; i++) {
      const trecho = palavrasOcr.slice(i, i + tam).join(" ");
      if (similarity(nome, trecho) >= minSim) return true;
    }
  }
  return false;
}

/**
 * Verifica que toda data/hora mencionada no output do LLM existe no OCR
 * original (em alguma forma textual). Se o LLM alucinou uma data,
 * levanta LLMExtractError com code=alucinacao.
 */
export function validateAntiAlucinacao(
  tipo: LLMTipoDoc,
  output:
    | CartaoPontoLLMOutput
    | FeriasLLMOutput
    | FaltasLLMOutput
    | HoleriteLLMOutput,
  ocr: string,
): void {
  const datasBR = new Set([...ocr.matchAll(RE_DATA_BR)].map((m) => m[0]));
  const datasIso = new Set<string>();
  for (const d of datasBR) datasIso.add(dataBRToIso(d));
  for (const m of ocr.matchAll(RE_DATA_ISO)) datasIso.add(m[0]);

  const horas = new Set<string>();
  for (const m of ocr.matchAll(RE_HORA)) {
    const [hh, mm] = m[0].split(":");
    if (parseInt(hh, 10) <= 23 && parseInt(mm, 10) <= 59) {
      horas.add(`${hh.padStart(2, "0")}:${mm}`);
    }
  }

  if (tipo === "cartao_ponto") {
    const o = output as CartaoPontoLLMOutput;
    // Anti-alucinação CONTEXTUAL: cada hora da apuração precisa aparecer em
    // alguma linha do OCR onde a data daquela apuração TAMBÉM aparece.
    // Bloqueia o vetor "IA pega 22:00 do dia 5 e atribui ao dia 16".
    const horasPorData = indexarHorasPorData(ocr);
    for (const a of o.apuracoes) {
      if (!datasIso.has(a.data)) {
        throw new LLMExtractError({
          code: "alucinacao",
          message: `LLM gerou data ${a.data} que não está no OCR`,
        });
      }
      const horasDoDia = horasPorData.get(a.data) ?? new Set<string>();
      for (const m of a.marcacoes) {
        for (const h of [m.e, m.s]) {
          if (!h || h === "") continue;
          // Fallback: se o índice por data está vazio (data parsable mas sem
          // horas próximas no OCR), aceita se a hora existe globalmente —
          // evita falso-positivo em layouts atípicos.
          const okContexto = horasDoDia.has(h);
          const okGlobal = horas.has(h);
          if (!okContexto && !okGlobal) {
            throw new LLMExtractError({
              code: "alucinacao",
              message: `LLM gerou hora ${h} (data ${a.data}) que não está no OCR`,
            });
          }
          if (!okContexto && horasDoDia.size > 0) {
            // Hora existe no OCR mas NÃO em linha próxima da data — sinal forte
            // de que a IA cruzou dados de outro dia.
            throw new LLMExtractError({
              code: "alucinacao",
              message: `LLM gerou hora ${h} para a data ${a.data} (${dataIsoToBR(a.data)}), mas essa hora não aparece em nenhuma linha do OCR contendo essa data`,
            });
          }
        }
      }
    }
  } else if (tipo === "recibo_ferias") {
    const o = output as FeriasLLMOutput;
    for (const f of o.ferias) {
      for (const g of [f.gozo1, f.gozo2, f.gozo3]) {
        if (!g) continue;
        if (!datasBR.has(g.inicio) && !datasIso.has(dataBRToIso(g.inicio))) {
          throw new LLMExtractError({
            code: "alucinacao",
            message: `LLM gerou data de gozo ${g.inicio} que não está no OCR`,
          });
        }
        if (!datasBR.has(g.fim) && !datasIso.has(dataBRToIso(g.fim))) {
          throw new LLMExtractError({
            code: "alucinacao",
            message: `LLM gerou data de gozo ${g.fim} que não está no OCR`,
          });
        }
      }
    }
  } else if (tipo === "registro_faltas") {
    const o = output as FaltasLLMOutput;
    for (const f of o.faltas) {
      if (!datasIso.has(f.data_inicio)) {
        throw new LLMExtractError({
          code: "alucinacao",
          message: `LLM gerou data ${f.data_inicio} que não está no OCR`,
        });
      }
      if (!datasIso.has(f.data_fim)) {
        throw new LLMExtractError({
          code: "alucinacao",
          message: `LLM gerou data ${f.data_fim} que não está no OCR`,
        });
      }
    }
  } else if (tipo === "holerite") {
    const o = output as HoleriteLLMOutput;
    // Normaliza OCR: lowercase + remove acentos/pontuação pra match fuzzy.
    const ocrNorm = normalizeText(ocr);
    for (const r of o.rubricas) {
      if (!r.nome || r.nome.length < 3) continue;
      const nomeNorm = normalizeText(r.nome);
      if (nomeNorm.length < 3) continue;
      // Exige que o nome inteiro apareça no OCR com similaridade ≥75%.
      // Bloqueia o vetor "IA inventa 'INSS Patronal' a partir de 'INSS Empregado'".
      if (!nomeApareceFuzzy(nomeNorm, ocrNorm, 0.75)) {
        throw new LLMExtractError({
          code: "alucinacao",
          message: `LLM gerou rubrica "${r.nome}" que não aparece no OCR (similaridade <75%)`,
        });
      }
    }
  }
}
