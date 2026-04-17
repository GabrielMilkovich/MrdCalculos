/**
 * =====================================================
 * eSocial Validator — Validação básica dos layouts S-2500 e S-2501
 * =====================================================
 *
 * Valida regras canônicas dos eventos antes da geração do XML:
 * - Obrigatoriedade e presença de blocos estruturais
 * - CPF / CNPJ (formato + dígito verificador)
 * - NIS/PIS/PASEP (11 dígitos)
 * - Datas YYYY-MM-DD parseáveis
 * - Tamanhos máximos de strings
 * - Valores monetários Decimal >= 0
 *
 * NÃO implementa validação XSD completa (cobertura deliberadamente ~80%).
 */

import Decimal from 'decimal.js';
import {
  IND_RETIF,
  TP_AMB,
  PROC_EMI,
  TP_INSC,
  TP_PROC,
  IND_RECONHECIMENTO,
  COD_CATEG,
  IND_CATEG,
  TP_PGTO,
  IND_APUR_IR,
  TP_CR,
} from './esocial-schema';

Decimal.set({ precision: 20 });

// =====================================================
// TIPOS EXPORTADOS
// =====================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =====================================================
// UTIL — leitura segura de campos em `unknown`
// =====================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getField(obj: unknown, key: string): unknown {
  if (!isRecord(obj)) return undefined;
  return obj[key];
}

// =====================================================
// VALIDADORES DE TIPOS BÁSICOS
// =====================================================

/** Dígito verificador CPF (algoritmo oficial) */
export function isValidCPF(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== digits[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === digits[10];
}

/** Dígito verificador CNPJ (algoritmo oficial) */
export function isValidCNPJ(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const digits = cnpj.split('').map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s1 = 0;
  for (let i = 0; i < 12; i++) s1 += digits[i] * w1[i];
  let d1 = s1 % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== digits[12]) return false;
  let s2 = 0;
  for (let i = 0; i < 13; i++) s2 += digits[i] * w2[i];
  let d2 = s2 % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return d2 === digits[13];
}

/** NIS/PIS/PASEP — formato 11 dígitos (DV opcional, aceita qualquer) */
export function isValidNIS(nis: string): boolean {
  return /^\d{11}$/.test(nis);
}

/** Data YYYY-MM-DD parseável e consistente */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Período YYYY-MM */
export function isValidPerAnoMes(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Valor monetário: Decimal válido e >= 0 (a menos que permitNegative) */
function isValidMoney(value: unknown, permitNegative = false): boolean {
  if (typeof value !== 'string' || value.trim() === '') return false;
  let dec: Decimal;
  try {
    dec = new Decimal(value);
  } catch {
    return false;
  }
  if (!dec.isFinite()) return false;
  if (!permitNegative && dec.isNegative()) return false;
  return true;
}

// =====================================================
// CHECKS GENÉRICOS (empurram em `errors`)
// =====================================================

interface Ctx {
  errors: ValidationError[];
}

function requireString(
  ctx: Ctx,
  field: string,
  value: unknown,
  opts: { min?: number; max?: number; enumVals?: readonly string[] } = {},
): string | null {
  if (value === undefined || value === null || value === '') {
    ctx.errors.push({ field, message: 'campo obrigatório ausente ou vazio', value });
    return null;
  }
  if (typeof value !== 'string') {
    ctx.errors.push({ field, message: 'deve ser string', value });
    return null;
  }
  if (opts.min !== undefined && value.length < opts.min) {
    ctx.errors.push({ field, message: `tamanho mínimo ${opts.min}`, value });
  }
  if (opts.max !== undefined && value.length > opts.max) {
    ctx.errors.push({ field, message: `tamanho máximo ${opts.max}`, value });
  }
  if (opts.enumVals && !opts.enumVals.includes(value)) {
    ctx.errors.push({
      field,
      message: `valor fora do enum permitido (${opts.enumVals.join('|')})`,
      value,
    });
  }
  return value;
}

function checkCPF(ctx: Ctx, field: string, value: unknown): void {
  if (typeof value !== 'string' || !isValidCPF(value)) {
    ctx.errors.push({ field, message: 'CPF inválido (formato ou DV)', value });
  }
}

function checkCNPJ(ctx: Ctx, field: string, value: unknown): void {
  if (typeof value !== 'string' || !isValidCNPJ(value)) {
    ctx.errors.push({ field, message: 'CNPJ inválido (formato ou DV)', value });
  }
}

function checkISODate(ctx: Ctx, field: string, value: unknown, optional = false): void {
  if (value === undefined || value === null || value === '') {
    if (!optional) ctx.errors.push({ field, message: 'data obrigatória', value });
    return;
  }
  if (typeof value !== 'string' || !isValidISODate(value)) {
    ctx.errors.push({ field, message: 'data inválida (esperado YYYY-MM-DD)', value });
  }
}

function checkPerAnoMes(ctx: Ctx, field: string, value: unknown): void {
  if (typeof value !== 'string' || !isValidPerAnoMes(value)) {
    ctx.errors.push({ field, message: 'período inválido (esperado YYYY-MM)', value });
  }
}

function checkMoney(
  ctx: Ctx,
  field: string,
  value: unknown,
  opts: { optional?: boolean; permitNegative?: boolean } = {},
): void {
  if (value === undefined || value === null || value === '') {
    if (!opts.optional) ctx.errors.push({ field, message: 'valor monetário obrigatório', value });
    return;
  }
  if (!isValidMoney(value, opts.permitNegative)) {
    ctx.errors.push({
      field,
      message: opts.permitNegative
        ? 'valor monetário inválido (Decimal)'
        : 'valor monetário inválido ou negativo',
      value,
    });
  }
}

function requireObject(ctx: Ctx, field: string, value: unknown): boolean {
  if (!isRecord(value)) {
    ctx.errors.push({ field, message: 'objeto obrigatório ausente', value });
    return false;
  }
  return true;
}

function requireArray(ctx: Ctx, field: string, value: unknown, minLen = 1): boolean {
  if (!Array.isArray(value)) {
    ctx.errors.push({ field, message: 'array obrigatório ausente', value });
    return false;
  }
  if (value.length < minLen) {
    ctx.errors.push({ field, message: `array deve conter no mínimo ${minLen} item(ns)`, value });
    return false;
  }
  return true;
}

// =====================================================
// VALIDADORES DE BLOCOS COMUNS
// =====================================================

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
    if (typeof nrInsc === 'string' && /^\d{8}$/.test(nrInsc)) return; // raiz 8 dígitos aceitável
    checkCNPJ(ctx, `${prefix}.nrInsc`, nrInsc);
  } else if (tpInsc === TP_INSC.CPF) {
    checkCPF(ctx, `${prefix}.nrInsc`, nrInsc);
  } else {
    requireString(ctx, `${prefix}.nrInsc`, nrInsc, { min: 8, max: 14 });
  }
}

function checkNrProcCNJ(ctx: Ctx, field: string, value: unknown): void {
  const s = requireString(ctx, field, value, { min: 20, max: 20 });
  if (s && !/^\d{20}$/.test(s)) {
    ctx.errors.push({ field, message: 'deve conter 20 dígitos (padrão CNJ)', value: s });
  }
}

// =====================================================
// S-2500
// =====================================================

export function validateS2500(obj: unknown): ValidationResult {
  const ctx: Ctx = { errors: [] };
  if (!isRecord(obj)) {
    ctx.errors.push({ field: 'root', message: 'evento S-2500 deve ser um objeto', value: obj });
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
      ctx.errors.push({ field: 'trabalhador.nisTrab', message: 'NIS deve conter 11 dígitos', value: nis });
    }
    const codCateg = getField(trab, 'codCateg');
    if (codCateg !== undefined && codCateg !== '') {
      requireString(ctx, 'trabalhador.codCateg', codCateg, { enumVals: COD_CATEG });
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
    const remun = getField(contr, 'remuneracao');
    if (remun !== undefined && remun !== '') checkMoney(ctx, 'infoContrato.remuneracao', remun);
  }

  checkPerAnoMes(ctx, 'perApurPgto', getField(obj, 'perApurPgto'));

  const periodos = getField(obj, 'periodos');
  if (requireArray(ctx, 'periodos', periodos, 1) && Array.isArray(periodos)) {
    periodos.forEach((per, i) => {
      const prefix = `periodos[${i}]`;
      if (!requireObject(ctx, prefix, per)) return;
      checkPerAnoMes(ctx, `${prefix}.perRef`, getField(per, 'perRef'));
      const rem = getField(per, 'remuneracao');
      if (rem !== undefined && rem !== '') checkMoney(ctx, `${prefix}.remuneracao`, rem);
      const rubricas = getField(per, 'rubricas');
      if (requireArray(ctx, `${prefix}.rubricas`, rubricas, 1) && Array.isArray(rubricas)) {
        rubricas.forEach((r, j) => {
          const rp = `${prefix}.rubricas[${j}]`;
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

// =====================================================
// S-2501
// =====================================================

export function validateS2501(obj: unknown): ValidationResult {
  const ctx: Ctx = { errors: [] };
  if (!isRecord(obj)) {
    ctx.errors.push({ field: 'root', message: 'evento S-2501 deve ser um objeto', value: obj });
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
