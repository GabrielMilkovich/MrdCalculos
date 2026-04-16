/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.constantes.BaseParaApuracaoDeMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeImpostoDeRendaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapterPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class ResumoJRAdapterPagamentoPadrao
extends ResumoJRAdapterPagamento {
    private static final String PARA = " PARA ";
    private static final String HONORARIOS_LIQUIDOS_PARA = "Honor\u00e1rios L\u00edquidos para ";
    private static final String IRPF_SOBRE_HONORARIOS_PARA = "IRPF sobre Honor\u00e1rios para ";
    private static final String IRPJ_SOBRE_HONORARIOS_PARA = "IRPJ sobre Honor\u00e1rios para ";
    private static final String IRRF_SOBRE_HONORARIOS_PARA = "IRRF sobre Honor\u00e1rios para ";
    private static final String CUSTAS_DEVIDAS_RECLAMANTE = "Custas Judiciais devidas pelo Reclamante";
    private static final String DEPOSITO_FGTS = "Dep\u00f3sito FGTS";
    private static final String CONTRIBUICAO_SOCIAL_DEVIDO = "Contribui\u00e7\u00e3o Social Sobre Sal\u00e1rios Devidos";
    private static final String CONTRIBUICAO_SOCIAL_PAGO = "Contribui\u00e7\u00e3o Social Sobre Sal\u00e1rios Pagos";
    private static final String PREVIDENCIA_PRIVADA = "Previd\u00eancia Privada";
    private static final String PENSAO_ALIMENTICIA = "Pens\u00e3o Aliment\u00edcia";
    private static final String CONTRIBUICAO_SOCIAL_DEZ = "Contribui\u00e7\u00e3o Social 10% (Lei Complementar 110/2001)";
    private static final String CONTRIBUICAO_SOCIAL_MEIO = "Contribui\u00e7\u00e3o Social 0,5% (Lei Complementar 110/2001)";
    private static final String CUSTAS_JUDICIAIS_RECLAMADO = "Custas Judiciais devidas pelo Reclamado";
    private static final String CUSTAS_JUDICIAIS_RECLAMANTE = "Custas Judiciais devidas pelo Reclamante";
    private static final int DOIS_CARACTERES = 2;
    private Calculo calculo;
    private ResumoJRAdapterPagamento.ItensResumoAppender appender = new ResumoJRAdapterPagamento.ItensResumoAppender();
    private String descritivoDeEventosResumo;
    private StringBuilder observacaoPagamentosAMaiorReclamada;
    private StringBuilder observacaoPagamentosAMaiorReclamante;
    private List<String> parcelasPagasAMaiorDebitosCobrarDoReclamante;
    private List<String> parcelasPagasAMaiorDebitosReclamado;

    public ResumoJRAdapterPagamentoPadrao(Calculo calculo) {
        this.calculo = calculo;
        this.descritivoDeEventosResumo = this.calculo.getAtualizacao().getDescritivoDeEventosResumo();
        this.observacaoPagamentosAMaiorReclamada = new StringBuilder();
        this.observacaoPagamentosAMaiorReclamante = new StringBuilder();
        this.parcelasPagasAMaiorDebitosCobrarDoReclamante = new ArrayList<String>();
        this.parcelasPagasAMaiorDebitosReclamado = new ArrayList<String>();
        this.popularItensResumo();
        this.montarObservacao();
    }

    private void montarObservacao() {
        this.observacaoPagamentosAMaiorReclamada = ResumoPagamentoUtils.montarObservacao(this.parcelasPagasAMaiorDebitosReclamado);
        this.observacaoPagamentosAMaiorReclamante = ResumoPagamentoUtils.montarObservacao(this.parcelasPagasAMaiorDebitosCobrarDoReclamante);
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<ResumoJRAdapterPagamento.OcorrenciaResumoJRAdapter> getOcorrenciasDebitoReclamado() {
        return new JRAdapterDataSource<ResumoJRAdapterPagamento.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensDebitoReclamado());
    }

    @Override
    public JRAdapterDataSource<ResumoJRAdapterPagamento.OcorrenciaResumoJRAdapter> getOcorrenciasDebitoCobrarReclamante() {
        return new JRAdapterDataSource<ResumoJRAdapterPagamento.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensDebitoCobrarReclamante());
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
    public String getDescritivoDeEventos() {
        return this.descritivoDeEventosResumo;
    }

    @Override
    public String getComentarios() {
        return this.calculo.getAtualizacao().getComentarios();
    }

    @Override
    public String getObservacoesReclamada() {
        return this.observacaoPagamentosAMaiorReclamada.toString();
    }

    @Override
    public String getObservacoesReclamante() {
        return this.observacaoPagamentosAMaiorReclamante.toString();
    }

    @Override
    public void popularItensResumo() {
        this.popularSecaoDebitoReclamado();
        this.popularSecaoDebitoCobrarReclamante();
    }

    /*
     * WARNING - void declaration
     */
    private void popularSecaoDebitoCobrarReclamante() {
        int count;
        List<DebitosCobrarDoReclamante> ultimoDebitosCobrarReclamante = DebitosCobrarDoReclamante.obterUltimoRegistro(this.calculo.getAtualizacao());
        if (Utils.nulo(ultimoDebitosCobrarReclamante) || ultimoDebitosCobrarReclamante.isEmpty()) {
            return;
        }
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
        ArrayList entradasInformadasJaProcessadas = new ArrayList();
        for (Map.Entry entry : mapaMultasCalculadas.entrySet()) {
            void var4_13;
            StringBuilder stringBuilder = new StringBuilder();
            BigDecimal bigDecimal = BigDecimal.ZERO;
            count = 0;
            for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                void var4_8;
                if (multaDaAtualizacao.getValorRemanescenteMulta() == null || ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) && ultimoDebitosCobrarReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(this.calculo.getDataDeLiquidacao())) {
                    BigDecimal bigDecimal2 = Utils.somar((BigDecimal)var4_8, multaDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var4_8);
                } else {
                    BigDecimal bigDecimal4 = Utils.somar((BigDecimal)var4_8, multaDaAtualizacao.getDiferencaCalculadaRemanescente(ultimoDebitosCobrarReclamante.get(0).getIndiceDeCorrecao()), (BigDecimal)var4_8);
                    bigDecimal4 = Utils.somar(bigDecimal4, multaDaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : ultimoDebitosCobrarReclamante.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaDaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM), multaDaAtualizacao.getPagoJuro()), bigDecimal4);
                }
                ++count;
                stringBuilder.append(multaDaAtualizacao.getMulta().getDescricao());
                stringBuilder.append("# ");
            }
            for (Map.Entry entry2 : mapaMultasInformadas.entrySet()) {
                if (!((String)entry.getKey()).equals(entry2.getKey())) continue;
                entradasInformadasJaProcessadas.add(entry2.getKey());
                for (MultaDaAtualizacao multaDaAtualizacao : (List)entry2.getValue()) {
                    BigDecimal taxaJurosMulta = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoDebitosCobrarReclamante.get(0).getTaxaDeJuros();
                    BigDecimal bigDecimal5 = Utils.somar((BigDecimal)var4_13, ResumoPagamentoUtils.calcularTotalDiferencaMultaInformadoResumo(multaDaAtualizacao, ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo(), taxaJurosMulta), (BigDecimal)var4_13);
                    ++count;
                    stringBuilder.append(multaDaAtualizacao.getMulta().getDescricao());
                    stringBuilder.append("# ");
                }
            }
            if (count > 0) {
                stringBuilder.replace(stringBuilder.length() - 2, stringBuilder.length(), "");
            }
            if (count > 1) {
                int inicio = stringBuilder.lastIndexOf("#");
                stringBuilder.replace(inicio, inicio + 1, " e");
            }
            if (BigDecimal.ZERO.compareTo((BigDecimal)var4_13) > 0) {
                this.parcelasPagasAMaiorDebitosCobrarDoReclamante.add(stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var4_13)));
        }
        for (Map.Entry entry : mapaMultasInformadas.entrySet()) {
            void var4_17;
            StringBuilder stringBuilder = new StringBuilder();
            BigDecimal bigDecimal = BigDecimal.ZERO;
            count = 0;
            if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
            for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                Iterator taxaJurosMulta = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoDebitosCobrarReclamante.get(0).getTaxaDeJuros();
                BigDecimal bigDecimal6 = Utils.somar((BigDecimal)var4_17, ResumoPagamentoUtils.calcularTotalDiferencaMultaInformadoResumo(multaDaAtualizacao, ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo(), (BigDecimal)((Object)taxaJurosMulta)), (BigDecimal)var4_17);
                ++count;
                stringBuilder.append(multaDaAtualizacao.getMulta().getDescricao());
                stringBuilder.append("# ");
            }
            if (count > 0) {
                stringBuilder.replace(stringBuilder.length() - 2, stringBuilder.length(), "");
            }
            if (count > 1) {
                int inicio = stringBuilder.lastIndexOf("#");
                stringBuilder.replace(inicio, inicio + 1, " e");
            }
            if (BigDecimal.ZERO.compareTo((BigDecimal)var4_17) > 0) {
                this.parcelasPagasAMaiorDebitosCobrarDoReclamante.add(stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var4_17)));
        }
        HashMap mapaHonorariosCalculados = new HashMap();
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : ultimoDebitosCobrarReclamante.get(0).getHonorariosDaAtualizacaoCalculado()) {
            if (!mapaHonorariosCalculados.containsKey(honorarioDaAtualizacao.getHonorario().getNomeCredor())) {
                mapaHonorariosCalculados.put(honorarioDaAtualizacao.getHonorario().getNomeCredor(), new ArrayList());
            }
            ((List)mapaHonorariosCalculados.get(honorarioDaAtualizacao.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao);
        }
        HashMap hashMap = new HashMap();
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : ultimoDebitosCobrarReclamante.get(0).getHonorariosDaAtualizacaoInformado()) {
            if (!hashMap.containsKey(honorarioDaAtualizacao.getHonorario().getNomeCredor())) {
                hashMap.put(honorarioDaAtualizacao.getHonorario().getNomeCredor(), new ArrayList());
            }
            ((List)hashMap.get(honorarioDaAtualizacao.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao);
        }
        entradasInformadasJaProcessadas.clear();
        for (Map.Entry entry : mapaHonorariosCalculados.entrySet()) {
            void var8_40;
            BigDecimal bigDecimal = BigDecimal.ZERO;
            BigDecimal totalIRPF = BigDecimal.ZERO;
            for (HonorarioDaAtualizacao honorarioDaAtualizacao : (List)entry.getValue()) {
                BigDecimal valorImpostoRendaSaldo;
                void var8_34;
                if (honorarioDaAtualizacao.getValorRemanescenteHonorario() == null || ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(honorarioDaAtualizacao.getHonorario().getDataEvento()) && ultimoDebitosCobrarReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo().equals(ultimoDebitosCobrarReclamante.get(0).getCalculo().getDataDeLiquidacao())) {
                    BigDecimal bigDecimal7 = Utils.somar((BigDecimal)var8_34, honorarioDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var8_34);
                    valorImpostoRendaSaldo = honorarioDaAtualizacao.getValorImpostoRendaSaldo() != null ? honorarioDaAtualizacao.getValorImpostoRendaSaldo() : BigDecimal.ZERO;
                    totalIRPF = Utils.somar(totalIRPF, valorImpostoRendaSaldo, totalIRPF);
                    continue;
                }
                BigDecimal bigDecimal10 = Utils.somar((BigDecimal)var8_34, honorarioDaAtualizacao.getDiferencaCalculadaRemanescente(ultimoDebitosCobrarReclamante.get(0).getIndiceDeCorrecao()), (BigDecimal)var8_34);
                bigDecimal10 = Utils.somar(bigDecimal10, ultimoDebitosCobrarReclamante.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM), honorarioDaAtualizacao.getPagoJuro()), bigDecimal10);
                bigDecimal10 = Utils.somar(bigDecimal10, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.calcularHonorariosSobreMultas(ultimoDebitosCobrarReclamante.get(0).getCreditosDoReclamante()), honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), honorarioDaAtualizacao.getPagoSobreMultas()), bigDecimal10);
                valorImpostoRendaSaldo = honorarioDaAtualizacao.getValorImpostoRendaSaldo() != null ? honorarioDaAtualizacao.getValorImpostoRendaSaldo() : BigDecimal.ZERO;
                totalIRPF = Utils.somar(totalIRPF, valorImpostoRendaSaldo, totalIRPF);
            }
            for (Map.Entry entry3 : hashMap.entrySet()) {
                if (!((String)entry.getKey()).equals(entry3.getKey())) continue;
                entradasInformadasJaProcessadas.add(entry3.getKey());
                for (HonorarioDaAtualizacao honorarioInformado : (List)entry3.getValue()) {
                    BigDecimal taxaJurosHonorario = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : ultimoDebitosCobrarReclamante.get(0).getTaxaDeJuros();
                    List<BigDecimal> totais = ResumoPagamentoUtils.calcularTotalDiferencaHonorarioInformadoResumo(honorarioInformado, ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo(), taxaJurosHonorario);
                    BigDecimal bigDecimal11 = Utils.somar((BigDecimal)var8_40, totais.get(0), (BigDecimal)var8_40);
                    totalIRPF = Utils.somar(totalIRPF, totais.get(1), totalIRPF);
                }
            }
            BigDecimal totalLiquido = var8_40.subtract(totalIRPF, Utils.CONTEXTO_MATEMATICO);
            if (totalLiquido == null || BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
                this.parcelasPagasAMaiorDebitosCobrarDoReclamante.add(HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey(), Utils.zerarSeNegativo(totalLiquido)));
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, this.selecionarFraseImpostoHonorario((List)entry.getValue()) + (String)entry.getKey(), Utils.zerarSeNegativo(totalIRPF)));
        }
        for (Map.Entry entry : hashMap.entrySet()) {
            void var13_74;
            void var8_44;
            BigDecimal bigDecimal = BigDecimal.ZERO;
            BigDecimal totalIRPF = BigDecimal.ZERO;
            if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
            for (HonorarioDaAtualizacao honorarioInformado : (List)entry.getValue()) {
                BigDecimal taxaJurosHonorario = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : ultimoDebitosCobrarReclamante.get(0).getTaxaDeJuros();
                List<BigDecimal> totais = ResumoPagamentoUtils.calcularTotalDiferencaHonorarioInformadoResumo(honorarioInformado, ultimoDebitosCobrarReclamante.get(0).getDataFinalPeriodo(), taxaJurosHonorario);
                BigDecimal bigDecimal12 = Utils.somar((BigDecimal)var8_44, totais.get(0), (BigDecimal)var8_44);
                totalIRPF = Utils.somar(totalIRPF, totais.get(1), totalIRPF);
            }
            BigDecimal bigDecimal13 = var8_44.subtract(totalIRPF, Utils.CONTEXTO_MATEMATICO);
            if (bigDecimal13 == null || BigDecimal.ZERO.compareTo(bigDecimal13) > 0) {
                BigDecimal bigDecimal14 = BigDecimal.ZERO;
                this.parcelasPagasAMaiorDebitosCobrarDoReclamante.add(HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var13_74)));
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, this.selecionarFraseImpostoHonorario((List)entry.getValue()) + (String)entry.getKey(), Utils.zerarSeNegativo(totalIRPF)));
        }
        if (Utils.naoNulo(ultimoDebitosCobrarReclamante.get(0).getDiferencaCustasJudiciais()) && PagamentoUtils.verificaSeExisteCustaACobrarDoReclamante(this.calculo).booleanValue()) {
            if (BigDecimal.ZERO.compareTo(ultimoDebitosCobrarReclamante.get(0).getDiferencaCustasJudiciais()) > 0) {
                this.parcelasPagasAMaiorDebitosCobrarDoReclamante.add("Custas Judiciais devidas pelo Reclamante");
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, "Custas Judiciais devidas pelo Reclamante", Utils.zerarSeNegativo(ultimoDebitosCobrarReclamante.get(0).getDiferencaCustasJudiciais())));
        }
    }

    /*
     * WARNING - void declaration
     */
    private void popularSecaoDebitoReclamado() {
        Object totais;
        Object taxaJurosHonorario;
        Iterator<Object> taxaJurosMulta;
        int count;
        PensaoAlimenticia pensaoAlimenticia;
        List<CreditosDoReclamante> ultimoCreditosDoReclamante = CreditosDoReclamante.obterUltimoRegistro(this.calculo.getAtualizacao());
        List<DebitosDoReclamante> ultimoDebitosDoReclamante = DebitosDoReclamante.obterUltimoRegistro(this.calculo.getAtualizacao());
        List<OutrosDebitosReclamado> ultimoOutrosDebitosReclamado = OutrosDebitosReclamado.obterUltimoRegistro(this.calculo.getAtualizacao());
        this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "L\u00edquido devido ao Reclamante", Utils.subtrair(ultimoCreditosDoReclamante.get(0).getTotalDiferenca(), ultimoDebitosDoReclamante.get(0).calcularTotalDiferenca(Boolean.TRUE))));
        if (DestinoDoFgtsEnum.DEPOSITAR.equals((Object)this.calculo.getFgts().getDestinoDoFgts()) && Utils.naoNulo(ultimoDebitosDoReclamante.get(0).getValorFgts())) {
            if (BigDecimal.ZERO.compareTo(ultimoDebitosDoReclamante.get(0).getDiferencaFgts()) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(DEPOSITO_FGTS);
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, DEPOSITO_FGTS, BigDecimal.ZERO.compareTo(ultimoDebitosDoReclamante.get(0).getDiferencaFgts()) > 0 ? BigDecimal.ZERO : Utils.somar(Utils.somar(ultimoDebitosDoReclamante.get(0).getDiferencaJuroDeMoraFgts(), ultimoDebitosDoReclamante.get(0).getDiferencaJuroDeMoraFgtsPeriodoAtual()), ultimoDebitosDoReclamante.get(0).getDiferencaFgts())));
        }
        if (ultimoOutrosDebitosReclamado.get(0).getDevidoContribuicaoSocialSalariosDevidos() != null && PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosDevidos(this.calculo).booleanValue()) {
            BigDecimal desconto = ultimoDebitosDoReclamante.get(0).getDiferencaInss();
            BigDecimal valorReclamado = ultimoOutrosDebitosReclamado.get(0).getDiferencaContribuicaoSocialSalariosDevidos();
            BigDecimal contribuicaoSocialDevido = Utils.somar(Utils.zerarSeNegativo(desconto), valorReclamado);
            if (BigDecimal.ZERO.compareTo(contribuicaoSocialDevido) > 0 || BigDecimal.ZERO.compareTo(contribuicaoSocialDevido) == 0 && BigDecimal.ZERO.compareTo(desconto) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(CONTRIBUICAO_SOCIAL_DEVIDO);
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CONTRIBUICAO_SOCIAL_DEVIDO, Utils.zerarSeNegativo(contribuicaoSocialDevido)));
        }
        if (ultimoOutrosDebitosReclamado.get(0).getDevidoContribuicaoSocialSalariosPagos() != null && PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosPagos(this.calculo).booleanValue()) {
            BigDecimal contribuicaoSocialPago = ultimoOutrosDebitosReclamado.get(0).getDiferencaContribuicaoSocialSalariosPagos();
            if (BigDecimal.ZERO.compareTo(contribuicaoSocialPago) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(CONTRIBUICAO_SOCIAL_PAGO);
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CONTRIBUICAO_SOCIAL_PAGO, Utils.zerarSeNegativo(contribuicaoSocialPago)));
        }
        if (this.calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue()) {
            BigDecimal valorPrevidencia = Utils.somar(BigDecimal.ZERO, ultimoDebitosDoReclamante.get(0).getDiferencaPrevidenciaPrivada(), BigDecimal.ZERO);
            BigDecimal valorJurosPrevidencia = Utils.somar(BigDecimal.ZERO, ultimoOutrosDebitosReclamado.get(0).getDiferencaJurosDePrevidenciaPrivada(), BigDecimal.ZERO);
            valorJurosPrevidencia = Utils.somar(valorJurosPrevidencia, ultimoOutrosDebitosReclamado.get(0).getDiferencaJurosDePrevidenciaPrivadaPeriodoAtual(), valorJurosPrevidencia);
            BigDecimal previdenciaPrivada = Utils.somar(Utils.zerarSeNegativo(valorPrevidencia), Utils.zerarSeNegativo(valorJurosPrevidencia));
            if (BigDecimal.ZERO.compareTo(previdenciaPrivada) == 0 && (BigDecimal.ZERO.compareTo(valorPrevidencia) > 0 || BigDecimal.ZERO.compareTo(valorJurosPrevidencia) > 0)) {
                this.parcelasPagasAMaiorDebitosReclamado.add(PREVIDENCIA_PRIVADA);
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, PREVIDENCIA_PRIVADA, Utils.zerarSeNegativo(previdenciaPrivada)));
        }
        if (Utils.nulo(pensaoAlimenticia = this.calculo.getPensaoAlimenticiaDoPagamento())) {
            pensaoAlimenticia = this.calculo.getPensaoAlimenticiaDoCalculo();
        }
        if (pensaoAlimenticia != null && pensaoAlimenticia.getApurarPensaoAlimenticia().booleanValue() && ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao() != null) {
            if (ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getValorRemanescente() == null || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getDataEvento()) && ultimoDebitosDoReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(this.calculo.getDataDeLiquidacao())) {
                BigDecimal valorPensaoAlimenticia = ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getDiferencaPensaoDevido();
                if (BigDecimal.ZERO.compareTo(valorPensaoAlimenticia) > 0) {
                    this.parcelasPagasAMaiorDebitosReclamado.add(PENSAO_ALIMENTICIA);
                }
                this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, PENSAO_ALIMENTICIA, Utils.zerarSeNegativo(valorPensaoAlimenticia)));
            } else {
                BigDecimal valorPensao = ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getDiferencaCalculadaRemanescente(ultimoDebitosDoReclamante.get(0).getIndiceDeCorrecao());
                if (ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getIncidirSobreJuros().booleanValue()) {
                    BigDecimal percentualPrincipalPensao = ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getPercentualPrincipal();
                    BigDecimal bigDecimal = ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getPercentualFgts();
                    valorPensao = Utils.somar(valorPensao, ultimoDebitosDoReclamante.get(0).getCreditosDoReclamante().getDiferencaPensaoSobreJurosDoPeriodo(ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getPensaoAlimenticia().getAliquota().divide(Utils.CEM), ultimoDebitosDoReclamante.get(0).getPensaoAlimenticiaDaAtualizacao().getPagoJuro(), percentualPrincipalPensao, bigDecimal));
                }
                if (BigDecimal.ZERO.compareTo(valorPensao) > 0) {
                    this.parcelasPagasAMaiorDebitosReclamado.add(PENSAO_ALIMENTICIA);
                }
                this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, PENSAO_ALIMENTICIA, Utils.zerarSeNegativo(valorPensao)));
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
        for (MultaDaAtualizacao multaDaAtualizacao : ultimoOutrosDebitosReclamado.get(0).getMultasInformadas()) {
            if (!mapaMultasInformadas.containsKey(multaDaAtualizacao.getMulta().getNomeTerceiro())) {
                mapaMultasInformadas.put(multaDaAtualizacao.getMulta().getNomeTerceiro(), new ArrayList());
            }
            ((List)mapaMultasInformadas.get(multaDaAtualizacao.getMulta().getNomeTerceiro())).add(multaDaAtualizacao);
        }
        ArrayList entradasInformadasJaProcessadas = new ArrayList();
        for (Map.Entry entry : mapaMultasCalculadas.entrySet()) {
            void var7_18;
            StringBuilder stringBuilder = new StringBuilder();
            BigDecimal bigDecimal = BigDecimal.ZERO;
            count = 0;
            for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                void var7_13;
                if (multaDaAtualizacao.getValorRemanescenteMulta() == null || ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) && ultimoOutrosDebitosReclamado.get(0).getDataInicialPeriodo().equals(ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo()) || ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(this.calculo.getDataDeLiquidacao())) {
                    BigDecimal bigDecimal2 = Utils.somar((BigDecimal)var7_13, multaDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var7_13);
                } else {
                    BigDecimal bigDecimal4 = Utils.somar((BigDecimal)var7_13, multaDaAtualizacao.getDiferencaCalculadaRemanescente(ultimoOutrosDebitosReclamado.get(0).getIndiceDeCorrecao()), (BigDecimal)var7_13);
                    bigDecimal4 = Utils.somar(bigDecimal4, multaDaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : ultimoOutrosDebitosReclamado.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaDaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM), multaDaAtualizacao.getPagoJuro()), bigDecimal4);
                }
                ++count;
                stringBuilder.append(multaDaAtualizacao.getMulta().getDescricao());
                stringBuilder.append("# ");
            }
            for (Map.Entry entry2 : mapaMultasInformadas.entrySet()) {
                if (!((String)entry.getKey()).equals(entry2.getKey())) continue;
                entradasInformadasJaProcessadas.add(entry2.getKey());
                for (MultaDaAtualizacao multaDaAtualizacao : (List)entry2.getValue()) {
                    BigDecimal taxaJurosMulta2 = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoOutrosDebitosReclamado.get(0).getTaxaDeJuros();
                    BigDecimal bigDecimal5 = Utils.somar((BigDecimal)var7_18, ResumoPagamentoUtils.calcularTotalDiferencaMultaInformadoResumo(multaDaAtualizacao, ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo(), taxaJurosMulta2), (BigDecimal)var7_18);
                    ++count;
                    stringBuilder.append(multaDaAtualizacao.getMulta().getDescricao());
                    stringBuilder.append("# ");
                }
            }
            if (count > 0) {
                stringBuilder.replace(stringBuilder.length() - 2, stringBuilder.length(), "");
            }
            if (count > 1) {
                int inicio = stringBuilder.lastIndexOf("#");
                stringBuilder.replace(inicio, inicio + 1, " e");
            }
            if (BigDecimal.ZERO.compareTo((BigDecimal)var7_18) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var7_18)));
        }
        for (Map.Entry entry : mapaMultasInformadas.entrySet()) {
            void var7_22;
            StringBuilder stringBuilder = new StringBuilder();
            BigDecimal bigDecimal = BigDecimal.ZERO;
            count = 0;
            if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
            for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                taxaJurosMulta = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoOutrosDebitosReclamado.get(0).getTaxaDeJuros();
                BigDecimal bigDecimal6 = Utils.somar((BigDecimal)var7_22, ResumoPagamentoUtils.calcularTotalDiferencaMultaInformadoResumo(multaDaAtualizacao, ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo(), (BigDecimal)((Object)taxaJurosMulta)), (BigDecimal)var7_22);
                ++count;
                stringBuilder.append(multaDaAtualizacao.getMulta().getDescricao());
                stringBuilder.append("# ");
            }
            if (count > 0) {
                stringBuilder.replace(stringBuilder.length() - 2, stringBuilder.length(), "");
            }
            if (count > 1) {
                int inicio = stringBuilder.lastIndexOf("#");
                stringBuilder.replace(inicio, inicio + 1, " e");
            }
            if (BigDecimal.ZERO.compareTo((BigDecimal)var7_22) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var7_22)));
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
            void var7_31;
            StringBuilder stringBuilder = new StringBuilder();
            BigDecimal bigDecimal = BigDecimal.ZERO;
            count = 0;
            for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                void var7_26;
                if (multaDaAtualizacao.getValorRemanescenteMulta() == null || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(multaDaAtualizacao.getMulta().getDataEvento()) && ultimoDebitosDoReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(this.calculo.getDataDeLiquidacao())) {
                    BigDecimal bigDecimal7 = Utils.somar((BigDecimal)var7_26, multaDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var7_26);
                } else {
                    BigDecimal bigDecimal9 = Utils.somar((BigDecimal)var7_26, multaDaAtualizacao.getDiferencaCalculadaRemanescente(ultimoDebitosDoReclamante.get(0).getIndiceDeCorrecao()), (BigDecimal)var7_26);
                    bigDecimal9 = Utils.somar(bigDecimal9, multaDaAtualizacao.getMulta().getTipoBaseMulta().equals((Object)BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) ? BigDecimal.ZERO : ultimoDebitosDoReclamante.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(multaDaAtualizacao.getMulta().getAliquotaMulta().divide(Utils.CEM), multaDaAtualizacao.getPagoJuro()), bigDecimal9);
                }
                ++count;
                stringBuilder.append(multaDaAtualizacao.getMulta().getDescricao());
                stringBuilder.append("# ");
            }
            for (Map.Entry entry3 : mapaMultasInformadas.entrySet()) {
                if (!((String)entry.getKey()).equals(entry3.getKey())) continue;
                entradasInformadasJaProcessadas.add(entry3.getKey());
                for (MultaDaAtualizacao multaDaAtualizacao : (List)entry3.getValue()) {
                    BigDecimal taxaJurosMulta2 = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoDebitosDoReclamante.get(0).getTaxaDeJuros();
                    BigDecimal bigDecimal10 = Utils.somar((BigDecimal)var7_31, ResumoPagamentoUtils.calcularTotalDiferencaMultaInformadoResumo(multaDaAtualizacao, ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo(), taxaJurosMulta2), (BigDecimal)var7_31);
                    ++count;
                    stringBuilder.append(multaDaAtualizacao.getMulta().getDescricao());
                    stringBuilder.append("# ");
                }
            }
            if (count > 0) {
                stringBuilder.replace(stringBuilder.length() - 2, stringBuilder.length(), "");
            }
            if (count > 1) {
                int inicio = stringBuilder.lastIndexOf("#");
                stringBuilder.replace(inicio, inicio + 1, " e");
            }
            if (BigDecimal.ZERO.compareTo((BigDecimal)var7_31) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var7_31)));
        }
        for (Map.Entry entry : mapaMultasInformadas.entrySet()) {
            void var7_35;
            StringBuilder stringBuilder = new StringBuilder();
            BigDecimal bigDecimal = BigDecimal.ZERO;
            count = 0;
            if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
            for (MultaDaAtualizacao multaDaAtualizacao : (List)entry.getValue()) {
                taxaJurosMulta = multaDaAtualizacao.getTaxaJurosMulta() != null ? multaDaAtualizacao.getTaxaJurosMulta() : ultimoDebitosDoReclamante.get(0).getTaxaDeJuros();
                BigDecimal bigDecimal11 = Utils.somar((BigDecimal)var7_35, ResumoPagamentoUtils.calcularTotalDiferencaMultaInformadoResumo(multaDaAtualizacao, ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo(), (BigDecimal)((Object)taxaJurosMulta)), (BigDecimal)var7_35);
                ++count;
                stringBuilder.append(multaDaAtualizacao.getMulta().getDescricao());
                stringBuilder.append("# ");
            }
            if (count > 0) {
                stringBuilder.replace(stringBuilder.length() - 2, stringBuilder.length(), "");
            }
            if (count > 1) {
                int inicio = stringBuilder.lastIndexOf("#");
                stringBuilder.replace(inicio, inicio + 1, " e");
            }
            if (BigDecimal.ZERO.compareTo((BigDecimal)var7_35) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, stringBuilder.toString().replaceAll("#", ",") + PARA + (String)entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var7_35)));
        }
        HashMap mapaHonorariosCalculados = new HashMap();
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : ultimoOutrosDebitosReclamado.get(0).getHonorariosDaAtualizacaoCalculado()) {
            if (!mapaHonorariosCalculados.containsKey(honorarioDaAtualizacao.getHonorario().getNomeCredor())) {
                mapaHonorariosCalculados.put(honorarioDaAtualizacao.getHonorario().getNomeCredor(), new ArrayList());
            }
            ((List)mapaHonorariosCalculados.get(honorarioDaAtualizacao.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao);
        }
        HashMap hashMap = new HashMap();
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : ultimoOutrosDebitosReclamado.get(0).getHonorariosDaAtualizacaoInformado()) {
            if (!hashMap.containsKey(honorarioDaAtualizacao.getHonorario().getNomeCredor())) {
                hashMap.put(honorarioDaAtualizacao.getHonorario().getNomeCredor(), new ArrayList());
            }
            ((List)hashMap.get(honorarioDaAtualizacao.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao);
        }
        entradasInformadasJaProcessadas.clear();
        for (Map.Entry entry : mapaHonorariosCalculados.entrySet()) {
            void var11_70;
            BigDecimal bigDecimal = BigDecimal.ZERO;
            BigDecimal totalIRPF = BigDecimal.ZERO;
            for (HonorarioDaAtualizacao honorarioDaAtualizacao : (List)entry.getValue()) {
                void var11_64;
                if (honorarioDaAtualizacao.getValorRemanescenteHonorario() == null || ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(honorarioDaAtualizacao.getHonorario().getDataEvento()) && ultimoOutrosDebitosReclamado.get(0).getDataInicialPeriodo().equals(ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo()) || ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo().equals(ultimoOutrosDebitosReclamado.get(0).getCalculo().getDataDeLiquidacao())) {
                    BigDecimal bigDecimal12 = Utils.somar((BigDecimal)var11_64, honorarioDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var11_64);
                    if (!Utils.naoNulo(honorarioDaAtualizacao.getValorImpostoRendaSaldo())) continue;
                    totalIRPF = Utils.somar(totalIRPF, honorarioDaAtualizacao.getValorImpostoRendaSaldo(), totalIRPF);
                    continue;
                }
                BigDecimal bigDecimal15 = Utils.somar((BigDecimal)var11_64, honorarioDaAtualizacao.getDiferencaCalculadaRemanescente(ultimoOutrosDebitosReclamado.get(0).getIndiceDeCorrecao()), (BigDecimal)var11_64);
                bigDecimal15 = Utils.somar(bigDecimal15, ultimoOutrosDebitosReclamado.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM), honorarioDaAtualizacao.getPagoJuro()), bigDecimal15);
                bigDecimal15 = Utils.somar(bigDecimal15, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.calcularHonorariosSobreMultas(ultimoOutrosDebitosReclamado.get(0).getCreditosDoReclamante()), honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), honorarioDaAtualizacao.getPagoSobreMultas()), bigDecimal15);
                if (!Utils.naoNulo(honorarioDaAtualizacao.getValorImpostoRendaSaldo())) continue;
                totalIRPF = Utils.somar(totalIRPF, honorarioDaAtualizacao.getValorImpostoRendaSaldo(), totalIRPF);
            }
            for (Map.Entry entry4 : hashMap.entrySet()) {
                if (!((String)entry.getKey()).equals(entry4.getKey())) continue;
                entradasInformadasJaProcessadas.add(entry4.getKey());
                for (HonorarioDaAtualizacao honorarioInformado : (List)entry4.getValue()) {
                    if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)honorarioInformado.getHonorario().getTipoCobrancaReclamante())) continue;
                    BigDecimal taxaJurosHonorario2 = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : ultimoOutrosDebitosReclamado.get(0).getTaxaDeJuros();
                    List<BigDecimal> totais2 = ResumoPagamentoUtils.calcularTotalDiferencaHonorarioInformadoResumo(honorarioInformado, ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo(), taxaJurosHonorario2);
                    BigDecimal bigDecimal16 = Utils.somar((BigDecimal)var11_70, totais2.get(0), (BigDecimal)var11_70);
                    totalIRPF = Utils.somar(totalIRPF, totais2.get(1), totalIRPF);
                }
            }
            BigDecimal totalLiquido2 = var11_70.subtract(totalIRPF, Utils.CONTEXTO_MATEMATICO);
            if (totalLiquido2 == null || BigDecimal.ZERO.compareTo(totalLiquido2) > 0) {
                totalLiquido2 = BigDecimal.ZERO;
                this.parcelasPagasAMaiorDebitosReclamado.add(HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey(), Utils.zerarSeNegativo(totalLiquido2)));
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, this.selecionarFraseImpostoHonorario((List)entry.getValue()) + (String)entry.getKey(), Utils.zerarSeNegativo(totalIRPF)));
        }
        for (Map.Entry entry : hashMap.entrySet()) {
            void var16_139;
            void var11_74;
            BigDecimal bigDecimal = BigDecimal.ZERO;
            BigDecimal totalIRPF = BigDecimal.ZERO;
            if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
            for (HonorarioDaAtualizacao honorarioInformado : (List)entry.getValue()) {
                taxaJurosHonorario = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : ultimoOutrosDebitosReclamado.get(0).getTaxaDeJuros();
                totais = ResumoPagamentoUtils.calcularTotalDiferencaHonorarioInformadoResumo(honorarioInformado, ultimoOutrosDebitosReclamado.get(0).getDataFinalPeriodo(), (BigDecimal)taxaJurosHonorario);
                BigDecimal bigDecimal17 = Utils.somar((BigDecimal)var11_74, totais.get(0), (BigDecimal)var11_74);
                totalIRPF = Utils.somar(totalIRPF, (BigDecimal)totais.get(1), totalIRPF);
            }
            BigDecimal bigDecimal18 = var11_74.subtract(totalIRPF, Utils.CONTEXTO_MATEMATICO);
            if (bigDecimal18 == null || BigDecimal.ZERO.compareTo(bigDecimal18) > 0) {
                BigDecimal bigDecimal19 = BigDecimal.ZERO;
                this.parcelasPagasAMaiorDebitosReclamado.add(HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var16_139)));
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, this.selecionarFraseImpostoHonorario((List)entry.getValue()) + (String)entry.getKey(), Utils.zerarSeNegativo(totalIRPF)));
        }
        mapaHonorariosCalculados.clear();
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : ultimoDebitosDoReclamante.get(0).getHonorariosDaAtualizacaoCalculado()) {
            if (!mapaHonorariosCalculados.containsKey(honorarioDaAtualizacao.getHonorario().getNomeCredor())) {
                mapaHonorariosCalculados.put(honorarioDaAtualizacao.getHonorario().getNomeCredor(), new ArrayList());
            }
            ((List)mapaHonorariosCalculados.get(honorarioDaAtualizacao.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao);
        }
        hashMap.clear();
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : ultimoDebitosDoReclamante.get(0).getHonorariosDaAtualizacaoInformado()) {
            if (!hashMap.containsKey(honorarioDaAtualizacao.getHonorario().getNomeCredor())) {
                hashMap.put(honorarioDaAtualizacao.getHonorario().getNomeCredor(), new ArrayList());
            }
            ((List)hashMap.get(honorarioDaAtualizacao.getHonorario().getNomeCredor())).add(honorarioDaAtualizacao);
        }
        entradasInformadasJaProcessadas.clear();
        for (Map.Entry entry : mapaHonorariosCalculados.entrySet()) {
            void var11_84;
            BigDecimal bigDecimal = BigDecimal.ZERO;
            BigDecimal totalIRPF = BigDecimal.ZERO;
            for (HonorarioDaAtualizacao honorarioDaAtualizacao : (List)entry.getValue()) {
                void var11_78;
                if (honorarioDaAtualizacao.getValorRemanescenteHonorario() == null || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(honorarioDaAtualizacao.getHonorario().getDataEvento()) && ultimoDebitosDoReclamante.get(0).getDataInicialPeriodo().equals(ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo()) || ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo().equals(ultimoDebitosDoReclamante.get(0).getCalculo().getDataDeLiquidacao())) {
                    BigDecimal bigDecimal20 = Utils.somar((BigDecimal)var11_78, honorarioDaAtualizacao.getDiferencaCalculadaOutros(), (BigDecimal)var11_78);
                    if (!Utils.naoNulo(honorarioDaAtualizacao.getValorImpostoRendaSaldo())) continue;
                    totalIRPF = Utils.somar(totalIRPF, honorarioDaAtualizacao.getValorImpostoRendaSaldo(), totalIRPF);
                    continue;
                }
                BigDecimal bigDecimal23 = Utils.somar((BigDecimal)var11_78, honorarioDaAtualizacao.getDiferencaCalculadaRemanescente(ultimoDebitosDoReclamante.get(0).getIndiceDeCorrecao()), (BigDecimal)var11_78);
                bigDecimal23 = Utils.somar(bigDecimal23, ultimoDebitosDoReclamante.get(0).getCreditosDoReclamante().getDiferencaMultaCalculadaSobreJurosDoPeriodo(honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM), honorarioDaAtualizacao.getPagoJuro()), bigDecimal23);
                bigDecimal23 = Utils.somar(bigDecimal23, Utils.subtrair(Utils.arredondarValorMonetario(Utils.multiplicar(honorarioDaAtualizacao.calcularHonorariosSobreMultas(ultimoDebitosDoReclamante.get(0).getCreditosDoReclamante()), honorarioDaAtualizacao.getHonorario().getAliquota().divide(Utils.CEM))), honorarioDaAtualizacao.getPagoSobreMultas()), bigDecimal23);
                if (!Utils.naoNulo(honorarioDaAtualizacao.getValorImpostoRendaSaldo())) continue;
                totalIRPF = Utils.somar(totalIRPF, honorarioDaAtualizacao.getValorImpostoRendaSaldo(), totalIRPF);
            }
            for (Map.Entry entry5 : hashMap.entrySet()) {
                if (!((String)entry.getKey()).equals(entry5.getKey())) continue;
                entradasInformadasJaProcessadas.add(entry5.getKey());
                for (HonorarioDaAtualizacao honorarioInformado : (List)entry5.getValue()) {
                    BigDecimal taxaJurosHonorario2 = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : ultimoDebitosDoReclamante.get(0).getTaxaDeJuros();
                    List<BigDecimal> totais2 = ResumoPagamentoUtils.calcularTotalDiferencaHonorarioInformadoResumo(honorarioInformado, ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo(), taxaJurosHonorario2);
                    BigDecimal bigDecimal24 = Utils.somar((BigDecimal)var11_84, totais2.get(0), (BigDecimal)var11_84);
                    totalIRPF = Utils.somar(totalIRPF, totais2.get(1), totalIRPF);
                }
            }
            BigDecimal totalLiquido = var11_84.subtract(totalIRPF, Utils.CONTEXTO_MATEMATICO);
            if (totalLiquido == null || BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
                this.parcelasPagasAMaiorDebitosReclamado.add(HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey(), Utils.zerarSeNegativo(totalLiquido)));
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, this.selecionarFraseImpostoHonorario((List)entry.getValue()) + (String)entry.getKey(), Utils.zerarSeNegativo(totalIRPF)));
        }
        for (Map.Entry entry : hashMap.entrySet()) {
            void var16_147;
            void var11_88;
            BigDecimal bigDecimal = BigDecimal.ZERO;
            BigDecimal totalIRPF = BigDecimal.ZERO;
            if (entradasInformadasJaProcessadas.contains(entry.getKey())) continue;
            for (HonorarioDaAtualizacao honorarioInformado : (List)entry.getValue()) {
                taxaJurosHonorario = honorarioInformado.getTaxaJurosHonorario() != null ? honorarioInformado.getTaxaJurosHonorario() : ultimoDebitosDoReclamante.get(0).getTaxaDeJuros();
                totais = ResumoPagamentoUtils.calcularTotalDiferencaHonorarioInformadoResumo(honorarioInformado, ultimoDebitosDoReclamante.get(0).getDataFinalPeriodo(), (BigDecimal)taxaJurosHonorario);
                BigDecimal bigDecimal25 = Utils.somar((BigDecimal)var11_88, (BigDecimal)totais.get(0), (BigDecimal)var11_88);
                totalIRPF = Utils.somar(totalIRPF, (BigDecimal)totais.get(1), totalIRPF);
            }
            BigDecimal bigDecimal26 = var11_88.subtract(totalIRPF, Utils.CONTEXTO_MATEMATICO);
            if (bigDecimal26 == null || BigDecimal.ZERO.compareTo(bigDecimal26) > 0) {
                BigDecimal bigDecimal27 = BigDecimal.ZERO;
                this.parcelasPagasAMaiorDebitosReclamado.add(HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey());
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, HONORARIOS_LIQUIDOS_PARA + (String)entry.getKey(), Utils.zerarSeNegativo((BigDecimal)var16_147)));
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, this.selecionarFraseImpostoHonorario((List)entry.getValue()) + (String)entry.getKey(), Utils.zerarSeNegativo(totalIRPF)));
        }
        if (Boolean.TRUE.equals(this.calculo.getIrpf().getApurarImpostoRenda()) && Utils.naoNulo(ultimoDebitosDoReclamante.get(0).getDiferencaIrpf())) {
            BigDecimal valorIrpfAindaDevido = this.calculo.getIrpf().getTotalDiferecaComJurosEMultaAtualizacao();
            if (Boolean.TRUE.equals(this.calculo.getIrpf().getCobrarDoReclamado())) {
                this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF devido pelo Reclamado", valorIrpfAindaDevido));
            } else if (PagamentoUtils.verificaSeExisteImpostoParaReclamante(this.calculo).booleanValue()) {
                this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF devido pelo Reclamante", valorIrpfAindaDevido));
            }
        }
        if (Boolean.TRUE.equals(this.calculo.getFgts().getMulta10()) && PagamentoUtils.verificaSeExisteInssDezPorcento(this.calculo).booleanValue()) {
            BigDecimal valorMultaDez = ultimoOutrosDebitosReclamado.get(0).getDiferencaInssDez();
            if (BigDecimal.ZERO.compareTo(valorMultaDez) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(CONTRIBUICAO_SOCIAL_DEZ);
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CONTRIBUICAO_SOCIAL_DEZ, Utils.zerarSeNegativo(valorMultaDez)));
        }
        if (Boolean.TRUE.equals(this.calculo.getFgts().getContribuicaoSocial05()) && PagamentoUtils.verificaSeExisteInssMeioPorcento(this.calculo).booleanValue()) {
            BigDecimal valorMultaMeio = ultimoOutrosDebitosReclamado.get(0).getDiferencaInssMeio();
            if (BigDecimal.ZERO.compareTo(valorMultaMeio) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(CONTRIBUICAO_SOCIAL_MEIO);
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CONTRIBUICAO_SOCIAL_MEIO, Utils.zerarSeNegativo(valorMultaMeio)));
        }
        if (Utils.naoNulo(ultimoOutrosDebitosReclamado.get(0).getDiferencaCustasJudiciais()) && PagamentoUtils.verificaSeExisteCustaJudicialDoReclamado(this.calculo).booleanValue()) {
            BigDecimal valorCustaReclamado = ultimoOutrosDebitosReclamado.get(0).getDiferencaCustasJudiciais();
            if (BigDecimal.ZERO.compareTo(valorCustaReclamado) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add(CUSTAS_JUDICIAIS_RECLAMADO);
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CUSTAS_JUDICIAIS_RECLAMADO, Utils.zerarSeNegativo(valorCustaReclamado)));
        }
        if (Utils.naoNulo(ultimoDebitosDoReclamante.get(0).getDiferencaCustasJudiciais()) && PagamentoUtils.verificaSeExisteCustaDoReclamanteAPagar(this.calculo).booleanValue()) {
            BigDecimal valorCustaReclamante = ultimoDebitosDoReclamante.get(0).getDiferencaCustasJudiciais();
            if (BigDecimal.ZERO.compareTo(valorCustaReclamante) > 0) {
                this.parcelasPagasAMaiorDebitosReclamado.add("Custas Judiciais devidas pelo Reclamante");
            }
            this.appender.append(new ResumoJRAdapterPagamento.ItemResumo(ResumoJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Custas Judiciais devidas pelo Reclamante", Utils.zerarSeNegativo(valorCustaReclamante)));
        }
    }

    @Override
    public JRAdapterDataSource<JREmptyDS> getEmptyDS() {
        return new JRAdapterDataSource<JREmptyDS>(new JREmptyDS(), Arrays.asList(new Object()));
    }

    private String selecionarFraseImpostoHonorario(List<HonorarioDaAtualizacao> honorarios) {
        if (honorarios != null && honorarios.size() == 1) {
            Honorario honorario = honorarios.get(0).getHonorario();
            if (honorario.getApurarIRRF().booleanValue() && TipoDeImpostoDeRendaEnum.PESSOA_FISICA.equals((Object)honorario.getTipoImpostoRenda())) {
                return IRPF_SOBRE_HONORARIOS_PARA;
            }
            if (honorario.getApurarIRRF().booleanValue() && TipoDeImpostoDeRendaEnum.PESSOA_JURIDICA.equals((Object)honorario.getTipoImpostoRenda())) {
                return IRPJ_SOBRE_HONORARIOS_PARA;
            }
        }
        return IRRF_SOBRE_HONORARIOS_PARA;
    }

    public class OcorrenciaResumoPadrao
    extends ResumoJRAdapterPagamento.OcorrenciaResumoJRAdapter {
        private ResumoJRAdapterPagamento.ItemResumo item;

        @Override
        public OcorrenciaResumoPadrao adapt(Object adapted) {
            this.item = (ResumoJRAdapterPagamento.ItemResumo)adapted;
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

