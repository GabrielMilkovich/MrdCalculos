/**
 * PJe-Calc - Relatorio de JUSTIFICATIVA / CRITERIO DE CALCULO
 *
 * Documento explicativo (prosa, nao tabulado) que fundamenta as escolhas
 * metodologicas e jurisprudenciais adotadas na liquidacao. Segue o mesmo
 * padrao de saida dos demais relatorios (HTML Blob imprimivel) para
 * manter consistencia visual com pdf-report-completo.ts.
 *
 * Secoes:
 *   1. Cabecalho
 *   2. Regime de Correcao Monetaria
 *   3. Regime de Juros
 *   4. Contribuicao Previdenciaria (INSS)
 *   5. Imposto de Renda
 *   6. FGTS
 *   7. Memoria de Calculo Resumida
 */
import Decimal from 'decimal.js';
import type {
  PjeLiquidacaoResult,
  PjeCorrecaoConfig,
  PjeCSConfig,
  PjeIRConfig,
  PjeFGTSConfig,
} from './engine-types';

Decimal.set({ precision: 20 });

export interface JustificativaInput {
  resultado: PjeLiquidacaoResult;
  correcaoConfig: PjeCorrecaoConfig;
  csConfig: PjeCSConfig;
  irConfig: PjeIRConfig;
  fgtsConfig: PjeFGTSConfig;
  processo: string;
  beneficiario: string;
  data_liquidacao: string;
}

const fmtBRL = (v: number | string | Decimal): string => {
  const n = v instanceof Decimal ? v.toNumber() : typeof v === 'string' ? Number(v) : v;
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
};

const fmtDate = (d?: string): string => {
  if (!d) return '-';
  const parts = d.substring(0, 10).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const INDICE_LABEL: Record<string, string> = {
  IPCAE: 'IPCA-E',
  'IPCA-E': 'IPCA-E',
  IPCA: 'IPCA',
  SELIC: 'SELIC',
  TR: 'TR',
  SEM_CORRECAO: 'Sem Correcao',
};

const JUROS_TIPO_LABEL: Record<string, string> = {
  simples_mensal: 'Juros Simples Mensais (1% a.m.)',
  selic: 'Taxa SELIC (acumulada RFB)',
  composto: 'Juros Compostos',
  nenhum: 'Sem Juros',
  TRD_SIMPLES: 'TRD Simples (1% a.m.)',
  SELIC: 'SELIC',
  TAXA_LEGAL: 'Taxa Legal',
  NENHUM: 'Sem Juros',
};

const indiceLabel = (k: string): string => INDICE_LABEL[k] ?? k;
const jurosLabel = (k: string): string => JUROS_TIPO_LABEL[k] ?? k;

/* ======================= Secoes ======================= */

function renderCabecalho(input: JustificativaInput): string {
  return `
  <section>
    <h2>1. Identificacao do Calculo</h2>
    <p>
      <strong>Processo:</strong> ${escapeHtml(input.processo || '-')}<br/>
      <strong>Beneficiario:</strong> ${escapeHtml(input.beneficiario || '-')}<br/>
      <strong>Data de Liquidacao:</strong> ${fmtDate(input.data_liquidacao)}
    </p>
    <p class="lead">
      Este documento apresenta, de forma descritiva, os criterios juridicos e
      metodologicos aplicados na apuracao dos valores deste processo,
      contemplando regimes de correcao monetaria, juros, contribuicao
      previdenciaria, imposto de renda e FGTS, alem da memoria resumida
      dos totais apurados.
    </p>
  </section>`;
}

function renderCorrecao(cfg: PjeCorrecaoConfig): string {
  const combinacoes = cfg.combinacoes_indice ?? [];
  const usaCombinacao = combinacoes.length > 0;

  let combTxt = '';
  if (usaCombinacao) {
    const itens = combinacoes
      .map((c) => {
        const parts: string[] = [];
        if (c.de) parts.push(`a partir de ${fmtDate(c.de)}`);
        if (c.ate) parts.push(`ate ${fmtDate(c.ate)}`);
        const faixa = parts.length ? ` (${parts.join(', ')})` : '';
        return `<li>${escapeHtml(indiceLabel(c.indice))}${faixa}</li>`;
      })
      .join('');
    combTxt = `
      <p><strong>Fases de correcao aplicadas (regime COMBINACAO):</strong></p>
      <ul class="combinacoes">${itens}</ul>`;
  }

  const indicePrincipal = indiceLabel(cfg.indice || 'IPCAE');

  return `
  <section>
    <h2>2. Regime de Correcao Monetaria</h2>
    <p>
      Os valores foram atualizados monetariamente pelo indice
      <strong>${escapeHtml(indicePrincipal)}</strong>
      ${usaCombinacao ? 'em regime de COMBINACAO por data' : 'de forma uniforme no periodo'},
      acumulado a partir do mes subsequente ao vencimento (Sumula 381 do TST).
    </p>
    ${combTxt}
    <p>
      <strong>Fundamento juridico:</strong> a escolha do indice e regime acompanha
      a decisao do Supremo Tribunal Federal nas ADC 58 e 59, que fixou a
      aplicacao do IPCA-E na fase pre-judicial e da SELIC a partir da citacao,
      bem como o disposto na Emenda Constitucional n.o 113/2021, que unificou a
      taxa SELIC como parametro unico de atualizacao de debitos da Fazenda
      Publica.
    </p>
    ${cfg.ignorar_taxa_negativa ? '<p><em>Observacao:</em> fatores de correcao negativos foram limitados a 1,000000 (PJC ignorarTaxaNegativa).</p>' : ''}
  </section>`;
}

function renderJuros(cfg: PjeCorrecaoConfig): string {
  const combinacoes = cfg.combinacoes_juros ?? [];
  const usaCombinacao = combinacoes.length > 0;

  let combTxt = '';
  if (usaCombinacao) {
    const itens = combinacoes
      .map((c) => {
        const parts: string[] = [];
        if (c.de) parts.push(`a partir de ${fmtDate(c.de)}`);
        if (c.ate) parts.push(`ate ${fmtDate(c.ate)}`);
        const pct = c.percentual != null ? ` - ${c.percentual}% a.m.` : '';
        const faixa = parts.length ? ` (${parts.join(', ')})` : '';
        return `<li>${escapeHtml(jurosLabel(c.tipo))}${pct}${faixa}</li>`;
      })
      .join('');
    combTxt = `
      <p><strong>Fases de juros aplicadas:</strong></p>
      <ul class="combinacoes">${itens}</ul>`;
  }

  const base = (cfg.base_de_juros_das_verbas || 'DIFERENCA').toUpperCase();
  const inicioMap: Record<string, string> = {
    ajuizamento: 'data do ajuizamento da acao',
    citacao: 'data da citacao',
    vencimento: 'data de vencimento da verba',
  };
  const inicioTxt = inicioMap[cfg.juros_inicio] ?? cfg.juros_inicio;

  return `
  <section>
    <h2>3. Regime de Juros Moratorios</h2>
    <p>
      Juros moratorios apurados pelo regime
      <strong>${escapeHtml(jurosLabel(cfg.juros_tipo))}</strong>
      ${cfg.juros_percentual ? `com taxa de ${cfg.juros_percentual}% a.m. ` : ''}
      ${usaCombinacao ? 'em COMBINACAO por data conforme ADC 58/59 do STF.' : 'de forma uniforme no periodo.'}
    </p>
    ${combTxt}
    <p>
      <strong>Base de incidencia:</strong> ${escapeHtml(base)} (valor nominal nao
      corrigido), conforme <strong>Sumula n.o 200 do TST</strong>: "Os juros de
      mora, na Justica do Trabalho, incidem sobre a importancia da condenacao ja
      corrigida monetariamente."
    </p>
    <p>
      <strong>Marco inicial:</strong> ${escapeHtml(inicioTxt)}.
      ${cfg.juros_apos_deducao_cs ? 'Os juros foram calculados apos a deducao da contribuicao social do reclamante.' : ''}
      ${cfg.oj_394_juros_pos_ir ? 'Aplicada a OJ 394 SDI-1 TST: juros calculados sobre base posterior ao IR.' : ''}
    </p>
  </section>`;
}

function renderINSS(cs: PjeCSConfig): string {
  const aliq = cs.aliquota_segurado_tipo === 'fixa'
    ? `alicota fixa de ${cs.aliquota_segurado_fixa ?? 0}%`
    : `tabela progressiva de ${cs.aliquota_segurado_tipo}`;
  return `
  <section>
    <h2>4. Contribuicao Previdenciaria (INSS)</h2>
    <p>
      A contribuicao previdenciaria do segurado foi apurada com
      <strong>${escapeHtml(aliq)}</strong>, observado o
      <strong>regime progressivo</strong> instituido pela
      <strong>Emenda Constitucional n.o 103/2019</strong>, com aplicacao do
      <strong>${cs.limitar_teto ? 'teto maximo de contribuicao vigente em cada competencia' : 'sem limitacao de teto (mediante configuracao)'}</strong>.
    </p>
    <p>
      <strong>Incidencia da correcao trabalhista:</strong> ${cs.com_correcao_trabalhista
        ? 'SIM - a base salarial foi corrigida monetariamente antes da aplicacao das aliquotas de INSS, fazendo a contribuicao incidir sobre o valor ja atualizado.'
        : 'NAO - INSS incidente sobre o valor nominal historico da competencia (comportamento padrao PJe-Calc).'}
    </p>
    ${cs.separar_reclamante_beneficiario ? '<p>A contribuicao foi <strong>segregada</strong> entre parte do reclamante (deduzida do liquido) e parte do beneficiario (recolhimento patronal-segurado).</p>' : ''}
    ${cs.atualizar_inss_selic ? '<p>Valores de INSS <strong>atualizados pela SELIC</strong> (Lei 8.212/91 c/c Lei 9.430/96) ate a data de liquidacao.</p>' : ''}
    <p>
      <strong>Fundamento juridico:</strong> Lei n.o 8.212/1991 (custeio da
      Seguridade Social); Emenda Constitucional n.o 103/2019 (reforma da
      previdencia - alicotas progressivas); Sumula n.o 368, IV e V do TST.
    </p>
  </section>`;
}

function renderIR(ir: PjeIRConfig): string {
  const dep = ir.dependentes ?? 0;
  return `
  <section>
    <h2>5. Imposto de Renda (IRRF)</h2>
    <p>
      Imposto de renda apurado pelo regime de <strong>Rendimentos Recebidos
      Acumuladamente (RRA)</strong>, nos termos do
      <strong>artigo 12-A da Lei n.o 7.713/1988</strong>, com uso da tabela
      progressiva acumulada vigente na data de liquidacao.
    </p>
    <p>
      <strong>Tributacao exclusiva do 13.o salario:</strong> ${ir.tributacao_exclusiva_13 ? 'SIM' : 'NAO'}.<br/>
      <strong>Tributacao separada de ferias:</strong> ${ir.tributacao_separada_ferias ? 'SIM (tributacao em separado, sem cumulacao com demais rendimentos)' : 'NAO (ferias integram a base tributavel geral)'}.
    </p>
    ${dep > 0
      ? `<p><strong>Deducao por dependentes:</strong> ${dep} dependente(s) declarado(s), com deducao mensal conforme tabela vigente.</p>`
      : ''}
    ${ir.aposentado_65
      ? '<p><strong>Deducao adicional para aposentado 65+:</strong> aplicada parcela mensal de isencao prevista para aposentados com 65 anos ou mais (Lei 7.713/88, art. 6.o, XV).</p>'
      : ''}
    <p>
      ${ir.deduzir_cs ? 'Contribuicao social deduzida da base.' : ''}
      ${ir.deduzir_prev_privada ? ' Previdencia privada deduzida.' : ''}
      ${ir.deduzir_pensao ? ' Pensao alimenticia deduzida.' : ''}
      ${ir.deduzir_honorarios ? ' Honorarios advocaticios deduzidos.' : ''}
      ${ir.incidir_sobre_juros ? ' Juros de mora integram a base do IR.' : ' Juros de mora isentos de IR (Sumula 498 STJ).'}
    </p>
    <p>
      <strong>Fundamento juridico:</strong> Lei n.o 7.713/1988, art. 12-A;
      Instrucao Normativa RFB n.o 1.500/2014 e alteracoes; Decreto n.o 9.580/2018
      (Regulamento do Imposto sobre a Renda).
    </p>
  </section>`;
}

function renderFGTS(fgts: PjeFGTSConfig): string {
  const aliquotaBase = 8;
  return `
  <section>
    <h2>6. FGTS - Fundo de Garantia</h2>
    <p>
      Depositos do FGTS apurados a aliquota de <strong>${aliquotaBase}%</strong>
      sobre a remuneracao mensal devida, conforme <strong>Lei n.o 8.036/1990</strong>.
    </p>
    ${fgts.multa_apurar
      ? `<p><strong>Multa rescisoria de ${fgts.multa_percentual ?? 40}%</strong> sobre a base ${escapeHtml(fgts.multa_base)}, devida em razao da modalidade de rescisao contratual, nos termos do art. 18, par. 1.o, da Lei 8.036/90.</p>`
      : '<p>Multa rescisoria <strong>nao apurada</strong> neste calculo.</p>'}
    <p>
      <strong>Contribuicao LC 110/2001 - 10%:</strong> ${fgts.lc110_10 ? 'ATIVA' : 'INATIVA'}.<br/>
      <strong>Contribuicao LC 110/2001 - 0,5%:</strong> ${fgts.lc110_05 ? 'ATIVA' : 'INATIVA'}.
    </p>
    ${fgts.deduzir_saldo && fgts.saldos_saques.length > 0
      ? `<p>Foram deduzidos ${fgts.saldos_saques.length} saldo(s)/saque(s) previamente levantado(s) pelo trabalhador.</p>`
      : ''}
    <p>
      <strong>Fundamento juridico:</strong> Lei n.o 8.036/1990 (regulamenta o
      FGTS); Lei Complementar n.o 110/2001 (contribuicoes sociais de 10% e
      0,5%); Decreto n.o 99.684/1990 (regulamenta a Lei do FGTS).
    </p>
  </section>`;
}

function renderMemoriaResumida(r: PjeLiquidacaoResult): string {
  const rs = r.resumo;
  return `
  <section>
    <h2>7. Memoria de Calculo Resumida</h2>
    <table class="memoria">
      <tbody>
        <tr><td>Principal Bruto</td><td class="num">R$ ${fmtBRL(rs.principal_bruto)}</td></tr>
        <tr><td>Principal Corrigido</td><td class="num">R$ ${fmtBRL(rs.principal_corrigido)}</td></tr>
        <tr><td>Juros de Mora</td><td class="num">R$ ${fmtBRL(rs.juros_mora)}</td></tr>
        <tr><td>FGTS Total (incluindo multa)</td><td class="num">R$ ${fmtBRL(rs.fgts_total)}</td></tr>
        <tr><td>Contribuicao Social (Segurado)</td><td class="num">R$ ${fmtBRL(rs.cs_segurado)}</td></tr>
        <tr><td>Imposto de Renda Retido</td><td class="num">R$ ${fmtBRL(rs.ir_retido)}</td></tr>
        <tr class="destaque"><td><strong>Liquido Devido ao Reclamante</strong></td><td class="num"><strong>R$ ${fmtBRL(rs.liquido_reclamante)}</strong></td></tr>
        <tr class="destaque"><td><strong>Total Devido pelo Reclamado</strong></td><td class="num"><strong>R$ ${fmtBRL(rs.total_reclamada)}</strong></td></tr>
      </tbody>
    </table>
  </section>`;
}

/* ======================= CSS + HTML ======================= */

const CSS = `
@page { margin: 14mm; size: A4 portrait; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; color: #111; line-height: 1.55; background: #fff; padding: 8mm; }
h1 { font-size: 15pt; color: #003366; text-align: center; margin-bottom: 4mm; border-bottom: 2px solid #003366; padding-bottom: 3mm; }
h2 { font-size: 11.5pt; color: #003366; margin: 6mm 0 2mm; border-left: 3px solid #003366; padding-left: 3mm; }
p { margin: 1.5mm 0; text-align: justify; }
p.lead { font-style: italic; color: #333; border-left: 2px solid #ccc; padding-left: 3mm; margin-top: 3mm; }
section { page-break-inside: avoid; margin-bottom: 4mm; }
ul.combinacoes { margin: 1mm 0 2mm 6mm; font-size: 10pt; }
ul.combinacoes li { margin-bottom: 0.5mm; }
table.memoria { width: 100%; border-collapse: collapse; margin-top: 2mm; font-size: 10pt; }
table.memoria td { padding: 2mm 3mm; border-bottom: 1px solid #ddd; }
table.memoria td.num { text-align: right; font-family: 'Courier New', monospace; }
table.memoria tr.destaque td { background: #e6edf5; border-top: 2px solid #003366; border-bottom: 2px solid #003366; color: #003366; }
em { color: #555; font-style: italic; }
strong { color: #000; }
`;

function buildHTML(input: JustificativaInput): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Justificativa e Criterio de Calculo - ${escapeHtml(input.processo)}</title>
<style>${CSS}</style>
</head>
<body>
  <h1>JUSTIFICATIVA E CRITERIO DE CALCULO</h1>
  ${renderCabecalho(input)}
  ${renderCorrecao(input.correcaoConfig)}
  ${renderJuros(input.correcaoConfig)}
  ${renderINSS(input.csConfig)}
  ${renderIR(input.irConfig)}
  ${renderFGTS(input.fgtsConfig)}
  ${renderMemoriaResumida(input.resultado)}
</body>
</html>`;
}

/* ======================= Export ======================= */

export function gerarRelatorioJustificativa(input: JustificativaInput): Blob {
  const html = buildHTML(input);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
