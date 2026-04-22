// =====================================================
// GERADOR DE RELATÓRIO COMPLETO (LAUDO)
// Relatório passo-a-passo com premissas, fórmulas,
// fundamentos, ressalvas e conclusão
// =====================================================

import Decimal from 'decimal.js';
import {
  CalcResultItem,
  CalcSnapshot,
  CalcWarning,
  ConsistencyAlert,
  formatCurrency,
  ContractData,
} from '../../types/index';
import { AnaliseResult, SituacaoDetectada } from './SituationAnalyzer';
import { FUNDAMENTOS_LEGAIS } from './RubricaEngine';

// =====================================================
// TIPOS DO RELATÓRIO
// =====================================================

export interface SecaoRelatorio {
  id: string;
  titulo: string;
  tipo: 'premissas' | 'situacao' | 'rubrica' | 'desconto' | 'ressalva' | 'conclusao' | 'cenario';
  conteudo: string;
  detalhes?: DetalheRubrica;
  severidade?: 'info' | 'atencao' | 'critico';
  fundamentos?: string[];
}

export interface DetalheRubrica {
  codigo: string;
  nome: string;
  valor_bruto: number;
  formula_resumida: string;
  passos: PassoMemoria[];
  fundamentos_legais: {
    dispositivo: string;
    descricao: string;
    status: string;
    url?: string;
  }[];
  incluida: boolean;
  motivo_inclusao_exclusao: string;
}

export interface PassoMemoria {
  passo: number;
  descricao: string;
  formula: string;
  resultado: string;
  fundamento?: string;
}

export interface RelatorioCompleto {
  titulo: string;
  data_geracao: string;
  engine_version: string;
  secoes: SecaoRelatorio[];
  resumo_financeiro: {
    total_bruto: number;
    total_descontos: number;
    total_liquido: number;
    por_rubrica: { codigo: string; nome: string; valor: number; incluida: boolean; motivo?: string }[];
  };
  nivel_confianca: number;
  hash_integridade: string;
}

// =====================================================
// GERADOR
// =====================================================

export class ReportGenerator {
  constructor(
    private snapshot: CalcSnapshot,
    private analise: AnaliseResult,
    private contrato: ContractData,
  ) {}

  gerar(): RelatorioCompleto {
    const secoes: SecaoRelatorio[] = [];

    // 1. Premissas
    secoes.push(this.gerarSecaoPremissas());

    // 2. Situações detectadas
    for (const sit of this.analise.situacoes) {
      secoes.push(this.gerarSecaoSituacao(sit));
    }

    // 3. Rubricas (incluídas)
    const rubricasAgrupadas = this.agruparRubricas();
    for (const [codigo, items] of Object.entries(rubricasAgrupadas)) {
      secoes.push(this.gerarSecaoRubrica(codigo, items));
    }

    // 4. Rubricas excluídas (com justificativa)
    const excluidas = this.getRubricasExcluidas();
    for (const exc of excluidas) {
      secoes.push(this.gerarSecaoRubricaExcluida(exc));
    }

    // 5. Descontos (INSS, IRRF)
    const descontos = this.snapshot.items.filter(i => 
      ['INSS', 'IRRF'].includes(i.rubrica_codigo)
    );
    if (descontos.length > 0) {
      secoes.push(this.gerarSecaoDescontos(descontos));
    }

    // 6. Ressalvas
    if (this.analise.ressalvas_gerais.length > 0 || this.snapshot.warnings.length > 0) {
      secoes.push(this.gerarSecaoRessalvas());
    }

    // 7. Cenários alternativos
    const cenarios = this.analise.situacoes.filter(s => s.cenario_alternativo);
    for (const sit of cenarios) {
      secoes.push(this.gerarSecaoCenario(sit));
    }

    // 8. Conclusão
    secoes.push(this.gerarSecaoConclusao());

    // Resumo financeiro
    const totalBruto = this.snapshot.total_bruto instanceof Decimal 
      ? this.snapshot.total_bruto.toNumber() 
      : Number(this.snapshot.total_bruto);
    
    const totalDescontos = descontos.reduce((sum, d) => {
      const val = d.valor_bruto instanceof Decimal ? d.valor_bruto.toNumber() : Number(d.valor_bruto);
      return sum + val;
    }, 0);

    const porRubrica = this.gerarResumoPorRubrica();

    return {
      titulo: `Relatório de Cálculo — ${this.contrato.funcao || 'Reclamante'} — ${this.contrato.tipo_demissao.replace(/_/g, ' ')}`,
      data_geracao: new Date().toISOString(),
      engine_version: this.snapshot.engine_version,
      secoes,
      resumo_financeiro: {
        total_bruto: totalBruto,
        total_descontos: totalDescontos,
        total_liquido: totalBruto - totalDescontos,
        por_rubrica: porRubrica,
      },
      nivel_confianca: this.analise.nivel_confianca,
      hash_integridade: this.snapshot.ruleset_hash,
    };
  }

  // =====================================================
  // SEÇÕES INDIVIDUAIS
  // =====================================================

  private gerarSecaoPremissas(): SecaoRelatorio {
    const perfil = this.snapshot.inputs_snapshot.perfil;
    const params = perfil.parametros;
    const admStr = this.contrato.data_admissao.toLocaleDateString('pt-BR');
    const demStr = this.contrato.data_demissao.toLocaleDateString('pt-BR');

    const conteudo = [
      `PREMISSAS DO CÁLCULO`,
      ``,
      `Contrato de Trabalho:`,
      `  • Admissão: ${admStr}`,
      `  • Demissão: ${demStr}`,
      `  • Tipo de rescisão: ${this.contrato.tipo_demissao.replace(/_/g, ' ')}`,
      `  • Salário base: R$ ${this.contrato.salario_inicial.toFixed(2)}`,
      `  • Função: ${this.contrato.funcao || 'Não informada'}`,
      ``,
      `Parâmetros de Cálculo (Perfil: ${perfil.nome}):`,
      `  • Divisor: ${params.divisor}h`,
      `  • Jornada semanal: ${params.horas_semanais}h`,
      `  • Adicional HE 50%: ${(params.adicional_he_50 * 100).toFixed(0)}%`,
      `  • Adicional HE 100%: ${(params.adicional_he_100 * 100).toFixed(0)}%`,
      `  • Adicional noturno: ${(params.percentual_noturno * 100).toFixed(0)}%`,
      `  • Alíquota FGTS: ${(params.aliquota_fgts * 100).toFixed(0)}%`,
      `  • Multa FGTS: ${(params.multa_fgts * 100).toFixed(0)}%`,
      `  • Índice de atualização: ${params.indice_atualizacao.toUpperCase()}`,
      `  • Arredondamento: ${params.arredondamento} (${params.casas_decimais} casas)`,
      ``,
      `Dados Mensais: ${this.snapshot.inputs_snapshot.dados_mensais.length} competência(s)`,
      `Validações: ${this.snapshot.inputs_snapshot.validacoes.length} campo(s) validado(s)`,
    ].join('\n');

    return {
      id: 'premissas',
      titulo: '1. Premissas do Cálculo',
      tipo: 'premissas',
      conteudo,
    };
  }

  private gerarSecaoSituacao(sit: SituacaoDetectada): SecaoRelatorio {
    const linhas = [
      sit.descricao,
      ``,
      `Fundamentação: ${sit.fundamentacao}`,
      ``,
      `Impacto no cálculo: ${sit.impacto_calculo}`,
    ];

    if (sit.rubricas_bloqueadas.length > 0) {
      linhas.push(``, `Verbas EXCLUÍDAS por esta situação: ${sit.rubricas_bloqueadas.join(', ')}`);
    }
    if (sit.rubricas_adicionadas.length > 0) {
      linhas.push(`Verbas INCLUÍDAS: ${sit.rubricas_adicionadas.join(', ')}`);
    }
    if (sit.ressalva) {
      linhas.push(``, sit.ressalva);
    }

    return {
      id: `situacao-${sit.id}`,
      titulo: `📋 ${sit.titulo}`,
      tipo: 'situacao',
      conteudo: linhas.join('\n'),
      severidade: sit.severidade,
      fundamentos: [sit.fundamentacao],
    };
  }

  private gerarSecaoRubrica(codigo: string, items: CalcResultItem[]): SecaoRelatorio {
    const total = items.reduce((sum, i) => {
      const val = i.valor_bruto instanceof Decimal ? i.valor_bruto.toNumber() : Number(i.valor_bruto);
      return sum + val;
    }, 0);

    const fundamentos = FUNDAMENTOS_LEGAIS[codigo] || [];
    const primeiro = items[0];

    const passos: PassoMemoria[] = [];
    for (const item of items) {
      for (const mem of item.memoria) {
        passos.push({
          passo: mem.passo,
          descricao: `[${item.competencia || 'geral'}] ${mem.descricao}`,
          formula: mem.formula,
          resultado: mem.resultado instanceof Decimal ? `R$ ${mem.resultado.toFixed(2)}` : String(mem.resultado),
          fundamento: mem.fundamento_legal,
        });
      }
    }

    // Encontrar situação que explica inclusão desta rubrica
    const situacaoRelevante = this.analise.situacoes.find(s => 
      s.rubricas_adicionadas.includes(codigo) || s.rubricas_afetadas.includes(codigo)
    );

    const motivo = situacaoRelevante 
      ? `Incluída devido a: ${situacaoRelevante.titulo}`
      : 'Rubrica padrão aplicável ao caso';

    const conteudo = [
      `${primeiro.rubrica_nome} — Total: R$ ${total.toFixed(2)}`,
      ``,
      `Por que esta verba é devida: ${motivo}`,
      ``,
      `Fundamentação legal:`,
      ...fundamentos.map(f => `  • ${f.dispositivo}: ${f.descricao} [${f.status || 'vigente'}]`),
      ``,
      `Memória de cálculo (${passos.length} passos):`,
      ...passos.map(p => `  ${p.passo}. ${p.descricao}: ${p.formula} = ${p.resultado}${p.fundamento ? ` (${p.fundamento})` : ''}`),
    ].join('\n');

    return {
      id: `rubrica-${codigo}`,
      titulo: `💰 ${primeiro.rubrica_nome}`,
      tipo: 'rubrica',
      conteudo,
      detalhes: {
        codigo,
        nome: primeiro.rubrica_nome,
        valor_bruto: total,
        formula_resumida: passos.length > 0 ? passos[passos.length - 1].formula : '',
        passos,
        fundamentos_legais: fundamentos.map(f => ({
          dispositivo: f.dispositivo,
          descricao: f.descricao,
          status: f.status || 'vigente',
          url: f.url_oficial,
        })),
        incluida: true,
        motivo_inclusao_exclusao: motivo,
      },
    };
  }

  private gerarSecaoRubricaExcluida(exc: { codigo: string; nome: string; motivo: string }): SecaoRelatorio {
    return {
      id: `excluida-${exc.codigo}`,
      titulo: `🚫 ${exc.nome} — NÃO DEVIDA`,
      tipo: 'rubrica',
      conteudo: [
        `A verba "${exc.nome}" (${exc.codigo}) NÃO foi incluída neste cálculo.`,
        ``,
        `Motivo: ${exc.motivo}`,
        ``,
        `Se esta situação mudar (ex: reversão judicial), o cenário alternativo mostra o impacto.`,
      ].join('\n'),
      detalhes: {
        codigo: exc.codigo,
        nome: exc.nome,
        valor_bruto: 0,
        formula_resumida: 'N/A',
        passos: [],
        fundamentos_legais: [],
        incluida: false,
        motivo_inclusao_exclusao: exc.motivo,
      },
      severidade: 'atencao',
    };
  }

  private gerarSecaoDescontos(descontos: CalcResultItem[]): SecaoRelatorio {
    const totalDesc = descontos.reduce((sum, d) => {
      const val = d.valor_bruto instanceof Decimal ? d.valor_bruto.toNumber() : Number(d.valor_bruto);
      return sum + val;
    }, 0);

    const linhas = [
      `DESCONTOS OBRIGATÓRIOS — Total: R$ ${totalDesc.toFixed(2)}`,
      ``,
    ];

    for (const d of descontos) {
      const val = d.valor_bruto instanceof Decimal ? d.valor_bruto.toNumber() : Number(d.valor_bruto);
      const base = d.base_calculo instanceof Decimal ? d.base_calculo.toNumber() : Number(d.base_calculo);
      linhas.push(`${d.rubrica_nome} (${d.competencia || 'geral'}): R$ ${val.toFixed(2)} sobre base de R$ ${base.toFixed(2)}`);
      
      for (const mem of d.memoria) {
        const resultado = mem.resultado instanceof Decimal ? mem.resultado.toFixed(2) : String(mem.resultado);
        linhas.push(`  → ${mem.descricao}: ${mem.formula} = R$ ${resultado}`);
      }
      linhas.push('');
    }

    linhas.push(`⚠️ Os descontos de INSS e IRRF são obrigatórios e incidem sobre as verbas tributáveis.`);
    linhas.push(`Férias indenizadas são isentas de INSS (Art. 28, §9º, "d", Lei 8.212/91) e IRRF (Art. 6º, V, Lei 7.713/88).`);

    return {
      id: 'descontos',
      titulo: '📉 Descontos Obrigatórios (INSS/IRRF)',
      tipo: 'desconto',
      conteudo: linhas.join('\n'),
    };
  }

  private gerarSecaoRessalvas(): SecaoRelatorio {
    const linhas = ['RESSALVAS E ALERTAS', ''];

    for (const r of this.analise.ressalvas_gerais) {
      linhas.push(`⚠ ${r}`);
    }

    for (const w of this.snapshot.warnings) {
      const icon = w.tipo === 'erro' ? '❌' : w.tipo === 'atencao' ? '⚠️' : 'ℹ️';
      linhas.push(`${icon} ${w.mensagem}`);
      if (w.sugestao) linhas.push(`  💡 ${w.sugestao}`);
    }

    if (this.analise.pendencias.length > 0) {
      linhas.push('', 'PENDÊNCIAS QUE PODEM AFETAR O RESULTADO:');
      for (const p of this.analise.pendencias) {
        linhas.push(`  🔴 ${p}`);
      }
    }

    return {
      id: 'ressalvas',
      titulo: '⚠️ Ressalvas e Alertas',
      tipo: 'ressalva',
      conteudo: linhas.join('\n'),
      severidade: 'atencao',
    };
  }

  private gerarSecaoCenario(sit: SituacaoDetectada): SecaoRelatorio {
    const cen = sit.cenario_alternativo!;
    return {
      id: `cenario-${sit.id}`,
      titulo: `🔄 Cenário Alternativo: ${cen.nome}`,
      tipo: 'cenario',
      conteudo: [
        `CENÁRIO ALTERNATIVO: ${cen.nome}`,
        ``,
        `Descrição: ${cen.descricao}`,
        ``,
        `Premissa divergente: ${cen.premissa_divergente}`,
        ``,
        `Fundamentação: ${cen.fundamentacao}`,
        ``,
        `ℹ️ Este cenário apresenta como o cálculo seria diferente se a premissa acima fosse alterada.`,
        `Para calcular este cenário, crie uma cópia do caso com a premissa ajustada e execute novamente.`,
      ].join('\n'),
      severidade: 'info',
      fundamentos: [cen.fundamentacao],
    };
  }

  private gerarSecaoConclusao(): SecaoRelatorio {
    const totalBruto = this.snapshot.total_bruto instanceof Decimal 
      ? this.snapshot.total_bruto.toNumber() 
      : Number(this.snapshot.total_bruto);

    const descontos = this.snapshot.items
      .filter(i => ['INSS', 'IRRF'].includes(i.rubrica_codigo))
      .reduce((sum, d) => {
        const val = d.valor_bruto instanceof Decimal ? d.valor_bruto.toNumber() : Number(d.valor_bruto);
        return sum + val;
      }, 0);

    const liquido = totalBruto - descontos;
    const cenarios = this.analise.situacoes.filter(s => s.cenario_alternativo);

    const linhas = [
      `CONCLUSÃO`,
      ``,
      `Total bruto apurado: R$ ${totalBruto.toFixed(2)}`,
      `Descontos obrigatórios: R$ ${descontos.toFixed(2)}`,
      `TOTAL LÍQUIDO: R$ ${liquido.toFixed(2)}`,
      ``,
      `Nível de confiança do cálculo: ${this.analise.nivel_confianca}%`,
      ``,
    ];

    if (this.analise.nivel_confianca >= 85) {
      linhas.push(`✅ Alto grau de confiança. Todos os dados críticos foram validados e as premissas estão fundamentadas.`);
    } else if (this.analise.nivel_confianca >= 60) {
      linhas.push(`⚠️ Confiança moderada. Existem pendências ou ressalvas que podem impactar o resultado. Recomenda-se revisão manual antes de utilizar em peça processual.`);
    } else {
      linhas.push(`🔴 Baixa confiança. Dados insuficientes ou inconsistentes. NÃO RECOMENDADO para uso em peça processual sem revisão completa.`);
    }

    if (cenarios.length > 0) {
      linhas.push(``, `📊 ${cenarios.length} cenário(s) alternativo(s) disponível(is) para comparação.`);
    }

    linhas.push(``, `Engine: v${this.snapshot.engine_version} | Hash: ${this.snapshot.ruleset_hash}`);
    linhas.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);

    return {
      id: 'conclusao',
      titulo: '📊 Conclusão',
      tipo: 'conclusao',
      conteudo: linhas.join('\n'),
    };
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private agruparRubricas(): Record<string, CalcResultItem[]> {
    const grouped: Record<string, CalcResultItem[]> = {};
    for (const item of this.snapshot.items) {
      if (['INSS', 'IRRF'].includes(item.rubrica_codigo)) continue; // descontos separados
      if (!grouped[item.rubrica_codigo]) grouped[item.rubrica_codigo] = [];
      grouped[item.rubrica_codigo].push(item);
    }
    return grouped;
  }

  private getRubricasExcluidas(): { codigo: string; nome: string; motivo: string }[] {
    const excluidas: { codigo: string; nome: string; motivo: string }[] = [];
    
    const nomes: Record<string, string> = {
      AVISO_PREVIO: 'Aviso Prévio Indenizado',
      DECIMO_PROP: '13º Salário Proporcional',
      FERIAS_PROP: 'Férias Proporcionais',
      MULTA_FGTS: 'Multa 40% FGTS',
      FGTS_RESC: 'FGTS Rescisório',
    };

    for (const sit of this.analise.situacoes) {
      for (const bloq of sit.rubricas_bloqueadas) {
        // Verificar se realmente não está nos resultados
        const presente = this.snapshot.items.some(i => i.rubrica_codigo === bloq);
        if (!presente) {
          excluidas.push({
            codigo: bloq,
            nome: nomes[bloq] || bloq,
            motivo: `Excluída pela situação: ${sit.titulo}. ${sit.fundamentacao}`,
          });
        }
      }
    }

    return excluidas;
  }

  private gerarResumoPorRubrica(): RelatorioCompleto['resumo_financeiro']['por_rubrica'] {
    const result: RelatorioCompleto['resumo_financeiro']['por_rubrica'] = [];
    
    const grouped = this.agruparRubricas();
    for (const [codigo, items] of Object.entries(grouped)) {
      const total = items.reduce((sum, i) => {
        const val = i.valor_bruto instanceof Decimal ? i.valor_bruto.toNumber() : Number(i.valor_bruto);
        return sum + val;
      }, 0);
      result.push({ codigo, nome: items[0].rubrica_nome, valor: total, incluida: true });
    }

    // Adicionar excluídas
    const excluidas = this.getRubricasExcluidas();
    for (const exc of excluidas) {
      result.push({ codigo: exc.codigo, nome: exc.nome, valor: 0, incluida: false, motivo: exc.motivo });
    }

    return result;
  }
}
