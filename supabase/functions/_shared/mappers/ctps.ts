/**
 * Mapper: CTPS (Carteira de Trabalho).
 *
 * STATUS: STUB v6. Detector funciona; `mapear` retorna null.
 * Diferente dos outros: CTPS é "pacote" de férias + faltas + dados
 * contratuais. A v5 trata via tipo `ctps` no auto-detect e roda os 2
 * parsers (férias + faltas) em paralelo. Em v7+ esse comportamento será
 * portado pra mapper composto.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { CtpsDominio } from '../tipos-dominio.ts';

export const mapperCtps: Mapper<CtpsDominio> = {
  slug: 'ctps_v1',
  nome: 'CTPS — Carteira de Trabalho (stub)',
  tipoDocumento: 'ctps',
  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (/CARTEIRA\s+DE\s+TRABALHO(\s+E\s+PREVID[ÊE]NCIA\s+SOCIAL)?/i.test(t)) {
      acertos += 2;
      motivos.push("cabeçalho 'Carteira de Trabalho'");
    }
    if (/\bCTPS\b/i.test(t)) {
      acertos++;
      motivos.push('sigla CTPS');
    }
    if (/(ANOTA[ÇC][ÕO]ES?\s+GERAIS|ALTERA[ÇC][ÕO]ES?\s+DE\s+SAL[ÁA]RIO)/i.test(t)) {
      acertos++;
      motivos.push('campos típicos de CTPS');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min(acertos / 4, 0.85),
      motivos,
    };
  },
  mapear(_doc: DocumentoTabular): CtpsDominio | null {
    return null;
  },
};
