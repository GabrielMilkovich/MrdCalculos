/**
 * PJe-Calc v2.15.1 — JurosTaxaLegal
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.juros.taxalegal.JurosTaxaLegal
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/juros/taxalegal/JurosTaxaLegal.java
 *
 * Taxa legal de juros (Lei 14.905/2024 — SELIC - IPCA, vigente a partir de
 * 31/08/2024). **IMPORTANTE**: no Java, JurosTaxaLegal ESTENDE IndiceBase (não
 * JurosBase), com o `competencia` mapeado para a coluna `DDTDIAINDICE` (o que
 * sugere leitura DIÁRIA, similar a IndiceSelicDiaria). Mantemos a mesma
 * semântica na TS.
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../../indices/indice-base';

export class JurosTaxaLegal extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  clonar(): JurosTaxaLegal {
    const c = new JurosTaxaLegal(this.getCompetencia(), this.getTaxa(), this.getDataCriacao());
    if (this.getValorAcumulado() !== null) c.setValorAcumulado(this.getValorAcumulado()!);
    return c;
  }
}
