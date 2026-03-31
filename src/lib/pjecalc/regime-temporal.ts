/**
 * Matriz de regimes de correção/juros do PJe-Calc pós-ADC 58/59 STF.
 *
 * Fonte: PDFs dos casos reais analisados (gabarito PJe-Calc).
 *
 * Era 1: Competências anteriores ao ajuizamento
 *   - Correção: IPCA-E (desde a competência)
 *   - Juros:    1% a.m. simples pro-rata die (desde o ajuizamento)
 *
 * Era 2: Pós-ajuizamento até 30/08/2024 (corte ADC 58/59)
 *   - Correção: SEM_CORRECAO
 *   - Juros:    SELIC (absorve correção + juros)
 *   Exceção: casos ajuizados após 30/08/2024 → IPCA + Taxa Legal
 *
 * Era 3: A partir de 30/08/2024 (se o ajuizamento foi antes)
 *   - Correção: IPCA-E ou IPCA (conforme decisão)
 *   - Juros:    Taxa Legal
 */

export interface RegimeTemporal {
  de: string | null;       // YYYY-MM-DD ou null = desde sempre
  ate: string | null;      // YYYY-MM-DD ou null = até hoje
  indice_correcao: string; // IPCAE | IPCA | SELIC | SEM_CORRECAO
  tipo_juros: string;      // TRD_SIMPLES | SELIC | TAXA_LEGAL | NENHUM
}

const CORTE_ADC = '2024-08-30';

export function buildRegimeTemporalADC58(
  dataAjuizamento: string,
  dataLiquidacao: string,
): RegimeTemporal[] {
  const ajuizadoAposCorte = dataAjuizamento >= CORTE_ADC;

  if (ajuizadoAposCorte) {
    // Casos novos (ajuizamento após 30/08/2024):
    // IPCA-E até ajuizamento, IPCA + Taxa Legal após
    return [
      {
        de: null,
        ate: dataAjuizamento,
        indice_correcao: 'IPCAE',
        tipo_juros: 'TRD_SIMPLES',
      },
      {
        de: dataAjuizamento,
        ate: null,
        indice_correcao: 'IPCA',
        tipo_juros: 'TAXA_LEGAL',
      },
    ];
  }

  // Casos antigos (ajuizamento antes de 30/08/2024):
  const regimes: RegimeTemporal[] = [
    {
      de: null,
      ate: dataAjuizamento,
      indice_correcao: 'IPCAE',
      tipo_juros: 'TRD_SIMPLES',
    },
    {
      de: dataAjuizamento,
      ate: CORTE_ADC,
      indice_correcao: 'SEM_CORRECAO',
      tipo_juros: 'SELIC',
    },
  ];

  if (dataLiquidacao > CORTE_ADC) {
    regimes.push({
      de: CORTE_ADC,
      ate: null,
      indice_correcao: 'IPCAE',
      tipo_juros: 'TAXA_LEGAL',
    });
  }

  return regimes;
}
