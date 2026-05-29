/**
 * Catálogo da Planilha de Comissão/DSR do escritório MRD Advogados.
 *
 * Define os 6 grupos + sub-grupo + descartado conforme planilha oficial
 * "Planilha_Comissão_DSR (nova).xlsx".
 *
 * Mapeia rubricas (código Via Varejo + nome canônico) para o grupo
 * de exportação CSV → 1 CSV por grupo é importado no PJe-Calc 2.15.1
 * desktop como histórico salarial.
 *
 * IMPORTANTE: este catálogo é EXCLUSIVO para exportação CSV. Não afeta:
 *   - Motor V3 (PJe-Calc TypeScript) — usa `categoria_pje` do `rubrica_catalogo`
 *   - UI de revisão (`CategoriaSlug` em types.ts) — categorias antigas
 *   - `parse-ficha-financeira` edge function — não é modificada
 *
 * Decisões editoriais explícitas (revisáveis):
 *   - Códigos 0040 (PLR), 0510/0511 (13º), 0590/0591/3415 (1/3 férias),
 *     2750/2751/2752 (média férias), 0502 (DSR H.Extra) → DESCONSIDERADO.
 *     A planilha lista esses em "PODEM SER DESCONSIDERADOS".
 *   - Código 3391 ("Comissão Garantia") → comissao_servicos (col 4 da planilha)
 *     porque planilha tem "Com. Serv. Garantia" claramente. Coluna 2 também
 *     menciona "Comissão Garantida" mas é nome diferente. TODO: confirmar.
 *   - Código 3317 ("Adic. Sábado Com. 25%") → comissao_produtos (default).
 *     Planilha não lista explicitamente. TODO: confirmar.
 *   - Códigos de descontos (DESC), bases, encargos, totalizadores, INSS, IR,
 *     FGTS patronal → DESCONSIDERADO automaticamente.
 */

export type GrupoExportCSV =
  | 'minimo_garantido'
  | 'comissao_produtos'
  | 'dsr_comissao'
  | 'comissao_servicos'
  | 'premios'
  | 'salario_substituicao'
  | 'desconsiderado';

/**
 * Ordem de exportação no ZIP — prefixo numérico no nome de arquivo
 * pra que apareçam ordenados no PJe-Calc na hora do import.
 */
export const ORDEM_GRUPOS_CSV: Array<{ slug: GrupoExportCSV; prefixo: string; nome_pjecalc: string }> = [
  { slug: 'minimo_garantido', prefixo: '01', nome_pjecalc: 'Mínimo Garantido' },
  { slug: 'comissao_produtos', prefixo: '02', nome_pjecalc: 'Comissões sobre Produtos' },
  { slug: 'dsr_comissao', prefixo: '03', nome_pjecalc: 'DSR sobre Comissões' },
  { slug: 'comissao_servicos', prefixo: '04', nome_pjecalc: 'Comissões sobre Serviços' },
  { slug: 'premios', prefixo: '05', nome_pjecalc: 'Prêmios' },
  { slug: 'salario_substituicao', prefixo: '06', nome_pjecalc: 'Salário Substituição' },
];

/**
 * Mapa direto código Via Varejo → grupo da planilha. Cobre os 58 códigos
 * catalogados em `rubrica_catalogo` Via Varejo (auditoria 26/05/2026).
 *
 * Códigos não listados aqui caem no fuzzy match por denominação.
 */
export const CODIGO_PARA_GRUPO: Record<string, GrupoExportCSV> = {
  // MÍNIMO GARANTIDO (col 1 da planilha)
  '0712': 'minimo_garantido', // Mínimo Garantido — Comissionista
  '3368': 'minimo_garantido', // Horas Justificadas / TRN
  '3302': 'salario_substituicao', // Salário Substituição
  '3428': 'minimo_garantido', // Horas Justificadas (variante sem TRN — planilha B4)

  // COMISSÕES S/ PRODUTOS (col 2)
  '0620': 'comissao_produtos', // Comissões
  '7035': 'comissao_produtos', // Ajuste de Líquido
  '4325': 'comissao_produtos', // Adiantamento (= adiantamento em folha (EMP))
  '3317': 'comissao_produtos', // Adicional Sábado Com 25% — TODO confirmar

  // DSR S/ COMISSÕES (col 3)
  '0501': 'dsr_comissao', // DSR (Comissão)

  // COMISSÕES S/ SERVIÇOS (col 4)
  '3391': 'comissao_servicos', // Comissão Garantia (= Com. Serv. Garantia)
  '3393': 'comissao_servicos', // Comissão Seguros (= Com. Serv. Seguros)
  '3453': 'comissao_servicos', // Comissão Frete
  '4096': 'comissao_servicos', // Comissão Montagem
  '8489': 'comissao_servicos', // Campanha Serviços

  // PRÊMIOS (col 5)
  '3290': 'premios', // Prêmio Antecipado
  '4101': 'premios', // Prêmio Meta
  '8441': 'premios', // Antecip. Prêmio Estímulo

  // COMISSÕES S/ PRODUTOS — códigos adicionais (fichas teste1/teste2 2016-2021)
  '0710': 'comissao_produtos', // Dia do Comerciário
  '3155': 'comissao_produtos', // Dif. Comissão Mês Anterior
  '3303': 'comissao_produtos', // Inventário
  '4583': 'comissao_produtos', // Compl. Comissão Vendedor
  '7680': 'comissao_produtos', // Comissões Produtos Online

  // DSR S/ COMISSÕES — códigos adicionais
  '3090': 'dsr_comissao', // DSR s/ Média Horas Noturnas (planilha: "DSR s/ Média Hora Notuma")
  '3405': 'dsr_comissao', // R.S.R. s/ Comissão 200% (RSR para feriados trabalhados)
  '7753': 'dsr_comissao', // R.S.R. Trabalhado s/ Comissão

  // COMISSÕES S/ SERVIÇOS — códigos adicionais
  '2361': 'comissao_servicos', // Campanha Serv Fin (planilha E16 "Campanha Serviços")
  '3351': 'comissao_produtos', // Comissão Garantida (planilha C12 — confirmado escritório 2026-05-28)
  '3392': 'comissao_servicos', // COM.SERV TECNICOS (planilha E5)
  '4107': 'comissao_servicos', // COM VENDA EXPRESSA (planilha E13)
  '4533': 'comissao_servicos', // Campanha Categorias
  '4544': 'comissao_servicos', // COM. CART PRESENTE (planilha E17 "Campanha Cartão")
  '7653': 'comissao_servicos', // Campanha Cartão CB
  '7663': 'comissao_servicos', // Comissão Venda Incentivo
  '8505': 'comissao_servicos', // COM PLANOS OPERAD (planilha E9)

  // PRÊMIOS — códigos adicionais (prêmios antecipados e variações)
  '0040': 'premios', // Participação Lucros (PLR) — decisão escritório 2026-05-29
  '2375': 'premios', // Antec. Prêmio Vend. Light
  '2377': 'premios', // Antec. Prêmio Vendedor
  '2477': 'premios', // Antec. Prêmio Superação
  '2480': 'premios', // Antec. Prêmio Superação
  '2481': 'premios', // Antec. Prêmio Sócio
  '2496': 'premios', // Prêmio Antecipado Quinzenal
  '2354': 'premios', // Premio Loja (planilha F col Prêmios)
  '3183': 'premios', // Antec. Premiação / Incentivo
  '3343': 'premios', // GRATIFICACAO (planilha F14)
  '3423': 'premios', // Gratificação Feriado
  '4131': 'premios', // Prêmio Metal (planilha F col Prêmios)
  '4178': 'premios', // Premiação / Incentivo
  '4436': 'premios', // PR.ADIC(V.FINANC.) = PR. Adc. (planilha F17)
  '4591': 'premios', // Antec. Prêmio Vendedor Incentivo

  // PODEM SER DESCONSIDERADOS (col 6) — segue planilha
  '0502': 'desconsiderado', // DSR (H. Extra) — planilha lista explicitamente
  '0510': 'desconsiderado', // Adiantamento 13º Salário
  '0511': 'desconsiderado', // 13º Salário 1ª Parcela
  '0514': 'desconsiderado', // Desc. 13º Salário 1ª Parcela (DESC)
  '0515': 'desconsiderado', // Adiantamento de 13º (DESC)
  '0517': 'desconsiderado', // 13º Salário - Média
  '0518': 'desconsiderado', // Média 13º Sal. (Aviso Prévio)
  '0521': 'desconsiderado', // Desc. Média 13º Salário (DESC)
  '0525': 'desconsiderado', // Dif. de Médias 13º Salário
  '0526': 'desconsiderado', // Devolução Média 13º Salário (DESC)
  '0590': 'desconsiderado', // 1/3 Adic Const Férias
  '0591': 'desconsiderado', // 1/3 Adic Const Férias
  '0592': 'desconsiderado', // Difer. 1/3 Adic Const Fer
  '0593': 'desconsiderado', // 1/3 Férias - Pgto Rescisão
  '0594': 'desconsiderado', // 1/3 Férias - Pgto Rescisão
  '0631': 'desconsiderado', // Média Aviso Prévio
  '0654': 'desconsiderado', // Estabilidade – 13º Salário
  '0655': 'desconsiderado', // Estabilidade – Férias
  '0832': 'desconsiderado', // Insuficiência Saldo no Mês
  '0842': 'desconsiderado', // Licença por Atestado (Auxílio Doença)
  '0872': 'desconsiderado', // 30% Ajuda Compensatória
  '0873': 'desconsiderado', // Adicional Ajuda Compensatória
  '0874': 'desconsiderado', // Estabilidade SC/Redução
  '1101': 'desconsiderado', // Empréstimo Lei 10820
  '1108': 'desconsiderado', // Empréstimo HSBC Bank (DESC)
  '1800': 'desconsiderado', // Adicional Noturno 20%
  '1921': 'desconsiderado', // 1/3 Const. Férias Indenizatória
  '1922': 'desconsiderado', // 1/3 Const. F. Proporcional Ind.
  '1923': 'desconsiderado', // 1/3 Const. Férias (Aviso)
  '2412': 'desconsiderado', // Reemb. Mensalidade Unimed
  '2462': 'desconsiderado', // Coparticipação Unimed FESP (DESC)
  '2497': 'desconsiderado', // Prêmio Antecipado Quinzenal (DESC counterpart)
  '2741': 'desconsiderado', // Média Abono de Férias
  '2750': 'desconsiderado', // Média de Férias
  '2751': 'desconsiderado', // Média Férias
  '2752': 'desconsiderado', // Diferença Média Férias
  '2754': 'desconsiderado', // Média Adto. 13º Salário
  '2755': 'desconsiderado', // Média Adto. 13º Salário
  '2764': 'desconsiderado', // Média Adto. 13º Salário
  '2773': 'desconsiderado', // Média Férias Indenizatória
  '2774': 'desconsiderado', // Média Férias Indenizatória
  '2776': 'desconsiderado', // Média Férias (Aviso Prévio)
  '2823': 'desconsiderado', // Adiantamento Quinzenal
  '2882': 'desconsiderado', // Média 13º Salário Proporcional
  '3019': 'desconsiderado', // Antec. Créd. Média Horas Extras
  '3049': 'desconsiderado', // Reemb. Desc. Inss Contrib. Adic.
  '3102': 'desconsiderado', // Abono Salarial Conv. Coletiva
  '3415': 'desconsiderado', // 1/3 Férias Pagas
  '3514': 'desconsiderado', // Desconto Adto. Empregado (DESC)
  '3623': 'desconsiderado', // Assist. Interodonto / Odonto (DESC)
  '3768': 'desconsiderado', // Desc. Multicheque Rotativo (DESC)
  '4001': 'desconsiderado', // Horas Extras 60%
  '4003': 'desconsiderado', // Horas Extras 60%
  '4004': 'desconsiderado', // Hora Extras Noturna
  '4008': 'desconsiderado', // Horas Extras 65%
  '4013': 'desconsiderado', // Horas Extras 75%
  '4016': 'desconsiderado', // Horas Extras 70%
  '4024': 'desconsiderado', // Horas Extras 85%
  '4027': 'desconsiderado', // Horas Extras 100%
  '4028': 'desconsiderado', // Hora Extras Noturna
  '4132': 'desconsiderado', // DSR s/ Média Horas Extras (= DSR H. Extra)
  '4183': 'desconsiderado', // Ad. Noturno = Adicional Noturno (planilha G29)
  '4631': 'desconsiderado', // FGTS Art. 18 - Saldo (encargo patronal rescisório)
  '4635': 'desconsiderado', // FGTS Art. 18 - 13º (encargo patronal rescisório)
  '7037': 'desconsiderado', // Ajuste de Líquido Mês (DESC)
  '7076': 'desconsiderado', // PLR Variável

  // Descontos (classificação DESC) — todos descartados pra exportação
  '0833': 'desconsiderado', // Desc. Insuficiência Saldo
  '2393': 'desconsiderado', // Academia Gympass (DESC)
  '3249': 'desconsiderado', // INT.AD.NOT.NO DSR (planilha G18 — integração noturno no DSR)
  '3275': 'desconsiderado', // H. EXTRA COM.100%
  '3728': 'desconsiderado', // DESC. MULTICHEQUE (DESC)
  '5250': 'desconsiderado', // IR Retido 13Sal (DESC)
  '5251': 'desconsiderado', // Base IR 13Sal (BASE — filtrado antes, mas por precaução)
  '5252': 'desconsiderado', // Devolução de IRRF 13 (DESC)
  '5323': 'desconsiderado', // Diferença de Seguro (DESC)
  '5762': 'desconsiderado', // Mensalidade Sindical (DESC)
  '5860': 'desconsiderado', // Contrib Assistencial (DESC)
  '7197': 'desconsiderado', // Desc Multicheque Parc. (DESC)
  '7621': 'desconsiderado', // IR Férias (variante OCR)
  '8382': 'desconsiderado', // Provisionamento Férias (encargo patronal)
  '8383': 'desconsiderado', // Restituição Provisionamento
  '8384': 'desconsiderado', // Provisionamento Férias (encargo patronal)
  '9960': 'desconsiderado', // INSS 13 Salário (DESC)
  '9964': 'desconsiderado', // Devolução INSS 13o (DESC)
  '2333': 'desconsiderado', // Mensalidade Retroativa Unimed (DESC)
  '2339': 'desconsiderado', // Mensalidade Retroativa Unimed (DESC)
  '2824': 'desconsiderado', // Adiantamento Quinzenal (DESC)
  '3640': 'desconsiderado', // Prestação de Carnê
  '3669': 'desconsiderado', // Despesa Médica
  '3673': 'desconsiderado', // Seguro Vida Individual
  '3678': 'desconsiderado', // Seguro Vida Familiar
  '3684': 'desconsiderado', // Convênio Médico
  '3720': 'desconsiderado', // Prêmio Antecipado (DESC)
  '3721': 'desconsiderado', // Convênio Odontológico
  '3743': 'desconsiderado', // Adiantamento (DESC)
  '3784': 'desconsiderado', // Férias Recebidas
  '3795': 'desconsiderado', // Unimed FESP
  '3796': 'desconsiderado', // Unimed FESP Dependente
  '5500': 'desconsiderado', // IR Retido
  '5560': 'desconsiderado', // INSS
  '5580': 'desconsiderado', // INSS Férias
  '5616': 'desconsiderado', // Vale Alimentação
  '5760': 'desconsiderado', // Contrib Sindical
  '7103': 'desconsiderado', // Vale Alimentação V
  '7520': 'desconsiderado', // IR Férias

  // BASES informativas e encargos patronais — nunca exportam
  '5501': 'desconsiderado', // Base IR
  '5551': 'desconsiderado', // Base IR PLR
  '5561': 'desconsiderado', // Base INSS
  '8000': 'desconsiderado', // Salário Contribuição
  '9900': 'desconsiderado', // Base Contrib Sindical
  '9921': 'desconsiderado', // Base FGTS
  '9926': 'desconsiderado', // Base FGTS Férias
  '9953': 'desconsiderado', // Líquido Férias (totalizador)

  // Auditoria 2026-05-29 — códigos NAO_CLASSIFICADO recorrentes nas
  // 10 fichas teste1/teste2 (Joseli + outro colaborador, 2016-2021).
  // Decisões aprovadas pelo escritório em sessão de validação.
  '2437': 'desconsiderado', // Antecip. Mensalidade Unimed
  '2740': 'desconsiderado', // Media de Abono
  '3029': 'desconsiderado', // Antec. Crédito Dif. — mudou de comissao_produtos
  '3276': 'desconsiderado', // RSR COM.TRAB.100% (RSR sobre HE)
  '4142': 'desconsiderado', // Cred. Dif. Comissão — mudou de comissao_produtos
  '4529': 'comissao_servicos', // Campanha APP
  '3315': 'minimo_garantido', // FOLGA REMUNERADA (substitui jornada)
  '4780': 'desconsiderado', // 1/3 Ad Const Abono
  '4781': 'desconsiderado', // 1/3 Ad Const Abono
};

/**
 * Lista de nomes da planilha pra fuzzy match quando o código não está
 * em `CODIGO_PARA_GRUPO`. Strings em minúsculas sem acentos pra match
 * normalizado.
 *
 * 97 entries da planilha + variações comuns.
 */
export const NOMES_PLANILHA: Array<{ nome: string; grupo: GrupoExportCSV }> = [
  // MÍNIMO GARANTIDO
  { nome: 'minimo garantido', grupo: 'minimo_garantido' },
  { nome: 'horas justificadas', grupo: 'minimo_garantido' },
  { nome: 'horas justificadas trn', grupo: 'minimo_garantido' },
  { nome: 'trn', grupo: 'minimo_garantido' },
  { nome: 'treinamento', grupo: 'minimo_garantido' },

  // SALÁRIO SUBSTITUIÇÃO (sub-grupo separado)
  { nome: 'salario substituicao', grupo: 'salario_substituicao' },
  { nome: 'substituicao', grupo: 'salario_substituicao' },

  // COMISSÕES S/ PRODUTOS
  { nome: 'adic tempo de servico', grupo: 'comissao_produtos' },
  { nome: 'adicional tempo de servico', grupo: 'comissao_produtos' },
  { nome: 'antec credito dif de comissoes', grupo: 'comissao_produtos' },
  { nome: 'antecipacao credito diferenca comissoes', grupo: 'comissao_produtos' },
  { nome: 'ajuste liquido', grupo: 'comissao_produtos' },
  { nome: 'comissoes', grupo: 'comissao_produtos' },
  { nome: 'comissao adicional', grupo: 'comissao_produtos' },
  { nome: 'compl comissao', grupo: 'comissao_produtos' },
  { nome: 'complemento comissao', grupo: 'comissao_produtos' },
  { nome: 'compl comissao vem int ii', grupo: 'comissao_produtos' },
  { nome: 'comissoes produtos online', grupo: 'comissao_produtos' },
  { nome: 'comissao lib black friday', grupo: 'comissao_produtos' },
  { nome: 'comissao liberacao black friday', grupo: 'comissao_produtos' },
  { nome: 'comissao garantida', grupo: 'comissao_produtos' },
  { nome: 'dia do comerciario', grupo: 'comissao_produtos' },
  { nome: 'dif de convencao coletiva', grupo: 'comissao_produtos' },
  { nome: 'diferenca de convencao coletiva', grupo: 'comissao_produtos' },
  { nome: 'dif salario dissidio', grupo: 'comissao_produtos' },
  { nome: 'diferenca salario dissidio', grupo: 'comissao_produtos' },
  { nome: 'hora normal trabalhada', grupo: 'comissao_produtos' },
  { nome: 'inventario', grupo: 'comissao_produtos' },
  { nome: 'manuseio de valores', grupo: 'comissao_produtos' },
  { nome: 'proventos', grupo: 'comissao_produtos' },
  { nome: 'quebra de caixa', grupo: 'comissao_produtos' },
  { nome: 'quinquenio', grupo: 'comissao_produtos' },
  { nome: 'trienio', grupo: 'comissao_produtos' },
  { nome: 'remuneracao garantida', grupo: 'comissao_produtos' },
  { nome: 'comissao antecipada', grupo: 'comissao_produtos' },
  { nome: 'comissoes venda produto online', grupo: 'comissao_produtos' },
  { nome: 'dif comissao mes ant', grupo: 'comissao_produtos' },
  { nome: 'diferenca comissao mes anterior', grupo: 'comissao_produtos' },
  { nome: 'adiantamento em folha', grupo: 'comissao_produtos' },

  // DSR S/ COMISSÕES
  { nome: 'dsr comissao', grupo: 'dsr_comissao' },
  { nome: 'dsr e feriados', grupo: 'dsr_comissao' },
  { nome: 'int premio no dsr', grupo: 'dsr_comissao' },
  { nome: 'integracao premio no dsr', grupo: 'dsr_comissao' },
  { nome: 'dsr s media hora noturna', grupo: 'dsr_comissao' },
  { nome: 'dsr s media horas noturna', grupo: 'dsr_comissao' },
  { nome: 'rep rem s comissoes', grupo: 'dsr_comissao' },
  { nome: 'repouso remunerado s comissoes', grupo: 'dsr_comissao' },
  { nome: 'dsr premios', grupo: 'dsr_comissao' },
  { nome: 'r s r com', grupo: 'dsr_comissao' },
  { nome: 'rsr com', grupo: 'dsr_comissao' },
  { nome: 'r s r trabalhado', grupo: 'dsr_comissao' },

  // COMISSÕES S/ SERVIÇOS
  { nome: 'com serv seguros', grupo: 'comissao_servicos' },
  { nome: 'comissao servicos seguros', grupo: 'comissao_servicos' },
  { nome: 'com serv garantia', grupo: 'comissao_servicos' },
  { nome: 'comissao servicos garantia', grupo: 'comissao_servicos' },
  { nome: 'com serv tecnicos', grupo: 'comissao_servicos' },
  { nome: 'comissao servicos tecnicos', grupo: 'comissao_servicos' },
  { nome: 'com frete', grupo: 'comissao_servicos' },
  { nome: 'comissao frete', grupo: 'comissao_servicos' },
  { nome: 'com montagem', grupo: 'comissao_servicos' },
  { nome: 'comissao montagem', grupo: 'comissao_servicos' },
  { nome: 'com serv odont', grupo: 'comissao_servicos' },
  { nome: 'comissao servicos odontologico', grupo: 'comissao_servicos' },
  { nome: 'com planos operad', grupo: 'comissao_servicos' },
  { nome: 'comissao planos operadora', grupo: 'comissao_servicos' },
  { nome: 'com tecnicos pto lj', grupo: 'comissao_servicos' },
  { nome: 'com catalogo', grupo: 'comissao_servicos' },
  { nome: 'comissao catalogo', grupo: 'comissao_servicos' },
  { nome: 'com serv fin', grupo: 'comissao_servicos' },
  { nome: 'comissao servicos financeiros', grupo: 'comissao_servicos' },
  { nome: 'com venda expressa', grupo: 'comissao_servicos' },
  { nome: 'comissao venda expressa', grupo: 'comissao_servicos' },
  { nome: 'campanha', grupo: 'comissao_servicos' },
  { nome: 'camapanha', grupo: 'comissao_servicos' }, // typo na planilha
  { nome: 'campanha moveis', grupo: 'comissao_servicos' },
  { nome: 'campanha servicos', grupo: 'comissao_servicos' },
  { nome: 'campanha cartao pf', grupo: 'comissao_servicos' },
  { nome: 'compl com seguros', grupo: 'comissao_servicos' },
  { nome: 'complemento comissao seguros', grupo: 'comissao_servicos' },
  { nome: 'comissoes servicos online', grupo: 'comissao_servicos' },

  // PRÊMIOS
  { nome: 'antec premiacao', grupo: 'premios' },
  { nome: 'premiacao incentivo', grupo: 'premios' },
  { nome: 'gratific feriado', grupo: 'premios' },
  { nome: 'gratificacao feriado', grupo: 'premios' },
  { nome: 'premio', grupo: 'premios' },
  { nome: 'premio mensal', grupo: 'premios' },
  { nome: 'premio meta', grupo: 'premios' },
  { nome: 'premio antecipado', grupo: 'premios' },
  { nome: 'premio estimulo', grupo: 'premios' },
  { nome: 'antecip premio estimulo', grupo: 'premios' },
  { nome: 'premio performance', grupo: 'premios' },
  { nome: 'premio lb', grupo: 'premios' },
  { nome: 'premio gar estendida', grupo: 'premios' },
  { nome: 'premio garantia estendida', grupo: 'premios' },
  { nome: 'pr recarga de celular', grupo: 'premios' },
  { nome: 'pr cartao de credito', grupo: 'premios' },
  { nome: 'prm', grupo: 'premios' },
  { nome: 'gratificacao', grupo: 'premios' },
  { nome: 'dif premio vendedor', grupo: 'premios' },
  { nome: 'diferenca premio vendedor', grupo: 'premios' },
  { nome: 'ppr pula meio', grupo: 'premios' },
  { nome: 'pr adc', grupo: 'premios' },
  { nome: 'premio seguro', grupo: 'premios' },
  { nome: 'pr garantia compl', grupo: 'premios' },
  { nome: 'premiacao incentivo', grupo: 'premios' },
  { nome: 'pr saude', grupo: 'premios' },
  { nome: 'premio atend loja', grupo: 'premios' },
  { nome: 'premio atendimento loja', grupo: 'premios' },

  // PODEM SER DESCONSIDERADOS — explícitos da planilha
  { nome: 'dif 13 salario', grupo: 'desconsiderado' },
  { nome: 'diferenca 13 salario', grupo: 'desconsiderado' },
  { nome: 'dif ferias', grupo: 'desconsiderado' },
  { nome: 'diferenca ferias', grupo: 'desconsiderado' },
  { nome: 'dif de medias 13 salario', grupo: 'desconsiderado' },
  { nome: 'ferias pagas', grupo: 'desconsiderado' },
  { nome: 'antec vale transp admissao', grupo: 'desconsiderado' },
  { nome: 'antecipacao vale transporte admissao', grupo: 'desconsiderado' },
  { nome: 'banco de horas 100 noturna', grupo: 'desconsiderado' },
  { nome: 'dsr h extra', grupo: 'desconsiderado' },
  { nome: 'dsr hora extra', grupo: 'desconsiderado' },
  { nome: '13 de ferias pagas', grupo: 'desconsiderado' },
  { nome: 'media ferias', grupo: 'desconsiderado' },
  { nome: 'salario maternidade', grupo: 'desconsiderado' },
  { nome: 'salario paternidade', grupo: 'desconsiderado' },
  { nome: 'devolucao inss 13 salario', grupo: 'desconsiderado' },
  { nome: 'abono de ferias pago', grupo: 'desconsiderado' },
  { nome: 'abono p comissao', grupo: 'desconsiderado' },
  { nome: 'abono para comissao', grupo: 'desconsiderado' },
  { nome: '13 de abono pago', grupo: 'desconsiderado' },
  { nome: 'banco de horas', grupo: 'desconsiderado' },
  { nome: 'int ad not no dsr', grupo: 'desconsiderado' },
  { nome: 'auxilio alimentacao', grupo: 'desconsiderado' },
  { nome: 'auxilio doenca', grupo: 'desconsiderado' },
  { nome: 'ch extras', grupo: 'desconsiderado' },
  { nome: 'devolucao de carne', grupo: 'desconsiderado' },
  { nome: 'restituicao de ferias p 13', grupo: 'desconsiderado' },
  { nome: 'reembolso', grupo: 'desconsiderado' },
  { nome: 'compl he garantido', grupo: 'desconsiderado' },
  { nome: 'complemento he garantido', grupo: 'desconsiderado' },
  { nome: 'refeicao', grupo: 'desconsiderado' },
  { nome: 'abono salarial conv col trab', grupo: 'desconsiderado' },
  { nome: 'abono salarial convencao coletiva', grupo: 'desconsiderado' },
  { nome: 'horas noturnas', grupo: 'desconsiderado' },
  { nome: 'adicional noturno', grupo: 'desconsiderado' },
];

/**
 * Normaliza string para fuzzy match: minúscula, sem acento, sem pontuação,
 * espaços únicos. "Comissão Serviços" → "comissao servicos".
 */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ') // pontuação vira espaço
    .replace(/\s+/g, ' ') // espaços únicos
    .trim();
}

/**
 * Levenshtein simples — caracteres editados entre 2 strings.
 * Usado pra tolerância de OCR (e.g. "Comissao" vs "Comissoa").
 */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export interface ClassificacaoResultado {
  grupo: GrupoExportCSV;
  confianca: 'alta' | 'media' | 'baixa';
  metodo: 'codigo' | 'nome_exato' | 'nome_substring' | 'nome_fuzzy' | 'fallback';
  motivo: string;
}

/**
 * Classifica uma rubrica num grupo da planilha.
 *
 * Estratégia em cascata:
 *   1. Código catalogado → confiança alta
 *   2. Nome normalizado bate exato com algum item da planilha → alta
 *   3. Nome contém substring de item da planilha (5+ chars) → média
 *   4. Levenshtein ≤ 2 chars com algum item da planilha → baixa
 *   5. Fallback → 'desconsiderado' (pra forçar revisão manual)
 */
export function classificarRubrica(
  codigo: string | null | undefined,
  denominacao: string,
): ClassificacaoResultado {
  // Path 1: código catalogado
  if (codigo && CODIGO_PARA_GRUPO[codigo]) {
    return {
      grupo: CODIGO_PARA_GRUPO[codigo],
      confianca: 'alta',
      metodo: 'codigo',
      motivo: `Código ${codigo} mapeado diretamente.`,
    };
  }

  const denoNorm = normalizar(denominacao);
  if (!denoNorm) {
    return {
      grupo: 'desconsiderado',
      confianca: 'baixa',
      metodo: 'fallback',
      motivo: 'Denominação vazia.',
    };
  }

  // Path 2: nome bate exato
  const exato = NOMES_PLANILHA.find(n => normalizar(n.nome) === denoNorm);
  if (exato) {
    return {
      grupo: exato.grupo,
      confianca: 'alta',
      metodo: 'nome_exato',
      motivo: `Nome "${denominacao}" bate exato com "${exato.nome}".`,
    };
  }

  // Path 3: substring (5+ chars)
  for (const item of NOMES_PLANILHA) {
    const itemNorm = normalizar(item.nome);
    if (itemNorm.length < 5) continue;
    if (denoNorm.includes(itemNorm) || itemNorm.includes(denoNorm)) {
      return {
        grupo: item.grupo,
        confianca: 'media',
        metodo: 'nome_substring',
        motivo: `Nome "${denominacao}" contém/contido em "${item.nome}".`,
      };
    }
  }

  // Path 4: fuzzy (Levenshtein ≤ 2)
  let melhor: { item: typeof NOMES_PLANILHA[number]; dist: number } | null = null;
  for (const item of NOMES_PLANILHA) {
    const itemNorm = normalizar(item.nome);
    const dist = levenshtein(denoNorm, itemNorm);
    if (dist <= 2 && (!melhor || dist < melhor.dist)) {
      melhor = { item, dist };
    }
  }
  if (melhor) {
    return {
      grupo: melhor.item.grupo,
      confianca: 'baixa',
      metodo: 'nome_fuzzy',
      motivo: `Nome "${denominacao}" ~"${melhor.item.nome}" (dist ${melhor.dist}).`,
    };
  }

  // Path 5: fallback
  return {
    grupo: 'desconsiderado',
    confianca: 'baixa',
    metodo: 'fallback',
    motivo: `Nenhum match — código ${codigo ?? '∅'}, nome "${denominacao}". Revisar manualmente.`,
  };
}
