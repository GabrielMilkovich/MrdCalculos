import JSZip from 'jszip';
import type { CtpsDominioV2 } from '@/domain/tipos-dominio';
import { gerarDadosContratuais } from './csv-dados-contratuais';
import { gerarHistoricoSalarial } from './csv-historico-salarial';
import { gerarRegistroFaltas } from './csv-registro-faltas';
import { gerarHistoricoFerias } from './ferias-pjecalc-format';

/**
 * Constrói o ZIP de exportação CTPS V2 com 4 CSVs:
 *   {nomeBase}_dados_contratuais.csv  — pivot SECAO;CAMPO;VALOR
 *   {nomeBase}_historico_salarial.csv  — MES_ANO;VALOR;FGTS;...
 *   {nomeBase}_registro_faltas.csv     — INICIO;FIM;JUSTIFICADA;...
 *   {nomeBase}_historico_ferias.csv    — RELATIVAS;PRAZO;SITUACAO;...
 *
 * O formato dos 3 primeiros foi validado contra ground truth do Roque.
 * O formato de férias é INFERIDO — ver `ferias-pjecalc-format.ts` + KNOWN_GAPS.md.
 */
export async function exportarCtpsZip(
  ctps: CtpsDominioV2,
  nomeBase: string = 'CTPS',
): Promise<Blob> {
  const zip = new JSZip();
  zip.file(`${nomeBase}_dados_contratuais.csv`, gerarDadosContratuais(ctps));
  zip.file(`${nomeBase}_historico_ferias.csv`, gerarHistoricoFerias(ctps));
  zip.file(`${nomeBase}_historico_salarial.csv`, gerarHistoricoSalarial(ctps));
  zip.file(`${nomeBase}_registro_faltas.csv`, gerarRegistroFaltas(ctps));
  return await zip.generateAsync({ type: 'blob' });
}
