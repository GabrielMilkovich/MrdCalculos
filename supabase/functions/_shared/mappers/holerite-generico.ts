/**
 * Mapper: Holerite genérico (stub fallback).
 *
 * STATUS: STUB v6. Detector usa sinais comuns de holerite (título,
 * colunas, base de cálculo INSS/FGTS). `mapear` retorna null. Idem ao
 * holerite-via-varejo: aguarda fixture real para implementação.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { HoleriteResultDominio } from '../tipos-dominio.ts';

export const mapperHoleriteGenerico: Mapper<HoleriteResultDominio> = {
  slug: 'holerite_generico_v1',
  nome: 'Holerite genérico (stub)',
  tipoDocumento: 'holerite',
  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (/(HOLERITE|RECIBO\s+DE\s+PAGAMENTO|CONTRACHEQUE)/i.test(t)) {
      acertos += 2;
      motivos.push('título holerite/recibo/contracheque');
    }
    if (/VENCIMENTOS\b[\s\S]*?DESCONTOS\b/i.test(t)) {
      acertos++;
      motivos.push('colunas vencimentos/descontos');
    }
    if (/BASE\s+(de\s+)?C[ÁA]LCULO\s+(do\s+)?(INSS|FGTS|IRRF)/i.test(t)) {
      acertos++;
      motivos.push('base de cálculo INSS/FGTS');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min((acertos / 4) * 0.6, 0.6), // fallback < específico
      motivos,
    };
  },
  mapear(_doc: DocumentoTabular): HoleriteResultDominio | null {
    return null;
  },
};
