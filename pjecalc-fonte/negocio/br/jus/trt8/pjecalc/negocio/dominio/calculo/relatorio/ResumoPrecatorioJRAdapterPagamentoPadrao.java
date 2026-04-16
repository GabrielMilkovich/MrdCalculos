/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeImpostoDeRendaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPagamentoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJRAdapterPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class ResumoPrecatorioJRAdapterPagamentoPadrao
extends ResumoPrecatorioJRAdapterPagamento {
    private static final String HONORARIOS_LIQUIDOS_PARA = "Honor\u00e1rios L\u00edquidos para ";
    private static final String IRPF_SOBRE_HONORARIOS_PARA = "IRPF sobre Honor\u00e1rios para ";
    private static final String IRPJ_SOBRE_HONORARIOS_PARA = "IRPJ sobre Honor\u00e1rios para ";
    private static final String IRRF_SOBRE_HONORARIOS_PARA = "IRRF sobre Honor\u00e1rios para ";
    private static final String DEPOSITO_FGTS = "Dep\u00f3sito FGTS";
    private static final String CONTRIBUICAO_SOCIAL = "INSS Benefici\u00e1rio";
    private static final String CONTRIBUICAO_SOCIAL_DEVIDO = "INSS Executado - Sal\u00e1rios Devidos";
    private static final String CONTRIBUICAO_SOCIAL_PAGO = "INSS Executado - Sal\u00e1rios Pagos";
    private static final String IMPOSTO_RENDA = "Imposto de Renda";
    private static final String CUSTAS_JUDICIAIS_EXEQUENTE = "Custas Judiciais - Exequente";
    private static final String CUSTAS_JUDICIAIS_EXECUTADO = "Custas Judiciais - Executado";
    private Calculo calculo;
    private ResumoPrecatorioJRAdapterPagamento.ItensResumoAppender appender = new ResumoPrecatorioJRAdapterPagamento.ItensResumoAppender();
    private String descritivoDeEventosResumo;
    private StringBuilder observacaoPagamentosAMaiorReclamada;
    private StringBuilder observacaoPagamentosAMaiorReclamante;
    private List<String> parcelasPagasAMaiorDebitosCobrarDoReclamante;
    private List<String> parcelasPagasAMaiorDebitosReclamado;

    public ResumoPrecatorioJRAdapterPagamentoPadrao(Calculo calculo) {
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
    public JRAdapterDataSource<ResumoPrecatorioJRAdapterPagamento.OcorrenciaResumoJRAdapter> getOcorrenciasDebitoReclamado() {
        return new JRAdapterDataSource<ResumoPrecatorioJRAdapterPagamento.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensDebitoReclamado());
    }

    @Override
    public JRAdapterDataSource<ResumoPrecatorioJRAdapterPagamento.OcorrenciaResumoJRAdapter> getOcorrenciasDebitoCobrarReclamante() {
        return new JRAdapterDataSource<ResumoPrecatorioJRAdapterPagamento.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensDebitoCobrarReclamante());
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

    private void popularSecaoDebitoCobrarReclamante() {
        List<DebitosCobrarDoReclamante> ultimoDebitosCobrarReclamante = DebitosCobrarDoReclamante.obterUltimoRegistro(this.calculo.getAtualizacao());
        if (Utils.nulo(ultimoDebitosCobrarReclamante) || ultimoDebitosCobrarReclamante.isEmpty()) {
            return;
        }
        ArrayList<HonorarioDaAtualizacao> honorariosDaAtualizacao = new ArrayList<HonorarioDaAtualizacao>();
        honorariosDaAtualizacao.addAll(ultimoDebitosCobrarReclamante.get(0).getHonorariosDaAtualizacaoCalculado());
        honorariosDaAtualizacao.addAll(ultimoDebitosCobrarReclamante.get(0).getHonorariosDaAtualizacaoInformado());
        for (HonorarioDaAtualizacao honorarioAtualizacao : honorariosDaAtualizacao) {
            BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao()), honorarioAtualizacao.getPagoHonorario()));
            BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorJuros(), honorarioAtualizacao.getIndiceDeCorrecao()));
            if (Utils.nulo(devido)) {
                devido = BigDecimal.ZERO;
            }
            BigDecimal taxaDeJurosHonorario = honorarioAtualizacao.getTaxaJurosHonorario() != null ? honorarioAtualizacao.getTaxaJurosHonorario() : ultimoDebitosCobrarReclamante.get(0).getTaxaDeJuros();
            BigDecimal base = honorarioAtualizacao.getHonorario().getAplicarJuros() != false || TipoValorEnum.CALCULADO.equals((Object)honorarioAtualizacao.getHonorario().getTipoValor()) ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosHonorario.divide(Utils.CEM)));
            BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioAtualizacao.getPagoJuro()));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioAtualizacao.getPagoJuroPeriodoAtual()));
            BigDecimal totalLiquido = BigDecimal.ZERO;
            totalLiquido = Utils.somar(totalLiquido, diferencaHonorario);
            totalLiquido = Utils.somar(totalLiquido, diferencaJuro);
            totalLiquido = Utils.somar(totalLiquido, diferencaJuroAtual);
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, HONORARIOS_LIQUIDOS_PARA + honorarioAtualizacao.getHonorario().getNomeCredor(), Utils.zerarSeNegativo(totalLiquido)));
            BigDecimal totalIR = BigDecimal.ZERO;
            totalIR = Utils.somar(totalIR, honorarioAtualizacao.getValorImpostoRenda(), totalIR);
            totalIR = Utils.multiplicar(totalIR, honorarioAtualizacao.getIndiceDeCorrecao(), totalIR);
            totalIR = Utils.subtrair(totalIR, honorarioAtualizacao.getPagoImpostoRenda(), totalIR);
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, this.selecionarFraseImpostoHonorario(Collections.singletonList(honorarioAtualizacao)) + honorarioAtualizacao.getHonorario().getNomeCredor(), Utils.zerarSeNegativo(totalIR)));
        }
    }

    private void popularSecaoDebitoReclamado() {
        List<CreditosDoReclamante> ultimoCreditosDoReclamante = CreditosDoReclamante.obterUltimoRegistro(this.calculo.getAtualizacao());
        List<DebitosDoReclamante> ultimoDebitosDoReclamante = DebitosDoReclamante.obterUltimoRegistro(this.calculo.getAtualizacao());
        List<OutrosDebitosReclamado> ultimoOutrosDebitosReclamado = OutrosDebitosReclamado.obterUltimoRegistro(this.calculo.getAtualizacao());
        BigDecimal liquidoReclamante = BigDecimal.ZERO;
        if (PagamentoUtils.verificaSeExisteValorPrincipalParaCreditoDeReclamante(this.calculo).booleanValue()) {
            liquidoReclamante = liquidoReclamante.add(ultimoCreditosDoReclamante.get(0).getDiferencaPrincipal());
            liquidoReclamante = liquidoReclamante.add(ultimoCreditosDoReclamante.get(0).getDiferencaJuroDeMoraPrincipal());
            liquidoReclamante = liquidoReclamante.add(ultimoCreditosDoReclamante.get(0).getDiferencaJuroDeMoraPrincipalPeriodoAtual());
        }
        if (this.calculo.getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.PAGAR) && PagamentoUtils.verificaSeExisteFgtsParaCreditoDeReclamante(this.calculo).booleanValue()) {
            liquidoReclamante = liquidoReclamante.add(ultimoCreditosDoReclamante.get(0).getDiferencaFgts());
            liquidoReclamante = liquidoReclamante.add(ultimoCreditosDoReclamante.get(0).getDiferencaJuroDeMoraFgts());
            liquidoReclamante = liquidoReclamante.add(ultimoCreditosDoReclamante.get(0).getDiferencaJuroDeMoraFgtsPeriodoAtual());
        }
        this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "L\u00edquido devido ao Reclamante", liquidoReclamante));
        if (BigDecimal.ZERO.compareTo(ultimoDebitosDoReclamante.get(0).getDiferencaFgts()) > 0) {
            this.parcelasPagasAMaiorDebitosReclamado.add(DEPOSITO_FGTS);
        }
        BigDecimal totalDiferencaFGTS = BigDecimal.ZERO;
        if (this.calculo.getFgts().getDestinoDoFgts().equals((Object)DestinoDoFgtsEnum.DEPOSITAR) && PagamentoUtils.verificaSeExisteFgtsParaCreditoDeReclamante(this.calculo).booleanValue()) {
            totalDiferencaFGTS = Utils.somar(ultimoDebitosDoReclamante.get(0).getDiferencaFgts(), totalDiferencaFGTS);
            totalDiferencaFGTS = Utils.somar(ultimoDebitosDoReclamante.get(0).getDiferencaJuroDeMoraFgts(), totalDiferencaFGTS);
            totalDiferencaFGTS = Utils.somar(ultimoDebitosDoReclamante.get(0).getDiferencaJuroDeMoraFgtsPeriodoAtual(), totalDiferencaFGTS);
        }
        this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, DEPOSITO_FGTS, BigDecimal.ZERO.compareTo(ultimoDebitosDoReclamante.get(0).getDiferencaFgts()) > 0 ? BigDecimal.ZERO : totalDiferencaFGTS));
        if (PagamentoUtils.verificaSeExisteDescontoContribuicaoSocialReclamante(this.calculo).booleanValue()) {
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CONTRIBUICAO_SOCIAL, ultimoDebitosDoReclamante.get(0).getDiferencaInssPrecatorio()));
        }
        if (PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosDevidos(this.calculo).booleanValue()) {
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CONTRIBUICAO_SOCIAL_DEVIDO, ultimoOutrosDebitosReclamado.get(0).getDiferencaContribuicaoSocialSalariosDevidosPrecatorio()));
        }
        if (PagamentoUtils.verificaSeExisteContribuicaoSocialSalariosPagos(this.calculo).booleanValue()) {
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CONTRIBUICAO_SOCIAL_PAGO, ultimoOutrosDebitosReclamado.get(0).getDiferencaContribuicaoSocialSalariosPagosPrecatorio()));
        }
        if (PagamentoUtils.verificaSeExisteImpostoParaReclamante(this.calculo).booleanValue()) {
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, IMPOSTO_RENDA, ultimoDebitosDoReclamante.get(0).getDiferencaIrpfPrecatorio()));
        }
        if (PagamentoUtils.verificaSeExisteCustaDoReclamanteAPagar(this.calculo).booleanValue()) {
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CUSTAS_JUDICIAIS_EXEQUENTE, ultimoDebitosDoReclamante.get(0).getDiferencaCustasJudiciaisPrecatorio()));
        }
        if (PagamentoUtils.verificaSeExisteCustaJudicialDoReclamado(this.calculo).booleanValue()) {
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, CUSTAS_JUDICIAIS_EXECUTADO, ultimoOutrosDebitosReclamado.get(0).getDiferencaCustasJudiciaisPrecatorio()));
        }
        ArrayList<HonorarioDaAtualizacao> honorariosDaAtualizacaoOutrosDebitosReclamado = new ArrayList<HonorarioDaAtualizacao>();
        honorariosDaAtualizacaoOutrosDebitosReclamado.addAll(ultimoOutrosDebitosReclamado.get(0).getHonorariosDaAtualizacaoCalculado());
        honorariosDaAtualizacaoOutrosDebitosReclamado.addAll(ultimoOutrosDebitosReclamado.get(0).getHonorariosDaAtualizacaoInformado());
        for (HonorarioDaAtualizacao honorarioAtualizacao : honorariosDaAtualizacaoOutrosDebitosReclamado) {
            BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao()), honorarioAtualizacao.getPagoHonorario()));
            BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorJuros(), honorarioAtualizacao.getIndiceDeCorrecao()));
            if (Utils.nulo(devido)) {
                devido = BigDecimal.ZERO;
            }
            BigDecimal taxaDeJurosHonorario = honorarioAtualizacao.getTaxaJurosHonorario() != null ? honorarioAtualizacao.getTaxaJurosHonorario() : ultimoOutrosDebitosReclamado.get(0).getTaxaDeJuros();
            BigDecimal base = honorarioAtualizacao.getHonorario().getAplicarJuros() != false || TipoValorEnum.CALCULADO.equals((Object)honorarioAtualizacao.getHonorario().getTipoValor()) ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosHonorario.divide(Utils.CEM)));
            BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioAtualizacao.getPagoJuro()));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioAtualizacao.getPagoJuroPeriodoAtual()));
            BigDecimal totalLiquido = BigDecimal.ZERO;
            totalLiquido = Utils.somar(totalLiquido, diferencaHonorario);
            totalLiquido = Utils.somar(totalLiquido, diferencaJuro);
            totalLiquido = Utils.somar(totalLiquido, diferencaJuroAtual);
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, HONORARIOS_LIQUIDOS_PARA + honorarioAtualizacao.getHonorario().getNomeCredor(), Utils.zerarSeNegativo(totalLiquido)));
            BigDecimal totalIR = BigDecimal.ZERO;
            totalIR = Utils.somar(totalIR, honorarioAtualizacao.getValorImpostoRenda(), totalIR);
            totalIR = Utils.multiplicar(totalIR, honorarioAtualizacao.getIndiceDeCorrecao(), totalIR);
            totalIR = Utils.subtrair(totalIR, honorarioAtualizacao.getPagoImpostoRenda(), totalIR);
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, this.selecionarFraseImpostoHonorario(Collections.singletonList(honorarioAtualizacao)) + honorarioAtualizacao.getHonorario().getNomeCredor(), Utils.zerarSeNegativo(totalIR)));
        }
        ArrayList<HonorarioDaAtualizacao> honorariosDaAtualizacaoDebitosReclamante = new ArrayList<HonorarioDaAtualizacao>();
        honorariosDaAtualizacaoDebitosReclamante.addAll(ultimoDebitosDoReclamante.get(0).getHonorariosDaAtualizacaoCalculado());
        honorariosDaAtualizacaoDebitosReclamante.addAll(ultimoDebitosDoReclamante.get(0).getHonorariosDaAtualizacaoInformado());
        for (HonorarioDaAtualizacao honorarioAtualizacao : honorariosDaAtualizacaoDebitosReclamante) {
            BigDecimal diferencaHonorario = Utils.arredondarValorMonetario(Utils.subtrair(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao()), honorarioAtualizacao.getPagoHonorario()));
            BigDecimal devido = Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorJuros(), honorarioAtualizacao.getIndiceDeCorrecao()));
            if (Utils.nulo(devido)) {
                devido = BigDecimal.ZERO;
            }
            BigDecimal taxaDeJurosHonorario = honorarioAtualizacao.getTaxaJurosHonorario() != null ? honorarioAtualizacao.getTaxaJurosHonorario() : ultimoDebitosDoReclamante.get(0).getTaxaDeJuros();
            BigDecimal base = honorarioAtualizacao.getHonorario().getAplicarJuros() != false || TipoValorEnum.CALCULADO.equals((Object)honorarioAtualizacao.getHonorario().getTipoValor()) ? Utils.arredondarValorMonetario(Utils.multiplicar(honorarioAtualizacao.getValorHonorario(), honorarioAtualizacao.getIndiceDeCorrecao())) : BigDecimal.ZERO;
            BigDecimal dev = Utils.arredondarValorMonetario(Utils.multiplicar(base, taxaDeJurosHonorario.divide(Utils.CEM)));
            BigDecimal diferencaJuro = Utils.arredondarValorMonetario(Utils.subtrair(devido, honorarioAtualizacao.getPagoJuro()));
            BigDecimal diferencaJuroAtual = Utils.arredondarValorMonetario(Utils.subtrair(dev, honorarioAtualizacao.getPagoJuroPeriodoAtual()));
            BigDecimal totalLiquido = BigDecimal.ZERO;
            totalLiquido = Utils.somar(totalLiquido, diferencaHonorario);
            totalLiquido = Utils.somar(totalLiquido, diferencaJuro);
            totalLiquido = Utils.somar(totalLiquido, diferencaJuroAtual);
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, HONORARIOS_LIQUIDOS_PARA + honorarioAtualizacao.getHonorario().getNomeCredor(), Utils.zerarSeNegativo(totalLiquido)));
            BigDecimal totalIR = BigDecimal.ZERO;
            totalIR = Utils.somar(totalIR, honorarioAtualizacao.getValorImpostoRenda(), totalIR);
            totalIR = Utils.multiplicar(totalIR, honorarioAtualizacao.getIndiceDeCorrecao(), totalIR);
            totalIR = Utils.subtrair(totalIR, honorarioAtualizacao.getPagoImpostoRenda(), totalIR);
            this.appender.append(new ResumoPrecatorioJRAdapterPagamento.ItemResumo(ResumoPrecatorioJRAdapterPagamento.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, this.selecionarFraseImpostoHonorario(Collections.singletonList(honorarioAtualizacao)) + honorarioAtualizacao.getHonorario().getNomeCredor(), Utils.zerarSeNegativo(totalIR)));
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
    extends ResumoPrecatorioJRAdapterPagamento.OcorrenciaResumoJRAdapter {
        private ResumoPrecatorioJRAdapterPagamento.ItemResumo item;

        @Override
        public OcorrenciaResumoPadrao adapt(Object adapted) {
            this.item = (ResumoPrecatorioJRAdapterPagamento.ItemResumo)adapted;
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

