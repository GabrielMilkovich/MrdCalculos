/**
 * Relatório de Critérios Legais — VERSÃO EXPANDIDA (Fase 11)
 * Gera documento completo explicando TODOS os parâmetros, índices, regras e trilha de auditoria aplicados.
 */
import type { PjeLiquidacaoResult, PjeParametros, PjeCorrecaoConfig, PjeIRConfig, PjeCSConfig, PjeFGTSConfig, PjeCustasConfig, PjeHonorariosConfig } from "./engine-types";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const pct = (v: number) => `${(v || 0).toFixed(2)}%`;

export function gerarRelatorioCriteriosLegais(
  result: PjeLiquidacaoResult,
  params: PjeParametros,
  correcao: PjeCorrecaoConfig,
  ir: PjeIRConfig,
  cs: PjeCSConfig,
  fgts: PjeFGTSConfig,
  meta: { processo?: string; cliente?: string; engineVersion?: string; perfil?: string; custas?: PjeCustasConfig; honorarios?: PjeHonorariosConfig; dataCalculo?: string }
) {
  const custas = meta.custas;
  const honorarios = meta.honorarios;

  const indiceDescMap: Record<string, string> = {
    'IPCA-E': 'IPCA-E — Índice Nacional de Preços ao Consumidor Amplo Especial (IBGE)',
    'SELIC': 'SELIC — Sistema Especial de Liquidação e Custódia (BCB)',
    'TR': 'TR — Taxa Referencial (BCB)',
    'INPC': 'INPC — Índice Nacional de Preços ao Consumidor (IBGE)',
    'IGP-M': 'IGP-M — Índice Geral de Preços do Mercado (FGV)',
    'IGP-DI': 'IGP-DI — Índice Geral de Preços — Disponibilidade Interna (FGV)',
    'IPCA': 'IPCA — Índice Nacional de Preços ao Consumidor Amplo (IBGE)',
    'IPC-FIPE': 'IPC-FIPE — Índice de Preços ao Consumidor (FIPE/USP)',
    'TJLP': 'TJLP — Taxa de Juros de Longo Prazo (BCB/BNDES)',
    'TLP': 'TLP — Taxa de Longo Prazo (BCB)',
    'FACDT': 'FACDT — Fator de Atualização Créditos Diferidos do Tesouro',
  };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Critérios Legais — ${meta.processo || "PJe-Calc"}</title>
<style>
  @page { margin: 12mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 14px; text-align: center; margin-bottom: 8px; color: #1e40af; }
  h2 { font-size: 11px; margin: 12px 0 5px; border-bottom: 2px solid #1e40af; padding-bottom: 2px; color: #1e40af; }
  h3 { font-size: 10px; margin: 8px 0 3px; color: #374151; }
  .header { text-align: center; margin-bottom: 14px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
  .header .subtitle { font-size: 10px; color: #666; }
  .header .meta { font-size: 8px; color: #999; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  th, td { padding: 3px 6px; border: 1px solid #ddd; font-size: 8.5px; }
  th { background: #f0f4ff; font-weight: 600; text-align: left; width: 35%; }
  td { font-family: 'Consolas', monospace; }
  .section { margin-bottom: 10px; page-break-inside: avoid; }
  .nota { font-size: 8px; color: #666; font-style: italic; margin: 3px 0; padding: 3px 6px; background: #fefce8; border-left: 3px solid #eab308; }
  .fundamento { font-size: 7.5px; color: #6b7280; }
  .destaque { background: #eff6ff; font-weight: 600; }
  .footer { margin-top: 16px; text-align: center; font-size: 7px; color: #999; border-top: 1px solid #ddd; padding-top: 6px; }
  .hash { font-family: monospace; font-size: 7px; color: #9ca3af; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>RELATÓRIO COMPLETO DE CRITÉRIOS LEGAIS</h1>
    <div class="subtitle">${meta.processo ? `Processo nº ${meta.processo}` : "Cálculo Trabalhista"}</div>
    ${meta.cliente ? `<div class="subtitle">Reclamante: ${meta.cliente}</div>` : ""}
    <div class="meta">
      Perfil: ${meta.perfil || 'Não informado'} | 
      Engine: v${meta.engineVersion || "2.2.0"} | 
      Gerado em: ${new Date().toLocaleString("pt-BR")}
      ${meta.dataCalculo ? ` | Data do cálculo: ${meta.dataCalculo}` : ''}
    </div>
  </div>

  <h2>1. Identificação e Parâmetros do Contrato</h2>
  <div class="section">
    <table>
      <tr><th>Data de Admissão</th><td>${params.data_admissao || '—'}</td></tr>
      <tr><th>Data de Demissão</th><td>${params.data_demissao || '—'}</td></tr>
      <tr><th>Data de Ajuizamento</th><td>${params.data_ajuizamento || '—'}</td></tr>
      <tr><th>Data de Citação</th><td>${(correcao as any).data_citacao || 'Não informada'}</td></tr>
      <tr><th>Período Inicial do Cálculo</th><td>${params.data_inicial || 'Admissão'}</td></tr>
      <tr><th>Período Final do Cálculo</th><td>${params.data_final || 'Demissão'}</td></tr>
      <tr><th>Estado / Município</th><td>${params.estado} / ${params.municipio || '—'}</td></tr>
      <tr><th>Carga Horária Mensal</th><td>${params.carga_horaria_padrao}h</td></tr>
      <tr><th>Regime de Trabalho</th><td>${params.regime_trabalho === 'tempo_integral' ? 'Tempo Integral' : 'Tempo Parcial'}</td></tr>
      <tr><th>Prescrição Quinquenal</th><td>${params.prescricao_quinquenal ? `Sim — data limite: ${params.data_prescricao_quinquenal || 'calculada'}` : 'Não'}</td></tr>
      <tr><th>Prescrição FGTS</th><td>${params.prescricao_fgts ? 'Sim (ARE 709.212/DF)' : 'Não'}</td></tr>
      <tr><th>Limitar Avos ao Período</th><td>${params.limitar_avos_periodo ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Zerar Valor Negativo</th><td>${params.zerar_valor_negativo ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Sábado como Dia Útil</th><td>${params.sabado_dia_util ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Feriado Estadual</th><td>${params.considerar_feriado_estadual ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Feriado Municipal</th><td>${params.considerar_feriado_municipal ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Maior Remuneração</th><td>${params.maior_remuneracao ? fmt(params.maior_remuneracao) : '—'}</td></tr>
      <tr><th>Última Remuneração</th><td>${params.ultima_remuneracao ? fmt(params.ultima_remuneracao) : '—'}</td></tr>
      <tr><th>Aviso Prévio</th><td>${params.prazo_aviso_previo === 'calculado' ? 'Calculado (Lei 12.506/2011)' : params.prazo_aviso_previo === 'informado' ? `Informado: ${params.prazo_aviso_dias || 30} dias` : 'Não apurar'}</td></tr>
      <tr><th>Projetar Aviso Indenizado</th><td>${params.projetar_aviso_indenizado ? 'Sim' : 'Não'}</td></tr>
    </table>
  </div>

  <h2>2. Correção Monetária</h2>
  <div class="section">
    <table>
      <tr><th>Índice Principal</th><td>${indiceDescMap[correcao.indice] || correcao.indice}</td></tr>
      ${(correcao as any).transicao_adc58 ? `
      <tr class="destaque"><th>Transição ADC 58/59 STF</th><td>Sim</td></tr>
      <tr><th>Índice Pré-Citação</th><td>${indiceDescMap[correcao.indice] || correcao.indice}</td></tr>
      <tr><th>Índice Pós-Citação</th><td>${indiceDescMap[(correcao as any).indice_pos_citacao] || (correcao as any).indice_pos_citacao || 'SELIC'}</td></tr>
      <tr><th>Data de Citação</th><td>${(correcao as any).data_citacao || 'Não informada'}</td></tr>
      ` : `<tr><th>Transição ADC 58/59 STF</th><td>Não aplicada</td></tr>`}
      <tr><th>Época de Correção</th><td>${correcao.epoca === 'mensal' ? 'Mensal (por competência)' : `Data fixa: ${correcao.data_fixa}`}</td></tr>
      <tr><th>Data de Liquidação</th><td>${correcao.data_liquidacao}</td></tr>
    </table>
    <div class="nota">Fundamento: ADC 58 e ADC 59 (STF, 18/12/2020) — IPCA-E + juros 1% a.m. na fase pré-judicial; SELIC na fase judicial (já engloba correção e juros). Modulação: processos transitados em julgado com TR ou IPCA-E são preservados.</div>
  </div>

  <h2>3. Juros de Mora</h2>
  <div class="section">
    <table>
      <tr><th>Tipo</th><td>${correcao.juros_tipo === 'simples_mensal' ? `Simples — ${pct(correcao.juros_percentual)} a.m.` : correcao.juros_tipo === 'selic' ? 'Taxa SELIC (engloba correção)' : (correcao as any).juros_tipo === 'composto' ? 'Composto' : 'Não aplicado'}</td></tr>
      <tr><th>Início dos Juros</th><td>${correcao.juros_inicio === 'ajuizamento' ? 'Ajuizamento (Art. 883 CLT)' : correcao.juros_inicio === 'citacao' ? 'Citação (Art. 405 CC)' : 'Vencimento de cada parcela'}</td></tr>
      <tr><th>Pro Rata Die</th><td>${(correcao as any).juros_pro_rata !== false ? 'Sim (Art. 39, §1º, Lei 8.177/91)' : 'Não'}</td></tr>
    </table>
  </div>

  <h2>4. Multas Aplicáveis</h2>
  <div class="section">
    <table>
      <tr><th>Art. 523, §1º CPC</th><td>${correcao.multa_523 ? `Sim — ${pct(correcao.multa_523_percentual)}` : 'Não'}</td></tr>
      <tr><th>Art. 467 CLT</th><td>${(correcao as any).multa_467 ? `Sim — ${pct((correcao as any).multa_467_percentual || 50)}` : 'Não'}</td></tr>
    </table>
    <div class="nota">Art. 523 CPC: multa de 10% sobre o débito na fase de cumprimento. Art. 467 CLT: multa de 50% sobre parcelas incontroversas não pagas em audiência.</div>
  </div>

  <h2>5. Contribuição Social (INSS)</h2>
  <div class="section">
    <table>
      <tr><th>Segurado</th><td>${cs.apurar_segurado ? 'Progressiva — EC 103/2019 (7,5% a 14%)' : 'Não apurado'}</td></tr>
      <tr><th>Tipo Alíquota Segurado</th><td>${cs.aliquota_segurado_tipo === 'empregado' ? 'Empregado (progressiva)' : cs.aliquota_segurado_tipo === 'domestico' ? 'Doméstico' : `Fixa: ${pct(cs.aliquota_segurado_fixa || 0)}`}</td></tr>
      <tr><th>Cobrar do Reclamante</th><td>${cs.cobrar_reclamante ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Limitar ao Teto INSS</th><td>${cs.limitar_teto ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Empregador (patronal)</th><td>${cs.apurar_empresa ? `Sim — ${pct(cs.aliquota_empresa_fixa || 20)}` : 'Não'}</td></tr>
      <tr><th>SAT/RAT</th><td>${cs.apurar_sat ? `Sim — ${pct(cs.aliquota_sat_fixa || 2)}` : 'Não'}</td></tr>
      <tr><th>Terceiros (Sistema S)</th><td>${cs.apurar_terceiros ? `Sim — ${pct(cs.aliquota_terceiros_fixa || 5.8)}` : 'Não'}</td></tr>
      <tr><th>CNAE</th><td>${cs.cnae || 'Não informado'}</td></tr>
      <tr><th>Simples Nacional</th><td>${(cs.periodos_simples?.length || 0) > 0 ? `Sim — ${cs.periodos_simples!.length} período(s) (isenção CS patronal)` : 'Não'}</td></tr>
      <tr><th>CS sobre Salários Pagos</th><td>${cs.cs_sobre_salarios_pagos ? 'Sim' : 'Não'}</td></tr>
    </table>
    <div class="nota">Fundamento: Art. 195, I e II, CF/88; Lei 8.212/91; EC 103/2019 (alíquotas progressivas). Regime do Simples Nacional: LC 123/2006.</div>
  </div>

  <h2>6. Imposto de Renda (IRRF)</h2>
  <div class="section">
    <table>
      <tr><th>Método</th><td>Art. 12-A, Lei 7.713/88 (Rendimentos Recebidos Acumuladamente — RRA)</td></tr>
      <tr><th>Meses RRA</th><td>${result.imposto_renda?.meses_rra || '—'}</td></tr>
      ${result.imposto_renda?.ir_anos_anteriores !== undefined ? `<tr><th>IR Anos Anteriores</th><td>${fmt(result.imposto_renda.ir_anos_anteriores)}</td></tr>` : ''}
      ${result.imposto_renda?.ir_ano_liquidacao !== undefined ? `<tr><th>IR Ano Liquidação</th><td>${fmt(result.imposto_renda.ir_ano_liquidacao)}</td></tr>` : ''}
      <tr><th>Tributação Exclusiva 13º</th><td>${ir.tributacao_exclusiva_13 ? 'Sim (tabela progressiva anual)' : 'Não'}</td></tr>
      <tr><th>Tributação Separada Férias</th><td>${ir.tributacao_separada_ferias ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Deduzir CS Segurado</th><td>${ir.deduzir_cs ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Deduzir Prev. Privada</th><td>${ir.deduzir_prev_privada ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Deduzir Pensão Alimentícia</th><td>${ir.deduzir_pensao ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Deduzir Honorários</th><td>${ir.deduzir_honorarios ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Aposentado ≥ 65 anos</th><td>${ir.aposentado_65 ? 'Sim (dupla isenção)' : 'Não'}</td></tr>
      <tr><th>Dependentes</th><td>${ir.dependentes}</td></tr>
      <tr><th>Incidir sobre Juros</th><td>${ir.incidir_sobre_juros ? 'Sim' : 'Não'}</td></tr>
    </table>
    <div class="nota">Art. 12-A, Lei 7.713/88: RRA divide a base pela quantidade de meses correspondentes, aplicando tabela progressiva proporcional. Anos anteriores ao da liquidação usam tabela acumulada; ano corrente usa tabela mensal.</div>
  </div>

  <h2>7. FGTS</h2>
  <div class="section">
    <table>
      <tr><th>Apurar</th><td>${fgts.apurar ? 'Sim — 8% sobre diferenças' : 'Não'}</td></tr>
      <tr><th>Destino</th><td>${fgts.destino === 'pagar_reclamante' ? 'Pagar ao Reclamante' : 'Recolher em conta vinculada'}</td></tr>
      <tr><th>Compor Principal</th><td>${fgts.compor_principal ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Multa FGTS</th><td>${fgts.multa_apurar ? `${pct(fgts.multa_percentual)} (${fgts.multa_tipo === 'calculada' ? 'calculada sobre base: ' + fgts.multa_base : 'valor informado'})` : 'Não'}</td></tr>
      <tr><th>Deduzir Saldo</th><td>${fgts.deduzir_saldo ? 'Sim' : 'Não'}</td></tr>
      <tr><th>LC 110/2001 — 10%</th><td>${fgts.lc110_10 ? 'Sim' : 'Não'}</td></tr>
      <tr><th>LC 110/2001 — 0,5%</th><td>${fgts.lc110_05 ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Saldos/Saques</th><td>${(fgts.saldos_saques?.length || 0)} registro(s)</td></tr>
    </table>
  </div>

  ${honorarios ? `
  <h2>8. Honorários</h2>
  <div class="section">
    <table>
      <tr><th>Sucumbenciais</th><td>${honorarios.apurar_sucumbenciais ? `Sim — ${pct(honorarios.percentual_sucumbenciais)} sobre ${honorarios.base_sucumbenciais}` : 'Não'}</td></tr>
      <tr><th>Contratuais</th><td>${honorarios.apurar_contratuais ? `Sim — ${pct(honorarios.percentual_contratuais)}` : 'Não'}</td></tr>
      ${honorarios.valor_fixo ? `<tr><th>Valor Fixo</th><td>${fmt(honorarios.valor_fixo)}</td></tr>` : ''}
    </table>
    <div class="nota">Art. 791-A CLT (Reforma Trabalhista): honorários sucumbenciais de 5% a 15% sobre o valor liquidado.</div>
  </div>
  ` : ''}

  ${custas ? `
  <h2>9. Custas Processuais</h2>
  <div class="section">
    <table>
      <tr><th>Apurar</th><td>${custas.apurar ? 'Sim' : 'Não'}</td></tr>
      <tr><th>Assistência Judiciária</th><td>${custas.assistencia_judiciaria ? 'Sim (isento)' : 'Não'}</td></tr>
      ${(custas.itens || []).map((item: any) => `
      <tr><th>${item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}</th><td>${item.apurar ? (item.valor_fixo ? fmt(item.valor_fixo) : pct(item.percentual)) : 'Não apurado'}${item.isento ? ' (isento)' : ''}</td></tr>
      `).join('')}
    </table>
    <div class="nota">Art. 789 CLT: custas de 2% sobre o valor da condenação, mínimo R$ 10,64. Custas periciais: Art. 790-B CLT.</div>
  </div>
  ` : ''}

  <h2>${honorarios ? '10' : custas ? '9' : '8'}. Verbas Deferidas</h2>
  <div class="section">
    <table>
      <tr><th>Total de Verbas</th><td>${result.verbas.length}</td></tr>
      <tr><th>Principais</th><td>${result.verbas.filter(v => v.tipo === 'principal').length}</td></tr>
      <tr><th>Reflexas</th><td>${result.verbas.filter(v => v.tipo === 'reflexa').length}</td></tr>
    </table>
    <table>
      <tr><th style="width:40%">Verba</th><th style="width:12%">Tipo</th><th style="width:15%">Característica</th><th style="width:15%">Ocorrência</th><th style="width:18%">Incidências</th></tr>
      ${result.verbas.map(v => `<tr>
        <td>${v.nome}</td>
        <td>${v.tipo}</td>
        <td>${v.caracteristica}</td>
        <td>${(v as any).ocorrencia_pagamento || '—'}</td>
        <td>${[(v as any).incidencias?.fgts && 'FGTS', (v as any).incidencias?.contribuicao_social && 'CS', (v as any).incidencias?.irpf && 'IR'].filter(Boolean).join(', ') || '—'}</td>
      </tr>`).join('')}
    </table>
  </div>

  <h2>${honorarios ? '11' : custas ? '10' : '9'}. Resultado da Liquidação</h2>
  <div class="section">
    <table>
      <tr><th>Principal Bruto</th><td>${fmt(result.resumo.principal_bruto)}</td></tr>
      <tr><th>Correção Monetária</th><td>${fmt(result.resumo.principal_corrigido - result.resumo.principal_bruto)}</td></tr>
      <tr><th>Principal Corrigido</th><td>${fmt(result.resumo.principal_corrigido)}</td></tr>
      <tr><th>Juros de Mora</th><td>${fmt(result.resumo.juros_mora)}</td></tr>
      <tr><th>FGTS Total</th><td>${fmt(result.resumo.fgts_total)}</td></tr>
      <tr><th>CS Segurado (desconto)</th><td>${fmt(result.resumo.cs_segurado)}</td></tr>
      <tr><th>CS Empregador</th><td>${fmt(result.resumo.cs_empregador)}</td></tr>
      <tr><th>IRRF (desconto)</th><td>${fmt(result.resumo.ir_retido)}</td></tr>
      ${result.resumo.honorarios_sucumbenciais ? `<tr><th>Honorários Sucumbenciais</th><td>${fmt(result.resumo.honorarios_sucumbenciais)}</td></tr>` : ''}
      ${result.resumo.honorarios_contratuais ? `<tr><th>Honorários Contratuais</th><td>${fmt(result.resumo.honorarios_contratuais)}</td></tr>` : ''}
      ${result.resumo.custas ? `<tr><th>Custas Processuais</th><td>${fmt(result.resumo.custas)}</td></tr>` : ''}
      <tr class="destaque"><th>Líquido Reclamante</th><td><strong>${fmt(result.resumo.liquido_reclamante)}</strong></td></tr>
      <tr class="destaque"><th>Total Reclamada</th><td><strong>${fmt(result.resumo.total_reclamada)}</strong></td></tr>
    </table>
  </div>

  <h2>Declaração de Conformidade</h2>
  <div class="section">
    <p style="font-size: 8px; line-height: 1.4; text-align: justify;">
      Este relatório foi gerado automaticamente pelo sistema MRDcalc, replicando a lógica oficial do PJe-Calc CSJT v1.0. 
      Todos os cálculos seguem a fórmula padrão: <strong>Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra</strong>. 
      Os índices de correção, tabelas de contribuição social e imposto de renda são obtidos de fontes oficiais (IBGE, BCB, Receita Federal). 
      A transição de índices conforme ADC 58/59 do STF é aplicada automaticamente quando configurada.
      O presente documento serve como prova da transparência e rastreabilidade dos critérios adotados na liquidação.
    </p>
  </div>

  <div class="footer">
    Relatório de Critérios Legais — MRDcalc v${meta.engineVersion || "2.2.0"} — ${new Date().toLocaleString("pt-BR")}
    <br/>
    <span class="hash">Hash: ${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}</span>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}
