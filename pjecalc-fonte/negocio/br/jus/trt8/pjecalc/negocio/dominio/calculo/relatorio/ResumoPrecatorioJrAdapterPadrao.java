/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CustasDevidasFixasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeLiquidacaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDevedorDoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeImpostoDeRendaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustaPaga;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.AbstractResumoPrecatorioJrAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ResumoPrecatorioJrAdapterPadrao
extends AbstractResumoPrecatorioJrAdapter {
    private static final String CUSTAS_DEVIDAS_RECLAMANTE = "Custas Judiciais devidas pelo Reclamante";
    private static final String IRPF_SOBRE_HONORARIOS_PARA = "IRPF sobre Honor\u00e1rios para ";
    private static final String IRPJ_SOBRE_HONORARIOS_PARA = "IRPJ sobre Honor\u00e1rios para ";
    private static final String IRRF_SOBRE_HONORARIOS_PARA = "IRRF sobre Honor\u00e1rios para ";
    private static final String HONORARIOS_LIQUIDOS_PARA = "Honor\u00e1rios L\u00edquidos para ";
    private static final String PARA = " para ";
    private static final int ARRENDONDAMENTO_DUAS_CASAS = 2;
    public static final BigDecimal CEM = new BigDecimal("100.0");
    private boolean existemVerbasQueCompoemPrincipal = false;
    private BigDecimal depositoFGTS = null;
    private BigDecimal totalBrutoDevidoReclamanteParaCalculoDePercentual = BigDecimal.ZERO;
    private BigDecimal totalVerbasRemuneratorias = BigDecimal.ZERO;
    private BigDecimal totalVerbasTributaveis = BigDecimal.ZERO;
    private BigDecimal custasReclamanteDescontar = BigDecimal.ZERO;
    private BigDecimal multaTerceiros = BigDecimal.ZERO;
    private Calculo calculo;
    private AbstractResumoPrecatorioJrAdapter.ItensResumoPrecatorioAppender appender = new AbstractResumoPrecatorioJrAdapter.ItensResumoPrecatorioAppender();

    public ResumoPrecatorioJrAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
        this.popularItensResumoPrecatorio();
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public BigDecimal getValorTotalBruto() {
        return this.appender.getValorTotalBruto();
    }

    @Override
    public BigDecimal getJurosTotalBruto() {
        return this.appender.getJurosTotalBruto();
    }

    @Override
    public BigDecimal getTotalBruto() {
        return this.appender.getTotalBruto();
    }

    @Override
    public BigDecimal getValorTotalCreditoReclamante() {
        return this.appender.getValorTotalCreditoReclamante();
    }

    @Override
    public BigDecimal getValorTotalDebitoReclamante() {
        return this.appender.getValorTotalDebitoReclamante();
    }

    @Override
    public BigDecimal getValorLiquidoReclamante() {
        return this.appender.getValorLiquidoReclamante();
    }

    @Override
    public JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasVerbasForaDoPrincipal() {
        return new JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter>(new OcorrenciaResumoPrecatorioPadrao(), this.appender.getItensForaDoPrincipal());
    }

    @Override
    public JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasValorRequisitadoUm() {
        return new JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter>(new OcorrenciaResumoPrecatorioPadrao(), this.appender.getItensValorRequisitado());
    }

    @Override
    public BigDecimal getValorTotalRequisitadoUm() {
        return this.appender.getValorTotalRequisitado().getValor();
    }

    @Override
    public JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasValorRequisitadoDois() {
        return new JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter>(new OcorrenciaResumoPrecatorioPadrao(), this.appender.getItensValorRequisitadoDois());
    }

    @Override
    public BigDecimal getValorTotalRequisitadoDois() {
        return this.appender.getValorTotalRequisitadoDois().getValor();
    }

    @Override
    public JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasOutrosDebitosReclamante() {
        return new JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter>(new OcorrenciaResumoPrecatorioPadrao(), this.appender.getItensOutrosDebitosReclamante());
    }

    @Override
    public BigDecimal getValorTotalOutrosDebitosReclamante() {
        return this.appender.getValorTotalOutrosDebitosReclamante().getValor();
    }

    @Override
    public JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter> getOcorrenciasOutrosDebitosReclamada() {
        return new JRAdapterDataSource<AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter>(new OcorrenciaResumoPrecatorioPadrao(), this.appender.getItensOutrosDebitosReclamada());
    }

    @Override
    public BigDecimal getValorTotalOutrosDebitosReclamada() {
        return this.appender.getValorTotalOutrosDebitosReclamada().getValor();
    }

    @Override
    public BigDecimal getValorTotalRequisitadoPrecatorio() {
        return this.appender.getValorTotalRequisitadoPrecatorio();
    }

    @Override
    public void popularItensResumoPrecatorio() {
        this.popularSecaoBrutoDevidoReclamante();
        this.popularSecaoCreditoReclamante();
        this.popularSecaoDebitoReclamante();
        this.popularSecaoVerbasForaDoPrincipal();
        this.popularMultasDevidasATerceirosPeloReclamanteDescontar();
        this.popularMultasDevidasAterceirosPeloReclamanteCobrar();
        this.popularSubtotalPrecatorioUm();
        this.popularHonorarios();
        this.popularCustasJudiciaisDevidasReclamante();
        this.popularValorOutrasContribuicoes();
        this.popularMultasOutrosDebitosReclamada();
        this.popularPrevidenciaPrivada();
        this.popularPensaoAlimenticia();
        this.popularCustasPeloReclamado();
        this.popularCustasJudiciaisDevidasPeloReclamante();
        this.popularIrPeloReclamado();
    }

    private void popularSecaoVerbasForaDoPrincipal() {
        BigDecimal valorJuros = this.getJurosTotalBruto();
        BigDecimal valorPrincipalCorrigido = this.getValorTotalBruto();
        if (this.calculo.getFgts().isComporOPrincipal()) {
            if (!this.calculo.getFgts().getOcorrenciasVisiveisRelatorio().isEmpty()) {
                BigDecimal totalDaDiferenciaCorrigida = this.calculo.getFgts().getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                valorPrincipalCorrigido = valorPrincipalCorrigido.subtract(totalDaDiferenciaCorrigida);
                valorJuros = valorJuros.subtract(this.calculo.getFgts().getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
            }
            if (this.calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                BigDecimal totalDoDepositadoOuSacadoCorrigido = this.calculo.getFgts().getTotalDoDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate();
                valorPrincipalCorrigido = valorPrincipalCorrigido.subtract(totalDoDepositadoOuSacadoCorrigido);
                valorJuros = valorJuros.subtract(this.calculo.getFgts().getTotalDeJurosDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate());
            }
            if (this.calculo.getFgts().getMulta().booleanValue()) {
                BigDecimal valorDaMultaDoFgtsCorrigido = this.calculo.getFgts().getValorDaMultaDoFgtsCorrigido();
                valorPrincipalCorrigido = valorPrincipalCorrigido.subtract(valorDaMultaDoFgtsCorrigido);
                valorJuros = valorJuros.subtract(this.calculo.getFgts().getJurosDaMultaDoFgts() == null ? BigDecimal.ZERO : this.calculo.getFgts().getJurosDaMultaDoFgts());
            }
            if (this.calculo.getFgts().getMultaDoArtigo467().booleanValue()) {
                BigDecimal valorDaMultaDoArtigo467Corrigido = this.calculo.getFgts().getValorDaMultaDoArtigo467Corrigido();
                valorPrincipalCorrigido = valorPrincipalCorrigido.subtract(valorDaMultaDoArtigo467Corrigido);
                valorJuros = valorJuros.subtract(this.calculo.getFgts().getJurosDaMultaDoArtigo467());
            }
        }
        Integer meses = 0;
        BigDecimal verbasIR = BigDecimal.ZERO;
        BigDecimal baseIR = BigDecimal.ZERO;
        for (OcorrenciaDeIrpf ocorrencia : this.calculo.getIrpf().getOcorrencias()) {
            if (ocorrencia.getQuantidadeCompetencias() != null) {
                meses = meses + ocorrencia.getQuantidadeCompetencias();
            }
            if (ocorrencia.getValorVerbas() != null) {
                verbasIR = verbasIR.add(ocorrencia.getValorVerbas());
            }
            if (ocorrencia.getValorBase() == null) continue;
            baseIR = baseIR.add(ocorrencia.getValorBase());
        }
        if (meses == 0) {
            meses = 1;
        }
        this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VERBAS_FORA_DO_PRINCIPAL, "N\u00famero de meses", BigDecimal.valueOf(meses.intValue())));
        if (BigDecimal.ZERO.compareTo(valorPrincipalCorrigido) != 0) {
            BigDecimal taxaSelic = Utils.arredondarValor(valorJuros.multiply(CEM, Utils.CONTEXTO_MATEMATICO).divide(valorPrincipalCorrigido, Utils.CONTEXTO_MATEMATICO), 2);
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VERBAS_FORA_DO_PRINCIPAL, "\u00cdndice de juros ou taxa SELIC", taxaSelic + "%"));
        }
        this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VERBAS_FORA_DO_PRINCIPAL, "Valor do Juros", this.appender.getJurosTotalBruto()));
        this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VERBAS_FORA_DO_PRINCIPAL, "Valor do Principal Corrigido", this.appender.getValorTotalBruto()));
        this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VERBAS_FORA_DO_PRINCIPAL, "Valor das dedu\u00e7\u00f5es da base de c\u00e1lculo do IR", verbasIR.subtract(baseIR)));
    }

    private void popularMultasDevidasATerceirosPeloReclamanteDescontar() {
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !multa.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
            this.multaTerceiros = this.multaTerceiros.add(multa.getValorTotal());
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_DOIS, multa.getDescricao() + PARA + multa.getNomeTerceiro(), multa.getValorTotal()));
        }
    }

    private void popularMultasDevidasAterceirosPeloReclamanteCobrar() {
        BigDecimal multaTerceirosCobrar = BigDecimal.ZERO;
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !multa.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.COBRAR)) continue;
            multaTerceirosCobrar = multaTerceirosCobrar.add(multa.getValorTotal());
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.OUTROS_DEBITOS_RECLAMANTE, multa.getDescricao() + PARA + multa.getNomeTerceiro(), multa.getValorTotal()));
        }
    }

    private void popularSubtotalPrecatorioUm() {
        this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_UM, "Exeq. L\u00edquido", this.appender.getValorLiquidoReclamante()));
        BigDecimal inssBeneficiario = Utils.arredondarValorMonetario(this.calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
        this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_UM, "INSS Benefici\u00e1rio", inssBeneficiario));
        BigDecimal valorContribuicaoSocialSalariosDevidos = null;
        if (!this.calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
            valorContribuicaoSocialSalariosDevidos = Boolean.TRUE.equals(this.calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado()) ? this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSegurado() : BigDecimal.ZERO;
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssEmpresa(), valorContribuicaoSocialSalariosDevidos);
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSAT(), valorContribuicaoSocialSalariosDevidos);
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssTerceiros(), valorContribuicaoSocialSalariosDevidos);
        }
        if (valorContribuicaoSocialSalariosDevidos != null) {
            BigDecimal inssExecutado = valorContribuicaoSocialSalariosDevidos.subtract(inssBeneficiario);
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_UM, "INSS Executado", inssExecutado));
        }
        if (Boolean.TRUE.equals(this.calculo.getIrpf().getApurarImpostoRenda()) && Utils.naoNulo(this.calculo.getIrpf().getTotalValorDevido()) && Boolean.FALSE.equals(this.calculo.getIrpf().getCobrarDoReclamado())) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_UM, "IR", this.calculo.getIrpf().getTotalValorDevido()));
        }
        BigDecimal valorFGTS = this.calculo.calculaValorFgtsParaCreditoDoReclamante();
        if (DestinoDoFgtsEnum.DEPOSITAR.equals((Object)this.calculo.getFgts().getDestinoDoFgts()) && Utils.naoNulo(valorFGTS)) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_UM, "Dep\u00f3sito FGTS", this.depositoFGTS));
        }
    }

    private void popularHonorarios() {
        Map<String, List<Honorario>> mapaHonorarios = this.agruparHonorariosPorCredor(this.calculo.getHonorarios());
        for (Map.Entry<String, List<Honorario>> entry : mapaHonorarios.entrySet()) {
            for (Honorario honorario : entry.getValue()) {
                this.popularHonorarioTotalRequisitado(honorario, entry);
                this.popularHonorarioOutrosDebitosReclamante(honorario, entry);
                this.popularOutrosDebitosReclamada(honorario, entry);
            }
        }
    }

    private void popularHonorarioTotalRequisitado(Honorario honorario, Map.Entry<String, List<Honorario>> mapaHonorarios) {
        if (honorario.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO) && honorario.getTipoDeDevedor().equals((Object)TipoDeDevedorDoHonorarioEnum.RECLAMANTE)) {
            BigDecimal valorIrpf;
            BigDecimal valorTotal = honorario.getValorTotal() != null ? honorario.getValorTotal() : BigDecimal.ZERO;
            BigDecimal totalLiquido = valorTotal.subtract(valorIrpf = honorario.getValorImpostoRenda() != null ? honorario.getValorImpostoRenda() : BigDecimal.ZERO, Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_DOIS, HONORARIOS_LIQUIDOS_PARA + mapaHonorarios.getKey(), totalLiquido));
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_DOIS, this.selecionarFraseImpostoHonorario(mapaHonorarios.getValue()) + mapaHonorarios.getKey(), honorario.getValorImpostoRenda()));
        }
    }

    private void popularHonorarioOutrosDebitosReclamante(Honorario honorario, Map.Entry<String, List<Honorario>> mapaHonorarios) {
        if (honorario.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.COBRAR) && honorario.getTipoDeDevedor().equals((Object)TipoDeDevedorDoHonorarioEnum.RECLAMANTE)) {
            BigDecimal valorIrpf;
            BigDecimal valorTotal = honorario.getValorTotal() != null ? honorario.getValorTotal() : BigDecimal.ZERO;
            BigDecimal totalLiquido = valorTotal.subtract(valorIrpf = honorario.getValorImpostoRenda() != null ? honorario.getValorImpostoRenda() : BigDecimal.ZERO, Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.OUTROS_DEBITOS_RECLAMANTE, HONORARIOS_LIQUIDOS_PARA + mapaHonorarios.getKey(), totalLiquido));
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.OUTROS_DEBITOS_RECLAMANTE, this.selecionarFraseImpostoHonorario(mapaHonorarios.getValue()) + mapaHonorarios.getKey(), honorario.getValorImpostoRenda()));
        }
    }

    private void popularOutrosDebitosReclamada(Honorario honorario, Map.Entry<String, List<Honorario>> mapaHonorarios) {
        if (honorario.getTipoDeDevedor().equals((Object)TipoDeDevedorDoHonorarioEnum.RECLAMADO)) {
            BigDecimal valorIrpf;
            BigDecimal valorTotal = honorario.getValorTotal() != null ? honorario.getValorTotal() : BigDecimal.ZERO;
            BigDecimal totalLiquido = valorTotal.subtract(valorIrpf = honorario.getValorImpostoRenda() != null ? honorario.getValorImpostoRenda() : BigDecimal.ZERO, Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.OUTROS_DEBITOS_RECLAMADA, HONORARIOS_LIQUIDOS_PARA + mapaHonorarios.getKey(), totalLiquido));
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.OUTROS_DEBITOS_RECLAMADA, this.selecionarFraseImpostoHonorario(mapaHonorarios.getValue()) + mapaHonorarios.getKey(), honorario.getValorImpostoRenda()));
        }
    }

    private void popularMultasOutrosDebitosReclamada() {
        Map<String, List<Multa>> mapaMultasCobrarReclamante = this.agruparMultasPorTerceirosReclamado(this.calculo.getMultasDoCalculo());
        for (Map.Entry<String, List<Multa>> entry : mapaMultasCobrarReclamante.entrySet()) {
            StringBuilder sb = new StringBuilder();
            BigDecimal total = BigDecimal.ZERO;
            int count = entry.getValue().size();
            for (Multa multa : entry.getValue()) {
                sb.append(multa.getDescricao());
                if (--count > 1) {
                    sb.append(", ");
                } else if (count == 1) {
                    sb.append(" e ");
                }
                total = Utils.somar(total, multa.getValorTotal(), total);
            }
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.OUTROS_DEBITOS_RECLAMADA, sb.toString() + PARA + entry.getKey(), total));
        }
    }

    private void popularPrevidenciaPrivada() {
        if (this.calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue()) {
            BigDecimal totalLiquido = this.calculo.getPrevidenciaPrivada().getTotalGeral().subtract(this.calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido(), Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_DOIS, "Previd\u00eancia Privada", this.calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido()));
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.OUTROS_DEBITOS_RECLAMADA, "Juros Sobre Previd\u00eancia Privada", totalLiquido));
        }
    }

    private void popularPensaoAlimenticia() {
        PensaoAlimenticia pensaoAlimenticia = this.calculo.getPensaoAlimenticiaDoCalculo();
        if (pensaoAlimenticia != null && pensaoAlimenticia.getApurarPensaoAlimenticia().booleanValue()) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_DOIS, "Pens\u00e3o Aliment\u00edcia", pensaoAlimenticia.getValorDevido()));
        }
    }

    private void popularCustasPeloReclamado() {
        BigDecimal valorCustasReclamado = null;
        if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamado())) {
            valorCustasReclamado = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamadoInformada();
        } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamado())) {
            valorCustasReclamado = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamadoCalculada();
        }
        if (TipoDeCustasDeLiquidacaoEnum.INFORMADA.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeLiquidacao())) {
            valorCustasReclamado = valorCustasReclamado == null ? this.calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoInformada() : Utils.somar(valorCustasReclamado, this.calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoInformada(), valorCustasReclamado);
        } else if (TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeLiquidacao())) {
            valorCustasReclamado = valorCustasReclamado == null ? this.calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoCalculada() : Utils.somar(valorCustasReclamado, this.calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoCalculada(), valorCustasReclamado);
        }
        for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
            CustasFixasWrapper fixa = new CustasFixasWrapper(this.calculo.getCustasJudiciais().getDataVencimentoCustasFixas(), custasDevidasFixasEnum.getDescricao(), custasDevidasFixasEnum.getBase(this.calculo.getCustasJudiciais()), custasDevidasFixasEnum.getQuantidade(this.calculo.getCustasJudiciais()), custasDevidasFixasEnum.getValor(this.calculo.getCustasJudiciais()), this.calculo.getCustasJudiciais().getIndiceCorrecaoCustasFixas(), this.calculo.getCustasJudiciais().getTaxaJurosCustasFixas());
            if (fixa.getTotal() == null || fixa.getTotal().compareTo(BigDecimal.ZERO) == 0) continue;
            valorCustasReclamado = valorCustasReclamado == null ? fixa.getTotal() : Utils.somar(valorCustasReclamado, fixa.getTotal(), valorCustasReclamado);
        }
        for (AutoJudicial auto : this.calculo.getCustasJudiciais().getAutosJudiciaisDoCalculo()) {
            if (valorCustasReclamado == null) {
                valorCustasReclamado = auto.getTotal();
                continue;
            }
            valorCustasReclamado = Utils.somar(valorCustasReclamado, auto.getTotal(), valorCustasReclamado);
        }
        for (Armazenamento armazenamento : this.calculo.getCustasJudiciais().getArmazenamentosDoCalculo()) {
            if (valorCustasReclamado == null) {
                valorCustasReclamado = armazenamento.getTotal();
                continue;
            }
            valorCustasReclamado = Utils.somar(valorCustasReclamado, armazenamento.getTotal(), valorCustasReclamado);
        }
        if (valorCustasReclamado != null) {
            for (CustaPaga custaPaga : this.calculo.getCustasJudiciais().getCustasPagasDoReclamado()) {
                valorCustasReclamado = Utils.subtrair(valorCustasReclamado, custaPaga.getTotal(), valorCustasReclamado);
            }
            if (BigDecimal.ZERO.compareTo(valorCustasReclamado) > 0) {
                valorCustasReclamado = BigDecimal.ZERO;
            }
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_UM, "Custas Judiciais", valorCustasReclamado));
        }
    }

    private void popularCustasJudiciaisDevidasPeloReclamante() {
        BigDecimal custasCobrarReclamante = BigDecimal.ZERO;
        if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)this.calculo.getCustasJudiciais().getTipoCobrancaReclamante())) {
            BigDecimal valorCustasReclamante = null;
            if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                valorCustasReclamante = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteInformada();
            } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                valorCustasReclamante = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
            }
            if (valorCustasReclamante != null) {
                for (CustaPaga custaPaga : this.calculo.getCustasJudiciais().getCustasPagasDoReclamante()) {
                    valorCustasReclamante = Utils.subtrair(valorCustasReclamante, custaPaga.getTotal(), valorCustasReclamante);
                }
                if (BigDecimal.ZERO.compareTo(valorCustasReclamante) > 0) {
                    valorCustasReclamante = BigDecimal.ZERO;
                }
                custasCobrarReclamante = custasCobrarReclamante.add(valorCustasReclamante);
            }
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.OUTROS_DEBITOS_RECLAMANTE, "Custas Judiciais Devidas pelo Reclamante", custasCobrarReclamante));
        }
    }

    private void popularIrPeloReclamado() {
        if (Boolean.TRUE.equals(this.calculo.getIrpf().getApurarImpostoRenda()) && Utils.naoNulo(this.calculo.getIrpf().getTotalValorDevido()) && Boolean.TRUE.equals(this.calculo.getIrpf().getCobrarDoReclamado())) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.OUTROS_DEBITOS_RECLAMADA, "IRPF devido pelo Reclamado", this.calculo.getIrpf().getTotalValorDevido()));
        }
    }

    private void popularCustasJudiciaisDevidasReclamante() {
        if (TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)this.calculo.getCustasJudiciais().getTipoCobrancaReclamante())) {
            BigDecimal valorCustasReclamante = null;
            if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                valorCustasReclamante = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteInformada();
            } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                valorCustasReclamante = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
            }
            if (valorCustasReclamante != null) {
                for (CustaPaga custaPaga : this.calculo.getCustasJudiciais().getCustasPagasDoReclamante()) {
                    valorCustasReclamante = Utils.subtrair(valorCustasReclamante, custaPaga.getTotal(), valorCustasReclamante);
                }
                if (BigDecimal.ZERO.compareTo(valorCustasReclamante) > 0) {
                    valorCustasReclamante = BigDecimal.ZERO;
                }
                this.custasReclamanteDescontar = this.custasReclamanteDescontar.add(valorCustasReclamante);
            }
            if (BigDecimal.ZERO.compareTo(this.custasReclamanteDescontar) > 0) {
                this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VALOR_REQUISITADO_DOIS, "Custas Judiciais Devidas pelo Reclamante", this.custasReclamanteDescontar));
            }
        }
    }

    private void popularValorOutrasContribuicoes() {
        BigDecimal outrasContribuicoes = this.multaTerceiros.add(this.custasReclamanteDescontar);
        this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.VERBAS_FORA_DO_PRINCIPAL, "Valor de Outras contribui\u00e7\u00f5es", outrasContribuicoes));
    }

    private Map<String, List<Multa>> agruparMultasPorTerceirosReclamado(Set<Multa> multas) {
        HashMap<String, List<Multa>> mapaMultas = new HashMap<String, List<Multa>>();
        for (Multa multa : multas) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) continue;
            if (!mapaMultas.containsKey(multa.getNomeTerceiro())) {
                mapaMultas.put(multa.getNomeTerceiro(), new ArrayList());
            }
            ((List)mapaMultas.get(multa.getNomeTerceiro())).add(multa);
        }
        return mapaMultas;
    }

    private Map<String, List<Honorario>> agruparHonorariosPorCredor(Set<Honorario> honorarios) {
        HashMap<String, List<Honorario>> mapaHonorarios = new HashMap<String, List<Honorario>>();
        for (Honorario honorario : honorarios) {
            if (!mapaHonorarios.containsKey(honorario.getNomeCredor())) {
                mapaHonorarios.put(honorario.getNomeCredor(), new ArrayList());
            }
            ((List)mapaHonorarios.get(honorario.getNomeCredor())).add(honorario);
        }
        return mapaHonorarios;
    }

    private void popularSecaoDebitoReclamante() {
        PensaoAlimenticia pensaoAlimenticia;
        if (DestinoDoFgtsEnum.DEPOSITAR.equals((Object)this.calculo.getFgts().getDestinoDoFgts()) && Utils.naoNulo(this.depositoFGTS)) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.DEBITO_RECLAMANTE, "Dep\u00f3sito FGTS", this.depositoFGTS.negate()));
        }
        if (Boolean.TRUE.equals(this.calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado()) && Boolean.TRUE.equals(this.calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante()) && !this.calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.DEBITO_RECLAMANTE, "Dedu\u00e7\u00e3o de Contribui\u00e7\u00e3o Social", Utils.arredondarValorMonetario(this.calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante()).negate()));
        }
        if (this.calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue()) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.DEBITO_RECLAMANTE, "Previd\u00eancia Privada", this.calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido().negate()));
        }
        if ((pensaoAlimenticia = this.calculo.getPensaoAlimenticiaDoCalculo()) != null && pensaoAlimenticia.getApurarPensaoAlimenticia().booleanValue()) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.DEBITO_RECLAMANTE, "Pens\u00e3o Aliment\u00edcia", pensaoAlimenticia.getValorDevido().negate()));
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !multa.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.DEBITO_RECLAMANTE, multa.getDescricao(), multa.getValorTotal().negate()));
        }
        for (Honorario honorario : this.calculo.getHonorariosDoCalculo()) {
            if (!TipoDeDevedorDoHonorarioEnum.RECLAMANTE.equals((Object)honorario.getTipoDeDevedor()) || !honorario.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.DEBITO_RECLAMANTE, honorario.getDescricao(), honorario.getValorTotal().negate()));
        }
        if (Boolean.TRUE.equals(this.calculo.getIrpf().getApurarImpostoRenda()) && Utils.naoNulo(this.calculo.getIrpf().getTotalValorDevido()) && Boolean.FALSE.equals(this.calculo.getIrpf().getCobrarDoReclamado())) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.DEBITO_RECLAMANTE, "IRPF devido pelo Reclamante", this.calculo.getIrpf().getTotalValorDevido().negate()));
        }
        if (TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)this.calculo.getCustasJudiciais().getTipoCobrancaReclamante())) {
            BigDecimal valorCustasReclamante = null;
            if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                valorCustasReclamante = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteInformada();
            } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                valorCustasReclamante = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
            }
            if (valorCustasReclamante != null) {
                for (CustaPaga custaPaga : this.calculo.getCustasJudiciais().getCustasPagasDoReclamante()) {
                    valorCustasReclamante = Utils.subtrair(valorCustasReclamante, custaPaga.getTotal(), valorCustasReclamante);
                }
                if (BigDecimal.ZERO.compareTo(valorCustasReclamante) > 0) {
                    valorCustasReclamante = BigDecimal.ZERO;
                }
                this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.DEBITO_RECLAMANTE, CUSTAS_DEVIDAS_RECLAMANTE, valorCustasReclamante.negate()));
            }
        }
    }

    private void popularSecaoCreditoReclamante() {
        BigDecimal valorFGTS;
        BigDecimal valorVerbas = this.calculo.calculaValorVerbaParaCreditoDoReclamante(this.existemVerbasQueCompoemPrincipal);
        if (valorVerbas != null) {
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.CREDITO_RECLAMANTE, "Verbas", valorVerbas));
        }
        if ((valorFGTS = this.calculo.calculaValorFgtsParaCreditoDoReclamante()) != null) {
            this.depositoFGTS = valorFGTS;
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.CREDITO_RECLAMANTE, "FGTS", valorFGTS));
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) continue;
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.CREDITO_RECLAMANTE, multa.getDescricao(), multa.getValorTotal()));
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !multa.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.CREDITO_RECLAMANTE, multa.getDescricao(), multa.getValorTotal().negate()));
        }
    }

    private void popularSecaoBrutoDevidoReclamante() {
        List<VerbaDeCalculo> verbasAtivas = this.calculo.getVerbasParaLiquidacao();
        for (VerbaDeCalculo verba : verbasAtivas) {
            if (!LogicoEnum.SIM.equals((Object)verba.getComporPrincipal())) continue;
            this.existemVerbasQueCompoemPrincipal = true;
            BigDecimal valorTotalDiferencaCorrigida = verba.getValorTotalDiferencaCorrigida();
            this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorTotalDiferencaCorrigida, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
            if (verba.getIncidenciaIRPF().booleanValue()) {
                this.totalVerbasTributaveis = Utils.somar(this.totalVerbasTributaveis, verba.getValorTotalDiferencaCorrigidaParaCalculoDasIncidencias(), this.totalVerbasTributaveis);
            }
            if (verba.getIncidenciaINSS().booleanValue()) {
                this.totalVerbasRemuneratorias = Utils.somar(this.totalVerbasRemuneratorias, verba.getValorTotalDiferencaCorrigidaParaCalculoDasIncidencias(), this.totalVerbasRemuneratorias);
            }
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.BRUTO_DEVIDO_RECLAMANTE, verba.getNome(), valorTotalDiferencaCorrigida, verba.getValorDeJuros(), Utils.somar(verba.getValorTotalDiferencaCorrigida(), verba.getValorDeJuros())));
        }
        if (this.calculo.getSalarioFamilia().getApurarSalarioFamilia().booleanValue() && this.calculo.getSalarioFamilia().isComporOPrincipal()) {
            BigDecimal totalDoDevidoCorrigido = this.calculo.getSalarioFamilia().getTotalDoDevidoCorrigido();
            this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDoDevidoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.BRUTO_DEVIDO_RECLAMANTE, "Sal\u00e1rio Fam\u00edlia", totalDoDevidoCorrigido, this.calculo.getSalarioFamilia().getTotalDeJuros(), this.calculo.getSalarioFamilia().getTotalGeral()));
        }
        if (this.calculo.getSeguroDesemprego().getApurarSeguroDesemprego().booleanValue() && this.calculo.getSeguroDesemprego().isComporOPrincipal()) {
            BigDecimal valorDevidoCorrigido = this.calculo.getSeguroDesemprego().getValorDevidoCorrigido();
            this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDevidoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.BRUTO_DEVIDO_RECLAMANTE, "Seguro Desemprego", valorDevidoCorrigido, this.calculo.getSeguroDesemprego().getJuros(), this.calculo.getSeguroDesemprego().getTotal()));
        }
        if (this.calculo.getFgts().isComporOPrincipal()) {
            if (!this.calculo.getFgts().getOcorrenciasVisiveisRelatorio().isEmpty()) {
                BigDecimal totalDaDiferenciaCorrigida = this.calculo.getFgts().getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDaDiferenciaCorrigida, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.BRUTO_DEVIDO_RECLAMANTE, "FGTS " + this.calculo.getFgts().getAliquota().getNome(), totalDaDiferenciaCorrigida, this.calculo.getFgts().getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO), this.calculo.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO)));
            }
            if (this.calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                BigDecimal totalDoDepositadoOuSacadoCorrigido = this.calculo.getFgts().getTotalDoDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDoDepositadoOuSacadoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.BRUTO_DEVIDO_RECLAMANTE, "Saldo e/ou Saque", totalDoDepositadoOuSacadoCorrigido, this.calculo.getFgts().getTotalDeJurosDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate(), this.calculo.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate()));
            }
            if (this.calculo.getFgts().getMulta().booleanValue()) {
                BigDecimal valorDaMultaDoFgtsCorrigido = this.calculo.getFgts().getValorDaMultaDoFgtsCorrigido();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDaMultaDoFgtsCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.BRUTO_DEVIDO_RECLAMANTE, "Multa sobre FGTS" + (this.calculo.getFgts().isMultaCalculada() ? " " + this.calculo.getFgts().getMultaDoFgts().getNome() : ""), valorDaMultaDoFgtsCorrigido, this.calculo.getFgts().getJurosDaMultaDoFgts() == null ? BigDecimal.ZERO : this.calculo.getFgts().getJurosDaMultaDoFgts(), this.calculo.getFgts().getTotalDaMultaDoFgts()));
            }
            if (this.calculo.getFgts().getMultaDoArtigo467().booleanValue()) {
                BigDecimal valorDaMultaDoArtigo467Corrigido = this.calculo.getFgts().getValorDaMultaDoArtigo467Corrigido();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDaMultaDoArtigo467Corrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.BRUTO_DEVIDO_RECLAMANTE, "Multa do Artigo 467 da CLT sobre Multa sobre FGTS", valorDaMultaDoArtigo467Corrigido, this.calculo.getFgts().getJurosDaMultaDoArtigo467(), this.calculo.getFgts().getTotalDaMultaDoArtigo467()));
            }
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) {
                this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.BRUTO_DEVIDO_RECLAMANTE, multa.getDescricao(), multa.getValorCorrigido(), multa.getJuros(), multa.getValorTotal()));
            }
            if (!CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor())) continue;
            this.appender.adicionar(new AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio(AbstractResumoPrecatorioJrAdapter.SecaoRelatorioResumoPrecatorioEnum.BRUTO_DEVIDO_RECLAMANTE, multa.getDescricao(), multa.getValorCorrigido().negate(), multa.getJuros().negate(), multa.getValorTotal().negate()));
        }
    }

    private String selecionarFraseImpostoHonorario(List<Honorario> honorarios) {
        if (honorarios != null && honorarios.size() == 1) {
            Honorario honorario = honorarios.get(0);
            if (honorario.getApurarIRRF().booleanValue() && TipoDeImpostoDeRendaEnum.PESSOA_FISICA.equals((Object)honorario.getTipoImpostoRenda())) {
                return IRPF_SOBRE_HONORARIOS_PARA;
            }
            if (honorario.getApurarIRRF().booleanValue() && TipoDeImpostoDeRendaEnum.PESSOA_JURIDICA.equals((Object)honorario.getTipoImpostoRenda())) {
                return IRPJ_SOBRE_HONORARIOS_PARA;
            }
        }
        return IRRF_SOBRE_HONORARIOS_PARA;
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

    public class OcorrenciaResumoPrecatorioComJurosPadrao
    extends AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioComJurosJrAdapter {
        private AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio item;

        @Override
        public OcorrenciaResumoPrecatorioComJurosPadrao adapt(Object adapted) {
            this.item = (AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio)adapted;
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
        public String getJuros() {
            return this.item.getJurosFormatado();
        }

        @Override
        public String getTotal() {
            return this.item.getTotalFormatado();
        }
    }

    public class OcorrenciaResumoPrecatorioPadrao
    extends AbstractResumoPrecatorioJrAdapter.AbstractOcorrenciaResumoPrecatorioJrAdapter {
        private AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio item;

        @Override
        public OcorrenciaResumoPrecatorioPadrao adapt(Object adapted) {
            this.item = (AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio)adapted;
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

