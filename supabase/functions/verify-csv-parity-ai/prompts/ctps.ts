import { SYSTEM_PROMPT_BASE } from "./base.ts";

export const SYSTEM_PROMPT_CTPS = `${SYSTEM_PROMPT_BASE}

CONTEXTO: Carteira de Trabalho — Férias e Afastamentos
- Estrutura: férias[] com período aquisitivo + gozo + dias; faltas/afastamentos[]
- field_paths esperados:
  - 'ferias[N].inicio_aquisitivo' / 'fim_aquisitivo' / 'gozos[M].inicio' / 'gozos[M].fim'
  - 'faltas[N].data_inicio' / 'data_fim' / 'justificada' / 'justificativa'

REGRAS ESPECÍFICAS:
- Período aquisitivo NÃO é falta. Se dados extraídos confundem → severidade=critica.
- Atestados e Auxílio Doença são afastamentos JUSTIFICADOS.
- Suspensões COVID são tipos específicos.
- Compare datas no formato DD/MM/AAAA.`;

export function buildUserPromptCtps(parsedJson: string): string {
  return `Analise o PDF da CTPS/documento de férias e faltas (anexo) e compare com os dados extraídos abaixo.

<dados_extraidos>
${parsedJson}
</dados_extraidos>

Emita o relatório de paridade forense via a tool emitir_paridade_forense.`;
}
