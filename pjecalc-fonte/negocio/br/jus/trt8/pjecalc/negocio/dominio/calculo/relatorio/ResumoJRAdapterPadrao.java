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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ResumoJRAdapterPadrao
extends ResumoJRAdapter {
    private static final String CUSTAS_DEVIDAS_RECLAMANTE = "Custas Judiciais devidas pelo Reclamante";
    private static final String IRPF_SOBRE_HONORARIOS_PARA = "IRPF sobre Honor\u00e1rios para ";
    private static final String IRPJ_SOBRE_HONORARIOS_PARA = "IRPJ sobre Honor\u00e1rios para ";
    private static final String IRRF_SOBRE_HONORARIOS_PARA = "IRRF sobre Honor\u00e1rios para ";
    public static final BigDecimal CEM = new BigDecimal("100.0");
    private boolean existemVerbasQueCompoemPrincipal = false;
    private BigDecimal depositoFGTS = null;
    private BigDecimal totalBrutoDevidoReclamanteParaCalculoDePercentual = BigDecimal.ZERO;
    private BigDecimal totalVerbasRemuneratorias = BigDecimal.ZERO;
    private BigDecimal totalVerbasTributaveis = BigDecimal.ZERO;
    private Calculo calculo;
    private ResumoJRAdapter.ItensResumoAppender appender = new ResumoJRAdapter.ItensResumoAppender();

    public ResumoJRAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
        this.popularItensResumo();
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoComJurosJRAdapter> getOcorrenciasBrutoDevidoReclamante() {
        return new JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoComJurosJRAdapter>(new OcorrenciaResumoComJurosPadrao(), this.appender.getItensBrutoDevidoReclamante());
    }

    @Override
    public String getPercentuais() {
        BigDecimal percentualRemuneratorio;
        BigDecimal percentualTributavel = this.calculaPercentualTributavel();
        if (percentualTributavel.compareTo(percentualRemuneratorio = this.calculaPercentualRemuneratorio()) == 0) {
            return "Percentual de Parcelas Remunerat\u00f3rias e Tribut\u00e1veis: " + Utils.formatarNumero(percentualRemuneratorio) + "%";
        }
        return "Percentual de Parcelas Remunerat\u00f3rias: " + Utils.formatarNumero(percentualRemuneratorio) + "% - Percentual de Parcelas Tribut\u00e1veis: " + Utils.formatarNumero(percentualTributavel) + "%";
    }

    private BigDecimal calculaPercentualRemuneratorio() {
        if (BigDecimal.ZERO.compareTo(this.totalBrutoDevidoReclamanteParaCalculoDePercentual) < 0) {
            return Utils.arredondarValor(this.totalVerbasRemuneratorias.multiply(CEM, Utils.CONTEXTO_MATEMATICO).divide(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, Utils.CONTEXTO_MATEMATICO), 2);
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal calculaPercentualTributavel() {
        if (BigDecimal.ZERO.compareTo(this.totalBrutoDevidoReclamanteParaCalculoDePercentual) < 0) {
            return Utils.arredondarValor(this.totalVerbasTributaveis.multiply(CEM, Utils.CONTEXTO_MATEMATICO).divide(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, Utils.CONTEXTO_MATEMATICO), 2);
        }
        return BigDecimal.ZERO;
    }

    @Override
    public boolean getMostrarComentarios() {
        return Utils.naoVazio(this.calculo.getComentarios());
    }

    @Override
    public String getComentarios() {
        return this.calculo.getComentarios();
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
    public JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter> getOcorrenciasCreditoReclamante() {
        return new JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensCreditoReclamante());
    }

    @Override
    public BigDecimal getValorTotalCreditoReclamante() {
        return this.appender.getValorTotalCreditoReclamante();
    }

    @Override
    public JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter> getOcorrenciasDebitoReclamante() {
        return new JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensDebitoReclamante());
    }

    @Override
    public BigDecimal getValorTotalDebitoReclamante() {
        return this.appender.getValorTotalDebitoReclamante();
    }

    @Override
    public JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter> getOcorrenciasDebitoCobrarReclamante() {
        return new JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensDebitoCobrarReclamante());
    }

    @Override
    public BigDecimal getValorTotalDebitoCobrarReclamante() {
        return this.appender.getValorTotalDebitoCobrarReclamante();
    }

    @Override
    public BigDecimal getValorLiquidoReclamante() {
        return this.appender.getValorLiquidoReclamante();
    }

    @Override
    public JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter> getOcorrenciasDebitoReclamado() {
        return new JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensDebitoReclamado());
    }

    @Override
    public BigDecimal getValorTotalDebitoReclamado() {
        return this.appender.getValorTotalDebitoReclamado();
    }

    @Override
    public JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter> getOcorrenciasCustasDebitoReclamado() {
        return new JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensCustasDebitoReclamado());
    }

    @Override
    public BigDecimal getValorSubtotalCustasDebitoReclamado() {
        return this.appender.getValorSubtotalCustasDebitoReclamado();
    }

    @Override
    public JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter> getOcorrenciasVerbasForaDoPrincipal() {
        return new JRAdapterDataSource<ResumoJRAdapter.OcorrenciaResumoJRAdapter>(new OcorrenciaResumoPadrao(), this.appender.getItensForaDoPrincipal());
    }

    @Override
    public BigDecimal getValorTotalVerbasForaDoPrincipal() {
        return this.appender.getValorTotalVerbasForaDoPrincipal();
    }

    @Override
    public void popularItensResumo() {
        this.popularSecaoBrutoDevidoReclamante();
        this.popularSecaoCreditoReclamante();
        this.popularSecaoDebitoReclamante();
        this.popularSecaoDebitoCobrarReclamante();
        this.popularSecaoDebitoReclamado();
        this.popularSecaoVerbasForaDoPrincipal();
    }

    /*
     * WARNING - void declaration
     */
    private void popularSecaoDebitoCobrarReclamante() {
        BigDecimal total;
        Map<String, List<Multa>> mapaMultasCobrarReclamante = this.agrupaMultasPorTerceiros(this.calculo.getMultasDoCalculoCobrarReclamante());
        for (Map.Entry<String, List<Multa>> entry : mapaMultasCobrarReclamante.entrySet()) {
            StringBuilder stringBuilder = new StringBuilder();
            total = BigDecimal.ZERO;
            int count = entry.getValue().size();
            for (Multa multa : entry.getValue()) {
                stringBuilder.append(multa.getDescricao());
                if (--count > 1) {
                    stringBuilder.append(", ");
                } else if (count == 1) {
                    stringBuilder.append(" e ");
                }
                total = Utils.somar(total, multa.getValorTotal(), total);
            }
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, stringBuilder.toString() + " para " + entry.getKey(), total));
        }
        Map<String, List<Honorario>> mapaHonorariosReclamante = this.agrupaHonorariosPorCredor(this.calculo.getHonorariosDoCalculoCobrarReclamante());
        for (Map.Entry<String, List<Honorario>> entry : mapaHonorariosReclamante.entrySet()) {
            total = BigDecimal.ZERO;
            BigDecimal totalIRPF = BigDecimal.ZERO;
            for (Honorario honorario : entry.getValue()) {
                total = Utils.somar(total, honorario.getValorTotal(), total);
                totalIRPF = Utils.somar(totalIRPF, honorario.getValorImpostoRenda(), totalIRPF);
            }
            BigDecimal totalLiquido = total.subtract(totalIRPF, Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, "Honor\u00e1rios L\u00edquidos para " + entry.getKey(), totalLiquido));
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, this.selecionarFraseImpostoHonorario(entry.getValue()) + entry.getKey(), totalIRPF));
        }
        if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)this.calculo.getCustasJudiciais().getTipoCobrancaReclamante())) {
            void var3_8;
            Object var3_5 = null;
            if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                BigDecimal bigDecimal = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteInformada();
            } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                BigDecimal bigDecimal = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
            }
            if (var3_8 != null) {
                void var3_12;
                void var3_9;
                for (CustaPaga custaPaga : this.calculo.getCustasJudiciais().getCustasPagasDoReclamante()) {
                    BigDecimal bigDecimal = Utils.subtrair((BigDecimal)var3_9, custaPaga.getTotal(), (BigDecimal)var3_9);
                }
                if (BigDecimal.ZERO.compareTo((BigDecimal)var3_9) > 0) {
                    BigDecimal bigDecimal = BigDecimal.ZERO;
                }
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, CUSTAS_DEVIDAS_RECLAMANTE, (BigDecimal)var3_12));
            }
        }
    }

    private void popularSecaoVerbasForaDoPrincipal() {
        for (VerbaDeCalculo verba : this.calculo.getVerbasAtivas()) {
            if (verba.isComporOPrincipal()) continue;
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, verba.getNome(), verba.getValorTotalDiferencaCorrigida()));
        }
        if (this.calculo.getSalarioFamilia().getApurarSalarioFamilia().booleanValue() && !this.calculo.getSalarioFamilia().isComporOPrincipal()) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Sal\u00e1rio Fam\u00edlia", this.calculo.getSalarioFamilia().getTotalGeral()));
        }
        if (this.calculo.getSeguroDesemprego().getApurarSeguroDesemprego().booleanValue() && !this.calculo.getSeguroDesemprego().isComporOPrincipal()) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Seguro Desemprego", this.calculo.getSeguroDesemprego().getTotal()));
        }
        if (!this.calculo.getFgts().isComporOPrincipal()) {
            if (!this.calculo.getFgts().getOcorrenciasVisiveisRelatorio().isEmpty()) {
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "FGTS " + this.calculo.getFgts().getAliquota().getNome(), this.calculo.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO)));
            }
            if (this.calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Saldo e/ou Saque", this.calculo.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate()));
            }
            if (this.calculo.getFgts().getMulta().booleanValue()) {
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Multa sobre FGTS" + (this.calculo.getFgts().isMultaCalculada() ? " " + this.calculo.getFgts().getMultaDoFgts().getNome() : ""), this.calculo.getFgts().getTotalDaMultaDoFgts()));
            }
            if (this.calculo.getFgts().getMultaDoArtigo467().booleanValue()) {
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Multa do Artigo 467 da CLT sobre Multa sobre FGTS", this.calculo.getFgts().getTotalDaMultaDoArtigo467()));
            }
        }
    }

    private Map<String, List<Multa>> agrupaMultasPorTerceiros(Set<Multa> multas) {
        HashMap<String, List<Multa>> mapaMultas = new HashMap<String, List<Multa>>();
        for (Multa multa : multas) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) && !CredorDevedorMultaEnum.TERCEIRO_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) continue;
            if (!mapaMultas.containsKey(multa.getNomeTerceiro())) {
                mapaMultas.put(multa.getNomeTerceiro(), new ArrayList());
            }
            ((List)mapaMultas.get(multa.getNomeTerceiro())).add(multa);
        }
        return mapaMultas;
    }

    private Map<String, List<Honorario>> agrupaHonorariosPorCredor(Set<Honorario> honorarios) {
        HashMap<String, List<Honorario>> mapaHonorarios = new HashMap<String, List<Honorario>>();
        for (Honorario honorario : honorarios) {
            if (!mapaHonorarios.containsKey(honorario.getNomeCredor())) {
                mapaHonorarios.put(honorario.getNomeCredor(), new ArrayList());
            }
            ((List)mapaHonorarios.get(honorario.getNomeCredor())).add(honorario);
        }
        return mapaHonorarios;
    }

    /*
     * WARNING - void declaration
     */
    private void popularSecaoDebitoReclamado() {
        void var6_24;
        void var6_11;
        BigDecimal total;
        PensaoAlimenticia pensaoAlimenticia;
        this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "L\u00edquido devido ao Reclamante", this.appender.getValorLiquidoReclamante()));
        if (DestinoDoFgtsEnum.DEPOSITAR.equals((Object)this.calculo.getFgts().getDestinoDoFgts()) && Utils.naoNulo(this.depositoFGTS)) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Dep\u00f3sito FGTS", this.depositoFGTS));
        }
        BigDecimal valorContribuicaoSocialSalariosDevidos = null;
        if (!this.calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
            valorContribuicaoSocialSalariosDevidos = Boolean.TRUE.equals(this.calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado()) ? this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSegurado() : BigDecimal.ZERO;
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssEmpresa(), valorContribuicaoSocialSalariosDevidos);
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSAT(), valorContribuicaoSocialSalariosDevidos);
            valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, this.calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssTerceiros(), valorContribuicaoSocialSalariosDevidos);
        }
        if (valorContribuicaoSocialSalariosDevidos != null) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social Sobre Sal\u00e1rios Devidos", valorContribuicaoSocialSalariosDevidos));
        }
        BigDecimal valorContribuicaoSocialSalariosPagos = null;
        if (Boolean.TRUE.equals(this.calculo.getInss().getApurarInssSobreSalariosPagos()) && !this.calculo.getInss().getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos().isEmpty()) {
            valorContribuicaoSocialSalariosPagos = this.calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSegurado();
            valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, this.calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssEmpresa(), valorContribuicaoSocialSalariosPagos);
            valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, this.calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSAT(), valorContribuicaoSocialSalariosPagos);
            valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, this.calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssTerceiros(), valorContribuicaoSocialSalariosPagos);
        }
        if (valorContribuicaoSocialSalariosPagos != null) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social Sobre Sal\u00e1rios Pagos", valorContribuicaoSocialSalariosPagos));
        }
        if (this.calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue()) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Previd\u00eancia Privada", this.calculo.getPrevidenciaPrivada().getTotalGeral()));
        }
        if ((pensaoAlimenticia = this.calculo.getPensaoAlimenticiaDoCalculo()) != null && pensaoAlimenticia.getApurarPensaoAlimenticia().booleanValue()) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Pens\u00e3o Aliment\u00edcia", pensaoAlimenticia.getValorDevido()));
        }
        Map<String, List<Multa>> mapaMultas = this.agrupaMultasPorTerceiros(this.calculo.getMultasDoCalculoDescontarCredito());
        for (Map.Entry<String, List<Multa>> entry : mapaMultas.entrySet()) {
            StringBuilder stringBuilder = new StringBuilder();
            total = BigDecimal.ZERO;
            int count = entry.getValue().size();
            for (Multa multa : entry.getValue()) {
                stringBuilder.append(multa.getDescricao());
                if (--count > 1) {
                    stringBuilder.append(", ");
                } else if (count == 1) {
                    stringBuilder.append(" e ");
                }
                total = Utils.somar(total, multa.getValorTotal(), total);
            }
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, stringBuilder.toString() + " para " + entry.getKey(), total));
        }
        Map<String, List<Honorario>> mapaHonorarios = this.agrupaHonorariosPorCredor(this.calculo.getHonorariosDoCalculoDescontarCredito());
        for (Map.Entry<String, List<Honorario>> entry : mapaHonorarios.entrySet()) {
            total = BigDecimal.ZERO;
            BigDecimal totalIRPF = BigDecimal.ZERO;
            for (Honorario honorario : entry.getValue()) {
                total = Utils.somar(total, honorario.getValorTotal(), total);
                totalIRPF = Utils.somar(totalIRPF, honorario.getValorImpostoRenda(), totalIRPF);
            }
            BigDecimal totalLiquido = total.subtract(totalIRPF, Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Honor\u00e1rios L\u00edquidos para " + entry.getKey(), totalLiquido));
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, this.selecionarFraseImpostoHonorario(entry.getValue()) + entry.getKey(), totalIRPF));
        }
        if (Boolean.TRUE.equals(this.calculo.getIrpf().getApurarImpostoRenda()) && Utils.naoNulo(this.calculo.getIrpf().getTotalValorDevido())) {
            if (Boolean.TRUE.equals(this.calculo.getIrpf().getCobrarDoReclamado())) {
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF devido pelo Reclamado", this.calculo.getIrpf().getTotalValorDevido()));
            } else {
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF devido pelo Reclamante", this.calculo.getIrpf().getTotalValorDevido()));
            }
        }
        if (Boolean.TRUE.equals(this.calculo.getFgts().getMulta10())) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social 10% (Lei Complementar 110/2001)", this.calculo.getFgts().getTotalDaMulta10Corrigida()));
        }
        if (Boolean.TRUE.equals(this.calculo.getFgts().getContribuicaoSocial05())) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social 0,5% (Lei Complementar 110/2001)", this.calculo.getFgts().getTotalDaContribuicaoSocial05()));
        }
        Object var6_8 = null;
        if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamado())) {
            BigDecimal bigDecimal = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamadoInformada();
        } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamado())) {
            BigDecimal bigDecimal = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamadoCalculada();
        }
        if (TipoDeCustasDeLiquidacaoEnum.INFORMADA.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeLiquidacao())) {
            if (var6_11 == null) {
                BigDecimal bigDecimal = this.calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoInformada();
            } else {
                BigDecimal bigDecimal = Utils.somar((BigDecimal)var6_11, this.calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoInformada(), (BigDecimal)var6_11);
            }
        } else if (TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeLiquidacao())) {
            if (var6_11 == null) {
                BigDecimal bigDecimal = this.calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoCalculada();
            } else {
                BigDecimal bigDecimal = Utils.somar((BigDecimal)var6_11, this.calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoCalculada(), (BigDecimal)var6_11);
            }
        }
        for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
            void var6_17;
            CustasFixasWrapper fixa = new CustasFixasWrapper(this.calculo.getCustasJudiciais().getDataVencimentoCustasFixas(), custasDevidasFixasEnum.getDescricao(), custasDevidasFixasEnum.getBase(this.calculo.getCustasJudiciais()), custasDevidasFixasEnum.getQuantidade(this.calculo.getCustasJudiciais()), custasDevidasFixasEnum.getValor(this.calculo.getCustasJudiciais()), this.calculo.getCustasJudiciais().getIndiceCorrecaoCustasFixas(), this.calculo.getCustasJudiciais().getTaxaJurosCustasFixas());
            if (fixa.getTotal() == null || fixa.getTotal().compareTo(BigDecimal.ZERO) == 0) continue;
            if (var6_17 == null) {
                BigDecimal bigDecimal = fixa.getTotal();
                continue;
            }
            BigDecimal bigDecimal = Utils.somar((BigDecimal)var6_17, fixa.getTotal(), (BigDecimal)var6_17);
        }
        for (AutoJudicial auto : this.calculo.getCustasJudiciais().getAutosJudiciaisDoCalculo()) {
            void var6_20;
            if (var6_20 == null) {
                BigDecimal bigDecimal = auto.getTotal();
                continue;
            }
            BigDecimal bigDecimal = Utils.somar((BigDecimal)var6_20, auto.getTotal(), (BigDecimal)var6_20);
        }
        for (Armazenamento armazenamento : this.calculo.getCustasJudiciais().getArmazenamentosDoCalculo()) {
            if (var6_24 == null) {
                BigDecimal bigDecimal = armazenamento.getTotal();
                continue;
            }
            BigDecimal bigDecimal = Utils.somar((BigDecimal)var6_24, armazenamento.getTotal(), (BigDecimal)var6_24);
        }
        if (var6_24 != null) {
            void var6_31;
            void var6_28;
            for (CustaPaga custaPaga : this.calculo.getCustasJudiciais().getCustasPagasDoReclamado()) {
                BigDecimal bigDecimal = Utils.subtrair((BigDecimal)var6_28, custaPaga.getTotal(), (BigDecimal)var6_28);
            }
            if (BigDecimal.ZERO.compareTo((BigDecimal)var6_28) > 0) {
                BigDecimal bigDecimal = BigDecimal.ZERO;
            }
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.CUSTAS_DEBITO_RECLAMADO, "Custas Judiciais devidas pelo Reclamado", (BigDecimal)var6_31));
        }
        if (TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)this.calculo.getCustasJudiciais().getTipoCobrancaReclamante())) {
            void var7_43;
            Object var7_40 = null;
            if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                BigDecimal bigDecimal = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteInformada();
            } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                BigDecimal bigDecimal = this.calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
            }
            if (var7_43 != null) {
                void var7_47;
                void var7_44;
                for (CustaPaga custaPaga : this.calculo.getCustasJudiciais().getCustasPagasDoReclamante()) {
                    BigDecimal bigDecimal = Utils.subtrair((BigDecimal)var7_44, custaPaga.getTotal(), (BigDecimal)var7_44);
                }
                if (BigDecimal.ZERO.compareTo((BigDecimal)var7_44) > 0) {
                    BigDecimal bigDecimal = BigDecimal.ZERO;
                }
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.CUSTAS_DEBITO_RECLAMADO, CUSTAS_DEVIDAS_RECLAMANTE, (BigDecimal)var7_47));
            }
        }
    }

    private void popularSecaoDebitoReclamante() {
        PensaoAlimenticia pensaoAlimenticia;
        if (DestinoDoFgtsEnum.DEPOSITAR.equals((Object)this.calculo.getFgts().getDestinoDoFgts()) && Utils.naoNulo(this.depositoFGTS)) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "Dep\u00f3sito FGTS", this.depositoFGTS.negate()));
        }
        if (Boolean.TRUE.equals(this.calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado()) && Boolean.TRUE.equals(this.calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante()) && !this.calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "Dedu\u00e7\u00e3o de Contribui\u00e7\u00e3o Social", Utils.arredondarValorMonetario(this.calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante()).negate()));
        }
        if (this.calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue()) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "Previd\u00eancia Privada", this.calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido().negate()));
        }
        if ((pensaoAlimenticia = this.calculo.getPensaoAlimenticiaDoCalculo()) != null && pensaoAlimenticia.getApurarPensaoAlimenticia().booleanValue()) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "Pens\u00e3o Aliment\u00edcia", pensaoAlimenticia.getValorDevido().negate()));
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !multa.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, multa.getDescricao(), multa.getValorTotal().negate()));
        }
        for (Honorario honorario : this.calculo.getHonorariosDoCalculo()) {
            if (!TipoDeDevedorDoHonorarioEnum.RECLAMANTE.equals((Object)honorario.getTipoDeDevedor()) || !honorario.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, honorario.getDescricao(), honorario.getValorTotal().negate()));
        }
        if (Boolean.TRUE.equals(this.calculo.getIrpf().getApurarImpostoRenda()) && Utils.naoNulo(this.calculo.getIrpf().getTotalValorDevido()) && Boolean.FALSE.equals(this.calculo.getIrpf().getCobrarDoReclamado())) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "IRPF devido pelo Reclamante", this.calculo.getIrpf().getTotalValorDevido().negate()));
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
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, CUSTAS_DEVIDAS_RECLAMANTE, valorCustasReclamante.negate()));
            }
        }
    }

    private void popularSecaoCreditoReclamante() {
        BigDecimal valorFGTS;
        BigDecimal valorVerbas = this.calculo.calculaValorVerbaParaCreditoDoReclamante(this.existemVerbasQueCompoemPrincipal);
        if (valorVerbas != null) {
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.CREDITO_RECLAMANTE, "Verbas", valorVerbas));
        }
        if ((valorFGTS = this.calculo.calculaValorFgtsParaCreditoDoReclamante()) != null) {
            this.depositoFGTS = valorFGTS;
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.CREDITO_RECLAMANTE, "FGTS", valorFGTS));
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) continue;
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.CREDITO_RECLAMANTE, multa.getDescricao(), multa.getValorTotal()));
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (!CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !multa.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.CREDITO_RECLAMANTE, multa.getDescricao(), multa.getValorTotal().negate()));
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
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.BRUTO_DEVIDO_RECLAMANTE, verba.getNome(), valorTotalDiferencaCorrigida, verba.getValorDeJuros(), Utils.somar(verba.getValorTotalDiferencaCorrigida(), verba.getValorDeJuros())));
        }
        if (this.calculo.getSalarioFamilia().getApurarSalarioFamilia().booleanValue() && this.calculo.getSalarioFamilia().isComporOPrincipal()) {
            BigDecimal totalDoDevidoCorrigido = this.calculo.getSalarioFamilia().getTotalDoDevidoCorrigido();
            this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDoDevidoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.BRUTO_DEVIDO_RECLAMANTE, "Sal\u00e1rio Fam\u00edlia", totalDoDevidoCorrigido, this.calculo.getSalarioFamilia().getTotalDeJuros(), this.calculo.getSalarioFamilia().getTotalGeral()));
        }
        if (this.calculo.getSeguroDesemprego().getApurarSeguroDesemprego().booleanValue() && this.calculo.getSeguroDesemprego().isComporOPrincipal()) {
            BigDecimal valorDevidoCorrigido = this.calculo.getSeguroDesemprego().getValorDevidoCorrigido();
            this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDevidoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.BRUTO_DEVIDO_RECLAMANTE, "Seguro Desemprego", valorDevidoCorrigido, this.calculo.getSeguroDesemprego().getJuros(), this.calculo.getSeguroDesemprego().getTotal()));
        }
        if (this.calculo.getFgts().isComporOPrincipal()) {
            if (!this.calculo.getFgts().getOcorrenciasVisiveisRelatorio().isEmpty()) {
                BigDecimal totalDaDiferenciaCorrigida = this.calculo.getFgts().getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDaDiferenciaCorrigida, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.BRUTO_DEVIDO_RECLAMANTE, "FGTS " + this.calculo.getFgts().getAliquota().getNome(), totalDaDiferenciaCorrigida, this.calculo.getFgts().getTotalDeJurosDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO), this.calculo.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO)));
            }
            if (this.calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                BigDecimal totalDoDepositadoOuSacadoCorrigido = this.calculo.getFgts().getTotalDoDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, totalDoDepositadoOuSacadoCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.BRUTO_DEVIDO_RECLAMANTE, "Saldo e/ou Saque", totalDoDepositadoOuSacadoCorrigido, this.calculo.getFgts().getTotalDeJurosDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate(), this.calculo.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate()));
            }
            if (this.calculo.getFgts().getMulta().booleanValue()) {
                BigDecimal valorDaMultaDoFgtsCorrigido = this.calculo.getFgts().getValorDaMultaDoFgtsCorrigido();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDaMultaDoFgtsCorrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.BRUTO_DEVIDO_RECLAMANTE, "Multa sobre FGTS" + (this.calculo.getFgts().isMultaCalculada() ? " " + this.calculo.getFgts().getMultaDoFgts().getNome() : ""), valorDaMultaDoFgtsCorrigido, this.calculo.getFgts().getJurosDaMultaDoFgts() == null ? BigDecimal.ZERO : this.calculo.getFgts().getJurosDaMultaDoFgts(), this.calculo.getFgts().getTotalDaMultaDoFgts()));
            }
            if (this.calculo.getFgts().getMultaDoArtigo467().booleanValue()) {
                BigDecimal valorDaMultaDoArtigo467Corrigido = this.calculo.getFgts().getValorDaMultaDoArtigo467Corrigido();
                this.totalBrutoDevidoReclamanteParaCalculoDePercentual = Utils.somar(this.totalBrutoDevidoReclamanteParaCalculoDePercentual, valorDaMultaDoArtigo467Corrigido, this.totalBrutoDevidoReclamanteParaCalculoDePercentual);
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.BRUTO_DEVIDO_RECLAMANTE, "Multa do Artigo 467 da CLT sobre Multa sobre FGTS", valorDaMultaDoArtigo467Corrigido, this.calculo.getFgts().getJurosDaMultaDoArtigo467(), this.calculo.getFgts().getTotalDaMultaDoArtigo467()));
            }
        }
        for (Multa multa : this.calculo.getMultasDoCalculo()) {
            if (CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) {
                this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.BRUTO_DEVIDO_RECLAMANTE, multa.getDescricao(), multa.getValorCorrigido(), multa.getJuros(), multa.getValorTotal()));
            }
            if (!CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor())) continue;
            this.appender.append(new ResumoJRAdapter.ItemResumo(ResumoJRAdapter.SecaoRelatorioResumoEnum.BRUTO_DEVIDO_RECLAMANTE, multa.getDescricao(), multa.getValorCorrigido().negate(), multa.getJuros().negate(), multa.getValorTotal().negate()));
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

    public class OcorrenciaResumoComJurosPadrao
    extends ResumoJRAdapter.OcorrenciaResumoComJurosJRAdapter {
        private ResumoJRAdapter.ItemResumo item;

        @Override
        public OcorrenciaResumoComJurosPadrao adapt(Object adapted) {
            this.item = (ResumoJRAdapter.ItemResumo)adapted;
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

    public class OcorrenciaResumoPadrao
    extends ResumoJRAdapter.OcorrenciaResumoJRAdapter {
        private ResumoJRAdapter.ItemResumo item;

        @Override
        public OcorrenciaResumoPadrao adapt(Object adapted) {
            this.item = (ResumoJRAdapter.ItemResumo)adapted;
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

