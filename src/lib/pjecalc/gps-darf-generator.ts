/**
 * PJe-Calc — GPS/DARF Generator
 * Generates GPS (Guia da Previdencia Social) and DARF (Documento de Arrecadacao)
 * data and printable HTML forms for Brazilian labor court calculations.
 */
import type { PjeLiquidacaoResult } from './engine-types';

// =====================================================
// TYPES
// =====================================================

export interface GPSData {
  /** Nome ou razão social do contribuinte */
  nome_empresa: string;
  /** CNPJ da empresa reclamada */
  cnpj: string;
  /** Endereço (opcional) */
  endereco?: string;
  /** Código de pagamento (2909 = Reclamatória Trabalhista CNPJ) */
  codigo_pagamento: string;
  /** Competência no formato MM/YYYY */
  competencia: string;
  /** NIT/PIS/PASEP ou número do processo */
  identificador: string;
  /** Valor INSS segurado */
  valor_inss_segurado: number;
  /** Valor INSS empresa */
  valor_inss_empresa: number;
  /** Valor outras entidades e fundos (terceiros) */
  valor_outras_entidades: number;
  /** Atualização monetária/multa/juros */
  atualizacao_monetaria: number;
  /** Valor total da GPS */
  valor_total: number;
  /** Data de pagamento (DD/MM/YYYY) */
  data_pagamento: string;
}

export interface DARFData {
  /** Nome do contribuinte (reclamante) */
  nome_contribuinte: string;
  /** CPF do reclamante */
  cpf: string;
  /** Período de apuração (MM/YYYY) */
  periodo_apuracao: string;
  /** Código da receita (5936 = IRRF Decisão Justiça do Trabalho) */
  codigo_receita: string;
  /** Número de referência (número do processo) */
  numero_referencia: string;
  /** Data de vencimento (DD/MM/YYYY) */
  data_vencimento: string;
  /** Valor principal */
  valor_principal: number;
  /** Multa */
  multa: number;
  /** Juros/encargos */
  juros_encargos: number;
  /** Valor total */
  valor_total: number;
}

export interface DadosProcessoGPS {
  reclamada_cnpj: string;
  reclamada_nome: string;
  numero_processo: string;
  reclamada_endereco?: string;
}

export interface DadosProcessoDARF {
  reclamante_cpf: string;
  reclamante_nome: string;
  numero_processo: string;
}

// =====================================================
// FORMATTERS
// =====================================================

const fmtBRL = (v: number): string =>
  (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtComp = (c: string): string => {
  if (!c) return '';
  const parts = c.substring(0, 7).split('-');
  if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
  return c;
};

const todayFormatted = (): string => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// =====================================================
// GPS GENERATION
// =====================================================

/**
 * GPS codes for judicial labor debts:
 * - 2909: Reclamatória Trabalhista - CNPJ
 * - 2917: Reclamatória Trabalhista - CEI
 */
export function gerarGPS(
  result: PjeLiquidacaoResult,
  dadosProcesso: DadosProcessoGPS,
): GPSData[] {
  const cs = result.contribuicao_social;
  if (!cs || cs.total_segurado === 0 && cs.total_empregador === 0) return [];

  // Build a map of competência -> values
  const compMap = new Map<string, {
    segurado: number;
    empresa: number;
    sat: number;
    terceiros: number;
  }>();

  // Aggregate segurado values per competência
  for (const s of cs.segurado_devidos) {
    const key = s.competencia.substring(0, 7);
    const existing = compMap.get(key) || { segurado: 0, empresa: 0, sat: 0, terceiros: 0 };
    existing.segurado += s.diferenca || s.valor || 0;
    compMap.set(key, existing);
  }

  // Aggregate empregador values per competência
  for (const e of cs.empregador) {
    const key = e.competencia.substring(0, 7);
    const existing = compMap.get(key) || { segurado: 0, empresa: 0, sat: 0, terceiros: 0 };
    existing.empresa += e.empresa || 0;
    existing.sat += e.sat || 0;
    existing.terceiros += e.terceiros || 0;
    compMap.set(key, existing);
  }

  const guias: GPSData[] = [];
  const dataHoje = todayFormatted();

  // Sort by competência
  const sortedComps = Array.from(compMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [comp, values] of sortedComps) {
    const totalEmpresa = values.empresa + values.sat;
    const total = values.segurado + totalEmpresa + values.terceiros;
    if (total <= 0) continue;

    guias.push({
      nome_empresa: dadosProcesso.reclamada_nome,
      cnpj: dadosProcesso.reclamada_cnpj,
      endereco: dadosProcesso.reclamada_endereco,
      codigo_pagamento: '2909',
      competencia: fmtComp(comp),
      identificador: dadosProcesso.numero_processo,
      valor_inss_segurado: values.segurado,
      valor_inss_empresa: totalEmpresa,
      valor_outras_entidades: values.terceiros,
      atualizacao_monetaria: 0, // could be computed if correction factors are available
      valor_total: total,
      data_pagamento: dataHoje,
    });
  }

  return guias;
}

// =====================================================
// DARF GENERATION
// =====================================================

/**
 * DARF codes for judicial labor IR:
 * - 5936: IRRF - Rendimentos Decorrentes de Decisão da Justiça do Trabalho
 * - 1708: IRRF - Rendimentos do Trabalho (alternative)
 */
export function gerarDARF(
  result: PjeLiquidacaoResult,
  dadosProcesso: DadosProcessoDARF,
): DARFData[] {
  const ir = result.imposto_renda;
  if (!ir || ir.imposto_devido <= 0) return [];

  const dataHoje = todayFormatted();

  // For judicial labor, typically a single DARF consolidating all IR
  // Art. 12-A Lei 7.713/88: RRA is computed globally, not per month.
  // Generate one DARF for main IR, and separate ones for 13° and férias if applicable.

  const darfs: DARFData[] = [];

  // Main DARF: IR anos anteriores + ano liquidação
  const irPrincipal = ir.ir_anos_anteriores + ir.ir_ano_liquidacao;
  if (irPrincipal > 0) {
    darfs.push({
      nome_contribuinte: dadosProcesso.reclamante_nome,
      cpf: dadosProcesso.reclamante_cpf,
      periodo_apuracao: fmtComp(result.data_liquidacao?.substring(0, 7) || ''),
      codigo_receita: '5936',
      numero_referencia: dadosProcesso.numero_processo,
      data_vencimento: dataHoje,
      valor_principal: irPrincipal,
      multa: 0,
      juros_encargos: 0,
      valor_total: irPrincipal,
    });
  }

  // 13° salary exclusive taxation
  if (ir.ir_13_exclusivo > 0) {
    darfs.push({
      nome_contribuinte: dadosProcesso.reclamante_nome,
      cpf: dadosProcesso.reclamante_cpf,
      periodo_apuracao: fmtComp(result.data_liquidacao?.substring(0, 7) || ''),
      codigo_receita: '5936',
      numero_referencia: dadosProcesso.numero_processo,
      data_vencimento: dataHoje,
      valor_principal: ir.ir_13_exclusivo,
      multa: 0,
      juros_encargos: 0,
      valor_total: ir.ir_13_exclusivo,
    });
  }

  // Férias separate taxation
  if (ir.ir_ferias_separado > 0) {
    darfs.push({
      nome_contribuinte: dadosProcesso.reclamante_nome,
      cpf: dadosProcesso.reclamante_cpf,
      periodo_apuracao: fmtComp(result.data_liquidacao?.substring(0, 7) || ''),
      codigo_receita: '5936',
      numero_referencia: dadosProcesso.numero_processo,
      data_vencimento: dataHoje,
      valor_principal: ir.ir_ferias_separado,
      multa: 0,
      juros_encargos: 0,
      valor_total: ir.ir_ferias_separado,
    });
  }

  // If no breakdown was generated but total exists, generate single consolidated DARF
  if (darfs.length === 0 && ir.imposto_devido > 0) {
    darfs.push({
      nome_contribuinte: dadosProcesso.reclamante_nome,
      cpf: dadosProcesso.reclamante_cpf,
      periodo_apuracao: fmtComp(result.data_liquidacao?.substring(0, 7) || ''),
      codigo_receita: '5936',
      numero_referencia: dadosProcesso.numero_processo,
      data_vencimento: dataHoje,
      valor_principal: ir.imposto_devido,
      multa: 0,
      juros_encargos: 0,
      valor_total: ir.imposto_devido,
    });
  }

  return darfs;
}

// =====================================================
// GPS/DARF DATA EXPORT (CSV)
// =====================================================

export function exportarGuiasCSV(gpsData: GPSData[], darfData: DARFData[]): string {
  const lines: string[] = [];
  const BOM = '\uFEFF';

  // GPS section
  lines.push('--- GPS (Guia da Previdência Social) ---');
  lines.push('CNPJ;Nome Empresa;Competência;Cód. Pagamento;Identificador;INSS Segurado;INSS Empresa;Terceiros;Atualização;Total;Data Pagamento');
  for (const g of gpsData) {
    lines.push([
      g.cnpj, g.nome_empresa, g.competencia, g.codigo_pagamento, g.identificador,
      fmtBRL(g.valor_inss_segurado), fmtBRL(g.valor_inss_empresa),
      fmtBRL(g.valor_outras_entidades), fmtBRL(g.atualizacao_monetaria),
      fmtBRL(g.valor_total), g.data_pagamento,
    ].join(';'));
  }

  lines.push('');
  lines.push('--- DARF (Documento de Arrecadação) ---');
  lines.push('CPF;Nome Contribuinte;Período Apuração;Cód. Receita;Nº Referência;Vencimento;Principal;Multa;Juros;Total');
  for (const d of darfData) {
    lines.push([
      d.cpf, d.nome_contribuinte, d.periodo_apuracao, d.codigo_receita, d.numero_referencia,
      d.data_vencimento, fmtBRL(d.valor_principal), fmtBRL(d.multa),
      fmtBRL(d.juros_encargos), fmtBRL(d.valor_total),
    ].join(';'));
  }

  return BOM + lines.join('\r\n');
}

// =====================================================
// PDF/HTML GENERATION (printable forms)
// =====================================================

/**
 * Generate printable HTML that mimics official GPS and DARF form layouts.
 * Can be opened in a new window and printed via window.print().
 */
export function gerarPDFGuias(gpsData: GPSData[], darfData: DARFData[]): string {
  const gpsPages = gpsData.map((g, idx) => `
    <div class="page gps-form">
      <div class="form-header">
        <div class="form-title">
          <strong>GPS - GUIA DA PREVIDÊNCIA SOCIAL</strong>
          <span class="form-subtitle">INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS</span>
        </div>
        <div class="form-num">${idx + 1}/${gpsData.length}</div>
      </div>

      <table class="form-table">
        <tr>
          <td class="label" style="width:30%">1 - Nome ou Razão Social / Fone / Endereço</td>
          <td colspan="3">
            <strong>${escapeHtml(g.nome_empresa)}</strong>
            ${g.endereco ? `<br/><span class="small">${escapeHtml(g.endereco)}</span>` : ''}
          </td>
        </tr>
        <tr>
          <td class="label">2 - Vencimento</td>
          <td>${g.data_pagamento}</td>
          <td class="label">3 - Código de Pagamento</td>
          <td><strong>${g.codigo_pagamento}</strong></td>
        </tr>
        <tr>
          <td class="label">4 - Competência (mês/ano)</td>
          <td><strong>${g.competencia}</strong></td>
          <td class="label">5 - Identificador (CNPJ/CEI/NIT/PIS/PASEP)</td>
          <td>${escapeHtml(g.cnpj)}</td>
        </tr>
        <tr>
          <td colspan="4" class="section-title">VALORES DO INSS</td>
        </tr>
        <tr>
          <td class="label">6 - Valor do INSS</td>
          <td class="value">R$ ${fmtBRL(g.valor_inss_segurado + g.valor_inss_empresa)}</td>
          <td colspan="2" class="small-info">
            Segurado: R$ ${fmtBRL(g.valor_inss_segurado)} | Empresa: R$ ${fmtBRL(g.valor_inss_empresa)}
          </td>
        </tr>
        <tr>
          <td class="label">7 - Outras Entidades</td>
          <td class="value">R$ ${fmtBRL(g.valor_outras_entidades)}</td>
          <td class="label">8 - ATM, Multa e Juros</td>
          <td class="value">R$ ${fmtBRL(g.atualizacao_monetaria)}</td>
        </tr>
        <tr>
          <td class="label">9 - TOTAL</td>
          <td class="value total-value" colspan="3"><strong>R$ ${fmtBRL(g.valor_total)}</strong></td>
        </tr>
        <tr>
          <td class="label">10 - Nº do Processo / Vara / Período</td>
          <td colspan="3">${escapeHtml(g.identificador)}</td>
        </tr>
      </table>

      <div class="form-footer">
        <div class="footer-note">Reclamatória Trabalhista — Código ${g.codigo_pagamento}</div>
        <div class="footer-note">Autenticação Bancária</div>
      </div>
    </div>
  `).join('\n<div class="page-break"></div>\n');

  const darfPages = darfData.map((d, idx) => `
    <div class="page darf-form">
      <div class="form-header">
        <div class="form-title">
          <strong>DARF - DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS</strong>
          <span class="form-subtitle">SECRETARIA DA RECEITA FEDERAL DO BRASIL</span>
        </div>
        <div class="form-num">${idx + 1}/${darfData.length}</div>
      </div>

      <table class="form-table">
        <tr>
          <td class="label" style="width:30%">01 - Nome / Telefone</td>
          <td colspan="3"><strong>${escapeHtml(d.nome_contribuinte)}</strong></td>
        </tr>
        <tr>
          <td class="label">02 - Período de Apuração</td>
          <td>${d.periodo_apuracao}</td>
          <td class="label">03 - Número do CPF ou CNPJ</td>
          <td>${escapeHtml(d.cpf)}</td>
        </tr>
        <tr>
          <td class="label">04 - Código da Receita</td>
          <td><strong>${d.codigo_receita}</strong></td>
          <td class="label">05 - Número de Referência</td>
          <td>${escapeHtml(d.numero_referencia)}</td>
        </tr>
        <tr>
          <td class="label">06 - Data de Vencimento</td>
          <td colspan="3">${d.data_vencimento}</td>
        </tr>
        <tr>
          <td colspan="4" class="section-title">VALORES</td>
        </tr>
        <tr>
          <td class="label">07 - Valor do Principal</td>
          <td class="value" colspan="3">R$ ${fmtBRL(d.valor_principal)}</td>
        </tr>
        <tr>
          <td class="label">08 - Valor da Multa</td>
          <td class="value" colspan="3">R$ ${fmtBRL(d.multa)}</td>
        </tr>
        <tr>
          <td class="label">09 - Valor dos Juros e/ou Encargos DL-1.025/69</td>
          <td class="value" colspan="3">R$ ${fmtBRL(d.juros_encargos)}</td>
        </tr>
        <tr>
          <td class="label">10 - Valor Total</td>
          <td class="value total-value" colspan="3"><strong>R$ ${fmtBRL(d.valor_total)}</strong></td>
        </tr>
      </table>

      <div class="form-footer">
        <div class="footer-note">IRRF — Código ${d.codigo_receita} (Rendimentos Decorrentes de Decisão da Justiça do Trabalho)</div>
        <div class="footer-note">Autenticação Bancária</div>
      </div>
    </div>
  `).join('\n<div class="page-break"></div>\n');

  const hasGPS = gpsData.length > 0;
  const hasDARF = darfData.length > 0;
  const separator = hasGPS && hasDARF ? '<div class="page-break"></div>' : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Guias de Recolhimento — GPS/DARF</title>
<style>
  @page { margin: 15mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; line-height: 1.4; }

  .page { padding: 10mm; border: 2px solid #000; margin-bottom: 10mm; page-break-inside: avoid; }
  .page-break { page-break-after: always; }

  .form-header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;
  }
  .form-title { display: flex; flex-direction: column; }
  .form-title strong { font-size: 14px; letter-spacing: 0.5px; }
  .form-subtitle { font-size: 9px; color: #333; margin-top: 2px; }
  .form-num { font-size: 10px; color: #666; }

  .form-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .form-table td { padding: 6px 8px; border: 1px solid #999; font-size: 11px; vertical-align: top; }
  .form-table .label { font-size: 8px; color: #555; font-weight: 600; text-transform: uppercase; }
  .form-table .value { text-align: right; font-family: 'Courier New', monospace; font-size: 12px; }
  .form-table .total-value { background: #f0f0f0; font-size: 14px; }
  .form-table .section-title { background: #e0e0e0; text-align: center; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .form-table .small-info { font-size: 9px; color: #555; }

  .form-footer { margin-top: 15px; display: flex; justify-content: space-between; border-top: 1px dashed #999; padding-top: 8px; }
  .footer-note { font-size: 8px; color: #666; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { border: 1px solid #000; margin: 0; padding: 8mm; }
  }
</style>
</head>
<body>
  ${hasGPS ? gpsPages : '<p style="text-align:center;padding:20px;color:#999;">Nenhuma GPS a gerar (INSS = R$ 0,00)</p>'}
  ${separator}
  ${hasDARF ? darfPages : '<p style="text-align:center;padding:20px;color:#999;">Nenhuma DARF a gerar (IRRF = R$ 0,00)</p>'}
</body>
</html>`;
}

/** Open printable GPS/DARF in a new window */
export function imprimirGuias(gpsData: GPSData[], darfData: DARFData[]): void {
  const html = gerarPDFGuias(gpsData, darfData);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}

// =====================================================
// HELPERS
// =====================================================

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
