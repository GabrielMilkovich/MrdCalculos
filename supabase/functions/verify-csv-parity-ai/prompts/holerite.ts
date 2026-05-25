import { SYSTEM_PROMPT_BASE } from "./base.ts";

export const SYSTEM_PROMPT_HOLERITE = `${SYSTEM_PROMPT_BASE}

CONTEXTO: Holerite mensal (1 mês único)
- Estrutura: rubricas com nome + valor + categoria
- field_paths esperados:
  - 'rubricas[N].nome' / 'valor' / 'categoria'
  - 'competencia' / 'empregado'

REGRAS ESPECÍFICAS:
- Compare cada rubrica dos dados extraídos com o holerite original.
- "Total Vencimentos" e "Total Descontos" NÃO devem aparecer como rubrica.
- Categoria só compare se PDF tem indicação visual.`;

export function buildUserPromptHolerite(parsedJson: string): string {
  return `Analise o PDF do holerite (anexo) e compare com os dados extraídos abaixo.

<dados_extraidos>
${parsedJson}
</dados_extraidos>

Emita o relatório de paridade forense via a tool emitir_paridade_forense.`;
}
