/**
 * Dispatcher de mappers.
 *
 * Recebe um `DocumentoTabular` e (opcionalmente) o tipo já detectado pelo
 * auto-detect. Escolhe o mapper com maior score de detecção.
 *
 * Quando nenhum mapper aplica (`aplica=false`), devolve null e o pipeline
 * cai pro fallback v5 (parsers regex sobre OCR/texto-nativo).
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, TipoDocumentoMapper } from './index.ts';

import { mapperCartaoViaVarejo } from './cartao-ponto-via-varejo.ts';
import { mapperCartaoGenerico } from './cartao-ponto-generico.ts';
import { mapperHoleriteViaVarejo } from './holerite-via-varejo.ts';
import { mapperHoleriteGenerico } from './holerite-generico.ts';
import { mapperReciboFerias } from './recibo-ferias.ts';
import { mapperRegistroFaltas } from './registro-faltas.ts';
import { mapperCtps } from './ctps.ts';

const TODOS_MAPPERS: Array<Mapper<unknown>> = [
  mapperCartaoViaVarejo,
  mapperCartaoGenerico,
  mapperHoleriteViaVarejo,
  mapperHoleriteGenerico,
  mapperReciboFerias,
  mapperRegistroFaltas,
  mapperCtps,
];

export interface DispatchResult {
  mapper: Mapper<unknown>;
  score: number;
  motivos: string[];
}

/**
 * Escolhe o melhor mapper aplicável.
 * Quando `tipoForcado` é provido, filtra apenas mappers daquele tipo.
 */
export function escolherMapper(
  doc: DocumentoTabular,
  tipoForcado?: TipoDocumentoMapper,
): DispatchResult | null {
  const candidatos = TODOS_MAPPERS
    .filter((m) => !tipoForcado || m.tipoDocumento === tipoForcado)
    .map((m) => ({ mapper: m, deteccao: m.detectar(doc) }))
    .filter((c) => c.deteccao.aplica)
    .sort((a, b) => b.deteccao.score - a.deteccao.score);

  if (candidatos.length === 0) return null;
  const melhor = candidatos[0];
  return {
    mapper: melhor.mapper,
    score: melhor.deteccao.score,
    motivos: melhor.deteccao.motivos,
  };
}

export function listarMappers(): Mapper<unknown>[] {
  return [...TODOS_MAPPERS];
}
