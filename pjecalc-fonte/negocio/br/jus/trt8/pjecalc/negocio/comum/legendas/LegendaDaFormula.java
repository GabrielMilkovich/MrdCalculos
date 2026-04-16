/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.legendas;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.legendas.ParametrosDaFormula;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba;
import java.io.Serializable;

public class LegendaDaFormula
implements Serializable {
    private static final long serialVersionUID = -1082419717557818140L;
    private static final String LEGENDA_PADRAO_DA_BASE = "Base";
    private static final String LEGENDA_PADRAO_DO_DIVISOR = "Divisor";
    private static final String LEGENDA_PADRAO_DO_MULTIPLICADOR = "Multiplicador";
    private static final String LEGENDA_PADRAO_DA_QUANTIDADE = "Quantidade";
    private ParametrosDaFormula parametros;

    public LegendaDaFormula(ParametrosDaFormula parametros) {
        this.parametros = parametros;
    }

    private boolean branco(StringBuilder str) {
        return str.length() == 0;
    }

    private String getBase() {
        StringBuilder str = new StringBuilder();
        if (Utils.naoNulo((Object)this.parametros.getBaseTabelada())) {
            switch (this.parametros.getBaseTabelada()) {
                case HISTORICO_SALARIAL: {
                    if (!this.parametros.getHistoricosSalariaisDaVerba().isEmpty()) {
                        for (HistoricoSalarialDaVerba historicoSalarialDaVerba : this.parametros.getHistoricosSalariaisDaVerba()) {
                            str.append(" + ").append(historicoSalarialDaVerba.getHistoricoSalarial().getNome());
                        }
                        break;
                    }
                    str.append(" + ").append(this.parametros.getBaseTabelada().getNome());
                    break;
                }
                case SALARIO_DA_CATEGORIA: {
                    if (Utils.naoNulo(this.parametros.getSalarioCategoriaDaVerba())) {
                        str.append(" + ").append(this.parametros.getSalarioCategoriaDaVerba().getNome());
                        break;
                    }
                    str.append(" + ").append(this.parametros.getBaseTabelada().getNome());
                    break;
                }
                case VALE_TRANSPORTE: {
                    if (!this.parametros.getValesTransportesDaVerba().isEmpty()) {
                        for (ValeTransporteDaVerba valeTransporteDaVerba : this.parametros.getValesTransportesDaVerba()) {
                            str.append(" + ").append(valeTransporteDaVerba.getValeTransporte().getDescricaoLinha());
                        }
                        break;
                    }
                    str.append(" + ").append(this.parametros.getBaseTabelada().getNome());
                    break;
                }
                default: {
                    str.append(" + ").append(this.parametros.getBaseTabelada().getNome());
                }
            }
        }
        if (Utils.naoNulo(this.parametros.getBasesCadastradas())) {
            if (!this.parametros.getBasesCadastradas().isEmpty()) {
                for (ItemBaseVerba itemBaseVerba : this.parametros.getBasesCadastradas()) {
                    str.append(" + ").append(itemBaseVerba.getVerbaDeCalculo().getNome());
                }
            }
        } else if (!this.parametros.getBasesCadastradasDoGestor().isEmpty()) {
            for (Verba verba : this.parametros.getBasesCadastradasDoGestor()) {
                str.append(" + ").append(verba.getNome());
            }
        }
        if (this.branco(str)) {
            str.append(LEGENDA_PADRAO_DA_BASE);
        } else {
            str.delete(0, 3);
        }
        return str.toString();
    }

    private String getDivisor() {
        StringBuilder str = new StringBuilder();
        if (Utils.naoNulo((Object)this.parametros.getTipoDeDivisor())) {
            switch (this.parametros.getTipoDeDivisor()) {
                case OUTRO_VALOR: {
                    if (!Utils.naoNulo(this.parametros.getValorDoDivisor())) break;
                    str.append(Utils.formatarNumero(this.parametros.getValorDoDivisor(), 4));
                    break;
                }
                default: {
                    str.append(this.parametros.getTipoDeDivisor().getNome());
                }
            }
        }
        if (this.branco(str)) {
            str.append(LEGENDA_PADRAO_DO_DIVISOR);
        }
        return str.toString();
    }

    private String getMultiplicador() {
        StringBuilder str = new StringBuilder();
        if (Utils.naoNulo(this.parametros.getValorDoMultiplicador())) {
            str.append(Utils.formatarNumero(this.parametros.getValorDoMultiplicador(), 8));
        }
        if (this.branco(str)) {
            str.append(LEGENDA_PADRAO_DO_MULTIPLICADOR);
        }
        return str.toString();
    }

    private String getQuantidade() {
        StringBuilder str = new StringBuilder();
        if (Utils.naoNulo((Object)this.parametros.getTipoDeQuantidade())) {
            switch (this.parametros.getTipoDeQuantidade()) {
                case INFORMADA: {
                    if (!Utils.naoNulo(this.parametros.getValorDaQuantidade())) break;
                    str.append(Utils.formatarNumero(this.parametros.getValorDaQuantidade(), 4));
                    break;
                }
                case IMPORTADA_DO_CALENDARIO: {
                    if (!Utils.naoNulo((Object)this.parametros.getTipoDeQuantidadeImportadaDoCalendario())) break;
                    str.append(this.parametros.getTipoDeQuantidadeImportadaDoCalendario().getNome());
                    break;
                }
                default: {
                    str.append(this.parametros.getTipoDeQuantidade().getNome());
                }
            }
            if (this.branco(str)) {
                str.append(LEGENDA_PADRAO_DA_QUANTIDADE);
            }
        }
        if (str.length() == 0) {
            str.append(LEGENDA_PADRAO_DA_QUANTIDADE);
        }
        return str.toString();
    }

    public String getLegenda() {
        return String.format("((((%s) / %s) x %s) x %s)", this.getBase(), this.getDivisor(), this.getMultiplicador(), this.getQuantidade()).toUpperCase();
    }

    public String toString() {
        return this.getLegenda();
    }
}

