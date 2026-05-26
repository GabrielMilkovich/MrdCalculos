/**
 * Mapper V6: CTPS — Carteira de Trabalho (composto).
 *
 * Extrai do mesmo PDF:
 *   - Dados contratuais (matrícula, admissão, demissão, cargo, empregador)
 *   - HISTÓRICO DE FÉRIAS (tabular: período aquisitivo + gozo + dias + abono)
 *   - AFASTAMENTOS / faltas (se presentes)
 *   - HISTÓRICO SALARIAL (se presente)
 *
 * Retorna null quando admissão está ausente → V5 fallback.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { CtpsDominio, FeriasDominio, FaltaDominio, CtpsHistoricoSalarialEntry } from '../tipos-dominio.ts';

const PARSER_VERSION = 'ctps-mapper-v8-2026-05-26';

// ── Regex: dados contratuais ──

const RE_DATA_BR = /(\d{2})\/(\d{2})\/(\d{4})/;
const RE_CNPJ = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
const RE_MATRICULA =
  /\b(?:matr[íi]cula|n[uú]mero\s+do\s+empregado|registro)\s*:?\s*(\d{4,12})\b/i;
const RE_ADMISSAO =
  /\b(?:admiss[ãa]o|data\s+de\s+admiss[ãa]o|in[íi]cio\s+do\s+contrato)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i;
const RE_DEMISSAO =
  /\b(?:demiss[ãa]o|sa[íi]da|t[eé]rmino\s+do\s+contrato|data\s+(?:de\s+)?desligamento|rescis[ãa]o)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i;
const RE_DEMISSAO_PROJECAO =
  /\bdesligamento\s+com\s+proje[çc][ãa]o\s+aviso\s+pr[ée]vio\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i;
const RE_CARGO =
  /\b(?:cargo|fun[çc][ãa]o(?:\s+atual)?|profiss[ãa]o)\s*:?\s*([\p{L}][\p{L}\s\.\-]{3,80}?)(?=\n|cbo|cnpj|admiss|salario|sal\.)/iu;
const RE_EMPREGADOR =
  /\b(?:empregador|empresa|raz[ãa]o\s+social)\s*:?\s*([\p{L}][\p{L}\s\.\-&]{3,80}?)(?=\n|cnpj|admiss|cargo|fun)/iu;

// ── Regex: férias tabular ──

const RE_CTPS_FERIAS_ROW =
  /(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{1,3})\s+(\d{1,3})/g;

// ── Regex: faltas / afastamentos ──

const RE_INTERVALO_DATA =
  /\b(\d{2}\/\d{2}\/\d{4})\s*(?:a|até|-|–)\s*(\d{2}\/\d{2}\/\d{4})\b/;
const RE_DUAS_DATAS_SEPARADAS =
  /\b(\d{2}\/\d{2}\/\d{4})\s+\S.*?\s+(\d{2}\/\d{2}\/\d{4})\b/;
const RE_DATA_UNICA = /\b(\d{2}\/\d{2}\/\d{4})\b/;

const RE_SUSPENSAO = /\bsuspens[ãa]o\b/i;
const RE_MATERNIDADE = /\b(?:maternidade|gestante)\b/i;
const RE_PATERNIDADE = /\bpaternidade\b/i;
const RE_AUX_DOENCA = /\b(?:aux[íi]lio\s*doen[çc]a|inss)\b/i;
const RE_LICENCA_MEDICA = /\blicen[çc]a\s+m[ée]dica\b/i;
const RE_ATESTADO = /\batestado\b/i;

// ── Regex: histórico salarial ──

const RE_HIST_SALARIAL_ROW =
  /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\p{L}][\p{L}\s\.\/%\-]{3,60}?)\s+([\d.,]+)\b/gu;

// ── Helpers ──

function dataBRtoISO(dataBR: string): string {
  const m = dataBR.match(RE_DATA_BR);
  if (!m) return dataBR;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function derivarRelativa(aqIni: string): string {
  const [, , y] = aqIni.split('/');
  const ano1 = parseInt(y, 10);
  return `${ano1}/${ano1 + 1}`;
}

function parseBRNumber(s: string): number {
  const cleaned = s.trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function diffDays(ini: string, fim: string): number {
  const d1 = new Date(ini);
  const d2 = new Date(fim);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

type TipoAfastamento =
  | 'falta_simples' | 'atestado' | 'aux_doenca'
  | 'licenca_maternidade' | 'licenca_paternidade'
  | 'licenca_medica' | 'suspensao' | 'outros';

function classificarTipo(linha: string, duracao: number): TipoAfastamento {
  if (RE_SUSPENSAO.test(linha)) return 'suspensao';
  if (RE_MATERNIDADE.test(linha)) return 'licenca_maternidade';
  if (RE_PATERNIDADE.test(linha)) return 'licenca_paternidade';
  if (RE_AUX_DOENCA.test(linha)) return 'aux_doenca';
  if (duracao > 15) return 'aux_doenca';
  if (RE_LICENCA_MEDICA.test(linha)) return 'licenca_medica';
  if (RE_ATESTADO.test(linha)) return 'atestado';
  return duracao >= 1 ? 'falta_simples' : 'outros';
}

// ── Seção: férias ──

function parseSecaoFerias(texto: string): FeriasDominio[] {
  const inicio = texto.search(/HIST[ÓO]RICO\s+DE\s+F[ÉE]RIAS/i);
  if (inicio === -1) return [];

  const restText = texto.slice(inicio);
  const fimMatch = restText.slice(30).search(
    /\n\s*(?:AFASTAMENTOS|ANOTA[ÇC][ÕO]ES|HIST[ÓO]RICO\s+(?:DE\s+CARGO|SALARIAL)|CONTRIBUI[ÇC][ÃA]O|REGISTRO\s+DE\s+FALT)/i,
  );
  const secao = fimMatch === -1 ? restText : restText.slice(0, 30 + fimMatch);

  const ferias: FeriasDominio[] = [];
  const re = new RegExp(RE_CTPS_FERIAS_ROW.source, 'g');
  let match;
  while ((match = re.exec(secao)) !== null) {
    const [, aqIni, , gozoIni, gozoFim, diasStr, abonoStr] = match;
    const diasGozo = Number(diasStr);
    const diasAbono = Number(abonoStr);
    ferias.push({
      relativa: derivarRelativa(aqIni),
      prazo: diasGozo + diasAbono,
      situacao: 'G',
      dobra_geral: false,
      abono: diasAbono > 0,
      dias_abono: diasAbono,
      gozo1: { inicio: gozoIni, fim: gozoFim, dobra: false },
      gozo2: null,
      gozo3: null,
    });
  }
  return ferias;
}

// ── Seção: faltas / afastamentos ──

function parseSecaoFaltas(texto: string): FaltaDominio[] {
  const lines = texto.split(/\r?\n/);

  const linhasDeFerias = new Set<number>();
  let dentroDeFerias = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/HIST[ÓO]RICO\s+DE\s+F[ÉE]RIAS/i.test(line)) {
      dentroDeFerias = true;
      linhasDeFerias.add(i);
      continue;
    }
    if (dentroDeFerias && /(?:AFASTAMENTOS|ANOTA[ÇC][ÕO]ES|HIST[ÓO]RICO\s+SALARIAL)/i.test(line)) {
      dentroDeFerias = false;
      continue;
    }
    if (dentroDeFerias) linhasDeFerias.add(i);
  }

  const inicioAfastamentos = texto.search(/AFASTAMENTOS/i);
  if (inicioAfastamentos === -1) return [];

  const faltas: FaltaDominio[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    if (linhasDeFerias.has(i)) continue;
    const line = lines[i];

    const temAfastamento = /afastament|atestado|aux[íi]lio|doen[çc]a|suspens[ãa]o|licen[çc]a|falt|m[ée]dico/i.test(line);
    if (!temAfastamento) continue;

    let dataInicio: string | null = null;
    let dataFim: string | null = null;

    const intervaloM = line.match(RE_INTERVALO_DATA);
    if (intervaloM) {
      dataInicio = dataBRtoISO(intervaloM[1]);
      dataFim = dataBRtoISO(intervaloM[2]);
    } else {
      const duasM = line.match(RE_DUAS_DATAS_SEPARADAS);
      if (duasM) {
        dataInicio = dataBRtoISO(duasM[1]);
        dataFim = dataBRtoISO(duasM[2]);
      } else {
        const unicaM = line.match(RE_DATA_UNICA);
        if (unicaM) {
          dataInicio = dataBRtoISO(unicaM[1]);
          dataFim = dataInicio;
        }
      }
    }

    if (!dataInicio || !dataFim) continue;

    const key = `${dataInicio}|${dataFim}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const duracao = diffDays(dataInicio, dataFim);
    const tipo = classificarTipo(line, duracao);
    const justificativa = line.replace(/\d{2}\/\d{2}\/\d{4}/g, '').replace(/\s+/g, ' ').trim() || null;

    faltas.push({
      data_inicio: dataInicio,
      data_fim: dataFim,
      tipo_afastamento: tipo,
      duracao_dias: duracao,
      justificada: false,
      reiniciar_periodo_aquisitivo: tipo === 'aux_doenca',
      justificativa,
    });
  }
  return faltas;
}

// ── Seção: histórico salarial ──

function parseSecaoHistoricoSalarial(texto: string): CtpsHistoricoSalarialEntry[] {
  const inicio = texto.search(/HIST[ÓO]RICO\s+SALARIAL|ALTERA[ÇC][ÕO]ES?\s+DE\s+SAL[ÁA]RIO/i);
  if (inicio === -1) return [];

  const restText = texto.slice(inicio);
  const fimMatch = restText.slice(30).search(
    /\n\s*(?:AFASTAMENTOS|HIST[ÓO]RICO\s+DE\s+F[ÉE]RIAS|ANOTA[ÇC][ÕO]ES|CONTRIBUI[ÇC][ÃA]O)/i,
  );
  const secao = fimMatch === -1 ? restText : restText.slice(0, 30 + fimMatch);

  const entries: CtpsHistoricoSalarialEntry[] = [];
  const re = new RegExp(RE_HIST_SALARIAL_ROW.source, 'gu');
  let match;
  while ((match = re.exec(secao)) !== null) {
    const [, d1, d2, desc, valStr] = match;
    entries.push({
      data_inicio: dataBRtoISO(d1),
      data_fim: dataBRtoISO(d2),
      descricao: desc.trim().replace(/\s+/g, ' '),
      valor: parseBRNumber(valStr),
    });
  }
  return entries;
}

// ── Mapper export ──

export const mapperCtps: Mapper<CtpsDominio> = {
  slug: 'ctps_v1',
  nome: 'CTPS — Carteira de Trabalho (V6 composto)',
  tipoDocumento: 'ctps',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (/CARTEIRA\s+DE\s+TRABALHO(\s+E\s+PREVID[ÊE]NCIA\s+SOCIAL)?/i.test(t)) {
      acertos += 2;
      motivos.push("cabeçalho 'Carteira de Trabalho'");
    }
    if (/\bCTPS\b/i.test(t)) {
      acertos++;
      motivos.push('sigla CTPS');
    }
    if (/(ANOTA[ÇC][ÕO]ES?\s+GERAIS|ALTERA[ÇC][ÕO]ES?\s+DE\s+SAL[ÁA]RIO)/i.test(t)) {
      acertos++;
      motivos.push('campos típicos de CTPS');
    }
    if (/gov\.br|CTPS\s+Digital|carteiradetrabalhodigital/i.test(t)) {
      acertos++;
      motivos.push('CTPS Digital gov.br');
    }
    if (/HIST[ÓO]RICO\s+DE\s+F[ÉE]RIAS/i.test(t)) {
      acertos++;
      motivos.push('seção HISTÓRICO DE FÉRIAS');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min(acertos / 6, 0.95),
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): CtpsDominio | null {
    const t = doc.textoCompleto;

    const mAdm = t.match(RE_ADMISSAO);
    if (!mAdm) return null;

    const admissao = dataBRtoISO(mAdm[1]);
    const mDem = t.match(RE_DEMISSAO);
    const demissao = mDem ? dataBRtoISO(mDem[1]) : null;
    const mDemProj = t.match(RE_DEMISSAO_PROJECAO);
    const demissao_com_projecao_aviso = mDemProj ? dataBRtoISO(mDemProj[1]) : null;

    const mMat = t.match(RE_MATRICULA);
    const matricula = mMat ? mMat[1] : null;

    const mCargo = t.match(RE_CARGO);
    const cargo = mCargo ? mCargo[1].trim().replace(/\s+/g, ' ') : null;

    const mEmp = t.match(RE_EMPREGADOR);
    const empregador = mEmp ? mEmp[1].trim().replace(/\s+/g, ' ') : null;

    const mCnpj = t.match(RE_CNPJ);
    const cnpj = mCnpj ? mCnpj[1] : null;

    const ferias = parseSecaoFerias(t);
    const faltas = parseSecaoFaltas(t);
    const historico_salarial = parseSecaoHistoricoSalarial(t);

    return {
      matricula,
      admissao,
      demissao,
      demissao_com_projecao_aviso,
      cargo,
      empregador,
      cnpj,
      ferias,
      faltas,
      historico_salarial,
      _meta: {
        parser: PARSER_VERSION,
        ferias_detectadas: ferias.length,
        faltas_detectadas: faltas.length,
      },
    };
  },
};

export { PARSER_VERSION as CTPS_VERSION };
