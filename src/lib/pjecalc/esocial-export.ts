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

import type { PjeLiquidacaoResult, PjeResumo, PjeVerbaResult, PjeOcorrenciaResult } from './engine-types';

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
  incluirS2500: boolean;
  incluirS2501: boolean;
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
// S-2500 — PROCESSO TRABALHISTA
// =====================================================

export function gerarS2500(
  config: ESocialConfig,
  result: PjeLiquidacaoResult,
): string {
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
  const d = config.dados;
  const id = gerarId();
  const resumo = result.resumo;

  // Agrupar por competência para bases de CS
  const competencias = new Set<string>();
  for (const v of result.verbas) {
    for (const o of v.ocorrencias) {
      if (o.ativa) competencias.add(fmtMesAno(o.competencia));
    }
  }
  const comps = Array.from(competencias).sort();

  // Para cada competência, calcular base de CS
  const basesXml = comps.map(comp => {
    let baseSeg = 0;
    for (const v of result.verbas) {
      const ocorrsDoMes = v.ocorrencias.filter(
        o => o.ativa && fmtMesAno(o.competencia) === comp
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
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// =====================================================
// BATCH EXPORT (ZIP)
// =====================================================

export async function exportarESocialZip(
  config: ESocialConfig,
  result: PjeLiquidacaoResult,
): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  if (config.incluirS2500) {
    zip.file('S-2500.xml', gerarS2500(config, result));
  }
  if (config.incluirS2501) {
    zip.file('S-2501.xml', gerarS2501(config, result));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `esocial-${config.dados.nrProcTrab || 'processo'}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
