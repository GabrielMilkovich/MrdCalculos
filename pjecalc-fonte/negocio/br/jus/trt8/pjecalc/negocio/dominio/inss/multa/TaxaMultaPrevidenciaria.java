/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.multa;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDaMultaDoINSSEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAliquotaDoEmpregadorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAliquotaDoSeguradoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPagamentoDaMultaDoINSSEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPeriodicidadeMultaPrevidenciariaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AtividadeEconomica;
import br.jus.trt8.pjecalc.negocio.dominio.inss.multa.RepositorioDeTaxaMultaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.multa.TaxaMultaPrevidenciariaOptimizerListSearch;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;

@Entity
@Table(name="TBTAXAMULTAINSS")
@SequenceGenerator(name="SQTAXAMULTAINSS", sequenceName="SQTAXAMULTAINSS", allocationSize=1)
public class TaxaMultaPrevidenciaria
extends EntidadeBase {
    private static final long serialVersionUID = -5781080650751597967L;
    private static final HelperDate TRINTA_SETEMBRO_2008 = HelperDate.getInstance(2008, 8, 30);
    private static final String SERVICOS_DOMESTICOS = "SERVI\u00c7OS DOM\u00c9STICOS";
    private static final BigDecimal TAXA_MULTA_CALCULO_EXTERNO = new BigDecimal("0.33");
    private static final BigDecimal TETO_MULTA_CALCULO_EXTERNO = new BigDecimal("20");
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTAXAMULTAINSS")
    @Column(name="IIDTAXAMULTA", nullable=false)
    private final Long id = null;
    @Column(name="DDTINICIO")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicial;
    @Column(name="DDTFIM")
    @Temporal(value=TemporalType.DATE)
    private Date dataFinal;
    @Column(name="STPMULTA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDaMultaDoINSSEnum")})
    private TipoDaMultaDoINSSEnum tipoMulta = TipoDaMultaDoINSSEnum.URBANA;
    @Column(name="STPPERIODICIDADE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoPeriodicidadeMultaPrevidenciariaEnum")})
    private TipoPeriodicidadeMultaPrevidenciariaEnum periodicidadeMulta = TipoPeriodicidadeMultaPrevidenciariaEnum.TAXA_UNICA;
    @Column(name="RVLTAXA", precision=38, scale=25)
    private BigDecimal taxa;
    @Column(name="RVLTETOTAXADIARIA", precision=38, scale=25)
    private BigDecimal tetoTaxaDiaria;
    @Column(name="SFLPERMITEREDUCAO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean permiteReducao = Boolean.FALSE;

    public TaxaMultaPrevidenciaria() {
        super(RepositorioDeTaxaMultaPrevidenciaria.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public Date getDataInicial() {
        return this.dataInicial;
    }

    public Date getDataFinal() {
        return this.dataFinal;
    }

    public TipoDaMultaDoINSSEnum getTipoMulta() {
        return this.tipoMulta;
    }

    public TipoPeriodicidadeMultaPrevidenciariaEnum getPeriodicidadeMulta() {
        return this.periodicidadeMulta;
    }

    public BigDecimal getTaxa() {
        return this.taxa;
    }

    public BigDecimal getTetoTaxaDiaria() {
        return this.tetoTaxaDiaria;
    }

    public Boolean getPermiteReducao() {
        return this.permiteReducao;
    }

    public static TaxaMultaPrevidenciariaOptimizerListSearch obterListaOtimizada(Date dataInicio, Date dataFim) {
        TaxaMultaPrevidenciariaOptimizerListSearch taxaMultaPrevidenciariaOptimizerListSearch = new TaxaMultaPrevidenciariaOptimizerListSearch(dataFim);
        taxaMultaPrevidenciariaOptimizerListSearch.init((Collection<TaxaMultaPrevidenciaria>)TaxaMultaPrevidenciaria.getRepositorio(RepositorioDeTaxaMultaPrevidenciaria.class).obterTodos(dataInicio, dataFim));
        return taxaMultaPrevidenciariaOptimizerListSearch;
    }

    public static TaxaMultaPrevidenciaria obterTaxaNa(Date data) {
        List<TaxaMultaPrevidenciaria> lista = TaxaMultaPrevidenciaria.getRepositorio(RepositorioDeTaxaMultaPrevidenciaria.class).obterTodos(data, data);
        if (lista == null || lista.isEmpty()) {
            return null;
        }
        return lista.get(0);
    }

    public BigDecimal resolverTaxa(InssSobreSalarios inssSobreSalarios, Competencia competencia, boolean ehDecimoTerceiro, Date dataLiquidacao) {
        return this.resolverTaxa(inssSobreSalarios, competencia.getHelperDate(), ehDecimoTerceiro, dataLiquidacao, false);
    }

    public BigDecimal resolverTaxa(InssSobreSalarios inssSobreSalarios, HelperDate competenciaHelperDate, boolean ehDecimoTerceiro, Date dataLiquidacao, boolean semProjecaoDeData) {
        if (inssSobreSalarios.getInss().getCalculo().isCalculoExterno().booleanValue()) {
            return this.resolverTaxaCalculoExterno(inssSobreSalarios, dataLiquidacao, ehDecimoTerceiro);
        }
        Competencia competencia = Competencia.getInstance(competenciaHelperDate.getDate());
        ParametrosDeAtualizacao parametros = inssSobreSalarios.getInss().getCalculo().getParametrosDeAtualizacao();
        TipoPagamentoDaMultaDoINSSEnum tipoPagamento = null;
        Boolean existeDataDeInicioDeAtualizacaoPrevidenciaria = null;
        Boolean existeDataDeInicioDeLei11941 = null;
        Date aPartirLei11941 = null;
        Boolean ehEmpregadoDomestico = null;
        Date dataInicioAtualizacaoPrevidenciaria = null;
        if (inssSobreSalarios instanceof InssSobreSalariosDevidos) {
            AtividadeEconomica atividadeSelecionada;
            tipoPagamento = parametros.getPagamentoDaMultaDosSalariosDevidosDoINSS();
            existeDataDeInicioDeAtualizacaoPrevidenciaria = Utils.naoNulo(parametros.getAplicarAteDosSalariosDevidosDoINSS());
            existeDataDeInicioDeLei11941 = parametros.getLei11941() != false && Utils.naoNulo(parametros.getApartirDeLei11941());
            aPartirLei11941 = HelperDate.getCurrentCompetence(parametros.getApartirDeLei11941()).getDate();
            dataInicioAtualizacaoPrevidenciaria = parametros.getAplicarAteDosSalariosDevidosDoINSS();
            ehEmpregadoDomestico = ((InssSobreSalariosDevidos)inssSobreSalarios).getApurarInssSegurado().booleanValue() ? (!TipoDeAliquotaDoSeguradoEnum.EMPREGADO_DOMESTICO.equals((Object)inssSobreSalarios.getInss().getTipoAliquotaSegurado()) ? Boolean.valueOf(false) : Boolean.valueOf(true)) : (!TipoDeAliquotaDoEmpregadorEnum.POR_ATIVIDADE_ECONOMICA.equals((Object)inssSobreSalarios.getInss().getTipoAliquotaEmpregador()) ? Boolean.valueOf(false) : (SERVICOS_DOMESTICOS.equals((atividadeSelecionada = inssSobreSalarios.getInss().getAtividadeEconomica()).getDescricao().toUpperCase()) ? Boolean.valueOf(true) : Boolean.valueOf(false)));
        } else {
            tipoPagamento = parametros.getPagamentoDaMultaDosSalariosPagosDoINSS();
            existeDataDeInicioDeAtualizacaoPrevidenciaria = Utils.naoNulo(parametros.getAplicarAteDosSalariosPagosDoINSS());
            existeDataDeInicioDeLei11941 = parametros.getLei11941Pago() != false && Utils.naoNulo(parametros.getApartirDeLei11941Pago());
            aPartirLei11941 = HelperDate.getCurrentCompetence(parametros.getApartirDeLei11941Pago()).getDate();
            dataInicioAtualizacaoPrevidenciaria = parametros.getAplicarAteDosSalariosPagosDoINSS();
            ehEmpregadoDomestico = !TipoDeAliquotaDoSeguradoEnum.EMPREGADO_DOMESTICO.equals((Object)inssSobreSalarios.getInss().getTipoAliquotaSegurado()) ? Boolean.valueOf(false) : Boolean.valueOf(true);
        }
        switch (this.getPeriodicidadeMulta()) {
            case TAXA_UNICA: {
                if (HelperDate.dateEquals(competencia.getData(), dataLiquidacao)) {
                    return BigDecimal.ZERO;
                }
                if (TipoPagamentoDaMultaDoINSSEnum.REDUZIDO.equals((Object)tipoPagamento) && this.getPermiteReducao().booleanValue()) {
                    return this.getTaxa().divide(new BigDecimal(2), Utils.CONTEXTO_MATEMATICO);
                }
                return this.getTaxa();
            }
            case DIARIA: {
                BigDecimal taxa;
                HelperDate dataInicial = null;
                if (semProjecaoDeData) {
                    dataInicial = competenciaHelperDate.addDay(-1);
                } else if (!(!Boolean.TRUE.equals(existeDataDeInicioDeAtualizacaoPrevidenciaria) || existeDataDeInicioDeLei11941.booleanValue() && HelperDate.dateAfterOrEquals(competencia.getData(), aPartirLei11941))) {
                    Competencia competenciaInicialParaContagem = new Competencia(competencia.getMes(), competencia.getAno());
                    HelperDate competenciaAplicarAte = HelperDate.getCurrentCompetence(dataInicioAtualizacaoPrevidenciaria);
                    if (Utils.naoNulo(dataInicioAtualizacaoPrevidenciaria) && HelperDate.dateAfter(competenciaAplicarAte.getDate(), competencia.getData())) {
                        competenciaInicialParaContagem.setAno(competenciaAplicarAte.getYear());
                        competenciaInicialParaContagem.setMes(competenciaAplicarAte.getMonth());
                    }
                    dataInicial = HelperDate.getInstance(competenciaInicialParaContagem.getAno(), competenciaInicialParaContagem.getMes(), 2).addMonth(1);
                    while (!dataInicial.isWorkDayWithoutSaturdays()) {
                        dataInicial.addDay(1);
                    }
                } else if (ehEmpregadoDomestico.booleanValue() && !ehDecimoTerceiro) {
                    Competencia competenciaJunho2015 = new Competencia(5, 2015);
                    if (competencia.isAnteriorA(competenciaJunho2015.getData())) {
                        dataInicial = HelperDate.getInstance(competencia.getAno(), competencia.getMes(), 15).addMonth(1);
                        while (!dataInicial.isWorkDayWithoutSaturdays()) {
                            dataInicial.addDay(1);
                        }
                    } else {
                        dataInicial = HelperDate.getInstance(competencia.getAno(), competencia.getMes(), 7).addMonth(1);
                        while (!dataInicial.isWorkDayWithoutSaturdays()) {
                            dataInicial.addDay(-1);
                        }
                    }
                } else {
                    dataInicial = HelperDate.getInstance(competencia.getAno(), competencia.getMes(), 20).addMonth(1);
                    while (!dataInicial.isWorkDayWithoutSaturdays()) {
                        dataInicial.addDay(-1);
                    }
                }
                long totalDeDias = HelperDate.countDays(dataInicial.getDate(), dataLiquidacao);
                if (totalDeDias < 0L) {
                    totalDeDias = 0L;
                }
                if ((taxa = this.getTaxa().multiply(new BigDecimal(totalDeDias), Utils.CONTEXTO_MATEMATICO)).compareTo(this.getTetoTaxaDiaria()) > 0) {
                    taxa = this.getTetoTaxaDiaria();
                }
                return taxa;
            }
        }
        return null;
    }

    private BigDecimal resolverTaxaCalculoExterno(InssSobreSalarios inssSobreSalarios, Date dataLiquidacao, boolean ehDecimoTerceiro) {
        BigDecimal taxa;
        Calculo calculo = inssSobreSalarios.getInss().getCalculo();
        ParcelasAtualizaveisOutrosDebitosReclamado parcelasExternoOutrosDebitosReclamado = ParcelasAtualizaveisOutrosDebitosReclamado.obterDoCalculo(calculo);
        Date dataInicial = null;
        if (inssSobreSalarios instanceof InssSobreSalariosDevidos && calculo.getParametrosDeAtualizacao().getLei11941().booleanValue() && ehDecimoTerceiro) {
            dataInicial = parcelasExternoOutrosDebitosReclamado.getDataInicialAposFev2009MultaContribSocialDevidos();
        } else if (inssSobreSalarios instanceof InssSobreSalariosDevidos && calculo.getParametrosDeAtualizacao().getLei11941().booleanValue() && !ehDecimoTerceiro) {
            dataInicial = parcelasExternoOutrosDebitosReclamado.getDataInicialAteFev2009MultaContribSocialDevidos();
        } else if (inssSobreSalarios instanceof InssSobreSalariosDevidos && !calculo.getParametrosDeAtualizacao().getLei11941().booleanValue()) {
            dataInicial = parcelasExternoOutrosDebitosReclamado.getDataInicialBaseMultaContribSocialDevidos();
        } else if (inssSobreSalarios instanceof InssSobreSalariosPagos && calculo.getParametrosDeAtualizacao().getLei11941Pago().booleanValue() && ehDecimoTerceiro) {
            dataInicial = parcelasExternoOutrosDebitosReclamado.getDataInicialAposFev2009MultaContribSocialPagos();
        } else if (inssSobreSalarios instanceof InssSobreSalariosPagos && calculo.getParametrosDeAtualizacao().getLei11941Pago().booleanValue() && !ehDecimoTerceiro) {
            dataInicial = parcelasExternoOutrosDebitosReclamado.getDataInicialAteFev2009MultaContribSocialPagos();
        } else if (inssSobreSalarios instanceof InssSobreSalariosPagos && !calculo.getParametrosDeAtualizacao().getLei11941Pago().booleanValue()) {
            dataInicial = parcelasExternoOutrosDebitosReclamado.getDataInicialBaseMultaContribSocialPagos();
        }
        if (Utils.nulo(dataInicial)) {
            return BigDecimal.ZERO;
        }
        long totalDeDias = HelperDate.countDays(dataInicial, dataLiquidacao);
        if (totalDeDias < 0L) {
            totalDeDias = 0L;
        }
        if ((taxa = TAXA_MULTA_CALCULO_EXTERNO.multiply(new BigDecimal(totalDeDias), Utils.CONTEXTO_MATEMATICO)).compareTo(TETO_MULTA_CALCULO_EXTERNO) > 0) {
            taxa = TETO_MULTA_CALCULO_EXTERNO;
        }
        return taxa;
    }

    public BigDecimal resolverTaxaIrpf(Competencia competencia, Date dataLiquidacao) {
        long totalDeDias;
        HelperDate dataInicial = null;
        if (HelperDate.getInstance(dataLiquidacao).lessThanOrEqualsTo(TRINTA_SETEMBRO_2008)) {
            dataInicial = HelperDate.getInstance(competencia.getAno(), competencia.getMes(), 10).addMonth(1);
            while (!dataInicial.isWorkDayWithoutSaturdays()) {
                dataInicial.addDay(1);
            }
        } else {
            dataInicial = HelperDate.getInstance(competencia.getAno(), competencia.getMes(), 20).addMonth(1);
            while (!dataInicial.isWorkDayWithoutSaturdays()) {
                dataInicial.addDay(-1);
            }
        }
        if ((totalDeDias = HelperDate.countDays(dataInicial.getDate(), dataLiquidacao)) < 0L) {
            totalDeDias = 0L;
        }
        BigDecimal taxa = this.getTaxa().multiply(new BigDecimal(totalDeDias), Utils.CONTEXTO_MATEMATICO);
        if (Utils.naoNulo(this.getTetoTaxaDiaria()) && taxa.compareTo(this.getTetoTaxaDiaria()) > 0) {
            taxa = this.getTetoTaxaDiaria();
        }
        return taxa;
    }
}

