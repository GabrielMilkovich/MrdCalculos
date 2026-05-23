/**
 * SNAPSHOT histórico da ONTOLOGIA V1 — congelado em 2026-05-24.
 *
 * NÃO É CÓDIGO DE PRODUÇÃO. Não importar em runtime.
 *
 * Único uso autorizado: scripts/gen-ontologia-v2-from-snapshot.ts, que
 * regenera supabase/functions/_shared/holerite-mapper-v2/ontologia-v2.json
 * preservando a curadoria de 145 sinônimos que o escritório fez na Sprint 2
 * e que ficaria irrecuperável quando vier XLSX nova.
 *
 * Pra evoluir: novos sinônimos descobertos em prod vão pra
 * scripts/ontologia-v2-overrides.json#extra_aliases, NÃO neste snapshot
 * (que é histórico, congelado).
 *
 * Quando vier XLSX nova do escritório: adicionar entries novas DIRETO neste
 * snapshot (mesmo formato V1 com texto_canonico + sinonimos), rodar
 * `npm run gen:ontologia`, conferir validate. Snapshot continua crescendo;
 * V1 engine não ressuscita.
 *
 * O cabeçalho original com decisões de Sprint 2 (typos corrigidos, etc.)
 * foi preservado no git log do commit que apagou _shared/ontologia-rubricas/
 * (fbbb40b). RUBRICAS_COM_DIVERGENCIA_JURIDICA não foi restaurado — é lista
 * derivada, recomputável via `ONTOLOGIA.filter(r => r.observacao_juridica)`.
 */

export type CategoriaRubrica =
  | 'MINIMO_GARANTIDO'
  | 'COMISSAO_PRODUTOS'
  | 'COMISSAO_SERVICOS'
  | 'PREMIO'
  | 'DSR_PAGO'
  | 'DESCONSIDERAR'
  | 'NAO_CLASSIFICADO';

export interface RubricaCanonica {
  texto_canonico: string;
  categoria: CategoriaRubrica;
  sinonimos: string[];
  observacao_juridica?: string;
}

/**
 * TODO — "Salário Substituição" (B12+B14 da planilha): pendente validação
 * jurídica. Escritório indicou tratamento separado mas não especificou
 * categoria. Por ora cai em NAO_CLASSIFICADO; operador classifica manual
 * até esclarecermos com o advogado responsável.
 */

export const ONTOLOGIA: readonly RubricaCanonica[] = [
  // =========================================================================
  // MINIMO_GARANTIDO (Coluna B da planilha)
  // =========================================================================
  {
    // Sinônimo "Mínimo Garantido - Comissão" adicionado em 2026-05-21 (Sprint 2,
    // Fase 3.1) — variação contextual observada em holerite Via Varejo real.
    texto_canonico: 'Mínimo Garantido',
    categoria: 'MINIMO_GARANTIDO',
    sinonimos: [
      'Minimo Garantido',
      'Mín. Garantido',
      'Min Garantido',
      'Mínimo Garantido - Comissão',
      'Minimo Garantido - Comissao',
    ],
  },
  {
    texto_canonico: 'Horas Justificadas / TRN',
    categoria: 'MINIMO_GARANTIDO',
    sinonimos: ['Horas Justificadas/TRN', 'Hrs Justificadas TRN', 'Horas Just. TRN'],
  },
  {
    texto_canonico: 'Treinamento',
    categoria: 'MINIMO_GARANTIDO',
    sinonimos: ['Treinam.', 'Treinamentos'],
  },

  // =========================================================================
  // COMISSAO_PRODUTOS (Coluna C da planilha) — BASE DO DSR SOBRE COMISSÕES
  // =========================================================================
  {
    texto_canonico: 'Adic. Tempo de Serviço',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Adicional Tempo de Serviço', 'Ad. Tempo Serviço', 'ATS'],
  },
  {
    // Sinônimo "Antec Ação Produtos Selecionados" adicionado em 2026-05-21
    // (Sprint 2, Fase 3.1) — variante de antecipação ligada a campanha de
    // produtos, alocada à categoria mais próxima conforme decisão do Gabriel.
    texto_canonico: 'Antec. Crédito Dif. De Comissões',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: [
      'Antecipação Crédito Dif. Comissões',
      'Antec Cred Dif Comissoes',
      'Antec Ação Produtos Selecionados',
      'Antec Acao Produtos Selecionados',
    ],
  },
  {
    // Sinônimo "Ajuste de Liquido" adicionado em 2026-05-21 (Sprint 2, Fase 3.1).
    texto_canonico: 'Ajuste Líquido',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Ajuste Liquido', 'Aj. Líquido', 'Ajuste de Liquido', 'Ajuste de Líquido'],
  },
  {
    texto_canonico: 'Comissões',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Comissoes', 'Comissão'],
  },
  {
    texto_canonico: 'Comissão adicional',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Comissão adicional ', 'Comissao adicional', 'Com. Adicional'],
  },
  {
    texto_canonico: 'Compl. Comissão',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Complemento Comissão', 'Compl Comissao'],
  },
  {
    texto_canonico: 'Compl. Comissão vem. Int. II',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Complemento Comissão vem Int II', 'Compl. Comissao vem. Int. II'],
  },
  {
    texto_canonico: 'Comissões Produtos Online',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Comissoes Produtos Online', 'Com. Produtos Online'],
  },
  {
    texto_canonico: 'Comissão Lib. Black Friday',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Comissao Lib Black Friday', 'Com. Lib. Black Friday', 'Comissão Liberada Black Friday'],
  },
  {
    texto_canonico: 'Comissão Garantida',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Comissão Garantida ', 'Comissao Garantida', 'Com. Garantida'],
  },
  {
    texto_canonico: 'Dia do Comerciário',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Dia do Comerciario', 'Dia Comerciário'],
  },
  {
    texto_canonico: 'Dif. De Convenção Coletiva',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Diferença Convenção Coletiva', 'Dif Convencao Coletiva'],
  },
  {
    texto_canonico: 'Dif. Salário Dissídio',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Diferença Salário Dissídio', 'Dif Salario Dissidio'],
  },
  {
    texto_canonico: 'Hora Normal Trabalhada',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Hora Normal Trab.', 'H. Normal Trabalhada'],
  },
  {
    texto_canonico: 'Inventário',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Inventario'],
  },
  {
    texto_canonico: 'Manuseio de Valores',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Manuseio Valores', 'Man. Valores'],
  },
  {
    texto_canonico: 'Proventos',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Prov.'],
  },
  {
    texto_canonico: 'Quebra de Caixa',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Quebra Caixa', 'Q. Caixa'],
  },
  {
    texto_canonico: 'Quinquênio / Triênio',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Quinquenio / Trienio', 'Quinquênio', 'Triênio'],
  },
  {
    texto_canonico: 'Remuneração Garantida',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Remuneracao Garantida', 'Rem. Garantida'],
  },
  {
    texto_canonico: 'Comissão antecipada',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Comissão antecipada ', 'Comissao antecipada', 'Com. Antecipada'],
  },
  {
    texto_canonico: 'Comissões Venda Produto online',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Comissoes Venda Produto Online', 'Com. Venda Produto Online'],
  },
  {
    // Sinônimo "Dif Comissão Mes Ant (SemMin)" adicionado em 2026-05-21
    // (Sprint 2, Fase 3.1) — observado em holerite Via Varejo real (variação
    // que carrega flag "sem mínimo garantido" entre parênteses).
    texto_canonico: 'Dif comissão mês ant',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: [
      'Diferença comissão mês anterior',
      'Dif Comissao Mes Anterior',
      'Dif. Comissão Mês Ant.',
      'Dif Comissão Mes Ant (SemMin)',
      'Dif Comissao Mes Ant (SemMin)',
    ],
  },
  {
    texto_canonico: 'adiantamento em folha (EMP)',
    categoria: 'COMISSAO_PRODUTOS',
    sinonimos: ['Adiantamento em folha EMP', 'Adiant. em folha (EMP)'],
  },

  // =========================================================================
  // DSR_PAGO (Coluna D da planilha) — JÁ É DSR PAGO, NÃO RECALCULAR
  //
  // POLÍTICA DE FALLBACK Magazine Luiza (D9 da planilha, NÃO automatizada
  // nesta versão): "Para holerite Magazine Luiza - todos os DSR's (exceto
  // horas extras e 13º salário) devem ser tratados como DSR_PAGO". A regra
  // depende de identificar a origem do holerite ANTES da classificação e
  // aplicar lógica condicional — fica para iteração futura.
  // =========================================================================
  {
    texto_canonico: 'DSR (Comissão)',
    categoria: 'DSR_PAGO',
    sinonimos: ['DSR Comissão', 'DSR Comissao', 'DSR sobre Comissão'],
  },
  {
    texto_canonico: 'DSR e Feriados',
    categoria: 'DSR_PAGO',
    sinonimos: ['DSR e Feriado', 'DSR/Feriados'],
  },
  {
    texto_canonico: 'Int. Prêmio no Dsr',
    categoria: 'DSR_PAGO',
    sinonimos: ['Integração Prêmio no DSR', 'Int Premio DSR', 'Int. Premio no Dsr'],
  },
  {
    // Typo corrigido (planilha D6: "Notuma" -> "Noturna").
    texto_canonico: 'DSR s/ Média Hora Noturna',
    categoria: 'DSR_PAGO',
    sinonimos: [
      'DSR s/ Média Hora Notuma', // grafia original da planilha
      'DSR sobre Média Hora Noturna',
      'DSR s/ Media Hora Noturna',
    ],
  },
  {
    texto_canonico: 'Rep Rem s/ Comissões',
    categoria: 'DSR_PAGO',
    sinonimos: ['Rep. Rem. s/ Comissões', 'Repouso Remunerado sobre Comissões', 'Rep Rem s Comissoes'],
  },
  {
    texto_canonico: 'DSR Prêmios',
    categoria: 'DSR_PAGO',
    sinonimos: ['DSR Premios', 'DSR sobre Prêmios'],
  },

  // =========================================================================
  // COMISSAO_SERVICOS (Coluna E da planilha) — BASE DO DSR
  //
  // POLÍTICA DE FALLBACK Magazine Luiza (E20 da planilha, NÃO automatizada
  // nesta versão): "Para holerite Magazine Luiza, toda rubrica comissão
  // que não seja a principal deve ser tratada como COMISSAO_SERVICOS".
  // Implementar como lógica condicional em iteração futura.
  // =========================================================================
  {
    // Sinônimo "COM.SEGUROS" adicionado em 2026-05-21 (Sprint 2, Fase 3.1) —
    // grafia abreviada sem "Serv" observada no holerite real (28 ocorrências).
    texto_canonico: 'Com. Serv. Seguros',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: [
      'Comissão Serviços Seguros',
      'Com Serv Seguros',
      'Com. Servicos Seguros',
      'COM.SEGUROS',
      'Com. Seguros',
    ],
  },
  {
    texto_canonico: 'Com. Serv. Garantia',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Comissão Serviços Garantia', 'Com Serv Garantia'],
  },
  {
    texto_canonico: 'Com. Serv. Técnicos',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Comissão Serviços Técnicos', 'Com Serv Tecnicos', 'Com. Serv. Tecnicos'],
  },
  {
    texto_canonico: 'Com. Frete',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Comissão Frete', 'Com Frete'],
  },
  {
    texto_canonico: 'Com. Montagem',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Comissão Montagem', 'Com Montagem'],
  },
  {
    texto_canonico: 'Com. Serv. Odont.',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Com. Serv. Odontológicos', 'Comissão Serviços Odontológicos', 'Com Serv Odont'],
  },
  {
    texto_canonico: 'Com. Planos Operad.',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Comissão Planos Operadora', 'Com Planos Operadora', 'Com. Planos Operadora'],
  },
  {
    texto_canonico: 'Com. Técnicos PTO LJ',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Com. Tecnicos PTO LJ', 'Comissão Técnicos PTO Loja', 'Com Tecnicos PTO LJ'],
  },
  {
    texto_canonico: 'Com. Catálogo',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Com Catalogo', 'Comissão Catálogo', 'Com. Catalogo'],
  },
  {
    texto_canonico: 'Com. Serv. Fin.',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Com. Serv. Financeiros', 'Comissão Serviços Financeiros', 'Com Serv Fin'],
  },
  {
    texto_canonico: 'Com. Venda Expressa',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Comissão Venda Expressa', 'Com Venda Expressa'],
  },
  {
    // Typo corrigido (planilha E14: "Camapanha" -> "Campanha").
    // Sinônimos "Campanha Categorias/Retira/Serv Fin/Via+" adicionados em
    // 2026-05-21 (Sprint 2, Fase 3.1) — variações observadas no holerite
    // real, todas seguem a mesma natureza de "Campanha".
    texto_canonico: 'Campanha',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: [
      'Camapanha',
      'Campanha Geral',
      'Campanha Categorias',
      'Campanha Retira',
      'Campanha Serv Fin',
      'Campanha Via+',
      'Campanha Via',
    ],
  },
  {
    // Typo corrigido (planilha E15: "Camapanha Móveis" -> "Campanha Móveis").
    texto_canonico: 'Campanha Móveis',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Camapanha Móveis', 'Camapanha Moveis', 'Campanha Moveis'],
  },
  {
    // Typo corrigido (planilha E16: "Camapanha Serviços" -> "Campanha Serviços").
    texto_canonico: 'Campanha Serviços',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Camapanha Serviços', 'Camapanha Servicos', 'Campanha Servicos'],
  },
  {
    // Typo corrigido (planilha E17: "Camapanha Cartão PF" -> "Campanha Cartão PF").
    texto_canonico: 'Campanha Cartão PF',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Camapanha Cartão PF', 'Camapanha Cartao PF', 'Campanha Cartao PF'],
  },
  {
    texto_canonico: 'Compl. Com. Seguros',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Complemento Comissão Seguros', 'Compl Com Seguros'],
  },
  {
    texto_canonico: 'Comissões Serviços Online',
    categoria: 'COMISSAO_SERVICOS',
    sinonimos: ['Comissoes Servicos Online', 'Com. Serviços Online'],
  },

  // =========================================================================
  // PREMIO (Coluna F da planilha) — INTEGRA BASE DE DSR
  // =========================================================================
  {
    // Trailing space removido (planilha F3: 'Prêmio ').
    texto_canonico: 'Prêmio',
    categoria: 'PREMIO',
    sinonimos: ['Premio', 'Prêmio '],
  },
  {
    texto_canonico: 'Prêmio Mensal',
    categoria: 'PREMIO',
    sinonimos: ['Premio Mensal', 'Pr. Mensal'],
  },
  {
    texto_canonico: 'Prêmio Meta',
    categoria: 'PREMIO',
    sinonimos: ['Premio Meta', 'Pr. Meta'],
  },
  {
    // Sinônimo "PREMIO ANTECIPADO QUINZENAL" adicionado em 2026-05-21
    // (Sprint 2, Fase 3.1) — variação de cadência (quinzenal vs mensal)
    // do mesmo prêmio antecipado; 24 ocorrências no holerite real.
    texto_canonico: 'Prêmio Antecipado',
    categoria: 'PREMIO',
    sinonimos: [
      'Premio Antecipado',
      'Pr. Antecipado',
      'PREMIO ANTECIPADO QUINZENAL',
      'Prêmio Antecipado Quinzenal',
      'Premio Antecipado Quinzenal',
    ],
  },
  {
    texto_canonico: 'Prêmio Estímulo',
    categoria: 'PREMIO',
    sinonimos: ['Premio Estimulo', 'Pr. Estímulo'],
  },
  {
    texto_canonico: 'Prêmio Performance',
    categoria: 'PREMIO',
    sinonimos: ['Premio Performance', 'Pr. Performance'],
  },
  {
    texto_canonico: 'Prêmio (LB)',
    categoria: 'PREMIO',
    sinonimos: ['Premio (LB)', 'Pr. (LB)', 'Prêmio LB'],
  },
  {
    texto_canonico: 'Prêmio Gar. Estendida',
    categoria: 'PREMIO',
    sinonimos: ['Premio Garantia Estendida', 'Prêmio Garantia Estendida', 'Pr. Gar. Estendida'],
  },
  {
    texto_canonico: 'PR Recarga de celular',
    categoria: 'PREMIO',
    sinonimos: ['Prêmio Recarga de Celular', 'Premio Recarga Celular', 'PR. Recarga'],
  },
  {
    texto_canonico: 'PR (Cartão de Crédito)',
    categoria: 'PREMIO',
    sinonimos: ['Prêmio Cartão de Crédito', 'Premio Cartao Credito', 'PR Cartão de Crédito'],
  },
  {
    texto_canonico: 'PRM',
    categoria: 'PREMIO',
    sinonimos: ['Prêmio (PRM)', 'Premio PRM'],
  },
  {
    texto_canonico: 'Gratificação',
    categoria: 'PREMIO',
    sinonimos: ['Gratificacao', 'Gratif.'],
  },
  {
    // Sinônimos "Antec Dif Premio" e "DIF. PREMIO" adicionados em 2026-05-21
    // (Sprint 2, Fase 3.1) — variações de prêmio que carregam "diferença"
    // sem o sufixo "Vendedor" da grafia canônica; alocadas aqui por serem
    // semanticamente mais próximas (todas tratam de diferença de prêmio).
    texto_canonico: 'Dif. Prêmio Vendedor',
    categoria: 'PREMIO',
    sinonimos: [
      'Diferença Prêmio Vendedor',
      'Dif Premio Vendedor',
      'Antec Dif Premio',
      'Antec. Dif. Prêmio',
      'DIF. PREMIO',
      'Dif. Prêmio',
      'Dif Premio',
    ],
  },
  {
    texto_canonico: 'PPR Pula meio (MagaLu)',
    categoria: 'PREMIO',
    sinonimos: ['PPR Pula Meio MagaLu', 'PPR Pula Meio (Magazine Luiza)'],
  },
  {
    texto_canonico: 'PR. Adc.',
    categoria: 'PREMIO',
    sinonimos: ['PR Adicional', 'Prêmio Adicional', 'PR. Adicional'],
  },
  {
    texto_canonico: 'Prêmio Seguro',
    categoria: 'PREMIO',
    sinonimos: ['Premio Seguro', 'Pr. Seguro'],
  },
  {
    texto_canonico: 'PR. Garantia Compl.',
    categoria: 'PREMIO',
    sinonimos: ['PR Garantia Complementar', 'Prêmio Garantia Complementar', 'PR Gar Compl'],
  },
  {
    texto_canonico: 'Premiação Incentivo',
    categoria: 'PREMIO',
    sinonimos: ['Premiacao Incentivo', 'Prem. Incentivo'],
  },
  {
    texto_canonico: 'PR Saúde',
    categoria: 'PREMIO',
    sinonimos: ['Prêmio Saúde', 'PR Saude', 'Premio Saude'],
  },
  {
    texto_canonico: 'Prêmio Atend. Loja',
    categoria: 'PREMIO',
    sinonimos: ['Prêmio Atendimento Loja', 'Premio Atend Loja', 'Pr. Atendimento Loja'],
  },

  // =========================================================================
  // DESCONSIDERAR (Coluna G da planilha)
  //
  // Algumas rubricas aqui têm divergência conhecida com súmulas (TST/STF).
  // O escritório optou por interpretação restritiva — `observacao_juridica`
  // documenta a divergência para rastreabilidade. Mudanças nesses itens
  // requerem nova validação jurídica.
  //
  // G21 ("CH. Extras nunca") descartada na Fase 1 — texto ambíguo,
  // requer esclarecimento do escritório se for re-incluir.
  // =========================================================================
  {
    texto_canonico: 'Dif. 13° Salário',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Diferença 13° Salário', 'Dif 13 Salario', 'Dif. 13o Salário'],
  },
  {
    texto_canonico: 'Dif. Férias',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Diferença Férias', 'Dif Ferias', 'Dif. Ferias'],
  },
  {
    // Sinônimo "Dif. de Médias 13º Sal" adicionado em 2026-05-21 (Sprint 2,
    // Fase 3.1) — observada no holerite real com ordinal masculino (º) em
    // vez de sinal de grau (°) E abreviação "Sal" em vez de "Salário".
    // A normalização º↔° em normalizarRubrica garante que a diferença de
    // codepoint Unicode não cause miss; a abreviação fica como sinônimo
    // explícito porque levenshtein "sal"<->"salario" passa do threshold.
    texto_canonico: 'Dif. de Médias 13° Salário',
    categoria: 'DESCONSIDERAR',
    sinonimos: [
      'Diferença de Médias 13° Salário',
      'Dif de Medias 13 Salario',
      'Dif. de Médias 13º Sal',
      'Dif. de Médias 13° Sal',
      'Dif de Medias 13 Sal',
    ],
  },
  {
    texto_canonico: 'Férias Pagas',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Ferias Pagas', 'F. Pagas'],
  },
  {
    // Typo corrigido (planilha G7: "Trasnp." -> "Transp.").
    texto_canonico: 'Antec. Vale Transp. - Admissão',
    categoria: 'DESCONSIDERAR',
    sinonimos: [
      'Antec. Vale Trasnp. - Admissão', // grafia original da planilha
      'Antecipação Vale Transporte Admissão',
      'Antec Vale Transp Admissao',
    ],
  },
  {
    texto_canonico: 'Banco de Horas 100% Noturna',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Banco Horas 100% Noturna', 'BH 100% Noturna'],
    observacao_juridica:
      'Classificado como DESCONSIDERAR conforme planilha do escritório. ' +
      'Por analogia à Súmula 60 TST (adicional noturno integra base de DSR), ' +
      'a parcela noturna do banco de horas poderia ser integrada à base. ' +
      'Decisão deliberada do escritório de seguir interpretação restritiva. ' +
      'Não alterar sem reaprovação jurídica.',
  },
  {
    texto_canonico: 'DSR H. Extra',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['DSR Hora Extra', 'DSR sobre Horas Extras', 'DSR HE'],
    observacao_juridica:
      'Classificado como DESCONSIDERAR conforme planilha do escritório. ' +
      'Súmula 172 TST estabelece que horas extras integram base de cálculo ' +
      'do repouso semanal remunerado. Decisão deliberada do escritório de ' +
      'seguir interpretação restritiva para evitar bis in idem (DSR sobre DSR). ' +
      'Não alterar sem reaprovação jurídica.',
  },
  {
    texto_canonico: '13° de Férias Pagas',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['13o de Férias Pagas', '13 Ferias Pagas', 'Décimo de Férias Pagas'],
  },
  {
    texto_canonico: 'Média Férias',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Media Ferias', 'Méd. Férias'],
  },
  {
    texto_canonico: 'Salário Maternidade / Paternidade',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Salario Maternidade / Paternidade', 'Sal. Maternidade/Paternidade', 'Salário Maternidade'],
  },
  {
    texto_canonico: 'Devolução INSS 13° Salário',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Devolucao INSS 13 Salario', 'Dev. INSS 13°', 'Devolução INSS 13o'],
  },
  {
    texto_canonico: 'Abono de Férias Pago',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Abono Ferias Pago', 'Abono Férias Pago'],
  },
  {
    texto_canonico: 'Abono p/ Comissão',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Abono para Comissão', 'Abono p Comissao', 'Abono p/ Comissao'],
  },
  {
    texto_canonico: '13° de Abono Pago',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['13o de Abono Pago', '13 Abono Pago', 'Décimo de Abono Pago'],
  },
  {
    texto_canonico: 'Banco de Horas',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Banco Horas', 'BH'],
  },
  {
    texto_canonico: 'Int. Ad. Not. No Dsr',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Integração Adicional Noturno no DSR', 'Int Ad Not DSR', 'Int. Adic. Noturno no DSR'],
    observacao_juridica:
      'Classificado como DESCONSIDERAR conforme planilha do escritório. ' +
      'A rubrica representa integração do adicional noturno no DSR já pago — ' +
      'por Súmula 60 TST, o adicional noturno integra a base de DSR. ' +
      'Decisão deliberada do escritório de não recompor para evitar bis in idem. ' +
      'Não alterar sem reaprovação jurídica.',
  },
  {
    // Typo corrigido (planilha G19: "Aimientação" -> "Alimentação").
    texto_canonico: 'Auxílio Alimentação',
    categoria: 'DESCONSIDERAR',
    sinonimos: [
      'Auxílio Aimientação', // grafia original da planilha
      'Auxilio Alimentacao',
      'Aux. Alimentação',
      'Vale Alimentação',
    ],
  },
  {
    texto_canonico: 'Auxílio Doença',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Auxilio Doenca', 'Aux. Doença', 'Aux Doenca'],
  },
  {
    texto_canonico: 'Devolução de carnê',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Devolucao de carne', 'Dev. de carnê', 'Devolução carnê'],
  },
  {
    texto_canonico: 'Restituição de férias p/ 13°',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Restituicao de ferias p 13', 'Rest. Férias p/ 13°', 'Restituição Férias para 13°'],
  },
  {
    texto_canonico: 'Reembolso (de nenhum tipo)',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Reembolso de nenhum tipo', 'Reembolso'],
  },
  {
    // Typo corrigido (planilha G25: "Garatido" -> "Garantido").
    texto_canonico: 'Compl. HE Garantido',
    categoria: 'DESCONSIDERAR',
    sinonimos: [
      'Compl. HE Garatido', // grafia original da planilha
      'Complemento HE Garantido',
      'Compl Hora Extra Garantido',
    ],
  },
  {
    texto_canonico: 'Refeição',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Refeicao', 'Vale Refeição', 'Vale Refeicao'],
  },
  {
    texto_canonico: 'Abono Salarial Conv. Col. Trab.',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Abono Salarial Convenção Coletiva Trabalho', 'Abono Salarial CCT'],
  },
  {
    texto_canonico: 'Horas Noturnas',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Hrs Noturnas', 'H. Noturnas'],
    observacao_juridica:
      'Classificado como DESCONSIDERAR conforme planilha do escritório. ' +
      'Súmula 60 TST estabelece que adicional noturno integra base de DSR — ' +
      'por analogia, horas noturnas trabalhadas seguem o mesmo princípio. ' +
      'Decisão deliberada do escritório de seguir interpretação restritiva. ' +
      'Não alterar sem reaprovação jurídica.',
  },
  {
    texto_canonico: 'Adicional Noturno',
    categoria: 'DESCONSIDERAR',
    sinonimos: ['Adic. Noturno', 'Ad. Noturno', 'Ad Noturno', 'Adicional Not.'],
    observacao_juridica:
      'Classificado como DESCONSIDERAR conforme planilha do escritório. ' +
      'Súmula 60 TST estabelece que adicional noturno integra base de DSR. ' +
      'Decisão deliberada do escritório de seguir interpretação restritiva. ' +
      'Não alterar sem reaprovação jurídica.',
  },
];
