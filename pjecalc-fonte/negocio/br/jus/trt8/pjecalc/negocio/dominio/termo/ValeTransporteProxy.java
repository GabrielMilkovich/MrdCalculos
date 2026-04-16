/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.FaseDoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeImportadaDoCalendarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Quantidade;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValorValeTransporte;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba;
import java.math.BigDecimal;
import java.util.ArrayList;

public class ValeTransporteProxy
implements Termo {
    private static final long serialVersionUID = -1397561859950846487L;

    private int obterDias(ParametroDoTermo parametro, Periodo periodo) {
        if (!parametro.getVerbaDeCalculo().isInformada() && TipoDeQuantidadeEnum.IMPORTADA_DO_CALENDARIO.equals((Object)parametro.getVerbaDeCalculo().getFormula(FormulaReflexo.class).getQuantidade().getTipo())) {
            Quantidade quantidade = parametro.getVerbaDeCalculo().getFormula(FormulaReflexo.class).getQuantidade();
            if (TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS.equals((Object)quantidade.getTipoImportadaCalendarioEnum())) {
                LogicoFuzzy<?> sabadoDiaUtil = parametro.getCalculo().getSabadoDiaUtilComExcecao();
                return periodo.totalDeDiasNaoUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
            }
            if (TipoDeQuantidadeImportadaDoCalendarioEnum.DIAS_UTEIS.equals((Object)quantidade.getTipoImportadaCalendarioEnum())) {
                LogicoFuzzy<?> sabadoDiaUtil = parametro.getCalculo().getSabadoDiaUtilComExcecao();
                return periodo.totalDeDiasUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
            }
            if (TipoDeQuantidadeImportadaDoCalendarioEnum.FERIADOS.equals((Object)quantidade.getTipoImportadaCalendarioEnum())) {
                return periodo.totalDeFeriados();
            }
            if (TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS_FERIADOS.equals((Object)quantidade.getTipoImportadaCalendarioEnum())) {
                LogicoFuzzy<?> sabadoDiaUtil = parametro.getCalculo().getSabadoDiaUtilComExcecao();
                return periodo.totalDeRepousosEFeriados(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
            }
            return 0;
        }
        return periodo.totalDeDias();
    }

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        FaseDoCalculoEnum fase = parametro.getFase();
        ArrayList<ValorValeTransporte> ocorrencias = new ArrayList<ValorValeTransporte>();
        if (Utils.naoNulo((Object)fase) && fase == FaseDoCalculoEnum.CALCULANDO_VALOR_DEVIDO) {
            for (ValeTransporteDaVerba valeTransporteDaVerba : parametro.getVerbaDeCalculo().getValesTransportesDoValorDevido()) {
                ocorrencias.addAll(valeTransporteDaVerba.getValeTransporte().obterValoresPorPeriodo(parametro.getPeriodo()));
            }
        } else {
            for (ValeTransporteDaVerba valeTransporteDaVerba : parametro.getVerbaDeCalculo().getValesTransportesDoValorPago()) {
                ocorrencias.addAll(valeTransporteDaVerba.getValeTransporte().obterValoresPorPeriodo(parametro.getPeriodo()));
            }
        }
        BigDecimal valorTotal = BigDecimal.ZERO;
        for (ValorValeTransporte valorValeTransporte : ocorrencias) {
            Periodo periodo = new Periodo(valorValeTransporte.getDataInicio(), valorValeTransporte.getDataTermino());
            if (parametro.getPeriodo().getInicial().compareTo(periodo.getInicial()) > 0) {
                periodo.setInicial(parametro.getPeriodo().getInicial());
            }
            if (Utils.nulo(periodo.getFinal()) || parametro.getPeriodo().getFinal().compareTo(periodo.getFinal()) < 0) {
                periodo.setFinal(parametro.getPeriodo().getFinal());
            }
            int dias = this.obterDias(parametro, periodo);
            valorTotal = Utils.somar(valorTotal, Utils.multiplicar(valorValeTransporte.getValor(), new BigDecimal(dias)));
        }
        if (valorTotal.compareTo(BigDecimal.ZERO) > 0) {
            int n = this.obterDias(parametro, parametro.getPeriodo());
            valorTotal = Utils.dividir(valorTotal, new BigDecimal(n));
        }
        return valorTotal;
    }

    public String toString() {
        return Utils.formatarNumero(this.resolverValor(null));
    }
}

