/**
 * Mapper: Recibo de Férias (stub).
 *
 * STATUS: STUB v6. Detector funciona; `mapear` retorna null.
 * Implementação completa pendente de fixture real em PDF nativo.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { FeriasDominio } from '../tipos-dominio.ts';

export const mapperReciboFerias: Mapper<FeriasDominio[]> = {
  slug: 'recibo_ferias_v1',
  nome: 'Recibo de Férias (stub)',
  tipoDocumento: 'recibo_ferias',
  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (/(RECIBO|AVISO|COMUNICADO)\s+DE\s+F[ÉE]RIAS/i.test(t)) {
      acertos += 2;
      motivos.push('cabeçalho de férias');
    }
    if (/PER[ÍI]ODO\s+AQUISITIVO/i.test(t)) {
      acertos++;
      motivos.push('período aquisitivo');
    }
    if (/PER[ÍI]ODO\s+DE\s+GOZO/i.test(t)) {
      acertos++;
      motivos.push('período de gozo');
    }
    if (/ABONO\s+PECUNI[ÁA]RIO/i.test(t)) {
      acertos++;
      motivos.push('abono pecuniário');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min(acertos / 5, 0.9),
      motivos,
    };
  },
  mapear(_doc: DocumentoTabular): FeriasDominio[] | null {
    return null;
  },
};
