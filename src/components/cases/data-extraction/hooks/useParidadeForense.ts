import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeParidadeForense } from '@/features/data-extraction/paridade-forense/api/invokeParidadeForense';
import { mapConfidenceToCheckboxState } from '@/features/data-extraction/paridade-forense/confidence';
import type { ParidadeForenseResult, ParidadeBuilder, DiscrepanciaForense } from '@/features/data-extraction/paridade-forense/types';

export type ParidadeEstado = 'idle' | 'running' | 'success' | 'error';

export interface UseParidadeForenseOptions {
  documentId: string;
  builder: ParidadeBuilder;
  parsed: unknown;
}

export function useParidadeForense({ documentId, builder, parsed }: UseParidadeForenseOptions) {
  const [estado, setEstado] = useState<ParidadeEstado>('idle');
  const [resultado, setResultado] = useState<ParidadeForenseResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [itensSelecionados, setItensSelecionados] = useState<Map<number, boolean>>(new Map());

  const iniciar = useCallback(async () => {
    setEstado('running');
    setErro(null);
    setResultado(null);

    const resp = await invokeParidadeForense({
      document_id: documentId,
      builder,
      parsed,
    });

    if (!resp.ok) {
      setEstado('error');
      setErro(resp.error);
      return;
    }

    setResultado(resp.result);
    setEstado('success');

    const selecao = new Map<number, boolean>();
    resp.result.discrepancias.forEach((d: DiscrepanciaForense, idx: number) => {
      const mapping = mapConfidenceToCheckboxState(d.ai_confidence);
      selecao.set(idx, mapping.pre_marcado);
    });
    setItensSelecionados(selecao);
  }, [documentId, builder, parsed]);

  const toggleItem = useCallback((idx: number) => {
    setItensSelecionados((prev) => {
      const next = new Map(prev);
      next.set(idx, !next.get(idx));
      return next;
    });
  }, []);

  const selecionarTodos = useCallback(() => {
    if (!resultado) return;
    const next = new Map<number, boolean>();
    resultado.discrepancias.forEach((d, idx) => {
      const mapping = mapConfidenceToCheckboxState(d.ai_confidence);
      if (!mapping.aplicar_disabled) next.set(idx, true);
      else next.set(idx, false);
    });
    setItensSelecionados(next);
  }, [resultado]);

  const desselecionarTodos = useCallback(() => {
    if (!resultado) return;
    const next = new Map<number, boolean>();
    resultado.discrepancias.forEach((_, idx) => next.set(idx, false));
    setItensSelecionados(next);
  }, [resultado]);

  const aplicarSelecionados = useCallback(async (): Promise<{ aplicadas: number; erros: string[] }> => {
    if (!resultado) return { aplicadas: 0, erros: ['Sem resultado'] };

    const selecionados = resultado.discrepancias.filter((_, idx) => itensSelecionados.get(idx));
    if (selecionados.length === 0) return { aplicadas: 0, erros: [] };

    let aplicadas = 0;
    const erros: string[] = [];

    for (const d of selecionados) {
      const { error } = await supabase.from('ai_paridade_aplicacoes').insert({
        document_id: documentId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        builder,
        field_path: d.field_path,
        value_before: d.current as Record<string, unknown>,
        value_after: d.suggested as Record<string, unknown>,
        ai_confidence: d.ai_confidence,
        ai_severidade: d.severidade,
        ai_reason: d.motivo,
        ai_evidence_pdf: d.evidencia_pdf ?? null,
        ia_model: resultado.model,
        ia_duration_ms: resultado.duration_ms,
      });

      if (error) {
        erros.push(`${d.field_path}: ${error.message}`);
      } else {
        aplicadas++;
      }
    }

    return { aplicadas, erros };
  }, [resultado, itensSelecionados, documentId, builder]);

  const countSelecionados = [...itensSelecionados.values()].filter(Boolean).length;

  return {
    estado,
    resultado,
    erro,
    itensSelecionados,
    countSelecionados,
    iniciar,
    toggleItem,
    selecionarTodos,
    desselecionarTodos,
    aplicarSelecionados,
  };
}
