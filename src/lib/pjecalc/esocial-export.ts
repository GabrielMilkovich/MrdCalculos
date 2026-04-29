/**
 * =====================================================
 * eSocial Export — Geração de XML S-2500 e S-2501
 * =====================================================
 *
 * Eventos eSocial para processos trabalhistas:
 * - S-2500: Processo Trabalhista (informações do processo e bases)
 * - S-2501: Informações de Contribuições Decorrentes de Processo Trabalhista
 *
 * Layout: eSocial v. S-1.2 (Nota Técnica 01/2023)
 */

import Decimal from 'decimal.js';
import type { PjeLiquidacaoResult, PjeResumo, PjeVerbaResult, PjeOcorrenciaResult } from './engine-types';
import { validateS2500, validateS2501, type ValidationError } from './esocial-validator';
import type { S2500_Event, S2501_Event } from './esocial-schema';

// =====================================================
// TYPES
// =====================================================

export interface ESocialDadosProcesso {
  // Identificação do empregador
  cnpjEmpregador: string;
  nomeEmpregador: string;
  // Processo
  nrProcTrab: string;       // Número CNJ
  perApurPgto: string;      // Período de apuração do pagamento (YYYY-MM)
  obs?: string;
  // Trabalhador
  cpfTrab: string;
  nmTrab: string;
  dtNascto?: string;        // YYYY-MM-DD
  // Contrato
  dtAdm: string;            // YYYY-MM-DD
  dtDeslig?: string;        // YYYY-MM-DD
  codCateg: string;         // Código categoria eSocial (101 = empregado geral)
  // Decisão
  indContr: '1' | '2';      // 1=Reconhecida, 2=Sem vínculo
  tpTrib: '1' | '2';        // 1=Conciliação, 2=Decisão
  // Pagamento
  dtSentDecTransworker?: string;
  dtEfetPgto?: string;      // Data efetiva do pagamento
}

export interface ESocialConfig {
  dados: ESocialDadosProcesso;
  ambiente: '1' | '2';      // 1=Produção, 2=Produção restrita
  /** Processo executivo / fase */
  tpProcesso: '1' | '2';    // 1=Administrativo, 2=Judicial
}

// =====================================================
// HELPERS
// =====================================================

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtVal(v: number): string {
  return Math.abs(v || 0).toFixed(2);
}

function fmtMesAno(comp: string): string {
  // "2024-01" → "2024-01"
  return comp.slice(0, 7);
}

function gerarId(): string {
  return 'ID' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// =====================================================
// VALIDAÇÃO — constrói eventos tipados e chama validadores
// =====================================================

function formatValidationErrors(prefix: string, errors: ValidationError[]): string {
  const lines = errors.map(e => `  - ${e.field}: ${e.message}` + (e.value !== undefined ? ` (valor=${JSON.stringify(e.value)})` : ''));
  return `${prefix}\n${lines.join('\n')}`;
}

/** Constrói o evento S-2500 tipado a partir do config + result (para validação) */
function buildS2500Event(config: ESocialConfig, result: PjeLiquidacaoResult): S2500_Event {
  const d = config.dados;
  const cnpj = d.cnpjEmpregador.replace(/\D/g, '').slice(0, 14);
  const cpf = d.cpfTrab.replace(/\D/g, '');

  const competencias = new Set<string>();
  for (const v of result.verbas) {
    for (const o of v.ocorrencias) competencias.add(fmtMesAno(o.competencia));
  }
  const comps = Array.from(competencias).sort();

  const periodos = comps.map(comp => {
    const rubricas = result.verbas
      .map(v => {
        const mes = v.ocorrencias.filter(o => fmtMesAno(o.competencia) === comp);
        if (mes.length === 0) return null;
        const total = mes.reduce((s, o) => s + o.devido, 0);
        if (total === 0) return null;
        return {
          codRubr: v.nome.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '') || 'RUBR',
          ideTabRubr: 'MRD01',
          vrRubr: fmtVal(total),
        };
      })
      .filter((x): x is { codRubr: string; ideTabRubr: string; vrRubr: string } => x !== null);
    return { perRef: comp, rubricas };
  }).filter(p => p.rubricas.length > 0);

  return {
    ideEvento: {
      indRetif: '1',
      tpAmb: config.ambiente,
      procEmi: '1',
      verProc: 'MRDcalc-1.0',
    },
    ideEmpregador: { tpInsc: '1', nrInsc: cnpj },
    infoProcesso: {
      tpProc: config.tpProcesso === '2' ? '1' : '2',
      nrProcTrab: d.nrProcTrab.replace(/\D/g, ''),
      ...(d.obs !== undefined && d.obs !== '' ? { obsProc: d.obs } : {}),
      ...(d.dtSentDecTransworker ? { dtSent: d.dtSentDecTransworker } : {}),
    },
    trabalhador: {
      cpfTrab: cpf,
      nmTrab: d.nmTrab,
      ...(d.dtNascto ? { dtNascto: d.dtNascto } : {}),
    },
    infoContrato: {
      indReconhec: d.indContr === '1' ? '1' : '2',
      dtAdm: d.dtAdm,
      ...(d.dtDeslig ? { dtDeslig: d.dtDeslig } : {}),
      codCateg: d.codCateg as S2500_Event['infoContrato']['codCateg'],
    },
    perApurPgto: d.perApurPgto,
    periodos: periodos.length > 0 ? periodos : [
      { perRef: d.perApurPgto, rubricas: [{ codRubr: 'TOTAL', ideTabRubr: 'MRD01', vrRubr: '0.00' }] },
    ],
  };
}

/** Constrói o evento S-2501 tipado a partir do config + result (para validação) */
function buildS2501Event(config: ESocialConfig, result: PjeLiquidacaoResult): S2501_Event {
  const d = config.dados;
  const cnpj = d.cnpjEmpregador.replace(/\D/g, '').slice(0, 14);
  const cpf = d.cpfTrab.replace(/\D/g, '');
  const resumo = result.resumo;

  const competencias = new Set<string>();
  for (const v of result.verbas) {
    for (const o of v.ocorrencias) competencias.add(fmtMesAno(o.competencia));
  }
  const comps = Array.from(competencias).sort();

  const basesInss = comps.map(comp => {
    let base = 0;
    for (const v of result.verbas) {
      base += v.ocorrencias.filter(o => fmtMesAno(o.competencia) === comp)
        .reduce((s, o) => s + o.diferenca, 0);
    }
    return { perRef: comp, vrBcCpMensal: fmtVal(Math.max(0, base)) };
  }).filter(b => new Decimal(b.vrBcCpMensal).gt(0));

  return {
    ideEvento: {
      indRetif: '1',
      tpAmb: config.ambiente,
      procEmi: '1',
      verProc: 'MRDcalc-1.0',
    },
    ideEmpregador: { tpInsc: '1', nrInsc: cnpj },
    ideProc: {
      nrProcTrab: d.nrProcTrab.replace(/\D/g, ''),
      perApurPgto: d.perApurPgto,
      tpPgto: '1',
      ...(d.dtEfetPgto ? { dtPgto: d.dtEfetPgto } : {}),
    },
    ideTrab: { cpfTrab: cpf, indCateg: '1' },
    calcTrib: {
      indApurIR: '1',
      vrCpSeg: fmtVal(resumo.cs_segurado),
      contribuicoes: [
        { tpCR: '1708', vrCR: fmtVal(resumo.cs_segurado + resumo.cs_empregador) },
      ],
    },
    basesInss: basesInss.length > 0
      ? basesInss
      : [{ perRef: d.perApurPgto, vrBcCpMensal: fmtVal(Math.max(0, resumo.principal_bruto)) }],
  };
}

// =====================================================
// S-2500 — PROCESSO TRABALHISTA
// =====================================================

export function gerarS2500(
  config: ESocialConfig,
  result: PjeLiquidacaoResult,
): string {
  // Validação canônica antes de gerar XML — falha rápido com lista de erros
  const vr = validateS2500(buildS2500Event(config, result));
  if (!vr.valid) {
    throw new Error(formatValidationErrors('Validação S-2500 falhou:', vr.errors));
  }
  const d = config.dados;
  const id = gerarId();
  const now = new Date().toISOString().slice(0, 19);

  // Agrupar competências para idePeriodo
  const competencias = new Set<string>();
  for (const v of result.verbas) {
    for (const o of v.ocorrencias) {
      competencias.add(fmtMesAno(o.competencia));
    }
  }
  const comps = Array.from(competencias).sort();

  // Montar rubricas por competência
  const periodosXml = comps.map(comp => {
    const rubricas: string[] = [];

    for (const v of result.verbas) {
      const ocorrsDoMes = v.ocorrencias.filter(
        o => fmtMesAno(o.competencia) === comp
      );
      if (ocorrsDoMes.length === 0) continue;

      const totalDevido = ocorrsDoMes.reduce((s, o) => s + o.devido, 0);
      if (totalDevido === 0) continue;

      // Código rubrica eSocial: usar código da verba ou gerar
      const codRubr = esc(v.nome.slice(0, 30).replace(/[^a-zA-Z0-9]/g, ''));

      rubricas.push(`
            <ideEstabVlr>
              <tpInsc>1</tpInsc>
              <nrInsc>${esc(d.cnpjEmpregador.replace(/\D/g, '').slice(0, 14))}</nrInsc>
              <codRubr>${codRubr}</codRubr>
              <ideTabRubr>MRD01</ideTabRubr>
              <qtdRubr>1</qtdRubr>
              <fatorRubr>1</fatorRubr>
              <vrRubr>${fmtVal(totalDevido)}</vrRubr>
            </ideEstabVlr>`);
    }

    if (rubricas.length === 0) return '';

    return `
          <idePeriodo>
            <perRef>${comp}</perRef>${rubricas.join('')}
          </idePeriodo>`;
  }).filter(Boolean).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtProcTrab/v_S_01_02_00">
  <evtProcTrab Id="${id}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>${config.ambiente}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>MRDcalc-1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${esc(d.cnpjEmpregador.replace(/\D/g, '').slice(0, 14))}</nrInsc>
    </ideEmpregador>
    <ideTrab>
      <cpfTrab>${esc(d.cpfTrab.replace(/\D/g, ''))}</cpfTrab>
      <nmTrab>${esc(d.nmTrab)}</nmTrab>${d.dtNascto ? `
      <dtNascto>${d.dtNascto}</dtNascto>` : ''}
    </ideTrab>
    <infoProcTrab>
      <dados>
        <nrProcTrab>${esc(d.nrProcTrab)}</nrProcTrab>
        <indContr>${d.indContr}</indContr>
        <tpTrib>${d.tpTrib}</tpTrib>
        <dtAdm>${d.dtAdm}</dtAdm>${d.dtDeslig ? `
        <dtDeslig>${d.dtDeslig}</dtDeslig>` : ''}
        <codCateg>${esc(d.codCateg)}</codCateg>
      </dados>
      <idePeriodo>
        <perApurPgto>${esc(d.perApurPgto)}</perApurPgto>${periodosXml}
      </idePeriodo>
    </infoProcTrab>
  </evtProcTrab>
</eSocial>`;
}

// =====================================================
// S-2501 — CONTRIBUIÇÕES DE PROCESSO TRABALHISTA
// =====================================================

export function gerarS2501(
  config: ESocialConfig,
  result: PjeLiquidacaoResult,
): string {
  // Validação canônica antes de gerar XML — falha rápido com lista de erros
  const vr = validateS2501(buildS2501Event(config, result));
  if (!vr.valid) {
    throw new Error(formatValidationErrors('Validação S-2501 falhou:', vr.errors));
  }
  const d = config.dados;
  const id = gerarId();
  const resumo = result.resumo;

  // Agrupar por competência para bases de CS
  const competencias = new Set<string>();
  for (const v of result.verbas) {
    for (const o of v.ocorrencias) {
      competencias.add(fmtMesAno(o.competencia));
    }
  }
  const comps = Array.from(competencias).sort();

  // Para cada competência, calcular base de CS
  const basesXml = comps.map(comp => {
    let baseSeg = 0;
    for (const v of result.verbas) {
      const ocorrsDoMes = v.ocorrencias.filter(
        o => fmtMesAno(o.competencia) === comp
      );
      baseSeg += ocorrsDoMes.reduce((s, o) => s + o.diferenca, 0);
    }
    if (baseSeg <= 0) return '';

    return `
        <infoValores>
          <perRef>${comp}</perRef>
          <baseCalculo>
            <vrBcCpMensal>${fmtVal(baseSeg)}</vrBcCpMensal>
          </baseCalculo>
        </infoValores>`;
  }).filter(Boolean).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtContProc/v_S_01_02_00">
  <evtContProc Id="${id}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>${config.ambiente}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>MRDcalc-1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${esc(d.cnpjEmpregador.replace(/\D/g, '').slice(0, 14))}</nrInsc>
    </ideEmpregador>
    <ideProc>
      <nrProcTrab>${esc(d.nrProcTrab)}</nrProcTrab>
      <perApurPgto>${esc(d.perApurPgto)}</perApurPgto>
    </ideProc>
    <ideTrab>
      <cpfTrab>${esc(d.cpfTrab.replace(/\D/g, ''))}</cpfTrab>
      <calcTrib>
        <vrBcCpAtiva>${fmtVal(resumo.principal_bruto)}</vrBcCpAtiva>
        <vrCpSeg>${fmtVal(resumo.cs_segurado)}</vrCpSeg>
        <vrCpPatr>${fmtVal(resumo.cs_empregador)}</vrCpPatr>
        <vrDescSeg>${fmtVal(resumo.cs_segurado)}</vrDescSeg>
        <infoCRContrib>
          <tpCR>1</tpCR>
          <vrCR>${fmtVal(resumo.cs_segurado + resumo.cs_empregador)}</vrCR>
        </infoCRContrib>
      </calcTrib>${basesXml}
    </ideTrab>
  </evtContProc>
</eSocial>`;
}

// =====================================================
// DOWNLOAD HELPER
// =====================================================

export function downloadXml(xml: string, filename: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('downloadXml: ambiente sem suporte a File API.');
  }
  const safeName = (filename || 'esocial.xml')
    .replace(/[\x00-\x1f<>:"/\\|?*]+/g, '_')
    .trim()
    .slice(0, 200) || 'esocial.xml';

  const blob = new Blob([xml ?? ''], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  let a: HTMLAnchorElement | null = null;
  try {
    a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
  } finally {
    try {
      if (a && a.parentNode) a.parentNode.removeChild(a);
    } catch {
      /* ignore */
    }
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

// =====================================================
// BATCH EXPORT (ZIP)
// =====================================================

export async function exportarESocialZip(
  config: ESocialConfig,
  result: PjeLiquidacaoResult,
): Promise<void> {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('exportarESocialZip: ambiente sem suporte a File API.');
  }

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  zip.file('S-2500.xml', gerarS2500(config, result));
  zip.file('S-2501.xml', gerarS2501(config, result));

  const blob = await zip.generateAsync({ type: 'blob' });
  const safeProc = (config.dados.nrProcTrab || 'processo').replace(/[\x00-\x1f<>:"/\\|?*]+/g, '_');
  const url = URL.createObjectURL(blob);
  let a: HTMLAnchorElement | null = null;
  try {
    a = document.createElement('a');
    a.href = url;
    a.download = `esocial-${safeProc}.zip`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
  } finally {
    try {
      if (a && a.parentNode) a.parentNode.removeChild(a);
    } catch {
      /* ignore */
    }
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}
