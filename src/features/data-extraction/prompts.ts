/**
 * Prompts para extração estruturada via LLM (OpenAI gpt-4o-mini).
 *
 * Estilo:
 *  - System pede APENAS JSON (sem markdown, sem prefixo). Defesa contra
 *    LLM que injeta "Aqui está o JSON:" antes do array.
 *  - User passa o texto OCR cru entre delimitadores `<<<TEXT>>>`.
 *  - Schema explicito com tipos primitivos (regex de data, enums).
 *  - Defaults conservadores para flags (true/true/true/true em FGTS/INSS).
 *  - Política "se não conseguir identificar, OMITA" — preferir < linhas
 *    que linhas erradas.
 */

import type { ExtractionCategory } from './types';

export interface PromptPair {
  system: string;
  user: string;
}

const HISTORICO_SALARIAL_SYSTEM = `Você extrai dados de holerites/contracheques brasileiros para um sistema de cálculo trabalhista.
Retorne EXCLUSIVAMENTE um JSON válido (array de objetos), sem markdown, sem comentário, sem prefixo.

Schema:
[{"competencia": "MM/yyyy", "valor": <number>, "incideFgts": <bool>, "fgtsRecolhido": <bool>, "incideInss": <bool>, "inssRecolhido": <bool>}]

Regras:
- Uma linha por competência (mês/ano de referência da folha).
- "valor" = salário BRUTO (vencimentos totais antes dos descontos), em decimal com ponto (ex: 3500.50).
- Defaults para flags quando não há evidência contrária: incideFgts=true, fgtsRecolhido=true, incideInss=true, inssRecolhido=true.
- Marque flag como false APENAS se o documento explicitamente indicar não-incidência ou não-recolhimento.
- Se não conseguir identificar a competência ou o valor, OMITA a linha.
- Se o documento não for um holerite/ficha financeira, retorne [].`;

const FERIAS_SYSTEM = `Você extrai dados de períodos de férias de documentos trabalhistas brasileiros.
Retorne EXCLUSIVAMENTE um JSON válido (array de objetos), sem markdown.

Schema:
[{
  "relativa": "<aaaa/aaaa>",
  "prazo": <number>,
  "situacao": "<G|GP|NG|I|P>",
  "dobraGeral": <bool>,
  "abono": <bool>,
  "diasAbono": <number>,
  "gozo1": {"inicio":"dd/MM/yyyy","fim":"dd/MM/yyyy","dobra":<bool>} | null,
  "gozo2": {...} | null,
  "gozo3": {...} | null
}]

Regras:
- "relativa" = período aquisitivo (ex: "2022/2023" ou "2023/2024").
- "situacao": G=Gozadas, GP=Gozadas Parcialmente, NG=Não Gozadas, I=Indenizadas, P=Perdidas.
- "prazo" = dias do período de férias (geralmente 30).
- Se houver abono pecuniário, abono=true, diasAbono>0 (ex: 10 dias).
- Períodos de gozo são opcionais; até 3 períodos por relativa.
- Datas SEMPRE em dd/MM/yyyy.
- Se não conseguir identificar a relativa, OMITA a linha.
- Se o documento não menciona férias, retorne [].`;

const FALTAS_SYSTEM = `Você extrai registros de faltas (ausências) de documentos trabalhistas brasileiros.
Retorne EXCLUSIVAMENTE um JSON válido (array de objetos), sem markdown.

Schema:
[{
  "dataInicio": "dd/MM/yyyy",
  "dataFim": "dd/MM/yyyy",
  "justificada": <bool>,
  "reiniciarPeriodoAquisitivo": <bool>,
  "justificativa": "<string opcional>"
}]

Regras:
- Cada linha = um período de falta (pode ser 1 dia: dataInicio == dataFim).
- justificada=true se há atestado/declaração; false se ausência injustificada.
- reiniciarPeriodoAquisitivo: true APENAS se o documento explicitamente indicar reinício do período aquisitivo de férias por excesso de faltas.
- justificativa: texto curto (max 200 chars). NÃO USE ponto-e-vírgula, quebra de linha ou aspas.
- Se não houver datas claras, OMITA a linha.
- Se o documento não menciona faltas, retorne [].`;

/** Trunca texto OCR muito grande (proteção de tokens). gpt-4o-mini ~128k context. */
const MAX_OCR_LEN = 60_000;

function truncate(text: string): string {
  if (text.length <= MAX_OCR_LEN) return text;
  return text.slice(0, MAX_OCR_LEN) + '\n[...TRUNCADO]';
}

export function buildPrompt(category: ExtractionCategory, ocrText: string): PromptPair {
  const text = truncate(ocrText ?? '');
  const userText = `Extraia os dados do seguinte texto OCR:\n\n<<<TEXT>>>\n${text}\n<<<END>>>`;

  switch (category) {
    case 'historico_salarial':
      return { system: HISTORICO_SALARIAL_SYSTEM, user: userText };
    case 'ferias':
      return { system: FERIAS_SYSTEM, user: userText };
    case 'faltas':
      return { system: FALTAS_SYSTEM, user: userText };
  }
}
