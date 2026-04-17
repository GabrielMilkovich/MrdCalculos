/**
 * eSocial Validator — S-2500 e S-2501 (cobertura básica ~80%)
 * Valida: campos obrigatórios, CPF/CNPJ (DV), NIS, datas YYYY-MM-DD,
 * períodos YYYY-MM, tamanhos máx., valores monetários (Decimal >= 0),
 * enums e presença de objetos/arrays filhos.
 * NÃO implementa XSD completo.
 */

import Decimal from 'decimal.js';
import {
  IND_RETIF, TP_AMB, PROC_EMI, TP_INSC, TP_PROC, IND_RECONHECIMENTO,
  COD_CATEG, IND_CATEG, TP_PGTO, IND_APUR_IR, TP_CR,
} from './esocial-schema';

Decimal.set({ precision: 20 });

// ============ TIPOS EXPORTADOS ============

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============ LEITURA SEGURA DE `unknown` ============

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function getField(obj: unknown, key: string): unknown {
  return isRecord(obj) ? obj[key] : undefined;
}

// ============ VALIDADORES PRIMITIVOS ============

/** Dígito verificador CPF (algoritmo oficial) */
export function isValidCPF(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const d = cpf.split('').map(Number);
  let s = 0;
  for (let i = 0; i < 9; i++) s += d[i] * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += d[i] * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === d[10];
}

/** Dígito verificador CNPJ (algoritmo oficial) */
export function isValidCNPJ(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const d = cnpj.split('').map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s1 = 0;
  for (let i = 0; i < 12; i++) s1 += d[i] * w1[i];
  let d1 = s1 % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== d[12]) return false;
  let s2 = 0;
  for (let i = 0; i < 13; i++) s2 += d[i] * w2[i];
  let d2 = s2 % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return d2 === d[13];
}

export function isValidNIS(nis: string): boolean {
  return /^\d{11}$/.test(nis);
}

export function isValidISODate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidPerAnoMes(v: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

function isValidMoney(v: unknown, permitNegative = false): boolean {
  if (typeof v !== 'string' || v.trim() === '') return false;
  let dec: Decimal;
  try { dec = new Decimal(v); } catch { return false; }
  if (!dec.isFinite()) return false;
  if (!permitNegative && dec.isNegative()) return false;
  return true;
}

// ============ CHECKS GENÉRICOS ============

interface Ctx { errors: ValidationError[] }

function push(ctx: Ctx, field: string, message: string, value: unknown): void {
  ctx.errors.push({ field, message, value });
}

function requireString(
  ctx: Ctx, field: string, value: unknown,
  opts: { min?: number; max?: number; enumVals?: readonly string[] } = {},
): string | null {
  if (value === undefined || value === null || value === '') {
    push(ctx, field, 'campo obrigatório ausente ou vazio', value);
    return null;
  }
  if (typeof value !== 'string') {
    push(ctx, field, 'deve ser string', value);
    return null;
  }
  if (opts.min !== undefined && value.length < opts.min) push(ctx, field, `tamanho mínimo ${opts.min}`, value);
  if (opts.max !== undefined && value.length > opts.max) push(ctx, field, `tamanho máximo ${opts.max}`, value);
  if (opts.enumVals && !opts.enumVals.includes(value)) {
    push(ctx, field, `valor fora do enum permitido (${opts.enumVals.join('|')})`, value);
  }
  return value;
}

function checkCPF(ctx: Ctx, field: string, v: unknown): void {
  if (typeof v !== 'string' || !isValidCPF(v)) push(ctx, field, 'CPF inválido (formato ou DV)', v);
}

function checkCNPJ(ctx: Ctx, field: string, v: unknown): void {
  if (typeof v !== 'string' || !isValidCNPJ(v)) push(ctx, field, 'CNPJ inválido (formato ou DV)', v);
}

function checkISODate(ctx: Ctx, field: string, v: unknown, optional = false): void {
  if (v === undefined || v === null || v === '') {
    if (!optional) push(ctx, field, 'data obrigatória', v);
    return;
  }
  if (typeof v !== 'string' || !isValidISODate(v)) push(ctx, field, 'data inválida (esperado YYYY-MM-DD)', v);
}

function checkPerAnoMes(ctx: Ctx, field: string, v: unknown): void {
  if (typeof v !== 'string' || !isValidPerAnoMes(v)) push(ctx, field, 'período inválido (esperado YYYY-MM)', v);
}

function checkMoney(
  ctx: Ctx, field: string, v: unknown,
  opts: { optional?: boolean; permitNegative?: boolean } = {},
): void {
  if (v === undefined || v === null || v === '') {
    if (!opts.optional) push(ctx, field, 'valor monetário obrigatório', v);
    return;
  }
  if (!isValidMoney(v, opts.permitNegative)) {
    push(ctx, field,
      opts.permitNegative ? 'valor monetário inválido (Decimal)' : 'valor monetário inválido ou negativo', v);
  }
}

function requireObject(ctx: Ctx, field: string, v: unknown): boolean {
  if (!isRecord(v)) { push(ctx, field, 'objeto obrigatório ausente', v); return false; }
  return true;
}

function requireArray(ctx: Ctx, field: string, v: unknown, minLen = 1): boolean {
  if (!Array.isArray(v)) { push(ctx, field, 'array obrigatório ausente', v); return false; }
  if (v.length < minLen) { push(ctx, field, `array deve conter no mínimo ${minLen} item(ns)`, v); return false; }
  return true;
}

function checkNrProcCNJ(ctx: Ctx, field: string, v: unknown): void {
  const s = requireString(ctx, field, v, { min: 20, max: 20 });
  if (s && !/^\d{20}$/.test(s)) push(ctx, field, 'deve conter 20 dígitos (padrão CNJ)', s);
}

// ============ BLOCOS COMUNS ============

function validateIdeEvento(ctx: Ctx, prefix: string, ide: unknown): void {
  if (!requireObject(ctx, prefix, ide)) return;
  const indRetif = getField(ide, 'indRetif');
  requireString(ctx, `${prefix}.indRetif`, indRetif, { enumVals: Object.values(IND_RETIF) });
  if (indRetif === IND_RETIF.RETIFICACAO) {
    requireString(ctx, `${prefix}.nrRecibo`, getField(ide, 'nrRecibo'), { min: 1, max: 40 });
  }
  requireString(ctx, `${prefix}.tpAmb`, getField(ide, 'tpAmb'), { enumVals: Object.values(TP_AMB) });
  requireString(ctx, `${prefix}.procEmi`, getField(ide, 'procEmi'), { enumVals: Object.values(PROC_EMI) });
  requireString(ctx, `${prefix}.verProc`, getField(ide, 'verProc'), { min: 1, max: 20 });
}

function validateIdeEmpregador(ctx: Ctx, prefix: string, ide: unknown): void {
  if (!requireObject(ctx, prefix, ide)) return;
  const tpInsc = requireString(ctx, `${prefix}.tpInsc`, getField(ide, 'tpInsc'), {
    enumVals: Object.values(TP_INSC),
  });
  const nrInsc = getField(ide, 'nrInsc');
  if (tpInsc === TP_INSC.CNPJ) {
    if (typeof nrInsc === 'string' && /^\d{8}$/.test(nrInsc)) return;
    checkCNPJ(ctx, `${prefix}.nrInsc`, nrInsc);
  } else if (tpInsc === TP_INSC.CPF) {
    checkCPF(ctx, `${prefix}.nrInsc`, nrInsc);
  } else {
    requireString(ctx, `${prefix}.nrInsc`, nrInsc, { min: 8, max: 14 });
  }
}

// ============ S-2500 ============

export function validateS2500(obj: unknown): ValidationResult {
  const ctx: Ctx = { errors: [] };
  if (!isRecord(obj)) {
    push(ctx, 'root', 'evento S-2500 deve ser um objeto', obj);
    return { valid: false, errors: ctx.errors };
  }

  validateIdeEvento(ctx, 'ideEvento', getField(obj, 'ideEvento'));
  validateIdeEmpregador(ctx, 'ideEmpregador', getField(obj, 'ideEmpregador'));

  const info = getField(obj, 'infoProcesso');
  if (requireObject(ctx, 'infoProcesso', info)) {
    requireString(ctx, 'infoProcesso.tpProc', getField(info, 'tpProc'), { enumVals: Object.values(TP_PROC) });
    checkNrProcCNJ(ctx, 'infoProcesso.nrProcTrab', getField(info, 'nrProcTrab'));
    const obs = getField(info, 'obsProc');
    if (obs !== undefined) requireString(ctx, 'infoProcesso.obsProc', obs, { min: 1, max: 255 });
    checkISODate(ctx, 'infoProcesso.dtSent', getField(info, 'dtSent'), true);
  }

  const trab = getField(obj, 'trabalhador');
  if (requireObject(ctx, 'trabalhador', trab)) {
    checkCPF(ctx, 'trabalhador.cpfTrab', getField(trab, 'cpfTrab'));
    requireString(ctx, 'trabalhador.nmTrab', getField(trab, 'nmTrab'), { min: 2, max: 70 });
    checkISODate(ctx, 'trabalhador.dtNascto', getField(trab, 'dtNascto'), true);
    const nis = getField(trab, 'nisTrab');
    if (nis !== undefined && nis !== '' && (typeof nis !== 'string' || !isValidNIS(nis))) {
      push(ctx, 'trabalhador.nisTrab', 'NIS deve conter 11 dígitos', nis);
    }
    const cc = getField(trab, 'codCateg');
    if (cc !== undefined && cc !== '') {
      requireString(ctx, 'trabalhador.codCateg', cc, { enumVals: COD_CATEG });
    }
  }

  const contr = getField(obj, 'infoContrato');
  if (requireObject(ctx, 'infoContrato', contr)) {
    requireString(ctx, 'infoContrato.indReconhec', getField(contr, 'indReconhec'), {
      enumVals: Object.values(IND_RECONHECIMENTO),
    });
    checkISODate(ctx, 'infoContrato.dtAdm', getField(contr, 'dtAdm'));
    checkISODate(ctx, 'infoContrato.dtDeslig', getField(contr, 'dtDeslig'), true);
    requireString(ctx, 'infoContrato.codCateg', getField(contr, 'codCateg'), { enumVals: COD_CATEG });
    const rem = getField(contr, 'remuneracao');
    if (rem !== undefined && rem !== '') checkMoney(ctx, 'infoContrato.remuneracao', rem);
  }

  checkPerAnoMes(ctx, 'perApurPgto', getField(obj, 'perApurPgto'));

  const periodos = getField(obj, 'periodos');
  if (requireArray(ctx, 'periodos', periodos, 1) && Array.isArray(periodos)) {
    periodos.forEach((per, i) => {
      const pfx = `periodos[${i}]`;
      if (!requireObject(ctx, pfx, per)) return;
      checkPerAnoMes(ctx, `${pfx}.perRef`, getField(per, 'perRef'));
      const rem = getField(per, 'remuneracao');
      if (rem !== undefined && rem !== '') checkMoney(ctx, `${pfx}.remuneracao`, rem);
      const rubricas = getField(per, 'rubricas');
      if (requireArray(ctx, `${pfx}.rubricas`, rubricas, 1) && Array.isArray(rubricas)) {
        rubricas.forEach((r, j) => {
          const rp = `${pfx}.rubricas[${j}]`;
          if (!requireObject(ctx, rp, r)) return;
          requireString(ctx, `${rp}.codRubr`, getField(r, 'codRubr'), { min: 1, max: 30 });
          requireString(ctx, `${rp}.ideTabRubr`, getField(r, 'ideTabRubr'), { min: 1, max: 8 });
          checkMoney(ctx, `${rp}.vrRubr`, getField(r, 'vrRubr'), { permitNegative: true });
        });
      }
    });
  }

  return { valid: ctx.errors.length === 0, errors: ctx.errors };
}

// ============ S-2501 ============

export function validateS2501(obj: unknown): ValidationResult {
  const ctx: Ctx = { errors: [] };
  if (!isRecord(obj)) {
    push(ctx, 'root', 'evento S-2501 deve ser um objeto', obj);
    return { valid: false, errors: ctx.errors };
  }

  validateIdeEvento(ctx, 'ideEvento', getField(obj, 'ideEvento'));
  validateIdeEmpregador(ctx, 'ideEmpregador', getField(obj, 'ideEmpregador'));

  const ideProc = getField(obj, 'ideProc');
  if (requireObject(ctx, 'ideProc', ideProc)) {
    checkNrProcCNJ(ctx, 'ideProc.nrProcTrab', getField(ideProc, 'nrProcTrab'));
    checkPerAnoMes(ctx, 'ideProc.perApurPgto', getField(ideProc, 'perApurPgto'));
    requireString(ctx, 'ideProc.tpPgto', getField(ideProc, 'tpPgto'), { enumVals: Object.values(TP_PGTO) });
    checkISODate(ctx, 'ideProc.dtPgto', getField(ideProc, 'dtPgto'), true);
  }

  const ideTrab = getField(obj, 'ideTrab');
  if (requireObject(ctx, 'ideTrab', ideTrab)) {
    checkCPF(ctx, 'ideTrab.cpfTrab', getField(ideTrab, 'cpfTrab'));
    requireString(ctx, 'ideTrab.indCateg', getField(ideTrab, 'indCateg'), { enumVals: Object.values(IND_CATEG) });
  }

  const calc = getField(obj, 'calcTrib');
  if (requireObject(ctx, 'calcTrib', calc)) {
    requireString(ctx, 'calcTrib.indApurIR', getField(calc, 'indApurIR'), { enumVals: Object.values(IND_APUR_IR) });
    const anual = getField(calc, 'vrBcCpAnual');
    if (anual !== undefined && anual !== '') checkMoney(ctx, 'calcTrib.vrBcCpAnual', anual);
    const anual13 = getField(calc, 'vrBcCp13Anual');
    if (anual13 !== undefined && anual13 !== '') checkMoney(ctx, 'calcTrib.vrBcCp13Anual', anual13);
    checkMoney(ctx, 'calcTrib.vrCpSeg', getField(calc, 'vrCpSeg'));
    const desc = getField(calc, 'vrDescSeg');
    if (desc !== undefined && desc !== '') checkMoney(ctx, 'calcTrib.vrDescSeg', desc);

    const contribs = getField(calc, 'contribuicoes');
    if (requireArray(ctx, 'calcTrib.contribuicoes', contribs, 1) && Array.isArray(contribs)) {
      contribs.forEach((c, i) => {
        const cp = `calcTrib.contribuicoes[${i}]`;
        if (!requireObject(ctx, cp, c)) return;
        requireString(ctx, `${cp}.tpCR`, getField(c, 'tpCR'), { enumVals: Object.values(TP_CR) });
        checkMoney(ctx, `${cp}.vrCR`, getField(c, 'vrCR'));
      });
    }
  }

  const bases = getField(obj, 'basesInss');
  if (requireArray(ctx, 'basesInss', bases, 1) && Array.isArray(bases)) {
    bases.forEach((b, i) => {
      const bp = `basesInss[${i}]`;
      if (!requireObject(ctx, bp, b)) return;
      checkPerAnoMes(ctx, `${bp}.perRef`, getField(b, 'perRef'));
      checkMoney(ctx, `${bp}.vrBcCpMensal`, getField(b, 'vrBcCpMensal'));
      const v13 = getField(b, 'vrBcCp13');
      if (v13 !== undefined && v13 !== '') checkMoney(ctx, `${bp}.vrBcCp13`, v13);
      const vd = getField(b, 'vrDescCp');
      if (vd !== undefined && vd !== '') checkMoney(ctx, `${bp}.vrDescCp`, vd);
    });
  }

  return { valid: ctx.errors.length === 0, errors: ctx.errors };
}
