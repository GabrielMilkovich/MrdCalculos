import type { CtpsDominioV2, CtpsAfastamento } from '@/domain/tipos-dominio';
import type { FaltaParseada, ParseFaltasResult, TipoAfastamento } from '../../faltas';

/**
 * Adapta `CtpsDominioV2` (afastamentos + afastamentos_outros) pra
 * `ParseFaltasResult` (formato esperado pela `CtpsReviewDialog`).
 *
 * Inclui AFASTAMENTOS_OUTROS (atestados + auxílio) e AFASTAMENTOS
 * principais (suspensões). Demissão (sem retorno) é excluída — não é
 * "falta" na semântica da UI.
 *
 * Converte data BR (dd/MM/yyyy) → ISO (yyyy-mm-dd) e mapeia categoria V2
 * pra tipo_afastamento do shape legacy.
 */
export function adaptarFaltas(ctps: CtpsDominioV2): ParseFaltasResult {
  const todos = [...ctps.afastamentos_outros, ...ctps.afastamentos];
  const faltas: FaltaParseada[] = [];

  for (const af of todos) {
    if (!af.retorno) continue;
    const dataInicio = brToIso(af.data_inicio);
    const dataFim = brToIso(af.retorno);
    if (!dataInicio || !dataFim) continue;
    faltas.push({
      data_inicio: dataInicio,
      data_fim: dataFim,
      tipo_afastamento: mapearTipo(af),
      duracao_dias: diasEntre(dataInicio, dataFim),
      justificada: af.categoria === 'atestado_medico',
      reiniciar_periodo_aquisitivo: false,
      justificativa: af.situacao || null,
    });
  }

  return {
    faltas,
    warnings: [],
    unparsed_lines: [],
  };
}

function mapearTipo(af: CtpsAfastamento): TipoAfastamento {
  if (af.categoria === 'atestado_medico') return 'atestado';
  if (af.categoria === 'auxilio_doenca') return 'aux_doenca';
  if (af.categoria === 'afastamento') {
    // afastamentos principais — situação pode ser Suspensão, etc.
    if (/suspens/i.test(af.situacao)) return 'suspensao';
    return 'outros';
  }
  return 'outros';
}

function brToIso(dataBR: string): string | null {
  const m = dataBR.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function diasEntre(iso1: string, iso2: string): number {
  const d1 = new Date(iso1 + 'T00:00:00Z').getTime();
  const d2 = new Date(iso2 + 'T00:00:00Z').getTime();
  if (isNaN(d1) || isNaN(d2)) return 0;
  const dias = Math.round((d2 - d1) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, dias);
}
