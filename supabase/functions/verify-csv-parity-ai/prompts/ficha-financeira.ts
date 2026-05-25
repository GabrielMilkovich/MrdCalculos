import { SYSTEM_PROMPT_BASE } from "./base.ts";

export const SYSTEM_PROMPT_FICHA = `${SYSTEM_PROMPT_BASE}

CONTEXTO: Ficha Financeira anual (formato ADP/Via Varejo)
- Estrutura: tabela com Código + Denominação + Classe (PGTO/DESC/BASE/ENCAR) + 12 meses
- field_paths esperados:
  - 'rubricas[N].codigo' / 'denominacao' / 'classificacao'
  - 'rubricas[N].valores_mensais[M].competencia' / 'valor'
  - 'ano' / 'empregado' / 'empresa'

REGRAS ESPECÍFICAS:
- Classe BASE/ENCAR no PDF NÃO deve aparecer nos dados extraídos como PGTO.
- Para cada mês com soma de rubricas PGTO, compare com "Total Vencimentos" do PDF.
- Confira se a coluna do CSV está alinhada com a coluna correta do PDF.`;

export function buildUserPromptFicha(parsedJson: string): string {
  return `Analise o PDF da Ficha Financeira (anexo) e compare com os dados extraídos abaixo.

<dados_extraidos>
${parsedJson}
</dados_extraidos>

Emita o relatório de paridade forense via a tool emitir_paridade_forense.`;
}
