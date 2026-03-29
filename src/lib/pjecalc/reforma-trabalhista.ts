/**
 * =====================================================
 * REFORMA TRABALHISTA — Lei 13.467/2017
 * =====================================================
 *
 * Vigencia: 11 de novembro de 2017
 *
 * Este modulo determina as regras aplicaveis com base na
 * data do fato gerador, aplicando o principio tempus regit actum.
 */

const REFORMA_DATE = '2017-11-11'; // Lei 13.467/2017

/**
 * Verifica se a data e anterior a Reforma Trabalhista.
 * @param date Data no formato ISO (YYYY-MM-DD ou YYYY-MM)
 */
export function isPreReforma(date: string): boolean {
  // Normalize YYYY-MM to YYYY-MM-01 for comparison
  const normalized = date.length === 7 ? date + '-01' : date;
  return normalized < REFORMA_DATE;
}

/**
 * Verifica se a data e posterior ou igual a Reforma Trabalhista.
 */
export function isPosReforma(date: string): boolean {
  return !isPreReforma(date);
}

/**
 * Regras que mudam conforme a data em relacao a Reforma.
 */
export interface ReformaRules {
  /** Intervalo intrajornada: pre=remuneratoria, post=indenizatoria (Art. 71 §4) */
  intervalo_natureza: 'remuneratoria' | 'indenizatoria';
  /** HE habitual: pre=integra remuneracao para todos efeitos, post=same but with limits */
  he_habitual_integra: boolean;
  /** Honorarios sucumbenciais: pre=nao obrigatorio, post=obrigatorio (Art. 791-A) */
  honorarios_sucumbenciais_obrigatorios: boolean;
  /** Contribuicao sindical: pre=obrigatoria, post=facultativa (Art. 579) */
  contribuicao_sindical_obrigatoria: boolean;
  /** Dano moral: pre=sem teto, post=com teto baseado no salario (Art. 223-G) */
  dano_moral_com_teto: boolean;
  /** Prescricao intercorrente: pre=nao aplicavel, post=sim 2 anos (Art. 11-A) */
  prescricao_intercorrente: boolean;
  /** Horas in itinere: pre=computam na jornada, post=nao computam (Art. 58 §2) */
  horas_in_itinere: boolean;
  /** Equiparacao salarial: pre=mesmo local, post=mesmo estabelecimento (Art. 461) */
  equiparacao_mesmo_estabelecimento: boolean;
  /** Gestante em insalubridade: pre=afastamento automatico, post=afastamento por atestado (Art. 394-A) */
  gestante_insalubre_atestado: boolean;
}

/**
 * Retorna as regras aplicaveis para a data informada.
 *
 * @param date Data do fato gerador (YYYY-MM-DD ou YYYY-MM)
 */
export function getReformaRules(date: string): ReformaRules {
  if (isPreReforma(date)) {
    return {
      intervalo_natureza: 'remuneratoria',
      he_habitual_integra: true,
      honorarios_sucumbenciais_obrigatorios: false,
      contribuicao_sindical_obrigatoria: true,
      dano_moral_com_teto: false,
      prescricao_intercorrente: false,
      horas_in_itinere: true,
      equiparacao_mesmo_estabelecimento: false,
      gestante_insalubre_atestado: false,
    };
  }

  return {
    intervalo_natureza: 'indenizatoria',
    he_habitual_integra: true,
    honorarios_sucumbenciais_obrigatorios: true,
    contribuicao_sindical_obrigatoria: false,
    dano_moral_com_teto: true,
    prescricao_intercorrente: true,
    horas_in_itinere: false,
    equiparacao_mesmo_estabelecimento: true,
    gestante_insalubre_atestado: true,
  };
}

/**
 * Tetos para danos morais conforme Art. 223-G §1 da CLT (pos-Reforma).
 *
 * Graus de ofensa e seus limites:
 * - Leve: ate 3x o ultimo salario
 * - Media: ate 5x o ultimo salario
 * - Grave: ate 20x o ultimo salario
 * - Gravissima: ate 50x o ultimo salario
 *
 * Nota: STF em ADI 6050 (2023) declarou inconstitucionais os tetos,
 * mas muitos juizes ainda utilizam como referencia.
 */
export type DanoMoralGrau = 'leve' | 'media' | 'grave' | 'gravissima';

export function getDanoMoralTeto(grau: DanoMoralGrau, ultimoSalario: number): number | null {
  const multiplicadores: Record<DanoMoralGrau, number> = {
    leve: 3,
    media: 5,
    grave: 20,
    gravissima: 50,
  };
  return ultimoSalario * multiplicadores[grau];
}

export { REFORMA_DATE };
