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
  TipoAlertaApuracao,
} from '../tipos-dominio.ts';
import { detectarAlertas as detectarAlertasFn } from '../heuristicas/alertas-apuracao.ts';

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

// Sprint 3 Fase 4: linha-dia no texto-plano da página
// (fallback quando detectarTabelas falha em algumas páginas).
// Exemplo: "16/07/2021 - Sex 10:35* 12:00* 13:00* 19:00* Horas Trabalhadas: 07:25"
const RE_LINHA_DIA_PLANA =
  /^\s*(\d{2})\/(\d{2})\/(\d{4})\s*[-–]\s*(Dom|Seg|Ter|Qua|Qui|Sex|S[áa]b)\b\s*(.+)?$/i;

// Palavras-chave que marcam INÍCIO do campo RESULTADO em texto plano.
// Tudo APÓS a primeira ocorrência é descartado pra extração de batidas
// (mas usado pra detectar ocorrência).
//
// Sprint 3 Fase 4 (calibração Izabela): expandido com mais variantes
// vistas em produção:
//   - Hora Extra Feriado (variante de HE Com Feriado, casos 07/09 etc)
//   - Adicional Noturno (totalizador noturno)
//   - HE-Comiss / HE\s*[-–]\s*Comiss (variante hyphenada)
//   - 9T0X (códigos de evento totalizador)
const RE_INICIO_RESULTADO =
  /\b(?:Horas\s+Trabalhadas|Horas\s+Previstas|Banco\s+de\s+Horas|DSR\s+Semanal|DSR\s+Descontado|FERIADO|FALTA|F[ée]rias|Licen[çc]a|Atestado|Acompanhamento|Treinamento|Abono\s+Autorizado|Problemas\s+Relogio|Dia\s+do\s+Comerciario|Premio|HE\s+Com\s+Feriado|Hora\s+Extra\s+Feriado|HE\s*[-–]\s*Comiss|Adicional\s+Noturno|R\.?\s*S\.?\s*R\.?|RSR\s+Com|FOLGA|9T0\d|Banco\s+Acumulado)/i;

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

/**
 * Sprint 3 Fase 4 (2026-05-22) — detecta tabela de CONTINUAÇÃO de mês.
 *
 * Páginas de continuação não repetem o header DATA|BATIDAS|AJUSTES|RESULTADO.
 * O `detectarTabelas` do extrator usa a primeira linha como "header" — então
 * a primeira linha-dia (ex: "23/07/2021 - Sex") vira header, e
 * `isTabelaEspelho` rejeita.
 *
 * Esta função identifica esse caso: header começa com data + dia-da-semana
 * no formato do layout novo, E tem ≥2 colunas. Processada posicionalmente
 * (índice 0 = DATA, restante = batidas/ajustes/resultado concatenados).
 *
 * Bug real: páginas 2-4 do Jefferson NOVO perdiam ~150 dias por esse motivo.
 */
function isTabelaContinuacao(tab: TabelaDetectada): boolean {
  if (tab.headers.length < 2) return false;
  return RE_DATA_NOVO.test(tab.headers[0].trim());
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
  let idxData: number;
  let idxBatidas: number;
  let idxAjustes: number;
  let idxResultado: number;
  // Linhas a processar — em tabelas-continuação, INCLUI o "header" (que é
  // na verdade a primeira linha de dia).
  let linhasParaProcessar: typeof tab.linhas;

  if (isTabelaEspelho(tab)) {
    idxData = indiceHeader(tab, /^DATA$/i);
    idxBatidas = indiceHeader(tab, /^BATIDAS$/i);
    idxAjustes = indiceHeader(tab, /^AJUSTES$/i);
    idxResultado = indiceHeader(tab, /^RESULTADO$/i);
    linhasParaProcessar = tab.linhas;
  } else if (isTabelaContinuacao(tab)) {
    // Tabela de continuação — posições: 0=DATA, 1=BATIDAS, (2=AJUSTES opcional),
    // última coluna não-DATA-não-BATIDAS = RESULTADO. Heurística simples,
    // calibrada contra Jefferson NOVO/Izabela.
    idxData = 0;
    idxBatidas = 1;
    // Layout NOVO tem 4 colunas (DATA|BATIDAS|AJUSTES|RESULTADO), mas tabelas
    // de continuação podem aparecer com 3 (AJUSTES vazia foi colapsada).
    // Se 4 colunas: AJUSTES=2, RESULTADO=3. Se 3 colunas: AJUSTES=-1, RESULTADO=2.
    if (tab.headers.length >= 4) {
      idxAjustes = 2;
      idxResultado = 3;
    } else {
      idxAjustes = -1;
      idxResultado = tab.headers.length >= 3 ? 2 : -1;
    }
    // Inclui o "header" (que é dado) como primeira linha
    const headerComoLinha = tab.headers.map((h, i) => ({
      texto: h,
      coluna: i,
      fragmentos: [],
    }));
    linhasParaProcessar = [headerComoLinha, ...tab.linhas];
  } else {
    return;
  }

  if (idxData < 0 || idxBatidas < 0) return;

  for (const linha of linhasParaProcessar) {
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

    // Extrai batidas. Concatenamos BATIDAS + AJUSTES porque o pdfjs às vezes
    // clusteriza a 4ª batida na coluna AJUSTES (bug de clustering por X-position
    // limítrofe — observado em Izabela 16-19/06/2021, onde BATIDAS="09:30 13:38
    // 15:32" e AJUSTES="18:31"). Concat+dedup é defensivo: se a batida estava
    // realmente em BATIDAS, dedup remove a duplicata; se estava só em AJUSTES
    // (caso patológico), recuperamos.
    //
    // Ajustes textuais ("HH:MM - Inserido", "HH:MM - Desconsiderado") são
    // processados normalmente — o HH:MM neles é o MESMO que aparece em BATIDAS
    // com asterisco (caso Inserido) ou que será filtrado abaixo (caso
    // Desconsiderado). Dedup garante que não vira batida duplicada.
    const horasBat = extrairBatidas(batidasTxt);
    // Defensivo: SÓ extrair de AJUSTES quando:
    //   1. BATIDAS tem pelo menos 1 hora (preserva semântica de `--`), E
    //   2. BATIDAS tem MENOS de 4 horas (padrão completo). Acima de 4,
    //      qualquer HH:MM em AJUSTES é provavelmente totalizador vazado
    //      pelo clustering errado do pdfjs (vimos AJUSTES="07:57" sem
    //      texto, vindo do "Horas Trabalhadas: 07:57" do RESULTADO). E
    //   3. AJUSTES NÃO contém palavras-chave de RESULTADO (Horas, Banco,
    //      DSR, etc.) — defesa adicional caso AJUSTES tenha texto.
    // Sprint 3 Fase 4: descoberto na calibração contra Jefferson NOVO.
    const ajustesParaceResultado = RE_INICIO_RESULTADO.test(ajustesTxt);
    const horasAjusteExtra =
      horasBat.length > 0 &&
      horasBat.length < 4 &&
      !ajustesParaceResultado
        ? extrairBatidas(ajustesTxt)
        : [];
    const horasCombinadas: string[] = [];
    const seen = new Set<string>();
    for (const h of [...horasBat, ...horasAjusteExtra]) {
      if (!seen.has(h)) {
        seen.add(h);
        horasCombinadas.push(h);
      }
    }
    let horas = horasCombinadas;
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
    const alertasDetectados = detectarAlertasFn(apuracao.marcacoes, [observacao, resultadoTxt, ajustesTxt]);
    if (alertasDetectados.length > 0) apuracao.alertas = alertasDetectados;

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

  // Existe pelo menos 1 tabela com headers DATA + BATIDAS (ou continuação)?
  let temTabelaEspelho = false;
  for (const p of doc.paginas) {
    for (const tab of p.tabelas) {
      if (isTabelaEspelho(tab) || isTabelaContinuacao(tab)) {
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

/**
 * Sprint 3 Fase 4 — fallback de texto plano.
 *
 * detectarTabelas (pdfjs) falha em algumas páginas do layout NOVO,
 * quebrando tabelas grandes em sub-tabelas e perdendo linhas. Mas o
 * textoPlano de cada página tem TODAS as linhas-dia preservadas.
 *
 * Esta função varre o texto plano linha-a-linha procurando padrão
 * "DD/MM/YYYY - Dow ..." e ADICIONA datas que ainda NÃO estão em
 * apuracoesPorData (dedup natural com o que tabelas já capturaram).
 *
 * Heurística pra separar batidas de totalizadores:
 *   1. Procura primeira palavra-chave de RESULTADO (Horas, DSR, FERIADO,
 *      etc.) — corta a linha antes dela.
 *   2. Se sem palavra-chave E tem EXATAMENTE 5 HH:MM: descarta a 5ª
 *      (assume totalizador colapsado, padrão observado em "Banco de
 *      Horas 60% : 00:18" virando só "00:18" no texto plano).
 *   3. Cap em 6 batidas (limite PJe-Calc CSV).
 */
function processarTextoPlanoFallback(
  textoPlano: string,
  apuracoesPorData: Map<string, ApuracaoDominio>,
  competencias: Map<string, number>,
  warnings: string[],
): void {
  for (const linhaRaw of textoPlano.split(/\r?\n/)) {
    const m = RE_LINHA_DIA_PLANA.exec(linhaRaw);
    if (!m) continue;
    const dd = m[1];
    const mm = m[2];
    const yyyy = m[3];
    const dataIso = `${yyyy}-${mm}-${dd}`;
    const diaSemana = ddSemana(m[4]);
    const resto = m[5] ?? '';

    // Trecho de batidas (antes de qualquer palavra-chave de resultado)
    const mResultado = RE_INICIO_RESULTADO.exec(resto);
    const trechoBatidas = mResultado ? resto.substring(0, mResultado.index) : resto;
    const resultadoTxt = mResultado ? resto.substring(mResultado.index) : '';

    // Casos com `--` (sem batidas)
    let horas: string[] = [];
    if (!/\-\-/.test(trechoBatidas)) {
      const horasRaw = extrairBatidas(trechoBatidas);
      // Dedup preservando ordem — texto plano concatena BATIDAS + AJUSTES,
      // então "11:40* 13:00* 20:01 11:40 - Inserido | 13:00 - Inserido"
      // produz duplicatas. Mesma lógica do processarTabela.
      const seen = new Set<string>();
      for (const h of horasRaw) {
        if (!seen.has(h)) {
          seen.add(h);
          horas.push(h);
        }
      }
      // Filtra desconsiderados que possam aparecer no texto plano
      // ("HH:MM - Desconsiderado"). Mesma defesa do processarTabela.
      const desconsideradas = extrairDesconsideradas(trechoBatidas);
      if (desconsideradas.size > 0) {
        horas = horas.filter((h) => !desconsideradas.has(h));
      }
      // Heurística: se NÃO encontrou palavra-chave de resultado E tem
      // exatamente 5 HH:MM, descarta a 5ª (totalizador colapsado).
      if (!mResultado && horas.length === 5) {
        horas = horas.slice(0, 4);
      }
      // Cap defensivo em 6
      if (horas.length > 6) {
        warnings.push(
          `${dataIso} (fallback-texto): ${horas.length} batidas, truncando pra 6.`,
        );
        horas = horas.slice(0, 6);
      }
    }

    const marcacoes = paresFromHoras(horas);
    const { ocorrencia, observacao } = detectarOcorrenciaDoResultado(
      resultadoTxt,
      marcacoes.length > 0,
    );

    // Mesma regra de pular: NORMAL + sem batidas = sem info útil
    if (marcacoes.length === 0 && ocorrencia === 'NORMAL') continue;

    // Sobrescreve a versão da tabela quando:
    //   - novo tem MAIS batidas (caso comum: tabela quebrada perdeu HH:MM), OU
    //   - existente é "suspeito" (>=3 pares, layout novo padrão é 2 pares)
    //     E novo tem 1-3 pares (padrão normal). Defende contra tabelas onde
    //     RESULTADO vazou em colunas adicionais — texto plano com regex de
    //     cut por palavra-chave é mais confiável nesses casos.
    // Sprint 3 Fase 4: descobertos os dois padrões na calibração Jefferson NOVO.
    const existente = apuracoesPorData.get(dataIso);
    let sobrescrever = true;
    if (existente) {
      const novoMaisBatidas = marcacoes.length > existente.marcacoes.length;
      const existenteSuspeito =
        existente.marcacoes.length >= 3 &&
        marcacoes.length >= 1 &&
        marcacoes.length <= 3;
      sobrescrever = novoMaisBatidas || existenteSuspeito;
    }
    if (!sobrescrever) continue;
    const ehNovo = existente === undefined;

    const apFallback: ApuracaoDominio = {
      data: dataIso,
      dia_semana: diaSemana,
      ocorrencia,
      marcacoes: marcacoes.slice(0, 6),
      eventos: [],
      observacao,
    };
    const alertasFb = detectarAlertasFn(apFallback.marcacoes, [observacao, resto]);
    if (alertasFb.length > 0) apFallback.alertas = alertasFb;
    apuracoesPorData.set(dataIso, apFallback);

    if (ehNovo) {
      const k = `${mm}/${yyyy}`;
      competencias.set(k, (competencias.get(k) ?? 0) + 1);
    }
  }
}

function mapear(doc: DocumentoTabular): ParseCartaoPontoResultDominio | null {
  const warnings: string[] = [];
  const apuracoesPorData = new Map<string, ApuracaoDominio>();
  const competencias = new Map<string, number>();

  // 1ª passada: tabelas estruturadas (espelho + continuação)
  for (const pagina of doc.paginas) {
    for (const tab of pagina.tabelas) {
      if (!isTabelaEspelho(tab) && !isTabelaContinuacao(tab)) continue;
      processarTabela(tab, apuracoesPorData, competencias, warnings);
    }
  }

  // 2ª passada: fallback texto plano (recupera linhas perdidas por
  // bug de clustering em tabelas grandes ou complexas). DEDUP automático
  // — só adiciona datas que tabelas não cobriram.
  for (const pagina of doc.paginas) {
    processarTextoPlanoFallback(
      pagina.textoPlano,
      apuracoesPorData,
      competencias,
      warnings,
    );
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
    alertas_summary: agregarAlertasMinha(apuracoes),
  };
}

function agregarAlertasMinha(apuracoes: ApuracaoDominio[]) {
  let total = 0;
  const porTipo: Record<TipoAlertaApuracao, number> = { BATIDAS_IMPARES: 0, RELOGIO_QUEBRADO: 0 };
  for (const a of apuracoes) {
    if (!a.alertas || a.alertas.length === 0) continue;
    total++;
    for (const al of a.alertas) porTipo[al.tipo]++;
  }
  return total === 0 ? undefined : { total_apuracoes_com_alerta: total, por_tipo: porTipo };
}

export const mapperCartaoViaVarejoMinha: Mapper<ParseCartaoPontoResultDominio> = {
  slug: 'cartao_via_varejo_minha_v1',
  nome: 'Cartão de Ponto Via Varejo / Casas Bahia — Espelho Minha (layout novo)',
  tipoDocumento: 'cartao_ponto',
  detectar,
  mapear,
};
