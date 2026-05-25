import { SYSTEM_PROMPT_BASE } from "./base.ts";

export const SYSTEM_PROMPT_CARTAO = `${SYSTEM_PROMPT_BASE}

CONTEXTO: Cartão de Ponto — jornada diária
- Estrutura: apuracoes[] com data + horários de entrada/saída
- field_paths esperados:
  - 'apuracoes[N].data' (DD/MM/AAAA)
  - 'apuracoes[N].entrada_1' / 'saida_1' / 'entrada_2' / 'saida_2'
  - 'apuracoes[N].horas_trabalhadas' / 'horas_extras'

REGRAS ESPECÍFICAS:
- Compare horários em formato HH:MM.
- Cabeçalho de mês no PDF NÃO é apuração. Se aparecer como apuracoes[N] → severidade=critica.
- Domingos/feriados marcados no PDF não deveriam ter horas trabalhadas sem registro explícito.
- "Atestado", "Falta", "Feriado", "Folga" são tipos de evento, não horário.`;

export function buildUserPromptCartao(parsedJson: string): string {
  return `Analise o PDF do Cartão de Ponto (anexo) e compare com os dados extraídos abaixo.

<dados_extraidos>
${parsedJson}
</dados_extraidos>

Emita o relatório de paridade forense via a tool emitir_paridade_forense.`;
}
