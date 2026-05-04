/**
 * Análise de cobertura semântica entre documentos de um mesmo case.
 *
 * Cada documento (cartão-ponto, holerite, recibo de férias, registro de
 * faltas) é processado isoladamente em CSVs separados — design intencional
 * do v4 cleanup. Mas isso transfere ao usuário a responsabilidade de
 * verificar **coerência cruzada**: se o cartão de ponto menciona FALTA
 * em 12/05/2024 mas não há um registro_faltas separado uploadado para
 * esse case, a falta literalmente desaparece do cálculo final no PJe-Calc
 * — porque o CSV de jornada exporta uma linha vazia (sem batidas), e o
 * PJe-Calc trata como "ausência implícita" sem categorização.
 *
 * Este módulo é puro (sem dependência de Supabase/UI) e detecta:
 *   - Buracos de calendário em cartão-ponto (períodos sem cobertura)
 *   - Faltas mencionadas em cartão-ponto sem registro_faltas separado
 *   - Férias mencionadas em cartão-ponto sem recibo_ferias separado
 *   - Holerites com gaps de meses dentro do range coberto
 *   - Competências em holerite/cartão-ponto sem holerite correspondente
 *
 * Cada gap retornado tem severidade (`alta` | `media` | `baixa`) e um
 * texto de orientação para o usuário.
 */

import type { ParseCartaoPontoResult } from "../parsers/cartao-ponto";
import type { ParseFeriasResult } from "../parsers/ferias";
import type { ParseFaltasResult } from "../parsers/faltas";
import type { HoleriteParseResult } from "../parsers/holerite/types";

export interface CaseDoc {
  /** ID do documento (UUID Supabase). */
  id: string;
  /** Nome do arquivo (para mensagens). */
  filename: string;
  /** Tipo de extração já confirmado/aplicado. */
  tipo:
    | "cartao_ponto"
    | "holerite"
    | "recibo_ferias"
    | "registro_faltas";
  /** Resultado parseado correspondente ao tipo. */
  parsed:
    | ParseCartaoPontoResult
    | HoleriteParseResult
    | ParseFeriasResult
    | ParseFaltasResult;
}

export type Severidade = "alta" | "media" | "baixa";

export interface CoverageGap {
  /** Categoria do gap (para ícone/cor da UI). */
  tipo:
    | "falta_sem_registro"
    | "ferias_sem_recibo"
    | "competencia_sem_holerite"
    | "buraco_calendario_cartao_ponto"
    | "holerite_gap_meses"
    | "documento_isolado";
  severidade: Severidade;
  /** Mensagem em português curto para a UI. */
  mensagem: string;
  /** Detalhes opcionais (datas, competências, doc IDs). */
  detalhes?: {
    competencias?: string[];
    datas?: string[];
    doc_ids?: string[];
  };
}

export interface CaseCoverageReport {
  /** Total de gaps encontrados. */
  total: number;
  gaps: CoverageGap[];
  /** Range total coberto pelo case (mês mais antigo → mais recente). */
  rangeCompetencias: { inicio: string; fim: string } | null;
  /** Resumo numérico por categoria. */
  resumo: {
    cartoes_ponto: number;
    holerites: number;
    ferias: number;
    faltas: number;
  };
}

/**
 * Helpers de calendário.
 */
function competenciaToNumero(c: string): number | null {
  const m = c.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const mm = parseInt(m[1], 10);
  const yyyy = parseInt(m[2], 10);
  if (mm < 1 || mm > 12 || yyyy < 1900 || yyyy > 2100) return null;
  return yyyy * 12 + (mm - 1);
}

function numeroToCompetencia(n: number): string {
  const yyyy = Math.floor(n / 12);
  const mm = (n % 12) + 1;
  return `${String(mm).padStart(2, "0")}/${yyyy}`;
}

function dataIsoToCompetencia(iso: string): string | null {
  const m = iso.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!m) return null;
  return `${m[2]}/${m[1]}`;
}

/**
 * Computa a análise de cobertura cruzada para um case.
 */
export function analisarCobertura(docs: CaseDoc[]): CaseCoverageReport {
  const gaps: CoverageGap[] = [];

  const cartoes = docs.filter(
    (d): d is CaseDoc & { parsed: ParseCartaoPontoResult } =>
      d.tipo === "cartao_ponto",
  );
  const holerites = docs.filter(
    (d): d is CaseDoc & { parsed: HoleriteParseResult } =>
      d.tipo === "holerite",
  );
  const ferias = docs.filter(
    (d): d is CaseDoc & { parsed: ParseFeriasResult } =>
      d.tipo === "recibo_ferias",
  );
  const faltas = docs.filter(
    (d): d is CaseDoc & { parsed: ParseFaltasResult } =>
      d.tipo === "registro_faltas",
  );

  const resumo = {
    cartoes_ponto: cartoes.length,
    holerites: holerites.length,
    ferias: ferias.length,
    faltas: faltas.length,
  };

  // === Range total de competências cobertas ===
  const competenciasCobertas = new Set<string>();
  for (const c of cartoes) {
    for (const k of c.parsed.competencias.keys()) competenciasCobertas.add(k);
  }
  for (const h of holerites) {
    if (h.parsed.competencia && /^\d{2}\/\d{4}$/.test(h.parsed.competencia)) {
      competenciasCobertas.add(h.parsed.competencia);
    }
  }
  const numeros = [...competenciasCobertas]
    .map(competenciaToNumero)
    .filter((n): n is number => n !== null);
  numeros.sort((a, b) => a - b);
  const rangeCompetencias =
    numeros.length > 0
      ? {
          inicio: numeroToCompetencia(numeros[0]),
          fim: numeroToCompetencia(numeros[numeros.length - 1]),
        }
      : null;

  // === Detecção 1: cartão-ponto com FALTA mas sem registro_faltas ===
  if (cartoes.length > 0) {
    const datasFaltaCartao = new Set<string>();
    for (const c of cartoes) {
      for (const ap of c.parsed.apuracoes) {
        if (ap.ocorrencia === "FALTA") datasFaltaCartao.add(ap.data);
      }
    }
    if (datasFaltaCartao.size > 0 && faltas.length === 0) {
      gaps.push({
        tipo: "falta_sem_registro",
        severidade: "alta",
        mensagem: `${datasFaltaCartao.size} dia(s) de FALTA marcados em cartão-ponto, mas nenhum registro de faltas foi anexado ao caso. As faltas podem desaparecer do cálculo final.`,
        detalhes: {
          datas: [...datasFaltaCartao].sort().slice(0, 10),
        },
      });
    } else if (datasFaltaCartao.size > 0 && faltas.length > 0) {
      // Cruza: para cada data de FALTA no cartão, há cobertura nos registros?
      const datasFaltasCobertas = new Set<string>();
      for (const f of faltas) {
        for (const fa of f.parsed.faltas) {
          // Expande intervalo data_inicio..data_fim
          const ini = fa.data_inicio;
          const fim = fa.data_fim;
          if (!ini || !fim) continue;
          const d1 = new Date(ini + "T00:00:00Z");
          const d2 = new Date(fim + "T00:00:00Z");
          for (
            let d = new Date(d1);
            d <= d2;
            d.setUTCDate(d.getUTCDate() + 1)
          ) {
            datasFaltasCobertas.add(d.toISOString().slice(0, 10));
          }
        }
      }
      const naoCobertas = [...datasFaltaCartao].filter(
        (d) => !datasFaltasCobertas.has(d),
      );
      if (naoCobertas.length > 0) {
        gaps.push({
          tipo: "falta_sem_registro",
          severidade: "alta",
          mensagem: `${naoCobertas.length} falta(s) marcadas no cartão-ponto sem cobertura nos registros de falta uploadados.`,
          detalhes: { datas: naoCobertas.sort().slice(0, 10) },
        });
      }
    }
  }

  // === Detecção 2: cartão-ponto com FERIAS mas sem recibo de férias ===
  if (cartoes.length > 0) {
    const datasFeriasCartao = new Set<string>();
    for (const c of cartoes) {
      for (const ap of c.parsed.apuracoes) {
        if (ap.ocorrencia === "FERIAS") datasFeriasCartao.add(ap.data);
      }
    }
    if (datasFeriasCartao.size > 0 && ferias.length === 0) {
      gaps.push({
        tipo: "ferias_sem_recibo",
        severidade: "media",
        mensagem: `${datasFeriasCartao.size} dia(s) de FÉRIAS marcados em cartão-ponto, mas nenhum recibo de férias foi anexado. Sem recibo, parâmetros como abono pecuniário e dobra (art. 137 CLT) podem ser perdidos no cálculo.`,
        detalhes: {
          datas: [...datasFeriasCartao].sort().slice(0, 10),
        },
      });
    }
  }

  // === Detecção 3: cartão-ponto cobrindo competências sem holerite ===
  if (cartoes.length > 0 && holerites.length > 0) {
    const compsCartao = new Set<string>();
    for (const c of cartoes) {
      for (const k of c.parsed.competencias.keys()) compsCartao.add(k);
    }
    const compsHolerite = new Set<string>();
    for (const h of holerites) {
      if (h.parsed.competencia && /^\d{2}\/\d{4}$/.test(h.parsed.competencia)) {
        compsHolerite.add(h.parsed.competencia);
      }
    }
    const semHolerite = [...compsCartao].filter((c) => !compsHolerite.has(c));
    if (semHolerite.length > 0) {
      gaps.push({
        tipo: "competencia_sem_holerite",
        severidade: "media",
        mensagem: `${semHolerite.length} competência(s) com cartão-ponto mas sem holerite correspondente. Cálculo de horas extras precisa do salário-base do mês.`,
        detalhes: { competencias: semHolerite.sort() },
      });
    }
  }

  // === Detecção 4: buracos de calendário em cartão-ponto ===
  // Para cada doc de cartão-ponto, dentro do data_inicial..data_final, conta
  // dias trabalhados/registrados e detecta runs de >=10 dias consecutivos
  // sem cobertura (gaps internos do espelho).
  for (const c of cartoes) {
    if (!c.parsed.data_inicial || !c.parsed.data_final) continue;
    const datasCobertasSet = new Set(
      c.parsed.apuracoes.map((a) => a.data),
    );
    const ini = new Date(c.parsed.data_inicial + "T00:00:00Z");
    const fim = new Date(c.parsed.data_final + "T00:00:00Z");
    if (isNaN(ini.getTime()) || isNaN(fim.getTime()) || fim < ini) continue;
    let runVazio = 0;
    let runInicio: string | null = null;
    const buracos: Array<{ inicio: string; fim: string }> = [];
    for (
      let d = new Date(ini);
      d <= fim;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const iso = d.toISOString().slice(0, 10);
      if (datasCobertasSet.has(iso)) {
        if (runVazio >= 10 && runInicio) {
          const fimBuraco = new Date(d);
          fimBuraco.setUTCDate(fimBuraco.getUTCDate() - 1);
          buracos.push({
            inicio: runInicio,
            fim: fimBuraco.toISOString().slice(0, 10),
          });
        }
        runVazio = 0;
        runInicio = null;
      } else {
        if (runVazio === 0) runInicio = iso;
        runVazio++;
      }
    }
    if (runVazio >= 10 && runInicio) {
      buracos.push({ inicio: runInicio, fim: fim.toISOString().slice(0, 10) });
    }
    if (buracos.length > 0) {
      gaps.push({
        tipo: "buraco_calendario_cartao_ponto",
        severidade: "media",
        mensagem: `${c.filename}: ${buracos.length} período(s) de ≥10 dias sem cobertura dentro do range do espelho. Pode ser falha de OCR ou páginas faltando.`,
        detalhes: {
          datas: buracos.map((b) => `${b.inicio}..${b.fim}`),
          doc_ids: [c.id],
        },
      });
    }
  }

  // === Detecção 5: holerite gap de meses ===
  if (holerites.length >= 3) {
    const compsHolerite = holerites
      .map((h) => h.parsed.competencia)
      .filter((c): c is string => !!c && /^\d{2}\/\d{4}$/.test(c))
      .map(competenciaToNumero)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
    const gapsMeses: string[] = [];
    for (let i = 1; i < compsHolerite.length; i++) {
      const diff = compsHolerite[i] - compsHolerite[i - 1];
      if (diff > 1) {
        for (let g = compsHolerite[i - 1] + 1; g < compsHolerite[i]; g++) {
          gapsMeses.push(numeroToCompetencia(g));
        }
      }
    }
    if (gapsMeses.length > 0) {
      gaps.push({
        tipo: "holerite_gap_meses",
        severidade: gapsMeses.length >= 3 ? "alta" : "media",
        mensagem: `${gapsMeses.length} mês(es) sem holerite dentro do range coberto. Buracos no histórico salarial impactam médias e prescrição.`,
        detalhes: { competencias: gapsMeses },
      });
    }
  }

  // === Detecção 6: caso com 1 doc isolado (sem coordenação possível) ===
  if (docs.length === 1) {
    gaps.push({
      tipo: "documento_isolado",
      severidade: "baixa",
      mensagem: `Caso tem apenas 1 documento. Cálculo trabalhista normalmente exige holerites + cartão-ponto + recibos de férias do período pleiteado.`,
    });
  }

  return {
    total: gaps.length,
    gaps,
    rangeCompetencias,
    resumo,
  };
}
