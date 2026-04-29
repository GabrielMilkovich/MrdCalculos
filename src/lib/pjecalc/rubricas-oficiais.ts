/**
 * Catálogo oficial de rubricas / bases tabeladas e nomes de histórico
 * salarial usados no PJe-Calc. Esses valores espelham os enums Java
 * `BaseTabeladaEnum` e nomes mais frequentes em `HistoricoSalarial`
 * encontrados nos PJCs de referência (corpus 47).
 *
 * Mantemos como dicionário fixo (e não tabela no Supabase) porque:
 *  1. Os valores são oficiais (PJe-Calc), não mudam por tenant.
 *  2. Evitamos uma round-trip extra para preencher um <Select>.
 *  3. Caso o usuário precise de um valor fora do catálogo, ele pode
 *     digitar livremente via opção "Outro (digitar manualmente)".
 */

export interface CatalogoOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Bases tabeladas oficiais (Java `BaseTabeladaEnum`).
 * Ver `pjecalc-fonte/src/main/java/.../enums/BaseTabeladaEnum.java`.
 */
export const BASES_TABELADAS: CatalogoOption[] = [
  { value: "salario_base", label: "Salário Base", hint: "Vencimento básico" },
  { value: "salario_minimo", label: "Salário Mínimo", hint: "Tabela oficial nacional" },
  { value: "piso_salarial", label: "Piso Salarial", hint: "Convenção/CCT da categoria" },
  { value: "remuneracao", label: "Remuneração", hint: "Salário + adicionais" },
  { value: "remuneracao_media", label: "Remuneração Média", hint: "Média 12 meses" },
  { value: "ultimo_salario", label: "Último Salário", hint: "Salário do mês da rescisão" },
  { value: "maior_remuneracao", label: "Maior Remuneração", hint: "Maior valor pago no contrato" },
  { value: "salario_familia_base", label: "Base Salário-Família", hint: "Tabela INSS" },
  { value: "valor_informado", label: "Valor Informado", hint: "Valor fixo digitado pelo usuário" },
];

/**
 * Nomes oficiais de histórico salarial (mais comuns).
 * Ver `pjecalc_hist_salarial.nome`.
 */
export const HIST_SALARIAL_NOMES: CatalogoOption[] = [
  { value: "Salário Base", label: "Salário Base" },
  { value: "Salário Contratual", label: "Salário Contratual" },
  { value: "Comissões", label: "Comissões" },
  { value: "Horas Extras Habituais", label: "Horas Extras Habituais" },
  { value: "Adicional Noturno", label: "Adicional Noturno" },
  { value: "Adicional Insalubridade", label: "Adicional Insalubridade" },
  { value: "Adicional Periculosidade", label: "Adicional Periculosidade" },
  { value: "Gratificação", label: "Gratificação" },
  { value: "Prêmios", label: "Prêmios" },
  { value: "Diárias", label: "Diárias" },
  { value: "Salário-Variável", label: "Salário-Variável" },
];

/**
 * Comportamentos de reflexo (Java `ComportamentoReflexoEnum`).
 */
export const COMPORTAMENTOS_REFLEXO: CatalogoOption[] = [
  { value: "comum", label: "Comum (default)" },
  { value: "media_periodo", label: "Média do Período" },
  { value: "media_12m", label: "Média 12 meses" },
  { value: "ultima_competencia", label: "Última Competência" },
  { value: "habitualidade", label: "Habitualidade" },
];

/**
 * Modos de fração de mês (Java `FracaoMesModoEnum`).
 */
export const FRACAO_MES_MODOS: CatalogoOption[] = [
  { value: "30_dias", label: "30 dias (default)" },
  { value: "dias_uteis", label: "Dias úteis" },
  { value: "dias_corridos", label: "Dias corridos" },
  { value: "fracao_avos", label: "Fração em avos (1/12)" },
];

/**
 * Verbas-base oficiais (top-level). Espelha as principais entradas
 * do catálogo em `CatalogoVerbas.tsx` — mantido em sincronia
 * porque ambos derivam do mesmo conjunto de `VerbaDeCalculo` Java.
 */
export const VERBAS_BASE_DICIONARIO: CatalogoOption[] = [
  { value: "salario_base", label: "Salário Base" },
  { value: "comissao", label: "Comissão" },
  { value: "horas_extras_50", label: "Horas Extras 50%" },
  { value: "horas_extras_100", label: "Horas Extras 100%" },
  { value: "adicional_noturno", label: "Adicional Noturno" },
  { value: "adicional_insalubridade", label: "Adicional Insalubridade" },
  { value: "adicional_periculosidade", label: "Adicional Periculosidade" },
  { value: "gratificacao", label: "Gratificação" },
  { value: "premio", label: "Prêmio" },
  { value: "saldo_salario", label: "Saldo de Salário" },
  { value: "aviso_previo_indenizado", label: "Aviso Prévio Indenizado" },
  { value: "decimo_terceiro_proporcional", label: "13º Salário Proporcional" },
  { value: "ferias_proporcionais", label: "Férias Proporcionais + 1/3" },
  { value: "ferias_vencidas", label: "Férias Vencidas + 1/3" },
];
