/**
 * Auto-detecção de tipo de extração a partir do texto OCR.
 *
 * Usa regex heurística com sistema de pontos: cada padrão acerta soma N
 * pontos no tipo correspondente. O tipo com mais pontos vence, mas só
 * "alta confiança" se score >= 12 e diferença pra 2º lugar >= 4.
 *
 * Tipos detectáveis: holerite, cartao_ponto, ctps.
 *
 * **F1.3 — `ctps` cobre 3 casos**: recibo de férias avulso, registro de
 * faltas avulso, e CTPS/espelho que contém ambos. Os SINAIS_FERIAS e
 * SINAIS_FALTAS contribuem TODOS para o score `ctps`, junto com
 * SINAIS_CTPS_CABECALHO (cabeçalho "Carteira de Trabalho"). Eliminamos
 * a separação anterior em `recibo_ferias` / `registro_faltas` porque o
 * pipeline a jusante (mappers V6 + buildCtpsZip) já dispara os 2
 * parsers no mesmo OCR e gera 1 CSV por tipo (header-only quando vazio).
 *
 * Auto-disparo de extração só ocorre quando confiança = 'alta' (§6 do
 * spec). 'media' espera clique humano, 'baixa' fica em pending.
 */

import type { TipoExtracao, ConfiancaAuto } from "../types";

type Sinal = { pattern: RegExp; pontos: number; motivo: string };

const SINAIS_HOLERITE: Sinal[] = [
  {
    pattern: /\b(recibo\s+de\s+pagamento|holerite|contracheque|contra-?cheque)\b/i,
    pontos: 10,
    motivo: "cabeçalho de holerite",
  },
  {
    pattern: /\bvencimentos\b[\s\S]*?\bdescontos\b/i,
    pontos: 8,
    motivo: "colunas vencimentos/descontos",
  },
  {
    pattern: /\bbase\s+(de\s+)?c[áa]lculo\s+(do\s+)?(inss|fgts|irrf)\b/i,
    pontos: 6,
    motivo: "base de cálculo INSS/FGTS",
  },
  {
    pattern: /\brefer[êe]ncia\b[\s\S]*?\b\d{2}\/\d{4}\b/i,
    pontos: 4,
    motivo: "campo referência MM/AAAA",
  },
  {
    pattern: /\b(comiss[õo]es?|dsr|pr[êe]mio)\b/i,
    pontos: 3,
    motivo: "rubrica típica de holerite",
  },
];

const SINAIS_FERIAS: Sinal[] = [
  {
    pattern: /\b(recibo|aviso|comunicado)\s+de\s+f[ée]rias\b/i,
    pontos: 10,
    motivo: "cabeçalho de férias",
  },
  {
    pattern: /\bper[íi]odo\s+aquisitivo\b/i,
    pontos: 8,
    motivo: "menção a período aquisitivo",
  },
  {
    pattern: /\bper[íi]odo\s+de\s+gozo\b/i,
    pontos: 6,
    motivo: "menção a período de gozo",
  },
  {
    pattern: /\babono\s+pecuni[áa]rio\b/i,
    pontos: 4,
    motivo: "abono pecuniário",
  },
  {
    pattern: /\b1\/3\s+constitucional\b|\bter[çc]o\s+constitucional\b/i,
    pontos: 4,
    motivo: "terço constitucional",
  },
];

const SINAIS_FALTAS: Sinal[] = [
  {
    pattern: /\b(folha|registro|controle)\s+de\s+(faltas|frequ[êe]ncia)\b/i,
    pontos: 10,
    motivo: "cabeçalho de faltas",
  },
  {
    pattern: /\batestado\s+m[ée]dico\b/i,
    pontos: 8,
    motivo: "atestado médico",
  },
  {
    pattern: /\bcid[\s:-]+[a-z]\d{2}/i,
    pontos: 6,
    motivo: "código CID",
  },
  {
    pattern: /\baus[êe]ncia\s+(injustificada|justificada)\b/i,
    pontos: 6,
    motivo: "ausência justificada/injustificada",
  },
];

const SINAIS_FICHA_FINANCEIRA: Sinal[] = [
  {
    pattern: /\bficha\s+financeira\b/i,
    pontos: 10,
    motivo: "título 'Ficha Financeira'",
  },
  {
    pattern: /\bano\s+compet[eê]ncia\s*:\s*\d{4}\b/i,
    pontos: 8,
    motivo: "header 'Ano Competência: YYYY'",
  },
  {
    pattern: /janeiro.*fevereiro.*mar[çc]o.*abril/is,
    pontos: 6,
    motivo: "colunas com 4+ meses distintos",
  },
  {
    pattern: /\bpgto\b[\s\S]{0,200}?\bdesc\b/i,
    pontos: 4,
    motivo: "classificações PGTO/DESC no corpo",
  },
  {
    pattern: /\b\d{4}\s+[A-ZÀ-ÚÇ][\wÀ-úÇç\s/.]+\s*\|\s*(PGTO|DESC|BASE|ENCAR)/i,
    pontos: 6,
    motivo: "linha com código 4 dígitos + classificação ADP",
  },
];

const SINAIS_CARTAO_PONTO: Sinal[] = [
  {
    pattern: /\bcart[ãa]o\s+de\s+ponto\b|\bespelho\s+de\s+ponto\b/i,
    pontos: 10,
    motivo: "cabeçalho cartão/espelho de ponto",
  },
  {
    pattern: /\bjornada\s+de\s+trabalho\b/i,
    pontos: 8,
    motivo: "jornada de trabalho",
  },
  {
    pattern: /\bbatidas?\b[\s\S]{0,50}?\b(entrada|sa[íi]da)\b/i,
    pontos: 6,
    motivo: "colunas batidas/entrada/saída",
  },
  {
    pattern:
      /\b(entrada)\b[\s\S]{0,40}?\b(sa[íi]da)\b[\s\S]{0,40}?\b(entrada)\b[\s\S]{0,40}?\b(sa[íi]da)\b/i,
    pontos: 4,
    motivo: "duplas entrada/saída",
  },
  {
    pattern: /\b\d{2}\/\d{2}\/\d{4}\b[\s\S]{0,100}?\b\d{1,2}:\d{2}\b[\s\S]{0,30}?\b\d{1,2}:\d{2}\b/i,
    pontos: 4,
    motivo: "data + múltiplos horários",
  },
];

// Sinais de "Carteira de Trabalho" (CTPS) — não basta ter "CTPS" no texto;
// vamos exigir esses sinais EM CONJUNTO com pontos de férias OU faltas para
// classificar como ctps. Veja `detectarCtps` abaixo.
const SINAIS_CTPS_CABECALHO: Sinal[] = [
  {
    pattern:
      /\bcarteira\s+de\s+trabalho(\s+e\s+previd[êe]ncia\s+social)?\b/i,
    pontos: 10,
    motivo: "cabeçalho 'Carteira de Trabalho'",
  },
  {
    pattern: /\bCTPS\b/i,
    pontos: 6,
    motivo: "sigla CTPS",
  },
  {
    pattern: /\b(anota[çc][õo]es?\s+gerais|altera[çc][õo]es?\s+de\s+sal[áa]rio)\b/i,
    pontos: 4,
    motivo: "campos típicos de CTPS",
  },
];

export type AutoDetectResult = {
  tipo: TipoExtracao;
  confianca: ConfiancaAuto;
  motivos: string[];
  scoresPorTipo: Record<string, number>;
};

const MIN_OCR_LENGTH = 50;
const MIN_SCORE_TO_DETECT = 6;
const MIN_GAP_TO_FIRST = 4;
const SCORE_FOR_HIGH_CONFIDENCE = 12;

/**
 * Analisa o texto OCR e retorna o tipo de extração detectado + confiança.
 *
 * Regras-chave:
 * - OCR < 50 chars → nao_extrair, baixa, "OCR muito curto".
 * - Cartão de ponto detectado com >= 8 pts → nao_extrair, alta, com aviso.
 * - Score < 6 → nao_extrair, baixa, "sinais insuficientes".
 * - Gap < 4 entre 1º e 2º → nao_extrair, baixa, "empate técnico".
 * - Score >= 12 → alta confiança.
 * - 6 <= score < 12 → média confiança.
 */
export function autoDetectTipoExtracao(ocrText: string): AutoDetectResult {
  if (!ocrText || ocrText.trim().length < MIN_OCR_LENGTH) {
    return {
      tipo: "nao_extrair",
      confianca: "baixa",
      motivos: ["OCR muito curto"],
      scoresPorTipo: {},
    };
  }

  // F1.3 — CTPS unifica férias + faltas + cabeçalho carteira. Os 3
  // grupos de sinais somam para o mesmo score `ctps`. Antes tínhamos
  // 3 tipos separados (recibo_ferias / registro_faltas / ctps); agora
  // é 1 só, cobrindo recibo avulso, registro avulso, ou carteira.
  //
  // Guarda: ctps só vira candidato quando há sinal REAL de férias OU
  // faltas (>= 4 pts somados). Cabeçalho "Carteira de Trabalho" sozinho
  // (sem dado de férias/faltas) é apenas doc de identificação e não tem
  // nada pra extrair — não classificamos como ctps.
  const sinaisFerias = scoreSinais(ocrText, SINAIS_FERIAS);
  const sinaisFaltas = scoreSinais(ocrText, SINAIS_FALTAS);
  const sinaisCtpsCabecalho = scoreSinais(ocrText, SINAIS_CTPS_CABECALHO);
  const ctpsTemDado = sinaisFerias.pontos + sinaisFaltas.pontos >= 4;
  const ctpsPontos = ctpsTemDado
    ? sinaisFerias.pontos + sinaisFaltas.pontos + sinaisCtpsCabecalho.pontos
    : 0;
  const ctpsMotivos = ctpsTemDado
    ? [
        ...sinaisCtpsCabecalho.motivos,
        ...sinaisFerias.motivos,
        ...sinaisFaltas.motivos,
      ]
    : [];

  const scores = {
    holerite: scoreSinais(ocrText, SINAIS_HOLERITE),
    ficha_financeira: scoreSinais(ocrText, SINAIS_FICHA_FINANCEIRA),
    ctps: { pontos: ctpsPontos, motivos: ctpsMotivos },
    cartao_ponto: scoreSinais(ocrText, SINAIS_CARTAO_PONTO),
  };

  const entries = Object.entries(scores) as Array<
    [string, { pontos: number; motivos: string[] }]
  >;
  const ordered = [...entries].sort((a, b) => b[1].pontos - a[1].pontos);
  const [tipoMelhor, dadoMelhor] = ordered[0];
  const segundoPontos = ordered[1]?.[1].pontos ?? 0;

  // Score baixo absoluto
  if (dadoMelhor.pontos < MIN_SCORE_TO_DETECT) {
    return {
      tipo: "nao_extrair",
      confianca: "baixa",
      motivos: ["Sinais insuficientes para classificação automática"],
      scoresPorTipo: toRecord(scores),
    };
  }

  // Empate técnico
  if (dadoMelhor.pontos - segundoPontos < MIN_GAP_TO_FIRST) {
    return {
      tipo: "nao_extrair",
      confianca: "baixa",
      motivos: [
        `Empate técnico entre ${tipoMelhor} (${dadoMelhor.pontos}) e segundo lugar (${segundoPontos})`,
      ],
      scoresPorTipo: toRecord(scores),
    };
  }

  const confianca: ConfiancaAuto =
    dadoMelhor.pontos >= SCORE_FOR_HIGH_CONFIDENCE ? "alta" : "media";

  return {
    tipo: tipoMelhor as TipoExtracao,
    confianca,
    motivos: dadoMelhor.motivos,
    scoresPorTipo: toRecord(scores),
  };
}

function scoreSinais(
  texto: string,
  sinais: Sinal[],
): { pontos: number; motivos: string[] } {
  let pontos = 0;
  const motivos: string[] = [];
  for (const s of sinais) {
    if (s.pattern.test(texto)) {
      pontos += s.pontos;
      motivos.push(s.motivo);
    }
  }
  return { pontos, motivos };
}

function toRecord(
  scores: Record<string, { pontos: number }>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, v.pontos]),
  );
}
