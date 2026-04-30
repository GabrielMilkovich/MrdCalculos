import type {
  ComposicaoFaltas,
  ConflitoFaltas,
  FaltaExtraida,
  ResolucaoFaltas,
} from '../types';

/**
 * Compõe linhas de Faltas agregando registros por (data_inicio, data_fim).
 * Filtra `incluir=false`. Conflito quando dois registros com mesma chave
 * têm justificada/justificativa/reinicio divergentes.
 */
export function composeFaltas(
  registros: FaltaExtraida[],
  resolucoes: ResolucaoFaltas[] = [],
): ComposicaoFaltas {
  const incluidos = registros.filter((r) => r.incluir);

  const byKey = new Map<string, FaltaExtraida[]>();
  for (const r of incluidos) {
    const k = chaveFalta(r.data_inicio, r.data_fim);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }

  const resMap = new Map<string, string>();
  for (const r of resolucoes) resMap.set(r.chave, r.registro_id);

  const linhas: FaltaExtraida[] = [];
  const conflitos: ConflitoFaltas[] = [];

  for (const [chave, lista] of byKey) {
    if (lista.length === 1) {
      linhas.push(lista[0]);
      continue;
    }
    const allEqual = lista.every((x) => isEqualFalta(x, lista[0]));
    if (allEqual) {
      linhas.push(lista[0]);
      continue;
    }
    const escolhido = resMap.get(chave);
    if (escolhido) {
      const r = lista.find((x) => x.id === escolhido);
      if (r) {
        linhas.push(r);
        continue;
      }
    }
    conflitos.push({
      chave,
      data_inicio: lista[0].data_inicio,
      data_fim: lista[0].data_fim,
      candidatos: lista,
    });
  }

  linhas.sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
  conflitos.sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));

  return { linhas, conflitos };
}

export function chaveFalta(dataInicio: string, dataFim: string): string {
  return `${dataInicio}|${dataFim}`;
}

function isEqualFalta(a: FaltaExtraida, b: FaltaExtraida): boolean {
  return (
    a.justificada === b.justificada &&
    a.reiniciar_periodo_aquisitivo === b.reiniciar_periodo_aquisitivo &&
    (a.justificativa ?? '') === (b.justificativa ?? '')
  );
}
