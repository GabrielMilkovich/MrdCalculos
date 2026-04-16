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
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAcaoDeAuditoriaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.auditoria.Auditoria;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.AbstractResumoPrecatorioJrAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ApuracaoDeJurosJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ApuracaoDeJurosJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustasJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialInssFgtsJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialInssFgtsJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.FGTSJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.FGTSJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.HonorarioJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.HonorarioJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.MultaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.MultaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PensaoAlimenticiaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PensaoAlimenticiaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PrevidenciaPrivadaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PrevidenciaPrivadaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJrAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SalarioFamiliaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SalarioFamiliaJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SeguroDesempregoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SeguroDesempregoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado.ConsolidadoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado.RelatorioConsolidadoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.FaltasEFeriasJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto.CartaoDePontoDiarioJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto.CartaoDePontoMensalJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.historicosalarial.HistoricoSalarialJRAdapter;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public class ConsolidadoJRAdapterPadrao
extends ConsolidadoJRAdapter {
    private Calculo calculo;
    private Auditoria auditoria;
    private List<RelatorioConsolidadoEnum> sessoes;
    private HistoricoSalarialJRAdapter historicoSalarial;
    private CartaoDePontoMensalJRAdapter cartaoDePontoMensal;
    private CartaoDePontoDiarioJRAdapter cartaoDePontoDiario;
    private FaltasEFeriasJRAdapter faltasEFerias;
    private DemonstrativoJRAdapter demonstrativo;
    private AbstractResumoPrecatorioJrAdapter resumoPrecatorio;
    private ResumoJRAdapter resumo;
    private FGTSJRAdapter demonstrativoFGTS;
    private InssJRAdapter demonstrativoINSS;
    private EsocialInssFgtsJRAdapter demonstrativoEsocialInssFgts;
    private PensaoAlimenticiaJRAdapter pensaoAlimenticia;
    private PrevidenciaPrivadaJRAdapter previdenciaPrivada;
    private ApuracaoDeJurosJRAdapter apuracaoDeJuros;
    private MultaJRAdapter multa;
    private HonorarioJRAdapter honorario;
    private IrpfJRAdapter irpf;
    private CustaJRAdapter custas;
    private SeguroDesempregoJRAdapter seguroDesemprego;
    private SalarioFamiliaJRAdapter salarioFamilia;
    private JustificativaJRAdapter justificativa;

    public ConsolidadoJRAdapterPadrao() {
    }

    public ConsolidadoJRAdapterPadrao(Calculo calculo, List<RelatorioConsolidadoEnum> sessoes) {
        this.calculo = (Calculo)calculo.restaurar();
        this.calculo.getVerbas().size();
        this.calculo = calculo;
        this.auditoria = Auditoria.encontrarUltimoRegistroLiquidacaoDeUm(calculo, TipoDeAcaoDeAuditoriaEnum.LIQUIDACAO);
        this.sessoes = sessoes;
        this.iniciarAdatersAnexos();
    }

    private void iniciarAdatersAnexos() {
        if (this.getMostrarHistoricoSalarial()) {
            this.historicoSalarial = new HistoricoSalarialJRAdapter(this.calculo.getHistoricosSalariais());
        }
        if (this.getMostrarFaltasEFerias()) {
            this.faltasEFerias = new FaltasEFeriasJRAdapter(this.calculo);
        }
        if (this.getMostrarCartaoDePontoMensal()) {
            this.cartaoDePontoMensal = new CartaoDePontoMensalJRAdapter(this.calculo.getCartoesDePonto());
        }
        if (this.getMostrarCartaoDePontoDiario()) {
            this.cartaoDePontoDiario = new CartaoDePontoDiarioJRAdapter(this.calculo.getApuracoesDiariasCartaoDePonto(), this.calculo);
        }
        if (this.getMostrarDemonstrativo()) {
            this.demonstrativo = new DemonstrativoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarDemonstrativoFGTS()) {
            this.demonstrativoFGTS = new FGTSJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarDemonstrativoINSS()) {
            this.demonstrativoINSS = new InssJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarDemonstrativoEsocialInssFgts()) {
            this.demonstrativoEsocialInssFgts = new EsocialInssFgtsJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarPrevidenciaPrivada()) {
            this.previdenciaPrivada = new PrevidenciaPrivadaJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarApuracaoDeJuros()) {
            this.apuracaoDeJuros = new ApuracaoDeJurosJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarPensaoAlimenticia()) {
            this.pensaoAlimenticia = new PensaoAlimenticiaJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarMulta()) {
            this.multa = new MultaJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarHonorario()) {
            this.honorario = new HonorarioJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarIrpf()) {
            this.irpf = new IrpfJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarCustas()) {
            this.custas = new CustasJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarResumo()) {
            this.resumo = new ResumoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarResumoPrecatorio()) {
            this.resumoPrecatorio = new ResumoPrecatorioJrAdapterPadrao(this.calculo);
        }
        if (this.getMostrarSeguroDesemprego()) {
            this.seguroDesemprego = new SeguroDesempregoJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarSalarioFamilia()) {
            this.salarioFamilia = new SalarioFamiliaJRAdapterPadrao(this.calculo);
        }
        if (this.getMostrarJustificativas()) {
            this.justificativa = new JustificativaJRAdapterPadrao(this.calculo, false);
        }
    }

    public boolean getMostrarDadosDoCalculo() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.DADOS_DO_CALCULO);
    }

    public boolean getMostrarHistoricoSalarial() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.HISTORICO_SALARIAL);
    }

    public boolean getMostrarFaltasEFerias() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.FALTAS_E_FERIAS);
    }

    public boolean getMostrarCartaoDePontoMensal() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.CARTAO_MENSAL);
    }

    public boolean getMostrarCartaoDePontoDiario() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.CARTAO_DIARIO);
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
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

    public List<RelatorioConsolidadoEnum> getSessoes() {
        return this.sessoes;
    }

    public void setSessoes(List<RelatorioConsolidadoEnum> sessoes) {
        this.sessoes = sessoes;
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
    public Date getDataDeAjuizamento() {
        return this.calculo.getDataAjuizamento();
    }

    @Override
    public Date getDataDaLiquidacao() {
        return this.calculo.getDataDeLiquidacao();
    }

    @Override
    public CartaoDePontoMensalJRAdapter getCartaoDePontoMensal() {
        return this.cartaoDePontoMensal;
    }

    @Override
    public CartaoDePontoDiarioJRAdapter getCartaoDePontoDiario() {
        return this.cartaoDePontoDiario;
    }

    public void setCartaoDePontoDiario(CartaoDePontoDiarioJRAdapter cartaoDePontoDiario) {
        this.cartaoDePontoDiario = cartaoDePontoDiario;
    }

    @Override
    public HistoricoSalarialJRAdapter getHistoricoSalarial() {
        return this.historicoSalarial;
    }

    @Override
    public FaltasEFeriasJRAdapter getFaltasEFerias() {
        return this.faltasEFerias;
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
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.DEMONSTRATIVO_DE_CALCULO);
    }

    @Override
    public boolean getMostrarResumo() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.RESUMO_DE_CALCULO);
    }

    @Override
    public boolean getMostrarResumoPrecatorio() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.RESUMO_PRECATORIO);
    }

    @Override
    public boolean getMostrarAlgoAlemDoResumoEJustificativa() {
        return this.getMostrarDemonstrativo() || this.getMostrarDemonstrativoFGTS() || this.getMostrarDemonstrativoINSS() || this.getMostrarDemonstrativoEsocialInssFgts() || this.getMostrarPensaoAlimenticia() || this.getMostrarPrevidenciaPrivada() || this.getMostrarApuracaoDeJuros() || this.getMostrarMulta() || this.getMostrarHonorario() || this.getMostrarIrpf() || this.getMostrarSeguroDesemprego() || this.getMostrarCustas() || this.getMostrarSalarioFamilia() || this.getMostrarDadosDoCalculo() || this.getMostrarHistoricoSalarial() || this.getMostrarFaltasEFerias();
    }

    @Override
    public boolean getMostrarDemonstrativoFGTS() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.DEMONSTRATIVO_FGTS);
    }

    @Override
    public boolean getMostrarDemonstrativoINSS() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.DEMONSTRATIVO_INSS);
    }

    @Override
    public boolean getMostrarDemonstrativoEsocialInssFgts() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.DEMONSTRATIVO_ESOCIAL_INSS_FGTS);
    }

    @Override
    public boolean getMostrarPensaoAlimenticia() {
        PensaoAlimenticia pensaoAlimenticia = this.calculo.getPensaoAlimenticiaDoCalculo();
        if (pensaoAlimenticia != null) {
            return this.sessoes.contains((Object)RelatorioConsolidadoEnum.PENSAO_ALIMENTICIA) && pensaoAlimenticia.getApurarPensaoAlimenticia() != false;
        }
        return false;
    }

    @Override
    public boolean getMostrarPrevidenciaPrivada() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.PREVIDENCIA_PRIVADA);
    }

    @Override
    public boolean getMostrarApuracaoDeJuros() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.APURACAO_DE_JUROS);
    }

    @Override
    public boolean getMostrarMulta() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.DEMONSTRATIVO_MULTA);
    }

    @Override
    public boolean getMostrarHonorario() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.DEMONSTRATIVO_HONORARIO);
    }

    @Override
    public boolean getMostrarIrpf() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.DEMONSTRATIVO_IRPF);
    }

    @Override
    public boolean getMostrarSeguroDesemprego() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.SEGURO_DESEMPREGO);
    }

    @Override
    public boolean getMostrarCustas() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.DEMONSTRATIVO_CUSTAS);
    }

    @Override
    public boolean getMostrarSalarioFamilia() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.SALARIO_FAMILIA);
    }

    @Override
    public boolean getMostrarComentarios() {
        return Utils.naoVazio(this.calculo.getComentarios());
    }

    @Override
    public boolean getMostrarJustificativas() {
        return this.sessoes.contains((Object)RelatorioConsolidadoEnum.JUSTIFICATIVA);
    }

    @Override
    public DemonstrativoJRAdapter getDemonstrativo() {
        return this.demonstrativo;
    }

    @Override
    public ResumoJRAdapter getResumo() {
        return this.resumo;
    }

    @Override
    public AbstractResumoPrecatorioJrAdapter getResumoPrecatorio() {
        return this.resumoPrecatorio;
    }

    @Override
    public FGTSJRAdapter getDemonstrativoFGTS() {
        return this.demonstrativoFGTS;
    }

    @Override
    public InssJRAdapter getDemonstrativoINSS() {
        return this.demonstrativoINSS;
    }

    @Override
    public EsocialInssFgtsJRAdapter getDemonstrativoEsocialInssFgts() {
        return this.demonstrativoEsocialInssFgts;
    }

    @Override
    public PensaoAlimenticiaJRAdapter getPensaoAlimenticia() {
        return this.pensaoAlimenticia;
    }

    @Override
    public PrevidenciaPrivadaJRAdapter getPrevidenciaPrivada() {
        return this.previdenciaPrivada;
    }

    @Override
    public ApuracaoDeJurosJRAdapter getApuracaoDeJuros() {
        return this.apuracaoDeJuros;
    }

    @Override
    public MultaJRAdapter getMulta() {
        return this.multa;
    }

    @Override
    public HonorarioJRAdapter getHonorario() {
        return this.honorario;
    }

    @Override
    public IrpfJRAdapter getIrpf() {
        return this.irpf;
    }

    @Override
    public CustaJRAdapter getCustas() {
        return this.custas;
    }

    @Override
    public SeguroDesempregoJRAdapter getSeguroDesemprego() {
        return this.seguroDesemprego;
    }

    @Override
    public SalarioFamiliaJRAdapter getSalarioFamilia() {
        return this.salarioFamilia;
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
            sb.append("C\u00e1lculo liquidado por ");
            sb.append(this.formatarNome());
            sb.append(" na vers\u00e3o ");
            sb.append(this.calculo.getVersaoDoSistema());
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
}

