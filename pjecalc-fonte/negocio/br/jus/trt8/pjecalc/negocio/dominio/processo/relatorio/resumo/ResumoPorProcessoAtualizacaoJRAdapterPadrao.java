/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.resumo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.resumo.ResumoPorProcessoAtualizacaoJRAdapter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class ResumoPorProcessoAtualizacaoJRAdapterPadrao
extends ResumoPorProcessoAtualizacaoJRAdapter {
    private ResumoPorProcessoAtualizacaoJRAdapter.ItensResumoAppender appender = new ResumoPorProcessoAtualizacaoJRAdapter.ItensResumoAppender();
    private List<Calculo> calculos;
    private Map<String, String> nomesDosReclamantes;
    private Map<String, BigDecimal> brutoPorReclamante;
    private Map<String, BigDecimal> liquidoPorReclamante;
    private Map<String, BigDecimal> totalDevidoPeloReclamado;
    private Map<String, BigDecimal> debitosPorReclamante;

    public ResumoPorProcessoAtualizacaoJRAdapterPadrao(List<Calculo> calculos) {
        this.calculos = calculos;
        this.nomesDosReclamantes = new HashMap<String, String>();
        this.brutoPorReclamante = new HashMap<String, BigDecimal>();
        this.liquidoPorReclamante = new HashMap<String, BigDecimal>();
        this.totalDevidoPeloReclamado = new HashMap<String, BigDecimal>();
        this.debitosPorReclamante = new HashMap<String, BigDecimal>();
        this.popularReclamantes();
        this.popularItensResumoPorProcesso();
    }

    private void popularReclamantes() {
        for (Calculo calculo : this.calculos) {
            if (!this.nomesDosReclamantes.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) {
                this.nomesDosReclamantes.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), calculo.getProcesso().getReclamante().getNome());
            }
            if (!this.brutoPorReclamante.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) {
                this.brutoPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), BigDecimal.ZERO);
            }
            if (!this.liquidoPorReclamante.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) {
                this.liquidoPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), BigDecimal.ZERO);
            }
            if (!this.totalDevidoPeloReclamado.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) {
                this.totalDevidoPeloReclamado.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), BigDecimal.ZERO);
            }
            if (this.debitosPorReclamante.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) continue;
            this.debitosPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), BigDecimal.ZERO);
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public void popularItensResumoPorProcesso() {
        this.popularSecaoDebitoReclamado();
        this.popularSecaoDebitoCobrarReclamante();
        this.popularSecaoReclamantes();
    }

    private void popularSecaoDebitoCobrarReclamantePorCalculo(Calculo calculo, Map<String, BigDecimal> multas, Map<String, List<BigDecimal>> honorarios, Total totalCustasReclamante) {
        List<DebitosCobrarDoReclamante> ultimoDebitosCobrarReclamante = DebitosCobrarDoReclamante.obterUltimoRegistro(calculo.getAtualizacao());
        boolean existeDebitoCobrarReclamante = ultimoDebitosCobrarReclamante != null && !ultimoDebitosCobrarReclamante.isEmpty();
        Total debitosAcumulados = Total.newInstance(true);
        ArrayList<String> entradasInformadasJaProcessadas = new ArrayList<String>();
        if (existeDebitoCobrarReclamante) {
            this.processarMultasACobrarDoReclamante(calculo, multas, ultimoDebitosCobrarReclamante, debitosAcumulados, entradasInformadasJaProcessadas);
            this.processarHonorariosACobrarDoReclamante(honorarios, ultimoDebitosCobrarReclamante, debitosAcumulados, entradasInformadasJaProcessadas);
            if (Utils.naoNulo(ultimoDebitosCobrarReclamante.get(0).getDiferencaCustasJudiciais()) && PagamentoUtils.verificaSeExisteCustaACobrarDoReclamante(calculo).booleanValue()) {
                debitosAcumulados.acumular(ultimoDebitosCobrarReclamante.get(0).getDiferencaCustasJudiciais());
                totalCustasReclamante.acumular(ultimoDebitosCobrarReclamante.get(0).getDiferencaCustasJudiciais());
            }
        }
        this.debitosPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), debitosAcumulados.getValor());
    }

    /*
     * WARNING - void declaration
     */
    private void processarHonorariosACobrarDoReclamante(Map<String, List<BigDecimal>> honorarios, List<DebitosCobrarDoReclamante> ultimoDebitosCobrarReclamante, Total debitosAcumulados, List<String> entradasInformadasJaProcessadas) {
        HashMap mapaHonorariosCalculados = new HashMap();
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : ultimoDebitosCobrarReclamante.get(0).getHonorariosDaAtualizacaoCalculado()) {
            if (!mapaHonorariosCalculados.containsKey(honorarioDaAtualizacao.getHonorario().getNomeCredor())) {
                mapaHonorariosCalculados.put(honorarioDaAtualizacao.getHonorario().getNomeCredor(), new ArrayList());
            }
            ((List)mapaHonorariosCalculados.get(honorarioDaAtualizacao.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao);
        }
        HashMap mapaHonorariosInformados = new HashMap();
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : ultimoDebitosCobrarReclamante.get(0).getHonorariosDaAtualizacaoInformado()) {
            if (!mapaHonorariosInformados.containsKey(honorarioDaAtualizacao.getHonorario().getNomeCredor())) {
                mapaHonorariosInformados.put(honorarioDaAtualizacao.getHonorario().getNomeCredor(), new ArrayList());
            }
            ((List)mapaHonorariosInformados.get(honorarioDaAtualizacao.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao);
        }
        entradasInformadasJaProcessadas.clear();
        for (Map.Entry entry : mapaHonorariosCalculados.entrySet()) {
            void var7_17;
            Object valorImpostoRendaSaldo;
            BigDecimal bigDecimal = BigDecimal.ZERO;
            BigDecimal totalIRPF = BigDecimal.ZERO;
            for (HonorarioDaAtualizacao honorarioDaAtualizacao : (List)entry.getValue()) {
                void var7_11;
                Object object = valorImpostoRendaSaldo = honorarioDaAtualizacao.getValorImpostoRendaSaldo() != null ? honorarioDaAtualizacao.getValorImpostoRendaSaldo() : BigDecimal.ZERO;
                if (honorarioDaAtualizacao.getValorRemanescenteHonorario() == null || ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(honorarioDaAtualizacao.getHonorario().getDataEvento()) && ultimoDebitosCobrarReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(ultimoDebitosCobrarReclamante.get(0).getCalculo().getDataDeLiquidacao())) {
                    BigDecimal bigDecimal2 = Utils.somar((BigDecimal)var7_11, honorarioDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var7_11);
                    totalIRPF = Utils.somar(totalIRPF, (BigDecimal)valorImpostoRendaSaldo, totalIRPF);
                    continue;
                }
                BigDecimal bigDecimal4 = Utils.somar((BigDecimal)var7_11, honorarioDaAtualizacao.getDiferencaCalculadaRemanescente(honorarioDaAtualizacao.getIndiceDeCorrecao()), (BigDecimal)var7_11);
                bigDecimal4 = Utils.somar(bigDecimal4, ultimoDebitosCobrarReclamante.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM), honorarioDaAtualizacao.getPagoJuro()), bigDecimal4);
                totalIRPF = Utils.somar(totalIRPF, (BigDecimal)valorImpostoRendaSaldo, totalIRPF);
                boolean possuiMulta = !ultimoDebitosCobrarReclamante.get(0).getCreditosDoReclamante().getMultasCalculadas().isEmpty() || !ultimoDebitosCobrarReclamante.get(0).getCreditosDoReclamante().getMultasInformadas().isEmpty();
                BigDecimal bigDecimal5 = Utils.somar(bigDecimal4, possuiMulta ? Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.calcularHonorariosSobreMultas(ultimoDebitosCobrarReclamante.get(0).getCreditosDoReclamante()), honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), honorarioDaAtualizacao.getPagoSobreMultas()) : BigDecimal.ZERO, bigDecimal4);
            }
            for (Map.Entry entry2 : mapaHonorariosInformados.entrySet()) {
                if (!((String)entry.getKey()).equals(entry2.getKey())) continue;
                entradasInformadasJaProcessadas.add((String)entry2.getKey());
                valorImpostoRendaSaldo = ((List)entry2.getValue()).iterator();
                while (valorImpostoRendaSaldo.hasNext()) {
                    HonorarioDaAtualizacao honorarioInformado = (HonorarioDaAtualizacao)valorImpostoRendaSaldo.next();
                    BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao()), honorarioInformado.getPagoHonorario()));
                    BigDecimal bigDecimal6 = Utils.somar((BigDecimal)var7_17, diferencaMulta, (BigDecimal)var7_17);
                    BigDecimal valorImpostoRendaSaldo2 = honorarioInformado.getValorImpostoRendaSaldo();
                    totalIRPF = Utils.somar(totalIRPF, valorImpostoRendaSaldo2 != null ? valorImpostoRendaSaldo2 : BigDecimal.ZERO, totalIRPF);
                    BigDecimal bigDecimal7 = this.calcularTotalDiferencaHonorarioAtualizacao(ultimoDebitosCobrarReclamante, bigDecimal6, honorarioInformado);
                }
            }
            BigDecimal bigDecimal8 = Utils.zerarSeNegativo((BigDecimal)var7_17);
            BigDecimal totalLiquido = bigDecimal8.subtract(totalIRPF = Utils.zerarSeNegativo(totalIRPF), Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            ArrayList<BigDecimal> arrayList = new ArrayList<BigDecimal>();
            if (honorarios.containsKey(entry.getKey())) {
                BigDecimal valorAtualHonorario = honorarios.get(entry.getKey()).get(0);
                valorAtualHonorario = this.acumular(valorAtualHonorario, totalLiquido);
                BigDecimal valorAtualHonorarioIrpf = honorarios.get(entry.getKey()).get(1);
                valorAtualHonorarioIrpf = this.acumular(valorAtualHonorarioIrpf, totalIRPF);
                arrayList.add(valorAtualHonorario);
                arrayList.add(valorAtualHonorarioIrpf);
                honorarios.put((String)entry.getKey(), (List<BigDecimal>)arrayList);
            } else {
                arrayList.add(totalLiquido);
                arrayList.add(totalIRPF);
                honorarios.put((String)entry.getKey(), (List<BigDecimal>)arrayList);
            }
            debitosAcumulados.acumular((BigDecimal)arrayList.get(0));
            debitosAcumulados.acumular((BigDecimal)arrayList.get(1));
        }
        for (Map.Entry<String, List<HonorarioDaAtualizacao>> entry : mapaHonorariosInformados.entrySet()) {
            this.processarHonorariosDaAtualizacaoInformados(honorarios, ultimoDebitosCobrarReclamante, entradasInformadasJaProcessadas, entry, debitosAcumulados);
        }
    }

    /*
     * WARNING - void declaration
     */
    private void processarMultasACobrarDoReclamante(Calculo calculo, Map<String, BigDecimal> multas, List<DebitosCobrarDoReclamante> ultimoDebitosCobrarReclamante, Total debitosAcumulados, List<String> entradasInformadasJaProcessadas) {
        HashMap mapaMultasCalculadas = new HashMap();
        for (MultaDaAtualizacao multaDaAtualizacao : ultimoDebitosCobrarReclamante.get(0).getMultasCalculadas()) {
            if (!mapaMultasCalculadas.containsKey(multaDaAtualizacao.getMulta().getNomeTerceiro())) {
                mapaMultasCalculadas.put(multaDaAtualizacao.getMulta().getNomeTerceiro(), new ArrayList());
            }
            ((List)mapaMultasCalculadas.get(multaDaAtualizacao.getMulta().getNomeTerceiro())).add(multaDaAtualizacao);
        }
        HashMap mapaMultasInformadas = new HashMap();
        for (MultaDaAtualizacao multaDaAtualizacao : ultimoDebitosCobrarReclamante.get(0).getMultasInformadas()) {
            if (!mapaMultasInformadas.containsKey(multaDaAtualizacao.getMulta().getNomeTerceiro())) {
                mapaMultasInformadas.put(multaDaAtualizacao.getMulta().getNomeTerceiro(), new ArrayList());
            }
            ((List)mapaMultasInformadas.get(multaDaAtualizacao.getMulta().getNomeTerceiro())).add(multaDaAtualizacao);
        }
        for (Map.Entry<String, List<MultaDaAtualizacao>> entry : mapaMultasCalculadas.entrySet()) {
            void var8_17;
            BigDecimal bigDecimal = BigDecimal.ZERO;
            for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                void var8_12;
                if (multaDaAtualizacao.getValorRemanescenteMulta() == null || ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) && ultimoDebitosCobrarReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(calculo.getDataDeLiquidacao())) {
                    BigDecimal bigDecimal2 = Utils.somar((BigDecimal)var8_12, multaDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var8_12);
                    continue;
                }
                BigDecimal bigDecimal4 = Utils.somar((BigDecimal)var8_12, multaDaAtualizacao.getDiferencaCalculadaRemanescente(multaDaAtualizacao.getIndiceDeCorrecao()), (BigDecimal)var8_12);
                bigDecimal4 = Utils.somar(bigDecimal4, multaDaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : ultimoDebitosCobrarReclamante.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaDaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM), multaDaAtualizacao.getPagoJuro()), bigDecimal4);
            }
            for (Map.Entry entry2 : mapaMultasInformadas.entrySet()) {
                BigDecimal bigDecimal5 = this.calcularTotalDiferencaMultasInformadas(ultimoDebitosCobrarReclamante, (BigDecimal)var8_17, entradasInformadasJaProcessadas, entry, entry2);
            }
            BigDecimal bigDecimal6 = Utils.zerarSeNegativo((BigDecimal)var8_17);
            if (multas.containsKey(entry.getKey())) {
                BigDecimal valorAtualMulta = multas.get(entry.getKey());
                valorAtualMulta = this.acumular(valorAtualMulta, bigDecimal6);
                multas.put(entry.getKey(), valorAtualMulta);
                debitosAcumulados.acumular(bigDecimal6);
                continue;
            }
            multas.put(entry.getKey(), bigDecimal6);
            debitosAcumulados.acumular(bigDecimal6);
        }
        for (Map.Entry<String, List<MultaDaAtualizacao>> entry : mapaMultasInformadas.entrySet()) {
            this.processarMultasDaAtualizacaoInformadas(multas, ultimoDebitosCobrarReclamante, entradasInformadasJaProcessadas, entry, debitosAcumulados);
        }
    }

    private BigDecimal calcularTotalDiferencaHonorarioAtualizacao(List<DebitosCobrarDoReclamante> ultimoDebitosCobrarReclamante, BigDecimal totalDiferenca, HonorarioDaAtualizacao honorarioInformado) {
        if (!ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(honorarioInformado.getHonorario().getDataEvento()) && BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) <= 0) {
            BigDecimal devido = BigDecimal.ZERO;
            if (honorarioInformado.getHonorario().getAplicarJuros().booleanValue()) {
                devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao()));
            }
            BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioInformado.getPagoJuro()));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
            BigDecimal base = honorarioInformado.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal taxaJuros = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : ultimoDebitosCobrarReclamante.get(0).getTaxaDeJuros();
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaJuros.divide(Utils.CEM)));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioInformado.getPagoJuroPeriodoAtual()));
            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
        }
        return totalDiferenca;
    }

    private void popularSecaoDebitoCobrarReclamante() {
        HashMap<String, BigDecimal> multas = new HashMap<String, BigDecimal>();
        HashMap<String, List<BigDecimal>> honorarios = new HashMap<String, List<BigDecimal>>();
        Total totalCustasReclamante = Total.newInstance(true);
        for (Calculo calculo : this.calculos) {
            this.popularSecaoDebitoCobrarReclamantePorCalculo(calculo, multas, honorarios, totalCustasReclamante);
        }
        for (Map.Entry entry : multas.entrySet()) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, "Multas / Indeniza\u00e7\u00f5es devidas para " + (String)entry.getKey(), (BigDecimal)entry.getValue()));
        }
        for (Map.Entry entry : honorarios.entrySet()) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, "Honor\u00e1rios L\u00edquidos para " + (String)entry.getKey(), (BigDecimal)((List)entry.getValue()).get(0)));
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, "IRPF sobre Honor\u00e1rios para " + (String)entry.getKey(), (BigDecimal)((List)entry.getValue()).get(1)));
        }
        if (BigDecimal.ZERO.compareTo(totalCustasReclamante.getValor()) != 0) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, "Custas Judiciais devidas pelos Reclamantes", Utils.zerarSeNegativo(totalCustasReclamante.getValor())));
        }
    }

    private void processarMultasDaAtualizacaoInformadas(Map<String, BigDecimal> multas, List<DebitosCobrarDoReclamante> ultimoDebitosCobrarReclamante, List<String> entradasInformadasJaProcessadas, Map.Entry<String, List<MultaDaAtualizacao>> entryInformada, Total debitosAcumulados) {
        BigDecimal totalDiferencaMulta = BigDecimal.ZERO;
        if (!entradasInformadasJaProcessadas.contains(entryInformada.getKey())) {
            for (MultaDaAtualizacao multaInformada : entryInformada.getValue()) {
                BigDecimal devido;
                BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()), multaInformada.getPagoMulta()));
                totalDiferencaMulta = Utils.somar(totalDiferencaMulta, diferencaMulta, totalDiferencaMulta);
                BigDecimal bigDecimal = devido = multaInformada.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                if (ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(multaInformada.getMulta().getDataEvento()) || BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0) continue;
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro()));
                totalDiferencaMulta = Utils.somar(totalDiferencaMulta, diferencaJuro, totalDiferencaMulta);
                BigDecimal base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                BigDecimal taxaJuros = multaInformada.getTaxaJurosMulta() != null ? multaInformada.getTaxaJurosMulta() : ultimoDebitosCobrarReclamante.get(0).getTaxaDeJuros();
                BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaJuros.divide(Utils.CEM)));
                BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual()));
                totalDiferencaMulta = Utils.somar(totalDiferencaMulta, diferencaJuroAtual, totalDiferencaMulta);
            }
            totalDiferencaMulta = Utils.zerarSeNegativo(totalDiferencaMulta);
            if (multas.containsKey(entryInformada.getKey())) {
                BigDecimal valorAtualMulta = multas.get(entryInformada.getKey());
                valorAtualMulta = this.acumular(valorAtualMulta, totalDiferencaMulta);
                multas.put(entryInformada.getKey(), valorAtualMulta);
                debitosAcumulados.acumular(valorAtualMulta);
            } else {
                multas.put(entryInformada.getKey(), totalDiferencaMulta);
                debitosAcumulados.acumular(totalDiferencaMulta);
            }
        }
    }

    private BigDecimal calcularTotalDiferencaMultasInformadas(List<DebitosCobrarDoReclamante> ultimoDebitosCobrarReclamante, BigDecimal totalDiferencaMulta, List<String> entradasInformadasJaProcessadas, Map.Entry<String, List<MultaDaAtualizacao>> entryCalculada, Map.Entry<String, List<MultaDaAtualizacao>> entryInformada) {
        if (entryCalculada.getKey().equals(entryInformada.getKey())) {
            entradasInformadasJaProcessadas.add(entryInformada.getKey());
            for (MultaDaAtualizacao multaInformada : entryInformada.getValue()) {
                BigDecimal devido;
                BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao()), multaInformada.getPagoMulta()));
                totalDiferencaMulta = Utils.somar(totalDiferencaMulta, diferencaMulta, totalDiferencaMulta);
                BigDecimal bigDecimal = devido = multaInformada.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorJuros(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                if (ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(multaInformada.getMulta().getDataEvento()) || BigDecimal.ZERO.compareTo(multaInformada.getValorMulta()) > 0) continue;
                BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, multaInformada.getPagoJuro()));
                totalDiferencaMulta = Utils.somar(totalDiferencaMulta, diferencaJuro, totalDiferencaMulta);
                BigDecimal base = multaInformada.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaInformada.getValorMulta(), multaInformada.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                BigDecimal taxaJuros = multaInformada.getTaxaJurosMulta() != null ? multaInformada.getTaxaJurosMulta() : ultimoDebitosCobrarReclamante.get(0).getTaxaDeJuros();
                BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaJuros.divide(Utils.CEM)));
                BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, multaInformada.getPagoJuroPeriodoAtual()));
                totalDiferencaMulta = Utils.somar(totalDiferencaMulta, diferencaJuroAtual, totalDiferencaMulta);
            }
        }
        return totalDiferencaMulta;
    }

    private void processarHonorariosDaAtualizacaoInformados(Map<String, List<BigDecimal>> honorarios, List<DebitosCobrarDoReclamante> ultimoDebitosCobrarReclamante, List<String> entradasInformadasJaProcessadas, Map.Entry<String, List<HonorarioDaAtualizacao>> entryInformado, Total debitosAcumulados) {
        BigDecimal totalDiferenca = BigDecimal.ZERO;
        BigDecimal totalIRPF = BigDecimal.ZERO;
        if (!entradasInformadasJaProcessadas.contains(entryInformado.getKey())) {
            for (HonorarioDaAtualizacao honorarioInformado : entryInformado.getValue()) {
                BigDecimal diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao()), honorarioInformado.getPagoHonorario()));
                totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta, totalDiferenca);
                totalDiferenca = this.calcularTotalDiferencaHonorarioAtualizacao(ultimoDebitosCobrarReclamante, totalDiferenca, honorarioInformado);
                if (!Utils.naoNulo(honorarioInformado.getValorImpostoRendaSaldo())) continue;
                totalIRPF = Utils.somar(totalIRPF, honorarioInformado.getValorImpostoRendaSaldo(), totalIRPF);
            }
            BigDecimal totalLiquido = (totalDiferenca = Utils.zerarSeNegativo(totalDiferenca)).subtract(totalIRPF = Utils.zerarSeNegativo(totalIRPF), Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            ArrayList<BigDecimal> lista = new ArrayList<BigDecimal>();
            if (honorarios.containsKey(entryInformado.getKey())) {
                BigDecimal valorAtualHonorario = honorarios.get(entryInformado.getKey()).get(0);
                valorAtualHonorario = this.acumular(valorAtualHonorario, totalLiquido);
                BigDecimal valorAtualHonorarioIrpf = honorarios.get(entryInformado.getKey()).get(1);
                valorAtualHonorarioIrpf = this.acumular(valorAtualHonorarioIrpf, totalIRPF);
                lista.add(valorAtualHonorario);
                lista.add(valorAtualHonorarioIrpf);
                honorarios.put(entryInformado.getKey(), lista);
            } else {
                lista.add(totalLiquido);
                lista.add(totalIRPF);
                honorarios.put(entryInformado.getKey(), lista);
            }
            debitosAcumulados.acumular((BigDecimal)lista.get(0));
            debitosAcumulados.acumular((BigDecimal)lista.get(1));
        }
    }

    /*
     * WARNING - void declaration
     */
    private void popularSecaoDebitoReclamado() {
        HashMap multas = new HashMap();
        HashMap honorarios = new HashMap();
        BigDecimal totalLiquidoDevidoAoReclamante = BigDecimal.ZERO;
        BigDecimal totalDepositoFgts = BigDecimal.ZERO;
        BigDecimal totalContribuicaoSalariosDevidos = BigDecimal.ZERO;
        BigDecimal totalContribuicaoSalariosPagos = BigDecimal.ZERO;
        BigDecimal totalPrevidencia = BigDecimal.ZERO;
        BigDecimal totalPensao = BigDecimal.ZERO;
        BigDecimal totalIrpfReclamado = BigDecimal.ZERO;
        BigDecimal totalIrpfReclamante = BigDecimal.ZERO;
        BigDecimal totalContribuicaoMeio = BigDecimal.ZERO;
        BigDecimal totalCustasReclamante = BigDecimal.ZERO;
        BigDecimal totalContribuicaoDez = BigDecimal.ZERO;
        BigDecimal totalCustasReclamado = BigDecimal.ZERO;
        Boolean imprimeDepositoFGTS = Boolean.FALSE;
        Boolean imprimeContribuicaoSocialDevidos = Boolean.FALSE;
        Boolean imprimeContribuicaoSocialPagos = Boolean.FALSE;
        Boolean imprimePrevidenciaPrivada = Boolean.FALSE;
        Boolean imprimePensaoAlimenticia = Boolean.FALSE;
        Boolean imprimeIrpfReclamado = Boolean.FALSE;
        Boolean imprimeIrpfReclamante = Boolean.FALSE;
        Boolean imprimeContribuicaoSocialDezPorcento = Boolean.FALSE;
        Boolean imprimeContribuicaoSocialMeioPorcento = Boolean.FALSE;
        Boolean imprimeCustasReclamado = Boolean.FALSE;
        Boolean imprimeCustasReclamante = Boolean.FALSE;
        BigDecimal totalDebitoPorCalculo = BigDecimal.ZERO;
        for (Calculo calculo : this.calculos) {
            ArrayList<Object> lista;
            BigDecimal diferencaJuroAtual;
            BigDecimal dev;
            BigDecimal taxaJuros;
            BigDecimal base;
            BigDecimal diferencaJuro;
            BigDecimal devido;
            BigDecimal diferencaMulta;
            Object valorAtualHonorarioIrpf;
            Object totalLiquido;
            BigDecimal totalDiferenca;
            Object honorarioDaAtualizacao2;
            Object valorAtualMulta;
            PensaoAlimenticia pensaoAlimenticia;
            totalDebitoPorCalculo = BigDecimal.ZERO;
            List<CreditosDoReclamante> ultimoCreditosDoReclamante = CreditosDoReclamante.obterUltimoRegistro(calculo.getAtualizacao());
            List<DebitosDoReclamante> ultimoDebitosDoReclamante = DebitosDoReclamante.obterUltimoRegistro(calculo.getAtualizacao());
            List<OutrosDebitosReclamado> ultimoOutrosDebitosReclamado = OutrosDebitosReclamado.obterUltimoRegistro(calculo.getAtualizacao());
            BigDecimal totalDiferencaUltimoDebitos = ultimoDebitosDoReclamante.get(0).calcularTotalDiferenca(Boolean.TRUE);
            totalLiquidoDevidoAoReclamante = Utils.somar(totalLiquidoDevidoAoReclamante, Utils.subtrair(ultimoCreditosDoReclamante.get(0).getTotalDiferenca(), totalDiferencaUltimoDebitos));
            totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.subtrair(ultimoCreditosDoReclamante.get(0).getTotalDiferenca(), totalDiferencaUltimoDebitos));
            if (DestinoDoFgtsEnum.DEPOSITAR.equals((Object)calculo.getFgts().getDestinoDoFgts()) && Utils.naoNulo(ultimoDebitosDoReclamante.get(0).getValorFgts())) {
                imprimeDepositoFGTS = Boolean.TRUE;
                BigDecimal valorDeposito = BigDecimal.ZERO.compareTo(ultimoDebitosDoReclamante.get(0).getDiferencaFgts()) > 0 ? BigDecimal.ZERO : Utils.somar(Utils.somar(ultimoDebitosDoReclamante.get(0).getDiferencaJuroDeMoraFgts(), ultimoDebitosDoReclamante.get(0).getDiferencaJuroDeMoraFgtsPeriodoAtual()), ultimoDebitosDoReclamante.get(0).getDiferencaFgts());
                totalDepositoFgts = Utils.somar(totalDepositoFgts, valorDeposito);
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, valorDeposito);
            }
            if (ultimoOutrosDebitosReclamado.get(0).getDevidoContribuicaoSocialSalariosDevidos() != null && PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosDevidos(calculo).booleanValue()) {
                imprimeContribuicaoSocialDevidos = Boolean.TRUE;
                BigDecimal valorContribuicaoDevidos = Utils.zerarSeNegativo(Utils.somar(ultimoOutrosDebitosReclamado.get(0).getDiferencaContribuicaoSocialSalariosDevidos(), Utils.zerarSeNegativo(ultimoDebitosDoReclamante.get(0).getDescontoInssCorrigido())));
                totalContribuicaoSalariosDevidos = Utils.somar(totalContribuicaoSalariosDevidos, valorContribuicaoDevidos);
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, valorContribuicaoDevidos);
            }
            if (ultimoOutrosDebitosReclamado.get(0).getDevidoContribuicaoSocialSalariosPagos() != null && PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosPagos(calculo).booleanValue()) {
                imprimeContribuicaoSocialPagos = Boolean.TRUE;
                BigDecimal valorContribuicaoPagos = Utils.zerarSeNegativo(ultimoOutrosDebitosReclamado.get(0).getDiferencaContribuicaoSocialSalariosPagos());
                totalContribuicaoSalariosPagos = Utils.somar(totalContribuicaoSalariosPagos, valorContribuicaoPagos);
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, valorContribuicaoPagos);
            }
            if (calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue() && (PagamentoUtils.verificaSeExistePrevidenciaPrivada(calculo).booleanValue() || PagamentoUtils.verificaSeExisteJurosDePrevidenciaPrivada(calculo).booleanValue())) {
                imprimePrevidenciaPrivada = Boolean.TRUE;
                BigDecimal valorPrevidencia = Utils.somar(BigDecimal.ZERO, ultimoDebitosDoReclamante.get(0).getDiferencaPrevidenciaPrivada(), BigDecimal.ZERO);
                BigDecimal valorJurosPrevidencia = Utils.somar(BigDecimal.ZERO, ultimoOutrosDebitosReclamado.get(0).getDiferencaJurosDePrevidenciaPrivada(), BigDecimal.ZERO);
                valorJurosPrevidencia = Utils.somar(valorJurosPrevidencia, ultimoOutrosDebitosReclamado.get(0).getDiferencaJurosDePrevidenciaPrivadaPeriodoAtual(), valorJurosPrevidencia);
                BigDecimal previdenciaPrivada = Utils.somar(Utils.zerarSeNegativo(valorPrevidencia), Utils.zerarSeNegativo(valorJurosPrevidencia));
                totalPrevidencia = Utils.somar(totalPrevidencia, previdenciaPrivada);
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, previdenciaPrivada);
            }
            if (Utils.nulo(pensaoAlimenticia = calculo.getPensaoAlimenticiaDoPagamento())) {
                pensaoAlimenticia = calculo.getPensaoAlimenticiaDoCalculo();
            }
            if (pensaoAlimenticia != null && pensaoAlimenticia.getApurarPensaoAlimenticia().booleanValue() && ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao() != null) {
                imprimePensaoAlimenticia = Boolean.TRUE;
                if (ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getValorRemanescente() == null || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getDataEvento()) && ultimoDebitosDoReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(calculo.getDataDeLiquidacao())) {
                    BigDecimal valorPensaoAlimenticia = ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getDiferencaPensaoDevido();
                    totalPensao = Utils.somar(totalPensao, Utils.zerarSeNegativo(valorPensaoAlimenticia));
                    totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo(valorPensaoAlimenticia));
                } else {
                    BigDecimal valorPensao = ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getDiferencaCalculadaRemanescente(ultimoDebitosDoReclamante.get(0).getIndiceDeCorrecao());
                    valorPensao = Utils.somar(valorPensao, this.encontrarJurosPensao(ultimoDebitosDoReclamante.get(0)), valorPensao);
                    totalPensao = Utils.somar(totalPensao, Utils.zerarSeNegativo(valorPensao));
                    totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo(valorPensao));
                }
            }
            HashMap mapaMultasCalculadas = new HashMap();
            for (MultaDaAtualizacao multaDaAtualizacao : ultimoOutrosDebitosReclamado.get(0).getMultasCalculadas()) {
                if (!mapaMultasCalculadas.containsKey(multaDaAtualizacao.getMulta().getNomeTerceiro())) {
                    mapaMultasCalculadas.put(multaDaAtualizacao.getMulta().getNomeTerceiro(), new ArrayList());
                }
                ((List)mapaMultasCalculadas.get(multaDaAtualizacao.getMulta().getNomeTerceiro())).add(multaDaAtualizacao);
            }
            HashMap mapaMultasInformadas = new HashMap();
            for (MultaDaAtualizacao multaDaAtualizacao3 : ultimoOutrosDebitosReclamado.get(0).getMultasInformadas()) {
                if (!mapaMultasInformadas.containsKey(multaDaAtualizacao3.getMulta().getNomeTerceiro())) {
                    mapaMultasInformadas.put(multaDaAtualizacao3.getMulta().getNomeTerceiro(), new ArrayList());
                }
                ((List)mapaMultasInformadas.get(multaDaAtualizacao3.getMulta().getNomeTerceiro())).add(multaDaAtualizacao3);
            }
            ArrayList entradasInformadasJaProcessadas = new ArrayList();
            for (Map.Entry entry : mapaMultasCalculadas.entrySet()) {
                void var36_51;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                    void var36_46;
                    if (multaDaAtualizacao.getValorRemanescenteMulta() == null || ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) && ultimoOutrosDebitosReclamado.get(0).getDataInicialPeriodo().equals(ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo()) || ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(calculo.getDataDeLiquidacao())) {
                        BigDecimal bigDecimal2 = Utils.somar((BigDecimal)var36_46, multaDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var36_46);
                        continue;
                    }
                    BigDecimal bigDecimal4 = Utils.somar((BigDecimal)var36_46, multaDaAtualizacao.getDiferencaCalculadaRemanescente(multaDaAtualizacao.getIndiceDeCorrecao()), (BigDecimal)var36_46);
                    bigDecimal4 = Utils.somar(bigDecimal4, multaDaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : ultimoOutrosDebitosReclamado.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaDaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM), multaDaAtualizacao.getPagoJuro()), bigDecimal4);
                }
                for (Map.Entry entry2 : mapaMultasInformadas.entrySet()) {
                    if (!((String)entry.getKey()).equals(entry2.getKey())) continue;
                    entradasInformadasJaProcessadas.add(entry2.getKey());
                    for (MultaDaAtualizacao multaDaAtualizacao : (List)entry2.getValue()) {
                        BigDecimal bigDecimal5;
                        BigDecimal diferencaMulta4 = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao()), multaDaAtualizacao.getPagoMulta()));
                        BigDecimal bigDecimal6 = Utils.somar((BigDecimal)var36_51, diferencaMulta4, (BigDecimal)var36_51);
                        BigDecimal bigDecimal7 = bigDecimal5 = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorJuros(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        if (ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) || BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) > 0) continue;
                        BigDecimal diferencaJuro4 = Utils.arredondarValorMonetario(Utils.subtrair(bigDecimal5, multaDaAtualizacao.getPagoJuro()));
                        BigDecimal bigDecimal8 = Utils.somar(bigDecimal6, diferencaJuro4, bigDecimal6);
                        BigDecimal base4 = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        BigDecimal taxaJuros4 = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoOutrosDebitosReclamado.get(0).getTaxaDeJuros();
                        BigDecimal dev4 = Utils.arredondarValorMonetario(Utils.multiplicar(base4, taxaJuros4.divide(Utils.CEM)));
                        BigDecimal diferencaJuroAtual4 = Utils.arredondarValorMonetario(Utils.subtrair(dev4, multaDaAtualizacao.getPagoJuroPeriodoAtual()));
                        BigDecimal bigDecimal9 = Utils.somar(bigDecimal8, diferencaJuroAtual4, bigDecimal8);
                    }
                }
                if (multas.containsKey(entry.getKey())) {
                    valorAtualMulta = (BigDecimal)multas.get(entry.getKey());
                    valorAtualMulta = this.acumular((BigDecimal)valorAtualMulta, Utils.zerarSeNegativo((BigDecimal)var36_51));
                    multas.put(entry.getKey(), valorAtualMulta);
                } else {
                    multas.put(entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var36_51));
                }
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo((BigDecimal)var36_51), totalDebitoPorCalculo);
            }
            for (Map.Entry entry : mapaMultasInformadas.entrySet()) {
                void var36_58;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
                for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                    BigDecimal bigDecimal10;
                    BigDecimal diferencaMulta3 = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao()), multaDaAtualizacao.getPagoMulta()));
                    BigDecimal bigDecimal11 = Utils.somar((BigDecimal)var36_58, diferencaMulta3, (BigDecimal)var36_58);
                    BigDecimal bigDecimal12 = bigDecimal10 = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorJuros(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                    if (ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) || BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) > 0) continue;
                    BigDecimal diferencaJuro3 = Utils.arredondarValorMonetario(Utils.subtrair(bigDecimal10, multaDaAtualizacao.getPagoJuro()));
                    BigDecimal bigDecimal13 = Utils.somar(bigDecimal11, diferencaJuro3, bigDecimal11);
                    BigDecimal bigDecimal14 = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                    BigDecimal taxaJuros3 = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoOutrosDebitosReclamado.get(0).getTaxaDeJuros();
                    BigDecimal dev3 = Utils.arredondarValorMonetario(Utils.multiplicar(bigDecimal14, taxaJuros3.divide(Utils.CEM)));
                    BigDecimal diferencaJuroAtual3 = Utils.arredondarValorMonetario(Utils.subtrair(dev3, multaDaAtualizacao.getPagoJuroPeriodoAtual()));
                    BigDecimal bigDecimal15 = Utils.somar(bigDecimal13, diferencaJuroAtual3, bigDecimal13);
                }
                if (multas.containsKey(entry.getKey())) {
                    valorAtualMulta = (BigDecimal)multas.get(entry.getKey());
                    valorAtualMulta = this.acumular((BigDecimal)valorAtualMulta, Utils.zerarSeNegativo((BigDecimal)var36_58));
                    multas.put(entry.getKey(), valorAtualMulta);
                } else {
                    multas.put(entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var36_58));
                }
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo((BigDecimal)var36_58), totalDebitoPorCalculo);
            }
            mapaMultasCalculadas.clear();
            for (MultaDaAtualizacao multaDaAtualizacao : ultimoDebitosDoReclamante.get(0).getMultasCalculadas()) {
                if (!mapaMultasCalculadas.containsKey(multaDaAtualizacao.getMulta().getNomeTerceiro())) {
                    mapaMultasCalculadas.put(multaDaAtualizacao.getMulta().getNomeTerceiro(), new ArrayList());
                }
                ((List)mapaMultasCalculadas.get(multaDaAtualizacao.getMulta().getNomeTerceiro())).add(multaDaAtualizacao);
            }
            mapaMultasInformadas.clear();
            for (MultaDaAtualizacao multaDaAtualizacao : ultimoDebitosDoReclamante.get(0).getMultasInformadas()) {
                if (!mapaMultasInformadas.containsKey(multaDaAtualizacao.getMulta().getNomeTerceiro())) {
                    mapaMultasInformadas.put(multaDaAtualizacao.getMulta().getNomeTerceiro(), new ArrayList());
                }
                ((List)mapaMultasInformadas.get(multaDaAtualizacao.getMulta().getNomeTerceiro())).add(multaDaAtualizacao);
            }
            entradasInformadasJaProcessadas.clear();
            for (Map.Entry entry : mapaMultasCalculadas.entrySet()) {
                void var36_70;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                    void var36_65;
                    if (multaDaAtualizacao.getValorRemanescenteMulta() == null || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) && ultimoDebitosDoReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(calculo.getDataDeLiquidacao())) {
                        BigDecimal bigDecimal16 = Utils.somar((BigDecimal)var36_65, multaDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var36_65);
                        continue;
                    }
                    BigDecimal bigDecimal18 = Utils.somar((BigDecimal)var36_65, multaDaAtualizacao.getDiferencaCalculadaRemanescente(multaDaAtualizacao.getIndiceDeCorrecao()), (BigDecimal)var36_65);
                    bigDecimal18 = Utils.somar(bigDecimal18, multaDaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : ultimoDebitosDoReclamante.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaDaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM), multaDaAtualizacao.getPagoJuro()), bigDecimal18);
                }
                for (Map.Entry entry3 : mapaMultasInformadas.entrySet()) {
                    if (!((String)entry.getKey()).equals(entry3.getKey())) continue;
                    entradasInformadasJaProcessadas.add(entry3.getKey());
                    for (MultaDaAtualizacao multaDaAtualizacao : (List)entry3.getValue()) {
                        BigDecimal bigDecimal19;
                        BigDecimal diferencaMulta2 = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao()), multaDaAtualizacao.getPagoMulta()));
                        BigDecimal bigDecimal20 = Utils.somar((BigDecimal)var36_70, diferencaMulta2, (BigDecimal)var36_70);
                        BigDecimal bigDecimal21 = bigDecimal19 = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorJuros(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        if (ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) || BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) > 0) continue;
                        BigDecimal diferencaJuro2 = Utils.arredondarValorMonetario(Utils.subtrair(bigDecimal19, multaDaAtualizacao.getPagoJuro()));
                        BigDecimal bigDecimal22 = Utils.somar(bigDecimal20, diferencaJuro2, bigDecimal20);
                        BigDecimal base2 = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        BigDecimal taxaJuros2 = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoDebitosDoReclamante.get(0).getTaxaDeJuros();
                        BigDecimal dev2 = Utils.arredondarValorMonetario(Utils.multiplicar(base2, taxaJuros2.divide(Utils.CEM)));
                        BigDecimal diferencaJuroAtual2 = Utils.arredondarValorMonetario(Utils.subtrair(dev2, multaDaAtualizacao.getPagoJuroPeriodoAtual()));
                        BigDecimal bigDecimal23 = Utils.somar(bigDecimal22, diferencaJuroAtual2, bigDecimal22);
                    }
                }
                if (multas.containsKey(entry.getKey())) {
                    valorAtualMulta = (BigDecimal)multas.get(entry.getKey());
                    valorAtualMulta = this.acumular((BigDecimal)valorAtualMulta, Utils.zerarSeNegativo((BigDecimal)var36_70));
                    multas.put(entry.getKey(), valorAtualMulta);
                } else {
                    multas.put(entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var36_70));
                }
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo((BigDecimal)var36_70), totalDebitoPorCalculo);
            }
            for (Map.Entry entry : mapaMultasInformadas.entrySet()) {
                void var36_76;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
                for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                    BigDecimal bigDecimal24;
                    Iterator<Object> diferencaMulta3 = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao()), multaDaAtualizacao.getPagoMulta()));
                    BigDecimal bigDecimal25 = Utils.somar((BigDecimal)var36_76, (BigDecimal)((Object)diferencaMulta3), (BigDecimal)var36_76);
                    BigDecimal bigDecimal26 = bigDecimal24 = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorJuros(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                    if (ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) || BigDecimal.ZERO.compareTo(multaDaAtualizacao.getValorMulta()) > 0) continue;
                    BigDecimal diferencaJuro3 = Utils.arredondarValorMonetario(Utils.subtrair(bigDecimal24, multaDaAtualizacao.getPagoJuro()));
                    BigDecimal bigDecimal27 = Utils.somar(bigDecimal25, diferencaJuro3, bigDecimal25);
                    BigDecimal bigDecimal28 = multaDaAtualizacao.getMulta().getAplicarJurosSobreMulta() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(multaDaAtualizacao.getValorMulta(), multaDaAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                    BigDecimal taxaJuros3 = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoDebitosDoReclamante.get(0).getTaxaDeJuros();
                    BigDecimal dev3 = Utils.arredondarValorMonetario(Utils.multiplicar(bigDecimal28, taxaJuros3.divide(Utils.CEM)));
                    BigDecimal diferencaJuroAtual3 = Utils.arredondarValorMonetario(Utils.subtrair(dev3, multaDaAtualizacao.getPagoJuroPeriodoAtual()));
                    BigDecimal bigDecimal29 = Utils.somar(bigDecimal27, diferencaJuroAtual3, bigDecimal27);
                }
                if (multas.containsKey(entry.getKey())) {
                    valorAtualMulta = (BigDecimal)multas.get(entry.getKey());
                    valorAtualMulta = this.acumular((BigDecimal)valorAtualMulta, Utils.zerarSeNegativo((BigDecimal)var36_76));
                    multas.put(entry.getKey(), valorAtualMulta);
                } else {
                    multas.put(entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var36_76));
                }
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo((BigDecimal)var36_76), totalDebitoPorCalculo);
            }
            HashMap mapaHonorariosCalculados = new HashMap();
            for (Object honorarioDaAtualizacao2 : ultimoOutrosDebitosReclamado.get(0).getHonorariosDaAtualizacaoCalculado()) {
                if (!mapaHonorariosCalculados.containsKey(((HonorarioDaAtualizacao)honorarioDaAtualizacao2).getHonorario().getNomeCredor())) {
                    mapaHonorariosCalculados.put(((HonorarioDaAtualizacao)honorarioDaAtualizacao2).getHonorario().getNomeCredor(), new ArrayList());
                }
                ((List)mapaHonorariosCalculados.get(((HonorarioDaAtualizacao)honorarioDaAtualizacao2).getHonorario().getNomeCredor())).add(honorarioDaAtualizacao2);
            }
            HashMap hashMap = new HashMap();
            honorarioDaAtualizacao2 = ultimoOutrosDebitosReclamado.get(0).getHonorariosDaAtualizacaoInformado().iterator();
            while (honorarioDaAtualizacao2.hasNext()) {
                HonorarioDaAtualizacao honorarioDaAtualizacao3 = (HonorarioDaAtualizacao)honorarioDaAtualizacao2.next();
                if (!hashMap.containsKey(honorarioDaAtualizacao3.getHonorario().getNomeCredor())) {
                    hashMap.put(honorarioDaAtualizacao3.getHonorario().getNomeCredor(), new ArrayList());
                }
                ((List)hashMap.get(honorarioDaAtualizacao3.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao3);
            }
            entradasInformadasJaProcessadas.clear();
            for (Map.Entry entry : mapaHonorariosCalculados.entrySet()) {
                void var41_110;
                totalDiferenca = BigDecimal.ZERO;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                for (HonorarioDaAtualizacao honorarioDaAtualizacao4 : (List)entry.getValue()) {
                    void var41_107;
                    if (honorarioDaAtualizacao4.getValorRemanescenteHonorario() == null || ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(honorarioDaAtualizacao4.getHonorario().getDataEvento()) && ultimoOutrosDebitosReclamado.get(0).getDataInicialPeriodo().equals(ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo()) || ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(ultimoOutrosDebitosReclamado.get(0).getCalculo().getDataDeLiquidacao())) {
                        totalDiferenca = Utils.somar(totalDiferenca, honorarioDaAtualizacao4.getDiferencaCalculadaOutros(), totalDiferenca);
                        if (!Utils.naoNulo(honorarioDaAtualizacao4.getValorImpostoRendaSaldo())) continue;
                        BigDecimal bigDecimal30 = Utils.somar((BigDecimal)var41_107, honorarioDaAtualizacao4.getValorImpostoRendaSaldo(), (BigDecimal)var41_107);
                        continue;
                    }
                    totalDiferenca = Utils.somar(totalDiferenca, honorarioDaAtualizacao4.getDiferencaCalculadaRemanescente(honorarioDaAtualizacao4.getIndiceDeCorrecao()), totalDiferenca);
                    totalDiferenca = Utils.somar(totalDiferenca, ultimoOutrosDebitosReclamado.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao4.getHonorario().getAliquota().divide(Utils.CEM), honorarioDaAtualizacao4.getPagoJuro()), totalDiferenca);
                    if (Utils.naoNulo(honorarioDaAtualizacao4.getValorImpostoRendaSaldo())) {
                        BigDecimal bigDecimal31 = Utils.somar((BigDecimal)var41_107, honorarioDaAtualizacao4.getValorImpostoRendaSaldo(), (BigDecimal)var41_107);
                    }
                    if (ultimoOutrosDebitosReclamado.get(0).getCreditosDoReclamante().getMultasCalculadas().isEmpty() && ultimoOutrosDebitosReclamado.get(0).getCreditosDoReclamante().getMultasInformadas().isEmpty()) continue;
                    totalDiferenca = Utils.somar(totalDiferenca, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao4.calcularHonorariosSobreMultas(ultimoOutrosDebitosReclamado.get(0).getCreditosDoReclamante()), honorarioDaAtualizacao4.getHonorario().getAliquota().divide(Utils.CEM))), honorarioDaAtualizacao4.getPagoSobreMultas()), totalDiferenca);
                }
                for (Map.Entry entry4 : hashMap.entrySet()) {
                    if (!((String)entry.getKey()).equals(entry4.getKey())) continue;
                    entradasInformadasJaProcessadas.add(entry4.getKey());
                    for (HonorarioDaAtualizacao honorarioInformado : (List)entry4.getValue()) {
                        BigDecimal diferencaMulta2 = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao()), honorarioInformado.getPagoHonorario()));
                        totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta2, totalDiferenca);
                        if (!ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(honorarioInformado.getHonorario().getDataEvento()) && BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) <= 0) {
                            BigDecimal devido2 = honorarioInformado.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                            BigDecimal diferencaJuro2 = Utils.arredondarValorMonetario(Utils.subtrair(devido2, honorarioInformado.getPagoJuro()));
                            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro2, totalDiferenca);
                            BigDecimal base2 = honorarioInformado.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                            BigDecimal taxaJuros2 = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : ultimoOutrosDebitosReclamado.get(0).getTaxaDeJuros();
                            BigDecimal dev2 = Utils.arredondarValorMonetario(Utils.multiplicar(base2, taxaJuros2.divide(Utils.CEM)));
                            BigDecimal diferencaJuroAtual2 = Utils.arredondarValorMonetario(Utils.subtrair(dev2, honorarioInformado.getPagoJuroPeriodoAtual()));
                            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual2, totalDiferenca);
                        }
                        if (!Utils.naoNulo(honorarioInformado.getValorImpostoRendaSaldo())) continue;
                        BigDecimal bigDecimal32 = Utils.somar((BigDecimal)var41_110, honorarioInformado.getValorImpostoRendaSaldo(), (BigDecimal)var41_110);
                    }
                }
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo(totalDiferenca), totalDebitoPorCalculo);
                totalLiquido = totalDiferenca.subtract((BigDecimal)var41_110, Utils.CONTEXTO_MATEMATICO);
                if (BigDecimal.ZERO.compareTo((BigDecimal)totalLiquido) > 0) {
                    totalLiquido = BigDecimal.ZERO;
                }
                if (honorarios.containsKey(entry.getKey())) {
                    BigDecimal bigDecimal34 = (BigDecimal)((List)honorarios.get(entry.getKey())).get(0);
                    bigDecimal34 = this.acumular(bigDecimal34, Utils.zerarSeNegativo(totalLiquido));
                    valorAtualHonorarioIrpf = (BigDecimal)((List)honorarios.get(entry.getKey())).get(1);
                    valorAtualHonorarioIrpf = this.acumular((BigDecimal)valorAtualHonorarioIrpf, Utils.zerarSeNegativo((BigDecimal)var41_110));
                    ArrayList<BigDecimal> lista2 = new ArrayList<BigDecimal>();
                    lista2.add(bigDecimal34);
                    lista2.add((BigDecimal)valorAtualHonorarioIrpf);
                    honorarios.put(entry.getKey(), lista2);
                    continue;
                }
                ArrayList<BigDecimal> arrayList = new ArrayList<BigDecimal>();
                arrayList.add(Utils.zerarSeNegativo((BigDecimal)totalLiquido));
                arrayList.add(Utils.zerarSeNegativo((BigDecimal)var41_110));
                honorarios.put(entry.getKey(), arrayList);
            }
            for (Map.Entry entry : hashMap.entrySet()) {
                void var41_113;
                totalDiferenca = BigDecimal.ZERO;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
                for (HonorarioDaAtualizacao honorarioDaAtualizacao5 : (List)entry.getValue()) {
                    diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioDaAtualizacao5.getValorHonorario(), honorarioDaAtualizacao5.getIndiceDeCorrecao()), honorarioDaAtualizacao5.getPagoHonorario()));
                    totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta, totalDiferenca);
                    if (!ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(honorarioDaAtualizacao5.getHonorario().getDataEvento()) && BigDecimal.ZERO.compareTo(honorarioDaAtualizacao5.getValorHonorario()) <= 0) {
                        devido = honorarioDaAtualizacao5.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao5.getValorJuros(), honorarioDaAtualizacao5.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioDaAtualizacao5.getPagoJuro()));
                        totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
                        base = honorarioDaAtualizacao5.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao5.getValorHonorario(), honorarioDaAtualizacao5.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        taxaJuros = honorarioDaAtualizacao5.getTaxaJurosHonorario() != null ? honorarioDaAtualizacao5.getTaxaJurosHonorario() : ultimoOutrosDebitosReclamado.get(0).getTaxaDeJuros();
                        dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaJuros.divide(Utils.CEM)));
                        diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioDaAtualizacao5.getPagoJuroPeriodoAtual()));
                        totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
                    }
                    if (!Utils.naoNulo(honorarioDaAtualizacao5.getValorImpostoRendaSaldo())) continue;
                    BigDecimal bigDecimal35 = Utils.somar((BigDecimal)var41_113, honorarioDaAtualizacao5.getValorImpostoRendaSaldo(), (BigDecimal)var41_113);
                }
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo(totalDiferenca), totalDebitoPorCalculo);
                totalLiquido = totalDiferenca.subtract((BigDecimal)var41_113, Utils.CONTEXTO_MATEMATICO);
                if (BigDecimal.ZERO.compareTo((BigDecimal)totalLiquido) > 0) {
                    totalLiquido = BigDecimal.ZERO;
                }
                if (honorarios.containsKey(entry.getKey())) {
                    BigDecimal bigDecimal37 = (BigDecimal)((List)honorarios.get(entry.getKey())).get(0);
                    bigDecimal37 = this.acumular(bigDecimal37, Utils.zerarSeNegativo(totalLiquido));
                    valorAtualHonorarioIrpf = (BigDecimal)((List)honorarios.get(entry.getKey())).get(1);
                    valorAtualHonorarioIrpf = this.acumular((BigDecimal)valorAtualHonorarioIrpf, Utils.zerarSeNegativo((BigDecimal)var41_113));
                    lista = new ArrayList<Object>();
                    lista.add(bigDecimal37);
                    lista.add(valorAtualHonorarioIrpf);
                    honorarios.put(entry.getKey(), lista);
                    continue;
                }
                ArrayList<BigDecimal> arrayList = new ArrayList<BigDecimal>();
                arrayList.add(Utils.zerarSeNegativo(totalLiquido));
                arrayList.add(Utils.zerarSeNegativo((BigDecimal)var41_113));
                honorarios.put(entry.getKey(), arrayList);
            }
            mapaHonorariosCalculados.clear();
            for (HonorarioDaAtualizacao honorarioDaAtualizacao6 : ultimoDebitosDoReclamante.get(0).getHonorariosDaAtualizacaoCalculado()) {
                if (!mapaHonorariosCalculados.containsKey(honorarioDaAtualizacao6.getHonorario().getNomeCredor())) {
                    mapaHonorariosCalculados.put(honorarioDaAtualizacao6.getHonorario().getNomeCredor(), new ArrayList());
                }
                ((List)mapaHonorariosCalculados.get(honorarioDaAtualizacao6.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao6);
            }
            hashMap.clear();
            for (HonorarioDaAtualizacao honorarioDaAtualizacao7 : ultimoDebitosDoReclamante.get(0).getHonorariosDaAtualizacaoInformado()) {
                if (!hashMap.containsKey(honorarioDaAtualizacao7.getHonorario().getNomeCredor())) {
                    hashMap.put(honorarioDaAtualizacao7.getHonorario().getNomeCredor(), new ArrayList());
                }
                ((List)hashMap.get(honorarioDaAtualizacao7.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao7);
            }
            entradasInformadasJaProcessadas.clear();
            for (Map.Entry entry : mapaHonorariosCalculados.entrySet()) {
                void var41_119;
                totalDiferenca = BigDecimal.ZERO;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                for (HonorarioDaAtualizacao honorarioDaAtualizacao8 : (List)entry.getValue()) {
                    void var41_116;
                    if (honorarioDaAtualizacao8.getValorRemanescenteHonorario() == null || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(honorarioDaAtualizacao8.getHonorario().getDataEvento()) && ultimoDebitosDoReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(ultimoDebitosDoReclamante.get(0).getCalculo().getDataDeLiquidacao())) {
                        totalDiferenca = Utils.somar(totalDiferenca, honorarioDaAtualizacao8.getDiferencaCalculadaOutros(), totalDiferenca);
                        if (!Utils.naoNulo(honorarioDaAtualizacao8.getValorImpostoRendaSaldo())) continue;
                        BigDecimal bigDecimal38 = Utils.somar((BigDecimal)var41_116, honorarioDaAtualizacao8.getValorImpostoRendaSaldo(), (BigDecimal)var41_116);
                        continue;
                    }
                    totalDiferenca = Utils.somar(totalDiferenca, honorarioDaAtualizacao8.getDiferencaCalculadaRemanescente(honorarioDaAtualizacao8.getIndiceDeCorrecao()), totalDiferenca);
                    totalDiferenca = Utils.somar(totalDiferenca, ultimoDebitosDoReclamante.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao8.getHonorario().getAliquota().divide(Utils.CEM), honorarioDaAtualizacao8.getPagoJuro()), totalDiferenca);
                    if (Utils.naoNulo(honorarioDaAtualizacao8.getValorImpostoRendaSaldo())) {
                        BigDecimal bigDecimal39 = Utils.somar((BigDecimal)var41_116, honorarioDaAtualizacao8.getValorImpostoRendaSaldo(), (BigDecimal)var41_116);
                    }
                    if (ultimoDebitosDoReclamante.get(0).getCreditosDoReclamante().getMultasCalculadas().isEmpty() && ultimoDebitosDoReclamante.get(0).getCreditosDoReclamante().getMultasInformadas().isEmpty()) continue;
                    totalDiferenca = Utils.somar(totalDiferenca, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao8.calcularHonorariosSobreMultas(ultimoDebitosDoReclamante.get(0).getCreditosDoReclamante()), honorarioDaAtualizacao8.getHonorario().getAliquota().divide(Utils.CEM))), honorarioDaAtualizacao8.getPagoSobreMultas()), totalDiferenca);
                }
                for (Map.Entry entry5 : hashMap.entrySet()) {
                    if (!((String)entry.getKey()).equals(entry5.getKey())) continue;
                    entradasInformadasJaProcessadas.add(entry5.getKey());
                    for (HonorarioDaAtualizacao honorarioInformado : (List)entry5.getValue()) {
                        BigDecimal diferencaMulta4 = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao()), honorarioInformado.getPagoHonorario()));
                        totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta4, totalDiferenca);
                        if (!ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(honorarioInformado.getHonorario().getDataEvento()) && BigDecimal.ZERO.compareTo(honorarioInformado.getValorHonorario()) <= 0) {
                            BigDecimal devido2 = honorarioInformado.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorJuros(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                            BigDecimal diferencaJuro4 = Utils.arredondarValorMonetario(Utils.subtrair(devido2, honorarioInformado.getPagoJuro()));
                            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro4, totalDiferenca);
                            BigDecimal base3 = honorarioInformado.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioInformado.getValorHonorario(), honorarioInformado.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                            BigDecimal taxaJuros4 = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : ultimoDebitosDoReclamante.get(0).getTaxaDeJuros();
                            BigDecimal dev4 = Utils.arredondarValorMonetario(Utils.multiplicar(base3, taxaJuros4.divide(Utils.CEM)));
                            BigDecimal diferencaJuroAtual4 = Utils.arredondarValorMonetario(Utils.subtrair(dev4, honorarioInformado.getPagoJuroPeriodoAtual()));
                            totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual4, totalDiferenca);
                        }
                        if (!Utils.naoNulo(honorarioInformado.getValorImpostoRendaSaldo())) continue;
                        BigDecimal bigDecimal40 = Utils.somar((BigDecimal)var41_119, honorarioInformado.getValorImpostoRendaSaldo(), (BigDecimal)var41_119);
                    }
                }
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo(totalDiferenca), totalDebitoPorCalculo);
                totalLiquido = totalDiferenca.subtract((BigDecimal)var41_119, Utils.CONTEXTO_MATEMATICO);
                if (BigDecimal.ZERO.compareTo((BigDecimal)totalLiquido) > 0) {
                    totalLiquido = BigDecimal.ZERO;
                }
                if (honorarios.containsKey(entry.getKey())) {
                    BigDecimal bigDecimal42 = (BigDecimal)((List)honorarios.get(entry.getKey())).get(0);
                    bigDecimal42 = this.acumular(bigDecimal42, Utils.zerarSeNegativo((BigDecimal)totalLiquido));
                    valorAtualHonorarioIrpf = (BigDecimal)((List)honorarios.get(entry.getKey())).get(1);
                    valorAtualHonorarioIrpf = this.acumular((BigDecimal)valorAtualHonorarioIrpf, Utils.zerarSeNegativo((BigDecimal)var41_119));
                    lista = new ArrayList();
                    lista.add(bigDecimal42);
                    lista.add(valorAtualHonorarioIrpf);
                    honorarios.put(entry.getKey(), lista);
                    continue;
                }
                ArrayList<BigDecimal> arrayList = new ArrayList<BigDecimal>();
                arrayList.add(Utils.zerarSeNegativo((BigDecimal)totalLiquido));
                arrayList.add(Utils.zerarSeNegativo((BigDecimal)var41_119));
                honorarios.put(entry.getKey(), arrayList);
            }
            for (Map.Entry entry : hashMap.entrySet()) {
                void var41_122;
                totalDiferenca = BigDecimal.ZERO;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
                for (HonorarioDaAtualizacao honorarioDaAtualizacao9 : (List)entry.getValue()) {
                    diferencaMulta = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioDaAtualizacao9.getValorHonorario(), honorarioDaAtualizacao9.getIndiceDeCorrecao()), honorarioDaAtualizacao9.getPagoHonorario()));
                    totalDiferenca = Utils.somar(totalDiferenca, diferencaMulta, totalDiferenca);
                    if (!ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(honorarioDaAtualizacao9.getHonorario().getDataEvento()) && BigDecimal.ZERO.compareTo(honorarioDaAtualizacao9.getValorHonorario()) <= 0) {
                        devido = honorarioDaAtualizacao9.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao9.getValorJuros(), honorarioDaAtualizacao9.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioDaAtualizacao9.getPagoJuro()));
                        totalDiferenca = Utils.somar(totalDiferenca, diferencaJuro, totalDiferenca);
                        base = honorarioDaAtualizacao9.getHonorario().getAplicarJuros() != false ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao9.getValorHonorario(), honorarioDaAtualizacao9.getIndiceDeCorrecao())) : BigDecimal.ZERO;
                        taxaJuros = honorarioDaAtualizacao9.getTaxaJurosHonorario() != null ? honorarioDaAtualizacao9.getTaxaJurosHonorario() : ultimoDebitosDoReclamante.get(0).getTaxaDeJuros();
                        dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaJuros.divide(Utils.CEM)));
                        diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioDaAtualizacao9.getPagoJuroPeriodoAtual()));
                        totalDiferenca = Utils.somar(totalDiferenca, diferencaJuroAtual, totalDiferenca);
                    }
                    if (!Utils.naoNulo(honorarioDaAtualizacao9.getValorImpostoRendaSaldo())) continue;
                    BigDecimal bigDecimal43 = Utils.somar((BigDecimal)var41_122, honorarioDaAtualizacao9.getValorImpostoRendaSaldo(), (BigDecimal)var41_122);
                }
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, Utils.zerarSeNegativo(totalDiferenca), totalDebitoPorCalculo);
                totalLiquido = totalDiferenca.subtract((BigDecimal)var41_122, Utils.CONTEXTO_MATEMATICO);
                if (BigDecimal.ZERO.compareTo((BigDecimal)totalLiquido) > 0) {
                    totalLiquido = BigDecimal.ZERO;
                }
                if (honorarios.containsKey(entry.getKey())) {
                    BigDecimal bigDecimal45 = (BigDecimal)((List)honorarios.get(entry.getKey())).get(0);
                    bigDecimal45 = this.acumular(bigDecimal45, Utils.zerarSeNegativo((BigDecimal)totalLiquido));
                    valorAtualHonorarioIrpf = (BigDecimal)((List)honorarios.get(entry.getKey())).get(1);
                    valorAtualHonorarioIrpf = this.acumular((BigDecimal)valorAtualHonorarioIrpf, Utils.zerarSeNegativo((BigDecimal)var41_122));
                    lista = new ArrayList();
                    lista.add(bigDecimal45);
                    lista.add(valorAtualHonorarioIrpf);
                    honorarios.put(entry.getKey(), lista);
                    continue;
                }
                ArrayList<BigDecimal> arrayList = new ArrayList<BigDecimal>();
                arrayList.add(Utils.zerarSeNegativo((BigDecimal)totalLiquido));
                arrayList.add(Utils.zerarSeNegativo((BigDecimal)var41_122));
                honorarios.put(entry.getKey(), arrayList);
            }
            if (Boolean.TRUE.equals(calculo.getIrpf().getApurarImpostoRenda()) && Utils.naoNulo(ultimoDebitosDoReclamante.get(0).getDiferencaIrpf())) {
                if (Boolean.TRUE.equals(calculo.getIrpf().getCobrarDoReclamado())) {
                    imprimeIrpfReclamado = Boolean.TRUE;
                    totalIrpfReclamado = Utils.somar(totalIrpfReclamado, ultimoOutrosDebitosReclamado.get(0).getDiferencaIrpf());
                    totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, ultimoOutrosDebitosReclamado.get(0).getDiferencaIrpf());
                } else {
                    imprimeIrpfReclamante = Boolean.TRUE;
                    totalIrpfReclamante = Utils.somar(totalIrpfReclamante, ultimoDebitosDoReclamante.get(0).getDiferencaIrpf());
                    totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, ultimoDebitosDoReclamante.get(0).getDiferencaIrpf());
                }
            }
            if (Boolean.TRUE.equals(calculo.getFgts().getMulta10()) && PagamentoUtils.verificaSeExisteInssDezPorcento(calculo).booleanValue()) {
                imprimeContribuicaoSocialDezPorcento = Boolean.TRUE;
                BigDecimal valorContribSocialDez = Utils.zerarSeNegativo(ultimoOutrosDebitosReclamado.get(0).getDiferencaInssDez());
                totalContribuicaoDez = Utils.somar(totalContribuicaoDez, valorContribSocialDez);
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, valorContribSocialDez);
            }
            if (Boolean.TRUE.equals(calculo.getFgts().getContribuicaoSocial05()) && PagamentoUtils.verificaSeExisteInssMeioPorcento(calculo).booleanValue()) {
                imprimeContribuicaoSocialMeioPorcento = Boolean.TRUE;
                BigDecimal valorContribSocialMeio = Utils.zerarSeNegativo(ultimoOutrosDebitosReclamado.get(0).getDiferencaInssMeio());
                totalContribuicaoMeio = Utils.somar(totalContribuicaoMeio, valorContribSocialMeio);
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, valorContribSocialMeio);
            }
            if (Utils.naoNulo(ultimoOutrosDebitosReclamado.get(0).getDiferencaCustasJudiciais()) && PagamentoUtils.verificaSeExisteCustaJudicialDoReclamado(calculo).booleanValue()) {
                imprimeCustasReclamado = Boolean.TRUE;
                BigDecimal valorCustasReclamado = Utils.zerarSeNegativo(ultimoOutrosDebitosReclamado.get(0).getDiferencaCustasJudiciais());
                totalCustasReclamado = Utils.somar(totalCustasReclamado, valorCustasReclamado);
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, valorCustasReclamado);
            }
            if (Utils.naoNulo(ultimoDebitosDoReclamante.get(0).getDiferencaCustasJudiciais()) && PagamentoUtils.verificaSeExisteCustaDoReclamanteAPagar(calculo).booleanValue()) {
                imprimeCustasReclamante = Boolean.TRUE;
                BigDecimal valorCustasReclamante = Utils.zerarSeNegativo(ultimoDebitosDoReclamante.get(0).getDiferencaCustasJudiciais());
                totalCustasReclamante = Utils.somar(totalCustasReclamante, valorCustasReclamante);
                totalDebitoPorCalculo = Utils.somar(totalDebitoPorCalculo, valorCustasReclamante);
            }
            String numeroDocumentoFiscal = calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal();
            this.brutoPorReclamante.put(numeroDocumentoFiscal, this.acumular(this.brutoPorReclamante, numeroDocumentoFiscal, ultimoCreditosDoReclamante.get(0).getTotalDiferenca()));
            this.liquidoPorReclamante.put(numeroDocumentoFiscal, this.acumular(this.liquidoPorReclamante, numeroDocumentoFiscal, Utils.subtrair(ultimoCreditosDoReclamante.get(0).getTotalDiferenca(), ultimoDebitosDoReclamante.get(0).calcularTotalDiferenca(Boolean.TRUE))));
            this.totalDevidoPeloReclamado.put(numeroDocumentoFiscal, this.acumular(this.totalDevidoPeloReclamado, numeroDocumentoFiscal, totalDebitoPorCalculo));
        }
        this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "L\u00edquido devido aos Reclamantes", totalLiquidoDevidoAoReclamante));
        if (Boolean.TRUE.equals(imprimeDepositoFGTS)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Dep\u00f3sito FGTS", totalDepositoFgts));
        }
        if (Boolean.TRUE.equals(imprimeContribuicaoSocialDevidos)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social Sobre Sal\u00e1rios Devidos", totalContribuicaoSalariosDevidos));
        }
        if (Boolean.TRUE.equals(imprimeContribuicaoSocialPagos)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social Sobre Sal\u00e1rios Pagos", totalContribuicaoSalariosPagos));
        }
        if (Boolean.TRUE.equals(imprimePrevidenciaPrivada)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Previd\u00eancia Privada", totalPrevidencia));
        }
        if (Boolean.TRUE.equals(imprimePensaoAlimenticia)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Pens\u00e3o Aliment\u00edcia", totalPensao));
        }
        for (Map.Entry entry : multas.entrySet()) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Multas / Indeniza\u00e7\u00f5es devidas para " + (String)entry.getKey(), (BigDecimal)entry.getValue()));
        }
        for (Map.Entry entry : honorarios.entrySet()) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Honor\u00e1rios L\u00edquidos para " + (String)entry.getKey(), (BigDecimal)((List)entry.getValue()).get(0)));
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF sobre Honor\u00e1rios para " + (String)entry.getKey(), (BigDecimal)((List)entry.getValue()).get(1)));
        }
        if (Boolean.TRUE.equals(imprimeIrpfReclamado)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF devido pelo Reclamado", totalIrpfReclamado));
        }
        if (Boolean.TRUE.equals(imprimeIrpfReclamante)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF devido pelos Reclamantes", totalIrpfReclamante));
        }
        if (Boolean.TRUE.equals(imprimeContribuicaoSocialDezPorcento)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social 10% (Lei Complementar 110/2001)", totalContribuicaoDez));
        }
        if (Boolean.TRUE.equals(imprimeContribuicaoSocialMeioPorcento)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social 0,5% (Lei Complementar 110/2001)", totalContribuicaoMeio));
        }
        if (Boolean.TRUE.equals(imprimeCustasReclamado)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Custas Judiciais devidas pelo Reclamado", totalCustasReclamado));
        }
        if (Boolean.TRUE.equals(imprimeCustasReclamante)) {
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Custas Judiciais devidas pelos Reclamantes", totalCustasReclamante));
        }
    }

    private BigDecimal encontrarJurosPensao(DebitosDoReclamante debitosDoReclamante) {
        BigDecimal valorJurosPensao = BigDecimal.ZERO;
        if (debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getIncidirSobreJuros().booleanValue()) {
            BigDecimal percentualPrincipalPensao = debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPercentualPrincipal();
            BigDecimal percentualFgtsPensao = debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPercentualFgts();
            valorJurosPensao = Utils.somar(valorJurosPensao, debitosDoReclamante.getCreditosDoReclamante().getDiferencaPensaoSobreJurosDoPeriodo(debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota().divide(Utils.CEM), debitosDoReclamante.getPensaoAlimenticiaDaAtualizacao().getPagoJuro(), percentualPrincipalPensao, percentualFgtsPensao));
        }
        return valorJurosPensao;
    }

    private BigDecimal acumular(BigDecimal valorAcumulado, BigDecimal valorAAcumular) {
        valorAcumulado = Utils.nulo(valorAcumulado) ? valorAAcumular : Utils.somar(valorAcumulado, valorAAcumular, valorAcumulado);
        return valorAcumulado;
    }

    private BigDecimal acumular(Map<String, BigDecimal> valores, String chaveValorAAcumular, BigDecimal valorAAcumular) {
        BigDecimal valorAcumulado = valores.get(chaveValorAAcumular) != null ? valores.get(chaveValorAAcumular) : BigDecimal.ZERO;
        return Utils.somar(valorAcumulado, valorAAcumular);
    }

    private void popularSecaoReclamantes() {
        for (Map.Entry<String, String> entry : this.nomesDosReclamantes.entrySet()) {
            String nome = entry.getValue();
            BigDecimal bruto = this.brutoPorReclamante.get(entry.getKey());
            BigDecimal liquido = this.liquidoPorReclamante.get(entry.getKey());
            BigDecimal totalReclamado = this.totalDevidoPeloReclamado.get(entry.getKey());
            BigDecimal debitos = this.debitosPorReclamante.get(entry.getKey());
            this.appender.append(new ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo(ResumoPorProcessoAtualizacaoJRAdapter.SecaoRelatorioResumoEnum.RECLAMANTES, nome, bruto, liquido, totalReclamado, debitos));
        }
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoAtualizacaoJRAdapter.OcorrenciaResumoPorProcessoComInformacoesAdicionaisJRAdapter> getOcorrenciasReclamantes() {
        return new JRAdapterDataSource<ResumoPorProcessoAtualizacaoJRAdapter.OcorrenciaResumoPorProcessoComInformacoesAdicionaisJRAdapter>(new OcorrenciaResumoPorProcessoComInformacoesAdicionaisPadrao(), this.appender.getItensReclamantes());
    }

    @Override
    public BigDecimal getValorTotalBrutoDosReclamantes() {
        return this.appender.getValorTotalBrutoDosReclamantes();
    }

    @Override
    public BigDecimal getValorTotalLiquidoDosReclamantes() {
        return this.appender.getValorTotalLiquidoDosReclamantes();
    }

    @Override
    public BigDecimal getValorTotalDevidoPeloReclamado() {
        return this.appender.getValorTotalDebitoReclamado();
    }

    @Override
    public BigDecimal getValorTotalDebitosDosReclamantes() {
        return this.appender.getValorTotalDebitosDosReclamantes();
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoAtualizacaoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasDebitoReclamado() {
        return new JRAdapterDataSource<ResumoPorProcessoAtualizacaoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter>(new OcorrenciaResumoPorProcessoPadrao(), this.appender.getItensDebitoReclamado());
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoAtualizacaoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasDebitoCobrarReclamante() {
        return new JRAdapterDataSource<ResumoPorProcessoAtualizacaoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter>(new OcorrenciaResumoPorProcessoPadrao(), this.appender.getItensDebitoCobrarReclamante());
    }

    @Override
    public BigDecimal getValorTotalDebitoReclamado() {
        return this.appender.getValorTotalDebitoReclamado();
    }

    @Override
    public BigDecimal getValorTotalDebitoCobrarReclamante() {
        return this.appender.getValorTotalDebitoCobrarReclamante();
    }

    @Override
    public JRAdapterDataSource<JREmptyDS> getEmptyDS() {
        return new JRAdapterDataSource<JREmptyDS>(new JREmptyDS(), Arrays.asList(new Object()));
    }

    public class CustasFixasWrapper {
        private Date ocorrencia;
        private String tipo;
        private BigDecimal base;
        private Integer quantidade;
        private BigDecimal valor;
        private BigDecimal indiceDeCorrecao;
        private BigDecimal taxaDeJuros;

        public CustasFixasWrapper(Date ocorrencia, String tipo, BigDecimal base, Integer quantidade, BigDecimal valor, BigDecimal indiceDeCorrecao, BigDecimal taxaDeJuros) {
            this.ocorrencia = ocorrencia;
            this.tipo = tipo;
            this.base = base;
            this.quantidade = quantidade;
            this.valor = valor;
            this.indiceDeCorrecao = indiceDeCorrecao;
            this.taxaDeJuros = taxaDeJuros;
        }

        public Date getOcorrencia() {
            return this.ocorrencia;
        }

        public String getTipo() {
            return this.tipo;
        }

        public BigDecimal getBase() {
            return this.base;
        }

        public Integer getQuantidade() {
            return this.quantidade;
        }

        public BigDecimal getValor() {
            return this.valor;
        }

        public BigDecimal getIndiceDeCorrecao() {
            return this.indiceDeCorrecao;
        }

        public BigDecimal getValorCorrigido() {
            return Utils.aplicarCorrecaoMonetaria(this.indiceDeCorrecao, this.valor, BigDecimal.ZERO);
        }

        public BigDecimal getJuros() {
            return Utils.aplicarJuros(this.taxaDeJuros, this.getValorCorrigido(), BigDecimal.ZERO);
        }

        public BigDecimal getTotal() {
            return this.getValorCorrigido().add(this.getJuros(), Utils.CONTEXTO_MATEMATICO);
        }
    }

    public class OcorrenciaResumoPorProcessoComInformacoesAdicionaisPadrao
    extends ResumoPorProcessoAtualizacaoJRAdapter.OcorrenciaResumoPorProcessoComInformacoesAdicionaisJRAdapter {
        private ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo item;

        @Override
        public OcorrenciaResumoPorProcessoComInformacoesAdicionaisPadrao adapt(Object adapted) {
            this.item = (ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo)adapted;
            return this;
        }

        @Override
        public String getDescricao() {
            return this.item.getLabel();
        }

        @Override
        public String getValor() {
            return this.item.getValorFormatado();
        }

        @Override
        public String getLiquido() {
            return this.item.getLiquidoFormatado();
        }

        @Override
        public String getTotalReclamado() {
            return this.item.getTotalReclamadoFormatado();
        }

        @Override
        public String getDebitos() {
            return this.item.getDebitosFormatado();
        }
    }

    public class OcorrenciaResumoPorProcessoPadrao
    extends ResumoPorProcessoAtualizacaoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter {
        private ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo item;

        @Override
        public OcorrenciaResumoPorProcessoPadrao adapt(Object adapted) {
            this.item = (ResumoPorProcessoAtualizacaoJRAdapter.ItemResumo)adapted;
            return this;
        }

        @Override
        public String getDescricao() {
            return this.item.getLabel();
        }

        @Override
        public String getValor() {
            return this.item.getValorFormatado();
        }
    }
}

