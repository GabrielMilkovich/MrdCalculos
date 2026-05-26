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

  // PODEM SER DESCONSIDERADOS (col 6) — segue planilha
  '0040': 'desconsiderado', // Participação Lucros
  '0502': 'desconsiderado', // DSR (H. Extra) — planilha lista explicitamente
  '0510': 'desconsiderado', // Adiantamento 13º Salário
  '0511': 'desconsiderado', // 13º Salário 1ª Parcela
  '0590': 'desconsiderado', // 1/3 Adic Const Férias
  '0591': 'desconsiderado', // 1/3 Adic Const Férias
  '0832': 'desconsiderado', // Insuficiência Saldo no Mês
  '2750': 'desconsiderado', // Média de Férias
  '2751': 'desconsiderado', // Média Férias
  '2752': 'desconsiderado', // Diferença Média Férias
  '2823': 'desconsiderado', // Adiantamento Quinzenal
  '3415': 'desconsiderado', // 1/3 Férias Pagas
  '4013': 'desconsiderado', // Horas Extras 75% — não é DSR-comissão
  '4016': 'desconsiderado', // Horas Extras 70%
  '7076': 'desconsiderado', // PLR Variável

  // Descontos (classificação DESC) — todos descartados pra exportação
  '0833': 'desconsiderado', // Desc. Insuficiência Saldo
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
  { nome: 'rep rem s comissoes', grupo: 'dsr_comissao' },
  { nome: 'repouso remunerado s comissoes', grupo: 'dsr_comissao' },
  { nome: 'dsr premios', grupo: 'dsr_comissao' },

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
