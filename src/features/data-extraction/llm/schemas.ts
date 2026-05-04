/**
 * Zod schemas dos outputs aceitos pelo LLM (OpenAI) por tipo de documento.
 *
 * **Servem para 2 coisas:**
 *   1. JSON Schema na chamada da OpenAI (Structured Outputs / response_format
 *      json_schema) — força o modelo a só gerar campos previstos.
 *   2. Validação defensiva no front: mesmo com structured outputs, validamos
 *      o JSON recebido com Zod antes de aceitar (rejeita alucinação).
 *
 * **Importante:** os schemas são intencionalmente CONSERVADORES — campos
 * em `unparsed_lines`/`competencias`/`parser_version` são repostos
 * deterministicamente depois para manter compatibilidade com o tipo
 * `ParseCartaoPontoResult` original.
 */
import { z } from "zod";

// ============================================================
// Cartão-Ponto
// ============================================================

const Marcacao = z.object({
  e: z.string().regex(/^\d{2}:\d{2}$|^$/, "HH:MM ou vazio"),
  s: z.string().regex(/^\d{2}:\d{2}$|^$/, "HH:MM ou vazio"),
  e_inserida: z.boolean().nullable().optional(),
  s_inserida: z.boolean().nullable().optional(),
  e_desconsiderada: z.boolean().nullable().optional(),
  s_desconsiderada: z.boolean().nullable().optional(),
});

const Ocorrencia = z.enum([
  "NORMAL",
  "FALTA",
  "FERIADO",
  "FOLGA",
  "FERIAS",
  "ATESTADO",
  "LICENCA_MEDICA",
  "TREINAMENTO",
  "DSR",
  "AFASTAMENTO",
]);

const TipoEvento = z.enum([
  "horas_trabalhadas",
  "horas_previstas",
  "banco_horas_debito",
  "banco_horas_credito",
  "banco_horas_70",
  "he_com_70",
  "he_intervalo",
  "he_feriado_0",
  "he_feriado_100",
  "rsr_trabalhado_0",
  "intrajornada_sup_2hs",
  "intrajornada",
  "interjornada",
  "feriado_dias",
  "dsr_semanal_dias",
  "ferias",
  "licenca_medica",
  "treinamento",
  "atestado",
  "afastamento",
  "outro",
]);

const ApuracaoDiaria = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "yyyy-MM-dd"),
  dia_semana: z.string().nullable().optional(),
  ocorrencia: Ocorrencia,
  marcacoes: z.array(Marcacao).max(6),
  eventos: z
    .array(
      z.object({
        tipo: TipoEvento,
        valor: z.string(),
        raw: z.string().nullable().optional().transform((v) => v ?? ""),
      }),
    )
    .default([]),
  observacao: z.string().nullable().optional(),
});

export const CartaoPontoLLMOutput = z.object({
  apuracoes: z.array(ApuracaoDiaria),
});
export type CartaoPontoLLMOutput = z.infer<typeof CartaoPontoLLMOutput>;

// ============================================================
// Férias
// ============================================================

const GozoPeriodo = z.object({
  inicio: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "dd/MM/yyyy"),
  fim: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "dd/MM/yyyy"),
  dobra: z.boolean(),
});

const SituacaoFerias = z.enum(["G", "GP", "NG", "I", "P"]);

const FeriasParseada = z.object({
  relativa: z.string().regex(/^\d{4}\/\d{4}$/, "aaaa/aaaa"),
  prazo: z.number().int().min(0).max(60),
  situacao: SituacaoFerias,
  dobra_geral: z.boolean(),
  abono: z.boolean(),
  dias_abono: z.number().int().min(0).max(20),
  gozo1: GozoPeriodo.nullable(),
  gozo2: GozoPeriodo.nullable(),
  gozo3: GozoPeriodo.nullable(),
});

export const FeriasLLMOutput = z.object({
  ferias: z.array(FeriasParseada),
});
export type FeriasLLMOutput = z.infer<typeof FeriasLLMOutput>;

// ============================================================
// Faltas
// ============================================================

const FaltaParseada = z.object({
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "yyyy-MM-dd"),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "yyyy-MM-dd"),
  justificada: z.boolean(),
  reiniciar_periodo_aquisitivo: z.boolean(),
  justificativa: z.string().max(200).nullable(),
});

export const FaltasLLMOutput = z.object({
  faltas: z.array(FaltaParseada),
});
export type FaltasLLMOutput = z.infer<typeof FaltasLLMOutput>;

// ============================================================
// Holerite
// ============================================================

const RubricaParseada = z.object({
  codigo: z.string().nullable(),
  nome: z.string().min(1),
  valor_vencimento: z.number().nullable(),
  valor_desconto: z.number().nullable(),
  quantidade: z.number().nullable(),
  ordem: z.number().int().min(0),
});

export const HoleriteLLMOutput = z.object({
  competencia: z.string().regex(/^\d{2}\/\d{4}$/, "MM/yyyy"),
  rubricas: z.array(RubricaParseada),
  layout_usado: z.string().default("llm_v1"),
});
export type HoleriteLLMOutput = z.infer<typeof HoleriteLLMOutput>;

// ============================================================
// Discriminated union (utility) + helper
// ============================================================

export const LLM_SCHEMAS = {
  cartao_ponto: CartaoPontoLLMOutput,
  recibo_ferias: FeriasLLMOutput,
  registro_faltas: FaltasLLMOutput,
  holerite: HoleriteLLMOutput,
} as const;

export type LLMTipoDoc = keyof typeof LLM_SCHEMAS;

export function validateLLMOutput<T extends LLMTipoDoc>(
  tipo: T,
  raw: unknown,
): z.infer<(typeof LLM_SCHEMAS)[T]> {
  return LLM_SCHEMAS[tipo].parse(raw) as z.infer<(typeof LLM_SCHEMAS)[T]>;
}
