// src/hooks/useConfirmClassificacoes.ts
//
// Promove tentativas do case em curso para `rubrica_aliases` canônico.
// Invoca edge function `holerite-classify-confirm` que:
//   - Faz UPSERT em rubrica_aliases por (normalized_key)
//   - Detecta conflito (categoria divergente OU observacao_juridica diferente)
//     e retorna sem sobrescrever — caller decide UX
//   - Limpa tentativas promovidas, mantém as conflitantes pra revisão
//
// Chamado pelo HoleritePreviewDialog ANTES do build do ZIP. Conflitos não
// bloqueiam o ZIP (decisão de produto: ZIP usa state do grid, conflito é
// problema de propagação pra outros casos).

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConflitoAlias {
  tentativa_id: string;
  alias_original: string;
  normalized_key: string;
  motivo: 'conflict_existing' | 'observacao_juridica_changed';
  categoria_tentativa: string;
  categoria_existente: string;
  obs_anterior?: string | null;
  obs_tentativa?: string | null;
}

export interface ConfirmResult {
  promovidos: number;
  conflitos: ConflitoAlias[];
}

export interface UseConfirmClassificacoesResult {
  confirm: () => Promise<ConfirmResult>;
  isConfirming: boolean;
}

export function useConfirmClassificacoes(
  caseId: string | null | undefined,
): UseConfirmClassificacoesResult {
  const [isConfirming, setIsConfirming] = useState(false);

  const confirm = useCallback(async (): Promise<ConfirmResult> => {
    if (!caseId) {
      return { promovidos: 0, conflitos: [] };
    }
    setIsConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke<ConfirmResult>(
        'holerite-classify-confirm',
        { body: { case_id: caseId } },
      );
      if (error) {
        throw new Error(error.message ?? 'Falha ao confirmar classificações');
      }
      return data ?? { promovidos: 0, conflitos: [] };
    } finally {
      setIsConfirming(false);
    }
  }, [caseId]);

  return { confirm, isConfirming };
}
