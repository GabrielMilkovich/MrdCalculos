/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.constantes.RelatorioPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAcaoDeAuditoriaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.auditoria.Auditoria;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustasAtualizacaoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoAtualizacaoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoAtualizacaoPrecatorioJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialAtualizacaoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssAtualizacaoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfAtualizacaoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfHonorariosAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfHonorariosAtualizacaoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapterPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapterPagamentoPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJRAdapterPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJRAdapterPagamentoPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado.PagamentoConsolidadoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public class PagamentoConsolidadoJRAdapterPadrao
extends PagamentoConsolidadoJRAdapter {
    private Calculo calculo;
    private Atualizacao atualizacao;
    private Auditoria auditoria;
    private List<RelatorioPagamentoEnum> sessoes;
    private DemonstrativoAtualizacaoJRAdapter demonstrativo;
    private DemonstrativoAtualizacaoJRAdapter demonstrativoPrecatorio;
    private ResumoJRAdapterPagamento resumoPagamento;
    private ResumoPrecatorioJRAdapterPagamento resumoPrecatorio;
    private JustificativaJRAdapter justificativa;
    private InssAtualizacaoJRAdapter demonstrativoINSS;
    private EsocialAtualizacaoJRAdapter demonstrativoEsocial;
    private IrpfAtualizacaoJRAdapter irpf;
    private CustaAtualizacaoJRAdapter custas;
    private IrpfHonorariosAtualizacaoJRAdapter irpfHonorarios;

    public PagamentoConsolidadoJRAdapterPadrao() {
    }

    public PagamentoConsolidadoJRAdapterPadrao(Calculo calculo, List<RelatorioPagamentoEnum> sessoes) {
        this.calculo = (Calculo)calculo.restaurar();
        this.calculo.getVerbas().size();
        this.calculo = calculo;
        this.atualizacao = calculo.getAtualizacao();
        this.auditoria = Auditoria.encontrarUltimoRegistroLiquidacaoDeUm(this.calculo, TipoDeAcaoDeAuditoriaEnum.LIQUIDACAO_ATUALIZACAO);
        this.sessoes = sessoes;
        this.iniciarAdaptersAnexos();
    }

    private void iniciarAdaptersAnexos() {
        if (this.getMostrarDemonstrativo()) {
            this.demonstrativo = new DemonstrativoAtualizacaoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarDemonstrativoPrecatorio()) {
            this.demonstrativoPrecatorio = new DemonstrativoAtualizacaoPrecatorioJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarDemonstrativoINSS()) {
            this.demonstrativoINSS = new InssAtualizacaoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarDemonstrativoEsocial()) {
            this.demonstrativoEsocial = new EsocialAtualizacaoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarIrpf()) {
            this.irpf = new IrpfAtualizacaoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarIrpfHonorarios()) {
            this.irpfHonorarios = new IrpfHonorariosAtualizacaoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarCustas()) {
            this.custas = new CustasAtualizacaoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarResumo()) {
            this.resumoPagamento = new ResumoJRAdapterPagamentoPadrao(this.calculo);
        }
        if (this.getMostrarResumoPrecatorio()) {
            this.resumoPrecatorio = new ResumoPrecatorioJRAdapterPagamentoPadrao(this.calculo);
        }
        if (this.getMostrarJustificativas()) {
            this.justificativa = new JustificativaJRAdapterPadrao(this.calculo, true, this.atualizacao.getAtualizarRegraPrecatorio());
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<JREmptyDS> getEmptyDS() {
        return new JRAdapterDataSource<JREmptyDS>(new JREmptyDS(), Arrays.asList(new Object()));
    }

    @Override
    public String getNumeroDoProcesso() {
        return this.calculo.getProcesso().getIdentificacao();
    }

    @Override
    public String getNumeroDoCalculo() {
        return this.calculo.getId().toString();
    }

    @Override
    public String getReclamante() {
        return this.calculo.getProcesso().getReclamante().getNome();
    }

    @Override
    public String getReclamado() {
        return this.calculo.getProcesso().getReclamado().getNome();
    }

    @Override
    public Periodo getPeriodoDeCalculo() {
        return this.calculo.obterPeriodoDoCalculo();
    }

    @Override
    public String getDataDeUltimaAtualizacao() {
        if (this.calculo.isCalculoExterno().booleanValue()) {
            return new SimpleDateFormat("dd/MM/yyyy").format(this.calculo.getDataDeLiquidacao());
        }
        return "";
    }

    @Override
    public Date getDataDeAjuizamento() {
        return this.calculo.getDataAjuizamento();
    }

    @Override
    public Date getDataDaLiquidacao() {
        return this.atualizacao.getDataDeLiquidacao();
    }

    @Override
    public boolean isCalculoExterno() {
        return this.calculo.isCalculoExterno();
    }

    @Override
    public String getEstado() {
        return this.calculo.getEstado().getSigla();
    }

    @Override
    public String getMunicipio() {
        return this.calculo.getMunicipio().getNome();
    }

    @Override
    public String getRegimeTrabalho() {
        return this.calculo.getRegimeDoContrato().getNome();
    }

    @Override
    public String getMaiorRemuneracao() {
        return Utils.formatarNumero(this.calculo.getValorMaiorRemuneracao());
    }

    @Override
    public String getPrazoAviso() {
        return this.calculo.getApuracaoPrazoDoAvisoPrevio().getNome();
    }

    @Override
    public String getZerarValorNegativo() {
        return this.calculo.getZeraValorNegativo() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public BigDecimal getCargaHoraria() {
        return this.calculo.getValorCargaHorariaPadrao();
    }

    @Override
    public Date getAdmissao() {
        return this.calculo.getDataAdmissao();
    }

    @Override
    public String getQuinquenal() {
        return this.calculo.getPrescricaoQuinquenal() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getUltimaRemuneracao() {
        return Utils.formatarNumero(this.calculo.getValorUltimaRemuneracao());
    }

    @Override
    public String getProjetarAviso() {
        return this.calculo.getProjetaAvisoIndenizado() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getConsiderarFeriadosEstaduais() {
        return this.calculo.getConsideraFeriadoEstadual() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getSabadoDiaUtil() {
        return this.calculo.getSabadoDiaUtil() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public Date getDemissao() {
        return this.calculo.getDataDemissao();
    }

    @Override
    public String getPrescricaoFgts() {
        return this.calculo.getPrescricaoFgts() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getLimitarAvos() {
        return this.calculo.getLimitarAvosAoPeriodoDoCalculo() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getConsiderarFeriadosMunicipais() {
        return this.calculo.getConsideraFeriadoMunicipal() != false ? "Sim" : "N\u00e3o";
    }

    public JRBeanCollectionDataSource getExcecoesCargaHoraria() {
        return new JRBeanCollectionDataSource(this.calculo.getExcecoesDaCargaHoraria());
    }

    public JRBeanCollectionDataSource getExcecoesSabadoDiaUtil() {
        return new JRBeanCollectionDataSource(this.calculo.getExcecoesDoSabado());
    }

    public JRBeanCollectionDataSource getPontosFacultativos() {
        return new JRBeanCollectionDataSource(this.calculo.getPontosFacultativos());
    }

    public boolean getMostrarExcecoesCargaHoraria() {
        return !this.calculo.getExcecoesDaCargaHoraria().isEmpty();
    }

    public boolean getMostrarExcecoesSabadoDiaUtil() {
        return !this.calculo.getExcecoesDoSabado().isEmpty();
    }

    public boolean getMostrarPontosFacultativos() {
        return !this.calculo.getPontosFacultativos().isEmpty();
    }

    @Override
    public boolean getMostrarDemonstrativo() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.DEMONSTRATIVO_PAGAMENTO);
    }

    @Override
    public boolean getMostrarDemonstrativoPrecatorio() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.DEMONSTRATIVO_PRECATORIO);
    }

    @Override
    public boolean getMostrarResumo() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.RESUMO_PAGAMENTO);
    }

    @Override
    public boolean getMostrarResumoPrecatorio() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.RESUMO_PRECATORIO);
    }

    @Override
    public boolean getMostrarAlgoAlemDoResumoEJustificativa() {
        boolean isMostrarAlgumDemonstrativo = this.getMostrarDemonstrativo() || this.getMostrarDemonstrativoINSS() || this.getMostrarDemonstrativoEsocial();
        return isMostrarAlgumDemonstrativo || this.getMostrarIrpf() || this.getMostrarCustas();
    }

    @Override
    public boolean getMostrarDemonstrativoINSS() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.CONTRIBUICAO_SOCIAL_PAGAMENTO);
    }

    @Override
    public boolean getMostrarDemonstrativoEsocial() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.ESOCIAL_PAGAMENTO);
    }

    @Override
    public boolean getMostrarIrpf() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.IMPOSTO_DE_RENDA_PAGAMENTO);
    }

    @Override
    public boolean getMostrarIrpfHonorarios() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.IMPOSTO_DE_RENDA_HONORARIOS_PAGAMENTO);
    }

    @Override
    public boolean getMostrarCustas() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.CUSTAS_INCLUSAO);
    }

    @Override
    public boolean getMostrarComentarios() {
        return Utils.naoVazio(this.calculo.getComentarios());
    }

    @Override
    public boolean getMostrarJustificativas() {
        return this.sessoes.contains((Object)RelatorioPagamentoEnum.JUSTIFICATIVA);
    }

    @Override
    public DemonstrativoAtualizacaoJRAdapter getDemonstrativo() {
        return this.demonstrativo;
    }

    @Override
    public DemonstrativoAtualizacaoJRAdapter getDemonstrativoPrecatorio() {
        return this.demonstrativoPrecatorio;
    }

    @Override
    public ResumoJRAdapterPagamento getResumoPagamento() {
        return this.resumoPagamento;
    }

    @Override
    public ResumoPrecatorioJRAdapterPagamento getResumoPrecatorio() {
        return this.resumoPrecatorio;
    }

    @Override
    public InssAtualizacaoJRAdapter getDemonstrativoINSS() {
        return this.demonstrativoINSS;
    }

    @Override
    public EsocialAtualizacaoJRAdapter getDemonstrativoEsocial() {
        return this.demonstrativoEsocial;
    }

    @Override
    public IrpfAtualizacaoJRAdapter getIrpf() {
        return this.irpf;
    }

    @Override
    public IrpfHonorariosAtualizacaoJRAdapter getIrpfHonorarios() {
        return this.irpfHonorarios;
    }

    @Override
    public CustaAtualizacaoJRAdapter getCustas() {
        return this.custas;
    }

    @Override
    public String getComentarios() {
        return this.calculo.getComentarios();
    }

    @Override
    public JustificativaJRAdapter getJustificativa() {
        return this.justificativa;
    }

    @Override
    public String getIdentificacao() {
        StringBuilder sb = new StringBuilder();
        if (Utils.naoNulo(this.auditoria)) {
            sb.append("Atualiza\u00e7\u00e3o liquidada por ");
            sb.append(this.formatarNome());
            sb.append(" na vers\u00e3o ");
            sb.append(this.atualizacao.getVersaoDoSistema());
            sb.append(" em ");
            sb.append(this.formatarDataHora());
            sb.append('.');
        }
        return sb.toString();
    }

    private String formatarNome() {
        String nome = this.auditoria.getNome();
        if (Utils.nulo(nome) || nome.trim().isEmpty()) {
            return "-";
        }
        return nome;
    }

    private String formatarDataHora() {
        Date dataEvento = this.auditoria.getDataEvento();
        if (Utils.nulo(dataEvento)) {
            return "-";
        }
        SimpleDateFormat data = new SimpleDateFormat("dd/MM/yyyy");
        SimpleDateFormat hora = new SimpleDateFormat("HH:mm:ss");
        StringBuilder sb = new StringBuilder();
        try {
            sb.append(data.format(this.auditoria.getDataEvento()));
            sb.append(" \u00e0s ");
            sb.append(hora.format(this.auditoria.getDataEvento()));
        }
        catch (Exception e) {
            return "-";
        }
        return sb.toString();
    }

    public Auditoria getAuditoria() {
        return this.auditoria;
    }

    public void setAuditoria(Auditoria auditoria) {
        this.auditoria = auditoria;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public Atualizacao getAtualizacao() {
        return this.atualizacao;
    }

    public void setAtualizacao(Atualizacao atualizacao) {
        this.atualizacao = atualizacao;
    }

    public List<RelatorioPagamentoEnum> getSessoes() {
        return this.sessoes;
    }

    public void setSessoes(List<RelatorioPagamentoEnum> sessoes) {
        this.sessoes = sessoes;
    }
}

