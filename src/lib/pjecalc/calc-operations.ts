/**
 * PJe-Calc Operations: Fechar, Reabrir, Duplicar
 * Implements calculation locking, unlocking and duplication.
 */
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";

export interface CalcStatus {
  id: string;
  status: 'aberto' | 'fechado';
  fechado_em?: string;
  fechado_por?: string;
}

/**
 * Linha genérica de tabela "pjecalc_*". Todas estas tabelas seguem o
 * mesmo padrão (id PK, case_id FK, timestamps). Usar `unknown` para o
 * payload custom evita `any` ao fazer destructuring controlado.
 *
 * Justificativa para o `as any` nos calls do supabase: estas tabelas
 * são custom (`pjecalc_*`) e não fazem parte do schema gerado em
 * `src/types/supabase.ts`. Substituir por tipo explícito exigiria
 * declará-las manualmente — preferível centralizar a "fronteira de
 * tipo desconhecido" aqui via `RowGen`.
 */
type PjeCalcRowGen = {
  id: string;
  case_id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

/** Faltas têm shape específico (date, justificada, motivo). */
interface PjeCalcFaltaRow extends PjeCalcRowGen {
  data?: string;
  justificada?: boolean;
  motivo?: string | null;
}

/** Férias têm shape específico (data_inicio, data_fim, abono_pecuniario). */
interface PjeCalcFeriasRow extends PjeCalcRowGen {
  data_inicio?: string;
  data_fim?: string;
  abono_pecuniario?: boolean;
}

/**
 * Remove campos auto-gerados pelo banco e injeta novo `case_id`. Tipa
 * o retorno como `Omit<...>` para deixar claro que `id`/timestamps
 * desaparecem do payload de inserção.
 */
function rebindToCase<T extends PjeCalcRowGen>(
  row: T,
  newCaseId: string,
): Omit<T, 'id' | 'case_id' | 'created_at' | 'updated_at'> & { case_id: string } {
  const { id: _id, case_id: _case, created_at: _ca, updated_at: _ua, ...rest } = row;
  return { ...rest, case_id: newCaseId };
}

/**
 * Fechar (lock) a calculation - prevents further edits
 */
export async function fecharCalculo(calculoId: string): Promise<void> {
  const { error } = await supabase
    // tabela custom fora do schema gerado
    .from("pjecalc_liquidacao_resultado" as never)
    .update({
      status: 'fechado',
      fechado_em: new Date().toISOString(),
      fechado_por: 'usuario',
    } as never)
    .eq("id", calculoId);

  if (error) throw new Error(`Erro ao fechar cálculo: ${error.message}`);
}

/**
 * Reabrir (unlock) a calculation - allows edits again
 */
export async function reabrirCalculo(calculoId: string): Promise<void> {
  const { error } = await supabase
    // tabela custom fora do schema gerado
    .from("pjecalc_liquidacao_resultado" as never)
    .update({
      status: 'aberto',
      fechado_em: null,
      fechado_por: null,
    } as never)
    .eq("id", calculoId);

  if (error) throw new Error(`Erro ao reabrir cálculo: ${error.message}`);
}

/**
 * Duplicar a calculation - copies all module data to a new case
 */
export async function duplicarCalculo(caseId: string, novoCliente?: string): Promise<string> {
  // 1. Create new case
  const { data: originalCase } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .single();

  if (!originalCase) throw new Error("Caso original não encontrado");

  const { data: newCase, error: caseError } = await supabase
    .from("cases")
    .insert({
      cliente: novoCliente || `${originalCase.cliente} (cópia)`,
      numero_processo: originalCase.numero_processo,
      tribunal: originalCase.tribunal,
      status: 'rascunho',
      tags: [...(originalCase.tags || []), 'duplicado'],
    })
    .select()
    .single();

  if (caseError || !newCase) throw new Error(`Erro ao criar caso: ${caseError?.message}`);

  const newCaseId = newCase.id;

  // 2. Copy parametros
  const { data: params } = await supabase
    // tabela custom fora do schema gerado
    .from("pjecalc_parametros" as never)
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();

  if (params) {
    const paramsCopy = rebindToCase(params as unknown as PjeCalcRowGen, newCaseId);
    await fromUntyped("pjecalc_parametros").insert(paramsCopy as never);
  }

  // 3. Copy faltas
  const { data: faltas } = await supabase
    // tabela custom fora do schema gerado
    .from("pjecalc_faltas" as never)
    .select("*")
    .eq("case_id", caseId);

  if (faltas && Array.isArray(faltas) && faltas.length > 0) {
    const faltasCopy = (faltas as unknown as PjeCalcFaltaRow[]).map(
      (f) => rebindToCase(f, newCaseId),
    );
    await fromUntyped("pjecalc_faltas").insert(faltasCopy as never);
  }

  // 4. Copy ferias
  const { data: ferias } = await supabase
    // tabela custom fora do schema gerado
    .from("pjecalc_ferias" as never)
    .select("*")
    .eq("case_id", caseId);

  if (ferias && Array.isArray(ferias) && ferias.length > 0) {
    const feriasCopy = (ferias as unknown as PjeCalcFeriasRow[]).map(
      (f) => rebindToCase(f, newCaseId),
    );
    await fromUntyped("pjecalc_ferias").insert(feriasCopy as never);
  }

  // 5. Copy historico salarial
  const { data: historicos } = await supabase
    // tabela custom fora do schema gerado
    .from("pjecalc_historico_salarial" as never)
    .select("*")
    .eq("case_id", caseId);

  if (historicos && Array.isArray(historicos) && historicos.length > 0) {
    const histCopy = (historicos as unknown as PjeCalcRowGen[]).map(
      (h) => rebindToCase(h, newCaseId),
    );
    await fromUntyped("pjecalc_historico_salarial").insert(histCopy as never);
  }

  // 6. Copy verbas
  const { data: verbas } = await supabase
    // tabela custom fora do schema gerado
    .from("pjecalc_verbas" as never)
    .select("*")
    .eq("case_id", caseId);

  if (verbas && Array.isArray(verbas) && verbas.length > 0) {
    const verbasCopy = (verbas as unknown as PjeCalcRowGen[]).map(
      (v) => rebindToCase(v, newCaseId),
    );
    await fromUntyped("pjecalc_verbas").insert(verbasCopy as never);
  }

  // 7. Copy configs (FGTS, CS, IR, Correção, Honorários, Custas, Seguro)
  const configTables = [
    'pjecalc_fgts_config',
    'pjecalc_cs_config',
    'pjecalc_ir_config',
    'pjecalc_correcao_config',
    'pjecalc_honorarios',
    'pjecalc_custas_config',
    'pjecalc_seguro_config',
    'pjecalc_multas_config',
    'pjecalc_pensao_config',
    'pjecalc_previdencia_privada_config',
    'pjecalc_salario_familia_config',
  ] as const;

  for (const table of configTables) {
    const { data: config } = await supabase
      // tabela custom fora do schema gerado
      .from(table as unknown as never)
      .select("*")
      .eq("case_id", caseId)
      .maybeSingle();

    if (config) {
      const configCopy = rebindToCase(config as unknown as PjeCalcRowGen, newCaseId);
      await supabase.from(table as unknown as never).insert(configCopy as never);
    }
  }

  return newCaseId;
}
