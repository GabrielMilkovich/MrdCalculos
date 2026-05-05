/**
 * Mapper: Holerite Via Varejo.
 *
 * STATUS: STUB v6. Detector funciona; `mapear` retorna null pra cair pro
 * fallback v5. A implementação completa depende de fixture real de
 * holerite Via Varejo em PDF nativo, que ainda não foi entregue ao
 * pipeline. Quando chegar, a estratégia é:
 *
 *   1. Identificar a tabela de rubricas dentro de `doc.paginas[*].tabelas[]`
 *      (procurar headers como "Código", "Descrição", "Vencimentos",
 *      "Descontos").
 *   2. Iterar `tabela.linhas`, montar `RubricaDominio[]`.
 *   3. Extrair competência do cabeçalho (regex sobre `textoCompleto`).
 *
 * Documentado como pendência (v7+) — não bloquear o PR.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { HoleriteResultDominio } from '../tipos-dominio.ts';

export const mapperHoleriteViaVarejo: Mapper<HoleriteResultDominio> = {
  slug: 'holerite_via_varejo_v1',
  nome: 'Holerite Via Varejo (stub)',
  tipoDocumento: 'holerite',
  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (/(VIA\s+VAREJO|NOVA\s+CASA\s+BAHIA)/i.test(t)) {
      acertos++;
      motivos.push('razão social VV/CB');
    }
    if (/(HOLERITE|RECIBO\s+DE\s+PAGAMENTO|CONTRACHEQUE)/i.test(t)) {
      acertos++;
      motivos.push('título holerite/recibo/contracheque');
    }
    if (/VENCIMENTOS\b[\s\S]*?DESCONTOS\b/i.test(t)) {
      acertos++;
      motivos.push('colunas vencimentos/descontos');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min(acertos / 4, 0.9),
      motivos,
    };
  },
  mapear(_doc: DocumentoTabular): HoleriteResultDominio | null {
    // STUB: retorna null pra cair pro fallback v5.
    return null;
  },
};
