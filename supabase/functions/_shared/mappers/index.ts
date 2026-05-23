/**
 * Interface comum dos mappers — Camada 3 da arquitetura v6.
 *
 * Mappers consomem `DocumentoTabular` (saída do extrator geométrico) e
 * produzem estruturas de domínio (ApuracaoDiaria[], RubricaParseada[],
 * etc.). Cada empregador/layout pode ter seu próprio mapper; o
 * dispatcher (`./dispatcher.ts`) escolhe pelo score de detecção.
 *
 * Vantagem sobre parsers regex v5:
 *   - Input limpo (texto + coords) ao invés de OCR sujo.
 *   - Mappers são pequenos (~30-150 linhas) por construção.
 *   - Adicionar empregador = adicionar 1 mapper, não reescrever parser.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';

export type TipoDocumentoMapper =
  | 'cartao_ponto'
  | 'holerite'
  | 'recibo_ferias'
  | 'registro_faltas'
  | 'ctps';

export interface DeteccaoMapper {
  /** True quando o mapper se aplica ao documento. */
  aplica: boolean;
  /** Score 0..1 — quem tiver maior vence em ambiguidade. */
  score: number;
  /** Razões humanas (debug/log). */
  motivos: string[];
}

export interface Mapper<TSaida> {
  /** Identificador único do mapper. */
  slug: string;
  /** Nome legível para logs/UI. */
  nome: string;
  /** Tipo de domínio que este mapper produz. */
  tipoDocumento: TipoDocumentoMapper;
  /**
   * Quando true, o pipeline pré-carrega o cache de aliases aprendidos
   * (`rubrica_aliases_ativos`) antes de invocar `mapear()`. Mappers que
   * usam ontologia de rubricas declaram `true`. Sem o flag (default),
   * mapper roda só com seed estático. Mecanismo declarativo evita
   * acoplar v6-pipeline ao slug do tipo de documento.
   */
  requiresOntologiaPrewarm?: boolean;
  /**
   * Detecta se o mapper se aplica ao documento.
   * Score combinado de marcadores estruturais (razão social, CNPJ,
   * cabeçalhos da tabela, etc.).
   */
  detectar(doc: DocumentoTabular): DeteccaoMapper;
  /**
   * Mapeia o documento para a estrutura de domínio.
   * Retorna `null` quando a extração estrutural falha — a estrutura do
   * doc não tem o que o mapper esperava. Pipeline cai pro fallback v5.
   */
  mapear(doc: DocumentoTabular): TSaida | null;
}
