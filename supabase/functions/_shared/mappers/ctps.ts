/**
 * Mapper: CTPS — Carteira de Trabalho (V6 — composto).
 *
 * CTPS é "pacote" de dados contratuais + férias + faltas no mesmo PDF
 * (CTPS Digital pós-2019 do gov.br). Este mapper extrai:
 *
 *   - Dados contratuais: matrícula, admissão, demissão, cargo, empregador, CNPJ.
 *
 * O detector aceita CTPS Digital E física. Para férias/faltas dentro do
 * mesmo doc, o `process-document-mistral` deve invocar separadamente
 * `mapperReciboFerias.mapear()` e `mapperRegistroFaltas.mapear()` sobre
 * o mesmo `DocumentoTabular` (são mappers independentes que retornam
 * arrays distintos — o caller decide se persiste).
 *
 * Esta versão V6 cobre apenas o "envelope" CTPS (dados contratuais).
 * Quando dados-chave (admissão) faltam, retorna null e o pipeline cai
 * pro V5 (que tem detecção mais ampla via regex).
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { CtpsDominio } from '../tipos-dominio.ts';

const PARSER_VERSION = 'ctps-mapper-v6.1-2026-05-07';

const RE_DATA_BR = /(\d{2})\/(\d{2})\/(\d{4})/;
const RE_CNPJ = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
const RE_MATRICULA =
  /\b(?:matr[íi]cula|n[uú]mero\s+do\s+empregado|registro)\s*:?\s*(\d{4,12})\b/i;
const RE_ADMISSAO =
  /\b(?:admiss[ãa]o|data\s+de\s+admiss[ãa]o|in[íi]cio\s+do\s+contrato)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i;
const RE_DEMISSAO =
  /\b(?:demiss[ãa]o|sa[íi]da|t[eé]rmino\s+do\s+contrato|data\s+(?:de\s+)?desligamento|rescis[ãa]o)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i;
const RE_CARGO =
  /\b(?:cargo|fun[çc][ãa]o|profiss[ãa]o)\s*:?\s*([\p{L}][\p{L}\s\.\-]{3,80}?)(?=\n|cbo|cnpj|admiss|salario|sal\.)/iu;
const RE_EMPREGADOR =
  /\b(?:empregador|empresa|raz[ãa]o\s+social)\s*:?\s*([\p{L}][\p{L}\s\.\-&]{3,80}?)(?=\n|cnpj|admiss|cargo|fun)/iu;

function dataBRtoISO(dataBR: string): string {
  const m = dataBR.match(RE_DATA_BR);
  if (!m) return dataBR;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export const mapperCtps: Mapper<CtpsDominio> = {
  slug: 'ctps_v1',
  nome: 'CTPS — Carteira de Trabalho (V6)',
  tipoDocumento: 'ctps',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (
      /CARTEIRA\s+DE\s+TRABALHO(\s+E\s+PREVID[ÊE]NCIA\s+SOCIAL)?/i.test(t)
    ) {
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
    // CTPS Digital pós-2019 (gov.br) — marcadores específicos.
    if (/gov\.br|CTPS\s+Digital|carteiradetrabalhodigital/i.test(t)) {
      acertos++;
      motivos.push('CTPS Digital gov.br');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min(acertos / 5, 0.9),
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): CtpsDominio | null {
    const t = doc.textoCompleto;

    // Admissão é o único campo CRÍTICO — sem isso, não dá pra usar CTPS.
    const mAdm = t.match(RE_ADMISSAO);
    if (!mAdm) return null;

    const admissao = dataBRtoISO(mAdm[1]);

    const mDem = t.match(RE_DEMISSAO);
    const demissao = mDem ? dataBRtoISO(mDem[1]) : null;

    const mMat = t.match(RE_MATRICULA);
    const matricula = mMat ? mMat[1] : null;

    const mCargo = t.match(RE_CARGO);
    const cargo = mCargo ? mCargo[1].trim().replace(/\s+/g, ' ') : null;

    const mEmp = t.match(RE_EMPREGADOR);
    const empregador = mEmp ? mEmp[1].trim().replace(/\s+/g, ' ') : null;

    const mCnpj = t.match(RE_CNPJ);
    const cnpj = mCnpj ? mCnpj[1] : null;

    return {
      matricula,
      admissao,
      demissao,
      cargo,
      empregador,
      cnpj,
    };
  },
};

export { PARSER_VERSION as CTPS_VERSION };
