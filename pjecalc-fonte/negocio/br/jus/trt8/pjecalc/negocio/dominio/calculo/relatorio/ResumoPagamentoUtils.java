/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class ResumoPagamentoUtils {
    private static final String OBSERVACAO_BASE = "ALERTA: As seguintes parcelas, pagas \u00e0 maior, foram zeradas no resumo acima para que n\u00e3o haja compensa\u00e7\u00f5es indevidas entre credores diferentes: ";

    protected static BigDecimal calcularTotalDiferencaMultaInformadoResumo(MultaDaAtualizacao multaInformada, Date dataFinalPeriodo, BigDecimal taxaDeJuros) {
        BigDecimal indiceCorrecao = multaInformada.getIndiceDeCorrecao();
        BigDecimal totalDiferencaMulta = BigDecimal.ZERO;
        BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaInformada.getValorMulta(), indiceCorrecao), multaInformada.getPagoMulta()));
        totalDiferencaMulta = Utils.somar(totalDiferencaMulta, diferencaMulta, totalDiferencaMulta);
        BigDecimal devido = BigDecimal.ZERO;
        if (multaInformada.getMulta().getAplicarJurosSobreMulta().booleanValue()) {
            devido = Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), indiceCorrecao));
        }
        if (ResumoPagamentoUtils.podeCalcularJurosDeMulta(multaInformada.getMulta(), dataFinalPeriodo) && BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) <= 0) {
            BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro()));
            totalDiferencaMulta = Utils.somar(totalDiferencaMulta, diferencaJuro, totalDiferencaMulta);
            BigDecimal base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), indiceCorrecao)) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJuros.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual()));
            totalDiferencaMulta = Utils.somar(totalDiferencaMulta, diferencaJuroAtual, totalDiferencaMulta);
        }
        return totalDiferencaMulta;
    }

    protected static List<BigDecimal> calcularTotalDiferencaHonorarioInformadoResumo(HonorarioDaAtualizacao honorarioInformado, Date dataFinalPeriodo, BigDecimal taxaDeJuros) {
        BigDecimal indiceCorrecao = honorarioInformado.getIndiceDeCorrecao();
        BigDecimal totalDiferenca = BigDecimal.ZERO;
        BigDecimal totalIRPF = BigDecimal.ZERO;
        BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), indiceCorrecao), honorarioInformado.getPagoHonorario()));
        totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta, totalDiferenca);
        if (ResumoPagamentoUtils.podeCalcularJurosDeHonorario(honorarioInformado.getHonorario(), dataFinalPeriodo) && BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) <= 0) {
            BigDecimal devido = BigDecimal.ZERO;
            if (honorarioInformado.getHonorario().getAplicarJuros().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), indiceCorrecao));
            }
            BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioInformado.getPagoJuro()));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
            BigDecimal base = honorarioInformado.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), indiceCorrecao)) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJuros.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioInformado.getPagoJuroPeriodoAtual()));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
        }
        if (Utils.naoNulo(honorarioInformado.getValorImpostoRendaSaldo())) {
            totalIRPF = Utils.somar(totalIRPF, honorarioInformado.getValorImpostoRendaSaldo(), totalIRPF);
        }
        ArrayList<BigDecimal> totais = new ArrayList<BigDecimal>();
        totais.add(totalDiferenca);
        totais.add(totalIRPF);
        return totais;
    }

    private static boolean podeCalcularJurosDeMulta(Multa multa, Date dataFinalPeriodo) {
        Date dataRef = multa.getDataApartirDeAplicarJuros() != null ? multa.getDataApartirDeAplicarJuros() : (multa.getDataEvento() != null ? multa.getDataEvento() : multa.getDataVencimentoMulta());
        return multa.getAplicarJurosSobreMulta() != false && HelperDate.dateAfterOrEquals(dataFinalPeriodo, dataRef);
    }

    private static boolean podeCalcularJurosDeHonorario(Honorario honorario, Date dataFinalPeriodo) {
        Date dataRef = honorario.getDataApartirDeAplicarJuros() != null ? honorario.getDataApartirDeAplicarJuros() : (honorario.getDataEvento() != null ? honorario.getDataEvento() : honorario.getDataVencimento());
        return honorario.getAplicarJuros() != false && HelperDate.dateAfterOrEquals(dataFinalPeriodo, dataRef);
    }

    protected static StringBuilder montarObservacao(List<String> parcelasPagasAMaior) {
        StringBuilder observacaoPagamentosAMaior = new StringBuilder();
        int count = 1;
        int total = parcelasPagasAMaior.size();
        if (total > 0) {
            observacaoPagamentosAMaior.append(OBSERVACAO_BASE);
            for (String parcela : parcelasPagasAMaior) {
                observacaoPagamentosAMaior.append(parcela);
                if (count == total) {
                    observacaoPagamentosAMaior.append(".\n\n");
                } else if (count == total - 1) {
                    observacaoPagamentosAMaior.append(" e ");
                } else {
                    observacaoPagamentosAMaior.append(", ");
                }
                ++count;
            }
        }
        return observacaoPagamentosAMaior;
    }
}

