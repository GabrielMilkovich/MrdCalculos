/**
 * Empacota o CSV oficial PJe-Calc + o CSV completo de auditoria + LEIA-ME
 * num único ZIP.
 *
 * Conteúdo:
 *   - `cartao_ponto.csv` — formato oficial "Importar Jornada" do PJe-Calc
 *     (13 colunas fixas, 6 pares máx, sem dia_semana/eventos/observacao).
 *     **Não alterar este formato sem revisar o contrato com o PJe-Calc.**
 *   - `cartao_ponto_completo.csv` — auditoria. Colunas dinâmicas E1/S1…EN/SN
 *     (sem limite), `dia_semana`, `ocorrencia`, `eventos`, `observacao`.
 *   - `LEIA-ME.txt` — explica a diferença e como importar no PJe-Calc.
 *
 * Por que 2 arquivos: o operador precisa importar o oficial no PJe-Calc, mas
 * pode auditar paridade total OCR → CSV no completo. Quando o documento tem
 * mais de 6 pares E/S num dia, o oficial trunca silenciosamente (limitação
 * do PJe-Calc) e o completo registra todos os pares — auditor compara e
 * decide se aceita a perda.
 */

import JSZip from 'jszip';
import type { ParseCartaoPontoResult } from '../../parsers/cartao-ponto';
import { buildCartaoPontoCSVWithReport } from './cartao-ponto-csv';
import { buildCartaoPontoCSVCompletoWithReport } from './cartao-ponto-csv-completo';
import { emptyReport, type BuildReport } from '../validation';

const PARES_MAX_OFICIAL = 6;

export async function buildCartaoPontoZip(
  parsed: ParseCartaoPontoResult,
): Promise<Blob> {
  return (await buildCartaoPontoZipWithReport(parsed)).blob;
}

export async function buildCartaoPontoZipWithReport(
  parsed: ParseCartaoPontoResult,
): Promise<{ blob: Blob; report: BuildReport }> {
  const report = emptyReport();
  const zip = new JSZip();

  // 1. CSV oficial PJe-Calc (intocado).
  const oficial = buildCartaoPontoCSVWithReport(parsed);
  zip.file('cartao_ponto.csv', oficial.blob);
  mergeReport(report, oficial.report, '[oficial]');

  // 2. CSV completo (paridade total OCR → CSV).
  const completo = buildCartaoPontoCSVCompletoWithReport(parsed);
  zip.file('cartao_ponto_completo.csv', completo.blob);
  mergeReport(report, completo.report, '[completo]');

  // 3. Detecta e registra perda explícita do oficial quando há >6 pares
  //    num dia (limite PJe-Calc). O completo preserva tudo — esse warning
  //    é a "trilha" que o operador precisa pra justificar a divergência.
  if (completo.maxPares > PARES_MAX_OFICIAL) {
    const diasComExcesso = parsed.apuracoes.filter(
      (a) => a.marcacoes.length > PARES_MAX_OFICIAL,
    );
    report.warnings.push(
      `${diasComExcesso.length} dia(s) com mais de ${PARES_MAX_OFICIAL} pares E/S — ` +
        `cartao_ponto.csv (oficial) trunca em 6 pares (limite PJe-Calc); ` +
        `cartao_ponto_completo.csv preserva os ${completo.maxPares} pares. ` +
        `Datas: ${diasComExcesso
          .slice(0, 5)
          .map((a) => a.data)
          .join(', ')}${diasComExcesso.length > 5 ? '…' : ''}.`,
    );
  }

  // 4. LEIA-ME explicando a diferença entre os 2 CSVs.
  zip.file('LEIA-ME.txt', buildReadme(parsed, completo.maxPares));

  // 5. Linhas geradas no report unificado = oficial (= completo, mesma base).
  report.linhasGeradas = oficial.report.linhasGeradas;

  // 6. Paridade declarativa: campos do parsed que vão SÓ pro completo
  //    (não pro oficial PJe-Calc). Operador vê na UI e sabe onde achar.
  report.camposNaoExportados!.push(
    {
      campo: 'apuracao.dia_semana',
      motivo: 'CSV oficial PJe-Calc só tem 13 colunas (Data + 6 pares E/S) — dia_semana fica em cartao_ponto_completo.csv.',
    },
    {
      campo: 'apuracao.ocorrencia',
      motivo: 'CSV oficial PJe-Calc não tem coluna Ocorrencia — disponível em cartao_ponto_completo.csv.',
    },
    {
      campo: 'apuracao.eventos',
      motivo: 'CSV oficial PJe-Calc não exporta eventos (HT, HE, banco de horas) — disponíveis em cartao_ponto_completo.csv.',
    },
    {
      campo: 'apuracao.observacao',
      motivo: 'CSV oficial PJe-Calc não tem coluna Observacao — disponível em cartao_ponto_completo.csv.',
    },
  );
  if (completo.maxPares > PARES_MAX_OFICIAL) {
    report.camposNaoExportados!.push({
      campo: `apuracao.marcacoes[${PARES_MAX_OFICIAL}…${completo.maxPares - 1}]`,
      motivo: `Pares ${PARES_MAX_OFICIAL + 1}–${completo.maxPares} excedem o limite PJe-Calc (6) — preservados em cartao_ponto_completo.csv.`,
    });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, report };
}

function mergeReport(dest: BuildReport, src: BuildReport, prefix: string): void {
  for (const w of src.warnings) {
    dest.warnings.push(`${prefix} ${w}`);
  }
  for (const r of src.linhasRejeitadas) {
    dest.linhasRejeitadas.push({
      idx: r.idx,
      motivo: `${prefix} ${r.motivo}`,
      conteudo: r.conteudo,
    });
  }
  for (const a of src.linhasAjustadas) {
    dest.linhasAjustadas.push({ idx: a.idx, ajuste: `${prefix} ${a.ajuste}` });
  }
}

function buildReadme(parsed: ParseCartaoPontoResult, maxParesCompleto: number): string {
  const lines: string[] = [];
  lines.push('CARTÃO DE PONTO — ZIP de exportação');
  lines.push('===================================');
  lines.push('');
  // Pipeline: V6 (pdfjs geométrico → mapper Via Varejo/genérico) ou V5 (regex
  // sobre OCR Mistral). O nome do parser indica origem: mapper-vX ou layout-vX
  // → V6 (server-side); cartao-ponto-v3/v6-dispatcher → V5 frontend.
  const isV6 = parsed.parser_version.includes('mapper-v');
  const pipeline = isV6 ? 'V6 geométrico (pdfjs server-side)' : 'V5 regex frontend';
  lines.push(`Pipeline: ${pipeline}`);
  lines.push(`Parser: ${parsed.parser_version}`);
  lines.push(`Período: ${parsed.data_inicial || '?'} a ${parsed.data_final || '?'}`);
  lines.push(`Apurações: ${parsed.apuracoes.length}`);
  lines.push(`Competências: ${parsed.competencias.size}`);
  if (!isV6) {
    lines.push('');
    lines.push('⚠ ATENÇÃO: este export usou o parser V5 regex (fallback) — pode');
    lines.push('  conter ruído de OCR. Se o documento foi processado por pdfjs');
    lines.push('  geométrico, prefira re-exportar para obter resultado V6 limpo.');
  }
  lines.push('');
  lines.push('ARQUIVOS NESTE ZIP');
  lines.push('------------------');
  lines.push('');
  lines.push('* cartao_ponto.csv — FORMATO OFICIAL PJe-Calc');
  lines.push('  Header: Data;Entrada1;Saída1;...;Entrada6;Saída6 (13 colunas)');
  lines.push('  Use este arquivo em PJe-Calc → Cálculo → Jornada → Importar.');
  lines.push(`  Limite de 6 pares E/S por dia (definido pelo PJe-Calc).`);
  lines.push('');
  lines.push('* cartao_ponto_completo.csv — AUDITORIA (não importa no PJe-Calc)');
  lines.push('  Colunas dinâmicas: Data;Dia_Semana;Ocorrencia;E1/S1...EN/SN;Eventos;Observacao');
  lines.push(`  Pares por dia: até ${maxParesCompleto || 0} (sem limite PJe-Calc).`);
  lines.push('  Inclui dia da semana, tipo de ocorrência (NORMAL/FALTA/...),');
  lines.push('  eventos extraídos (HT, HE, banco de horas) e observações livres.');
  lines.push('  Útil para revisão posterior ou anexo ao processo como prova');
  lines.push('  da metodologia de extração.');
  lines.push('');
  if (maxParesCompleto > PARES_MAX_OFICIAL) {
    lines.push('AVISO DE PARIDADE');
    lines.push('-----------------');
    lines.push(
      `O documento original tem dia(s) com mais de ${PARES_MAX_OFICIAL} pares E/S.`,
    );
    lines.push(
      `O CSV oficial trunca em ${PARES_MAX_OFICIAL} pares (limite do PJe-Calc).`,
    );
    lines.push('O CSV completo preserva todos os pares — confira a paridade lá.');
    lines.push('');
  }
  if (parsed.warnings.length > 0) {
    lines.push('AVISOS DO PARSER');
    lines.push('----------------');
    for (const w of parsed.warnings) lines.push(`  - ${w}`);
    lines.push('');
  }
  lines.push('FORMATO DOS CSVs');
  lines.push('----------------');
  lines.push('  Encoding: UTF-8 (sem BOM)');
  lines.push('  Delimitador: ponto-e-vírgula (;)');
  lines.push('  Datas: dd/MM/yyyy');
  lines.push('  Horas válidas: HH:MM');
  lines.push('  Horas inválidas (apenas no completo): INVALIDO:<raw>');
  lines.push('  Line ending: CRLF');
  return lines.join('\r\n');
}

export { PARES_MAX_OFICIAL };
