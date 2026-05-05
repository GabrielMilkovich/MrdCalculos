/**
 * Mapper: Registro de Faltas (stub).
 *
 * STATUS: STUB v6. Detector funciona; `mapear` retorna null.
 * Implementação completa pendente de fixture real em PDF nativo.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { FaltaDominio } from '../tipos-dominio.ts';

export const mapperRegistroFaltas: Mapper<FaltaDominio[]> = {
  slug: 'registro_faltas_v1',
  nome: 'Registro de Faltas (stub)',
  tipoDocumento: 'registro_faltas',
  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (/(FOLHA|REGISTRO|CONTROLE)\s+DE\s+(FALTAS|FREQU[ÊE]NCIA)/i.test(t)) {
      acertos += 2;
      motivos.push('cabeçalho de faltas');
    }
    if (/ATESTADO\s+M[ÉE]DICO/i.test(t)) {
      acertos++;
      motivos.push('atestado médico');
    }
    if (/CID[\s:-]+[A-Z]\d{2}/i.test(t)) {
      acertos++;
      motivos.push('código CID');
    }
    if (/AUS[ÊE]NCIA\s+(injustificada|justificada)/i.test(t)) {
      acertos++;
      motivos.push('ausência just./injust.');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min(acertos / 5, 0.9),
      motivos,
    };
  },
  mapear(_doc: DocumentoTabular): FaltaDominio[] | null {
    return null;
  },
};
