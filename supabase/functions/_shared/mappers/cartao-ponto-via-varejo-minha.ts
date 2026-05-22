/**
 * Mapper: Cartão de Ponto Via Varejo / Casas Bahia — layout NOVO
 * "Espelho de Ponto Minha" (2018+).
 *
 * Sprint 3 (2026-05-22). Co-existe com `cartao-ponto-via-varejo.ts` (layout
 * antigo "Cartão de Ponto"). Dispatcher rota PDFs SÓ-NOVO direto pra cá;
 * PDFs híbridos acionam ambos e o merge dedup por data prevalecendo quem
 * tem mais batidas reais (ver dispatcher.escolherMappersCartaoPonto +
 * mesclarResultadosCartaoPonto).
 *
 * ESTRATÉGIA
 * ----------
 * Consome `doc.paginas[].tabelas[]` diretamente — extrator-geometrico já
 * clusterizou as células por coordenada X/Y. O layout NOVO é tabela REAL
 * de 4 colunas (DATA | BATIDAS | AJUSTES | RESULTADO), não texto linearizado.
 * Lemos célula a célula.
 *
 * COLUNAS
 * -------
 * - DATA: "16/06/2021 - Qua"
 * - BATIDAS: "11:35 14:11 15:11 20:00" (4 batidas) ou "11:46 14:42 15:42 20:18 20:25 20:43" (6)
 *            "--" = sem batida real (ocorrência ou DSR)
 *            "HH:MM*" = batida com ajuste manual (válida, remover *)
 * - AJUSTES: "11:48 - Desconsiderado | 11:57 - Desconsiderado"
 *            Cada HH:MM marcado como Desconsiderado deve ser REMOVIDO de BATIDAS
 * - RESULTADO: totalizadores ("Horas Trabalhadas : 07:25") e/ou marcadores
 *              de ocorrência ("FERIADO (dias) : 1"). NUNCA virar batida.
 *
 * MAPEAMENTO OCORRÊNCIA (Opção b — sem migration, observação carrega granularidade)
 * --------------------------------------------------------------------------------
 * Os 6 slugs do layout NOVO mapeiam pros 10 existentes do enum
 * `OcorrenciaDominio`. Granularidade preservada via `observacao`:
 *   - Licença falecimento  → AFASTAMENTO + observacao
 *   - Acompanhamento Medico → ATESTADO + observacao
 *   - Abono Autorizado     → AFASTAMENTO + observacao
 *   - Dia do Comerciario   → FOLGA + observacao
 *   - DSR Descontado       → FALTA + observacao
 *   - Problemas Relogio    → CONDICIONAL:
 *                              com batidas → NORMAL + observacao
 *                              sem batidas → AFASTAMENTO + observacao
 */

import type {
  CelulaTabular,
  DocumentoTabular,
  TabelaDetectada,
} from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type {
  ApuracaoDominio,
  MarcacaoDominio,
  OcorrenciaDominio,
  ParseCartaoPontoResultDominio,
} from '../tipos-dominio.ts';

const PARSER_VERSION = 'cartao-ponto-via-varejo-minha-mapper-v1-2026-05-22';

// Linha de data do layout NOVO: "16/06/2021 - Qua" ou "20/06/2021 - Dom"
const RE_DATA_NOVO =
  /^\s*(\d{2})\/(\d{2})\/(\d{4})\s*[-–]\s*(Dom|Seg|Ter|Qua|Qui|Sex|S[áa]b)/i;

// Batida com asterisco opcional (ajuste manual). Captura HH:MM, ignora *.
const RE_HORA_BATIDA = /\b(\d{1,2}):(\d{2})\*?\b/g;

// Mapeamento marcador → ocorrência. Ordem importa (mais específico primeiro):
// "Licença falecimento" antes de qualquer "Licença"; "DSR Descontado" antes
// de "DSR Semanal"; "Acompanhamento Medico" antes de "Atestado Medico" genérico.
// `Problemas Relogio` é tratado SEPARADO (condicional) — não está aqui.
interface MapeamentoMarker {
  re: RegExp;
  ocorrencia: OcorrenciaDominio;
  // Texto que vai pra `apuracao.observacao` (granularidade preservada).
  // Quando undefined, observação fica null (caso "FERIAS" puro, etc.).
  observacao?: string;
}

const MARCADORES_OCORRENCIA: MapeamentoMarker[] = [
  // === Específicos do layout NOVO (Opção b: mapeiam pros 10 do enum) ===
  { re: /Licen[çc]a\s+falecimento/i, ocorrencia: 'AFASTAMENTO', observacao: 'Licença falecimento' },
  { re: /Acompanhamento\s+M[ée]dic[oa]/i, ocorrencia: 'ATESTADO', observacao: 'Acompanhamento médico' },
  { re: /Abono\s+Autorizado/i, ocorrencia: 'AFASTAMENTO', observacao: 'Abono autorizado' },
  { re: /Dia\s+do\s+Comerciario/i, ocorrencia: 'FOLGA', observacao: 'Dia do Comerciário' },
  { re: /DSR\s+Descontado/i, ocorrencia: 'FALTA', observacao: 'DSR descontado' },
  // === Cobertos pelo enum existente ===
  { re: /Treinamento/i, ocorrencia: 'TREINAMENTO' },
  { re: /Licen[çc]a\s+m[ée]dica/i, ocorrencia: 'LICENCA_MEDICA' },
  { re: /Atestado\s+M[ée]dico/i, ocorrencia: 'ATESTADO' },
  { re: /\bF[ée]rias\b/i, ocorrencia: 'FERIAS' },
  { re: /\bFALTA\b/i, ocorrencia: 'FALTA' },
  { re: /\bFERIADO\b/i, ocorrencia: 'FERIADO' },
  { re: /\bDSR\s+Semanal/i, ocorrencia: 'DSR' },
  { re: /\bFOLGA\b/i, ocorrencia: 'FOLGA' },
];

// Regex separado pro caso condicional Problemas Relogio.
const RE_PROBLEMAS_RELOGIO = /Problemas\s+Relogio/i;

// Match "HH:MM - Desconsiderado" na coluna AJUSTES.
const RE_DESCONSIDERADO = /\b(\d{1,2}):(\d{2})\s*[-–]\s*Desconsiderado/gi;

function celulaToTexto(c: CelulaTabular | undefined | null): string {
  return c?.texto?.trim() ?? '';
}

function ddSemana(sigla: string): string {
  // Normaliza "Qua" → "QUA", "Sáb"/"Sab" → "SAB", etc.
  const up = sigla
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return up.substring(0, 3);
}

function isTabelaEspelho(tab: TabelaDetectada): boolean {
  if (tab.headers.length < 2) return false;
  const hsUpper = tab.headers.map((h) => h.trim().toUpperCase());
  // Mínimo: DATA + BATIDAS. AJUSTES e RESULTADO são bônus (alguns PDFs
  // omitem RESULTADO quando o dia é trivial; AJUSTES pode estar vazia).
  return hsUpper.includes('DATA') && hsUpper.includes('BATIDAS');
}

function indiceHeader(tab: TabelaDetectada, nome: RegExp): number {
  return tab.headers.findIndex((h) => nome.test(h.trim()));
}

function extrairBatidas(batidasTxt: string): string[] {
  if (!batidasTxt || batidasTxt === '--' || batidasTxt === '—') return [];
  const out: string[] = [];
  RE_HORA_BATIDA.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_HORA_BATIDA.exec(batidasTxt)) !== null) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    out.push(`${m[1].padStart(2, '0')}:${m[2]}`);
  }
  return out;
}

function extrairDesconsideradas(ajustesTxt: string): Set<string> {
  const out = new Set<string>();
  if (!ajustesTxt) return out;
  RE_DESCONSIDERADO.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_DESCONSIDERADO.exec(ajustesTxt)) !== null) {
    out.add(`${m[1].padStart(2, '0')}:${m[2]}`);
  }
  return out;
}

function detectarOcorrenciaDoResultado(
  resultadoTxt: string,
  temBatidas: boolean,
): { ocorrencia: OcorrenciaDominio; observacao: string | null } {
  if (!resultadoTxt) {
    return { ocorrencia: 'NORMAL', observacao: null };
  }
  // 1) Marcadores específicos (na ordem definida — mais específico primeiro).
  for (const m of MARCADORES_OCORRENCIA) {
    if (m.re.test(resultadoTxt)) {
      return { ocorrencia: m.ocorrencia, observacao: m.observacao ?? null };
    }
  }
  // 2) Problemas Relogio (condicional): com batidas → NORMAL, sem → AFASTAMENTO.
  //    Em ambos os casos a observação registra o evento pra operador revisar.
  if (RE_PROBLEMAS_RELOGIO.test(resultadoTxt)) {
    return {
      ocorrencia: temBatidas ? 'NORMAL' : 'AFASTAMENTO',
      observacao: 'Problemas relogio',
    };
  }
  return { ocorrencia: 'NORMAL', observacao: null };
}

function paresFromHoras(horas: string[]): MarcacaoDominio[] {
  // Até 6 batidas = 3 pares. PJe-Calc CSV aceita 12 colunas (6 pares).
  const out: MarcacaoDominio[] = [];
  for (let i = 0; i < horas.length; i += 2) {
    out.push({ e: horas[i], s: horas[i + 1] ?? '' });
  }
  return out;
}

function processarTabela(
  tab: TabelaDetectada,
  apuracoesPorData: Map<string, ApuracaoDominio>,
  competencias: Map<string, number>,
  warnings: string[],
): void {
  const idxData = indiceHeader(tab, /^DATA$/i);
  const idxBatidas = indiceHeader(tab, /^BATIDAS$/i);
  const idxAjustes = indiceHeader(tab, /^AJUSTES$/i);
  const idxResultado = indiceHeader(tab, /^RESULTADO$/i);

  if (idxData < 0 || idxBatidas < 0) return;

  for (const linha of tab.linhas) {
    const celData = linha[idxData];
    const textoData = celulaToTexto(celData);
    const mData = RE_DATA_NOVO.exec(textoData);
    if (!mData) continue;

    const dd = mData[1];
    const mm = mData[2];
    const yyyy = mData[3];
    const diaSemana = ddSemana(mData[4]);
    const dataIso = `${yyyy}-${mm}-${dd}`;

    const batidasTxt = celulaToTexto(linha[idxBatidas]);
    const ajustesTxt = idxAjustes >= 0 ? celulaToTexto(linha[idxAjustes]) : '';
    const resultadoTxt = idxResultado >= 0 ? celulaToTexto(linha[idxResultado]) : '';

    // Extrai batidas; remove as marcadas como "Desconsiderado" em AJUSTES.
    let horas = extrairBatidas(batidasTxt);
    if (horas.length > 0) {
      const desconsideradas = extrairDesconsideradas(ajustesTxt);
      if (desconsideradas.size > 0) {
        horas = horas.filter((h) => !desconsideradas.has(h));
      }
    }

    // Sprint 3 caveat: cap defensivo em 6 batidas (PJe-Calc CSV aceita 12
    // colunas = 6 pares). Mais que isso quase certamente é bug de parsing
    // (BATIDAS concatenando outra coluna). NÃO descarta silenciosamente —
    // warning permite operador investigar.
    if (horas.length > 6) {
      warnings.push(
        `${dataIso}: ${horas.length} batidas extraídas, truncando pra 6 (limite PJe-Calc).`,
      );
      horas = horas.slice(0, 6);
    }

    const marcacoes = paresFromHoras(horas);
    const { ocorrencia, observacao } = detectarOcorrenciaDoResultado(
      resultadoTxt,
      marcacoes.length > 0,
    );

    // Pula APENAS se não tem batida E ocorrência é NORMAL (sem nenhuma info).
    // Casos com `--` em BATIDAS + ocorrência marcada em RESULTADO entram no
    // array pra o dispatcher merge poder substituir com dados do mapper antigo
    // se houver. Isso é crítico em PDFs híbridos (Izabela).
    if (marcacoes.length === 0 && ocorrencia === 'NORMAL') continue;

    const apuracao: ApuracaoDominio = {
      data: dataIso,
      dia_semana: diaSemana,
      ocorrencia,
      marcacoes: marcacoes.slice(0, 6),
      eventos: [],
      observacao,
    };

    // Dedup interno: mesma data pode aparecer em múltiplas tabelas (PDFs
    // que dividem mês entre páginas). Prevalece quem tem mais batidas reais.
    const existente = apuracoesPorData.get(dataIso);
    if (!existente) {
      apuracoesPorData.set(dataIso, apuracao);
    } else if (apuracao.marcacoes.length > existente.marcacoes.length) {
      apuracoesPorData.set(dataIso, apuracao);
    }

    const k = `${mm}/${yyyy}`;
    competencias.set(k, (competencias.get(k) ?? 0) + 1);
  }

  // Sinaliza warning se a tabela tinha linhas mas nenhuma virou apuração
  // (suspeita: headers casaram mas conteúdo está fora do esperado).
  if (tab.linhas.length > 0 && apuracoesPorData.size === 0) {
    warnings.push(
      `Tabela espelho com ${tab.linhas.length} linha(s) mas nenhuma apuração extraída — headers casaram mas conteúdo divergente.`,
    );
  }
}

function detectar(doc: DocumentoTabular): DeteccaoMapper {
  const motivos: string[] = [];
  let acertos = 0;
  const t = doc.textoCompleto;

  if (!/ESPELHO\s+DE\s+PONTO/i.test(t)) {
    return { aplica: false, score: 0, motivos: ['sem ESPELHO DE PONTO'] };
  }
  acertos += 2;
  motivos.push('título ESPELHO DE PONTO');

  if (/33\.?041\.?260\/?\d{4}-?\d{2}/.test(t)) {
    acertos += 2;
    motivos.push('CGC Via Varejo (33.041.260)');
  }
  if (/10\.?757\.?237\/?\d{4}-?\d{2}/.test(t)) {
    acertos += 1;
    motivos.push('CGC Casa Bahia (10.757.237)');
  }
  if (/\bVIA\s+S\/?A\b/i.test(t)) {
    acertos += 2;
    motivos.push('razão social VIA S/A');
  }
  if (/\bCASAS?\s+BAHIA\b/i.test(t)) {
    acertos += 1;
    motivos.push('razão social Casas Bahia');
  }

  // Existe pelo menos 1 tabela com headers DATA + BATIDAS?
  let temTabelaEspelho = false;
  for (const p of doc.paginas) {
    for (const tab of p.tabelas) {
      if (isTabelaEspelho(tab)) {
        temTabelaEspelho = true;
        break;
      }
    }
    if (temTabelaEspelho) break;
  }
  if (temTabelaEspelho) {
    acertos += 2;
    motivos.push('tabela com cabeçalho DATA|BATIDAS detectada');
  }

  return {
    aplica: acertos >= 4,
    score: Math.min(acertos / 8, 1),
    motivos,
  };
}

function mapear(doc: DocumentoTabular): ParseCartaoPontoResultDominio | null {
  const warnings: string[] = [];
  const apuracoesPorData = new Map<string, ApuracaoDominio>();
  const competencias = new Map<string, number>();

  for (const pagina of doc.paginas) {
    for (const tab of pagina.tabelas) {
      if (!isTabelaEspelho(tab)) continue;
      processarTabela(tab, apuracoesPorData, competencias, warnings);
    }
  }

  if (apuracoesPorData.size === 0) return null;

  const apuracoes = [...apuracoesPorData.values()].sort((a, b) =>
    a.data.localeCompare(b.data),
  );

  let predominante = '';
  let max = 0;
  for (const [k, v] of competencias) {
    if (v > max) {
      predominante = k;
      max = v;
    }
  }

  return {
    apuracoes,
    competencias,
    competencia_predominante: predominante,
    data_inicial: apuracoes[0]?.data ?? '',
    data_final: apuracoes[apuracoes.length - 1]?.data ?? '',
    warnings,
    unparsed_lines: [],
    parser_version: PARSER_VERSION,
  };
}

export const mapperCartaoViaVarejoMinha: Mapper<ParseCartaoPontoResultDominio> = {
  slug: 'cartao_via_varejo_minha_v1',
  nome: 'Cartão de Ponto Via Varejo / Casas Bahia — Espelho Minha (layout novo)',
  tipoDocumento: 'cartao_ponto',
  detectar,
  mapear,
};
