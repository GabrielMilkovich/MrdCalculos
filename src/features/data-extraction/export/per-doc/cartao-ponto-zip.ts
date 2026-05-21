/**
 * Exporta cartão de ponto como CSV ÚNICO no formato oficial PJe-Calc.
 *
 * Anteriormente este módulo empacotava 3 arquivos (CSV oficial + CSV
 * completo + LEIA-ME) num ZIP. A partir de 2026-05-20 (ciclo v7) o
 * comportamento foi simplificado: o usuário recebe apenas o CSV oficial
 * pronto pra importar em PJe-Calc → Cálculo → Jornada → Importar.
 *
 * Limitação preservada: o CSV oficial trunca em 6 pares E/S por dia
 * (limite do PJe-Calc). Dias com mais pares geram WARNING no report,
 * permitindo ao operador decidir se a perda é aceitável antes do
 * download (telemetria CSV registra isso).
 *
 * As funções `buildCartaoPontoZip*` mantêm o nome legado para evitar
 * cascata de renames; o blob retornado é text/csv (não application/zip).
 */

import type { ParseCartaoPontoResult } from '../../parsers/cartao-ponto';
import { buildCartaoPontoCSVWithReport } from './cartao-ponto-csv';
import { type BuildReport } from '../validation';

const PARES_MAX_OFICIAL = 6;

export async function buildCartaoPontoZip(
  parsed: ParseCartaoPontoResult,
): Promise<Blob> {
  return (await buildCartaoPontoZipWithReport(parsed)).blob;
}

export async function buildCartaoPontoZipWithReport(
  parsed: ParseCartaoPontoResult,
): Promise<{ blob: Blob; report: BuildReport }> {
  const oficial = buildCartaoPontoCSVWithReport(parsed);
  const report = oficial.report;

  // Detecta e registra perda explícita quando há >6 pares num dia.
  // O CSV oficial trunca em 6 pares (limite PJe-Calc) — o operador
  // precisa saber pra justificar a divergência.
  const diasComExcesso = parsed.apuracoes.filter(
    (a) => a.marcacoes.length > PARES_MAX_OFICIAL,
  );
  if (diasComExcesso.length > 0) {
    report.warnings.push(
      `${diasComExcesso.length} dia(s) com mais de ${PARES_MAX_OFICIAL} pares E/S — ` +
        `CSV oficial trunca em ${PARES_MAX_OFICIAL} (limite PJe-Calc). ` +
        `Datas: ${diasComExcesso
          .slice(0, 5)
          .map((a) => a.data)
          .join(', ')}${diasComExcesso.length > 5 ? '…' : ''}.`,
    );
    report.camposNaoExportados!.push({
      campo: `apuracao.marcacoes[${PARES_MAX_OFICIAL}…]`,
      motivo: `Pares acima de ${PARES_MAX_OFICIAL} excedem o limite PJe-Calc — descartados do CSV.`,
    });
  }

  // Campos do parsed que NÃO entram no CSV oficial PJe-Calc (13 colunas fixas).
  report.camposNaoExportados!.push(
    {
      campo: 'apuracao.dia_semana',
      motivo: 'CSV oficial PJe-Calc só tem 13 colunas (Data + 6 pares E/S) — dia_semana não exportado.',
    },
    {
      campo: 'apuracao.ocorrencia',
      motivo: 'CSV oficial PJe-Calc não tem coluna Ocorrencia — não exportado.',
    },
    {
      campo: 'apuracao.eventos',
      motivo: 'CSV oficial PJe-Calc não exporta eventos (HT, HE, banco de horas).',
    },
    {
      campo: 'apuracao.observacao',
      motivo: 'CSV oficial PJe-Calc não tem coluna Observacao — não exportado.',
    },
  );

  return { blob: oficial.blob, report };
}

export { PARES_MAX_OFICIAL };
