/**
 * Detector de "origem do empregador" — separado do auto-detect de tipo
 * para isolar a regra de bloqueio.
 *
 * Atualmente o pipeline V5 suporta apenas Via Varejo / Casa Bahia (parser
 * específico em `parsers/cartao-ponto/layouts/via-varejo-v1.ts` e mapping
 * de rubricas em `rubrica-mapping/`). Magazine Luiza está fora de escopo
 * e seu OCR seria processado com perda alta — bloqueamos antes de gastar
 * cota Mistral.
 */

const MARCADORES_MAGAZINE_LUIZA = [
  /\bMAGAZINE\s+LUIZA\b/i,
  /\bMAGAZ\s*LUIZA\b/i,
  /\bMAGALU\b/i,
  /\bLUIZALABS\b/i,
  // CGC Magazine Luiza varia por filial — usar começo do CNPJ matriz.
  /\bC\.?N\.?P\.?J\.?\.?:?\s*47\.?960\.?950\//i,
];

const MARCADORES_VIA_VAREJO_OU_CASAS_BAHIA = [
  /\bNOVA\s+CASA\s+BAHIA\s+S\/?A\b/i,
  /\bVIA\s+VAREJO\s+S\/?A\b/i,
  /\bC\.?G\.?C\.?\.?\s*\n?\s*10\.?757\.?237\/?\d{4}-?\d{2}\b/i, // CGC Casa Bahia
  /\bC\.?G\.?C\.?\.?\s*\n?\s*33\.?041\.?260\/?\d{4}-?\d{2}\b/i, // CGC Via Varejo
  /\bviavarejo\b/i,
];

export type OrigemEmpregador =
  | { suportado: true; layout: 'via_varejo' | 'generico'; motivos: string[] }
  | {
      suportado: false;
      motivo: 'magazine_luiza_fora_de_escopo';
      mensagemOperador: string;
      detalhes: string[];
    };

export const MENSAGEM_BLOQUEIO_MAGALU =
  'Este documento parece ser Magazine Luiza/Magalu. ' +
  'O sistema atual processa apenas documentos Via Varejo / Casa Bahia. ' +
  'Magazine Luiza está planejado para versão futura. Por favor, lance ' +
  'manualmente.';

/**
 * Detecta a origem do documento. Quando Magazine Luiza é identificado E
 * Via Varejo NÃO casa, bloqueia explicitamente. Quando ambos casam (raro,
 * pode ser holerite mencionando empresa do grupo), Via Varejo vence.
 */
export function detectarOrigemEmpregador(ocrText: string): OrigemEmpregador {
  const motivosVV: string[] = [];
  for (const re of MARCADORES_VIA_VAREJO_OU_CASAS_BAHIA) {
    if (re.test(ocrText)) motivosVV.push(re.source);
  }
  const motivosMagalu: string[] = [];
  for (const re of MARCADORES_MAGAZINE_LUIZA) {
    if (re.test(ocrText)) motivosMagalu.push(re.source);
  }

  // Via Varejo presente → suporta (mesmo com menção a Magalu como concorrente).
  if (motivosVV.length > 0) {
    return { suportado: true, layout: 'via_varejo', motivos: motivosVV };
  }
  // Magazine Luiza claramente identificado → bloqueia.
  if (motivosMagalu.length > 0) {
    return {
      suportado: false,
      motivo: 'magazine_luiza_fora_de_escopo',
      mensagemOperador: MENSAGEM_BLOQUEIO_MAGALU,
      detalhes: motivosMagalu,
    };
  }
  // Genérico (qualquer outra empresa).
  return { suportado: true, layout: 'generico', motivos: ['nenhum marcador específico'] };
}
