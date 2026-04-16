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
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeImportadaDoCalendarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeImportadaDoCartaoDePontoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaDoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.CartaoDePontoDaVerba;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTERMOQUANTIDADE")
@SequenceGenerator(name="SQTERMOQUANTIDADE", sequenceName="SQTERMOQUANTIDADE", allocationSize=1)
@Name(value="quantidade")
public class Quantidade
implements Termo {
    private static final long serialVersionUID = -5566656496999441525L;
    private static final int VENCIMENTO_DEZEMBRO = 20;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTERMOQUANTIDADE")
    @Column(name="IIDTERMOQUANTIDADE")
    private final Long id = null;
    @Column(name="STPQUANTIDADE", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeQuantidadeEnum")})
    private TipoDeQuantidadeEnum tipo = TipoDeQuantidadeEnum.INFORMADA;
    @Column(name="RVLOUTROVALOR", precision=38, scale=25)
    private BigDecimal valorInformado;
    @Column(name="STPCARTAOPONTO", columnDefinition="VARCHAR2(4)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeQuantidadeImportadaDoCartaoDePontoEnum")})
    private TipoDeQuantidadeImportadaDoCartaoDePontoEnum tipoImportadadoDoCartaoDePonto;
    @Column(name="STPCALENDARIO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeQuantidadeImportadaDoCalendarioEnum")})
    private TipoDeQuantidadeImportadaDoCalendarioEnum tipoImportadaCalendarioEnum;
    @Column(name="SFLPROPORCIONALIDADE", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarProporcionalidade = true;

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        if (this.tipo == TipoDeQuantidadeEnum.INFORMADA) {
            BigDecimal valor = this.valorInformado;
            if (valor != null && this.getAplicarProporcionalidade().booleanValue()) {
                int diasParaExcluir = 0;
                if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                    diasParaExcluir += parametro.getCalculo().obterDiasFerias(parametro.getPeriodo());
                }
                if (parametro.getPeriodo().totalDeDias() - diasParaExcluir == 31) {
                    diasParaExcluir = 1;
                }
                if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                    diasParaExcluir += parametro.getCalculo().obterFaltasJustificadas(parametro.getPeriodo());
                }
                if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                    diasParaExcluir += parametro.getCalculo().obterFaltasNaoJustificadas(parametro.getPeriodo());
                }
                parametro.setValorIntegral(valor);
                CalculoDoProporcionalizar proporcionalizar = new CalculoDoProporcionalizar(parametro.getPeriodo(), valor, diasParaExcluir);
                proporcionalizar.executar();
                valor = proporcionalizar.getResultado();
            }
            return valor;
        }
        if (this.tipo == TipoDeQuantidadeEnum.IMPORTADA_DO_CALENDARIO) {
            if (this.getTipoImportadaCalendarioEnum() == TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS) {
                LogicoFuzzy<?> sabadoDiaUtil = parametro.getCalculo().getSabadoDiaUtilComExcecao();
                int qtdDias = parametro.getPeriodo().totalDeDiasNaoUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                    List<Periodo> periodosFaltasJustificadas = parametro.getCalculo().obterPeriodosDeFaltasJustificadas(parametro.getPeriodo());
                    for (Periodo periodoFaltaJustificada : periodosFaltasJustificadas) {
                        qtdDias -= periodoFaltaJustificada.totalDeDiasNaoUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                    }
                }
                if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                    List<Periodo> periodosFaltasNaoJustificadas = parametro.getCalculo().obterPeriodosDeFaltasNaoJustificadas(parametro.getPeriodo());
                    for (Periodo periodoFaltaNaoJustificada : periodosFaltasNaoJustificadas) {
                        qtdDias -= periodoFaltaNaoJustificada.totalDeDiasNaoUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                    }
                }
                if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                    List<Periodo> periodosFeriasGozadas = parametro.getCalculo().obterPeriodosDeFeriasGozadas(parametro.getPeriodo());
                    for (Periodo periodoFeriasGozadas : periodosFeriasGozadas) {
                        qtdDias -= periodoFeriasGozadas.totalDeDiasNaoUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                    }
                }
                return new BigDecimal(qtdDias);
            }
            if (this.getTipoImportadaCalendarioEnum() == TipoDeQuantidadeImportadaDoCalendarioEnum.DIAS_UTEIS) {
                LogicoFuzzy<?> sabadoDiaUtil = parametro.getCalculo().getSabadoDiaUtilComExcecao();
                int qtdDias = parametro.getPeriodo().totalDeDiasUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                    List<Periodo> periodosFaltasJustificadas = parametro.getCalculo().obterPeriodosDeFaltasJustificadas(parametro.getPeriodo());
                    for (Periodo periodoFaltaJustificada : periodosFaltasJustificadas) {
                        qtdDias -= periodoFaltaJustificada.totalDeDiasUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                    }
                }
                if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                    List<Periodo> periodosFaltasNaoJustificadas = parametro.getCalculo().obterPeriodosDeFaltasNaoJustificadas(parametro.getPeriodo());
                    for (Periodo periodoFaltaNaoJustificada : periodosFaltasNaoJustificadas) {
                        qtdDias -= periodoFaltaNaoJustificada.totalDeDiasUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                    }
                }
                if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                    List<Periodo> periodosFeriasGozadas = parametro.getCalculo().obterPeriodosDeFeriasGozadas(parametro.getPeriodo());
                    for (Periodo periodoFeriasGozadas : periodosFeriasGozadas) {
                        qtdDias -= periodoFeriasGozadas.totalDeDiasUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                    }
                }
                return new BigDecimal(qtdDias);
            }
            if (this.getTipoImportadaCalendarioEnum() == TipoDeQuantidadeImportadaDoCalendarioEnum.FERIADOS) {
                int qtdDias = parametro.getPeriodo().totalDeFeriados();
                if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                    List<Periodo> periodosFaltasJustificadas = parametro.getCalculo().obterPeriodosDeFaltasJustificadas(parametro.getPeriodo());
                    for (Periodo periodoFaltaJustificada : periodosFaltasJustificadas) {
                        qtdDias -= periodoFaltaJustificada.totalDeFeriados();
                    }
                }
                if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                    List<Periodo> periodosFaltasNaoJustificadas = parametro.getCalculo().obterPeriodosDeFaltasNaoJustificadas(parametro.getPeriodo());
                    for (Periodo periodoFaltaNaoJustificada : periodosFaltasNaoJustificadas) {
                        qtdDias -= periodoFaltaNaoJustificada.totalDeFeriados();
                    }
                }
                if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                    List<Periodo> periodosFeriasGozadas = parametro.getCalculo().obterPeriodosDeFeriasGozadas(parametro.getPeriodo());
                    for (Periodo periodoFeriasGozadas : periodosFeriasGozadas) {
                        qtdDias -= periodoFeriasGozadas.totalDeFeriados();
                    }
                }
                return new BigDecimal(qtdDias);
            }
            if (this.getTipoImportadaCalendarioEnum() == TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS_FERIADOS) {
                LogicoFuzzy<?> sabadoDiaUtil = parametro.getCalculo().getSabadoDiaUtilComExcecao();
                int qtdDias = parametro.getPeriodo().totalDeRepousosEFeriados(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                    List<Periodo> periodosFaltasJustificadas = parametro.getCalculo().obterPeriodosDeFaltasJustificadas(parametro.getPeriodo());
                    for (Periodo periodoFaltaJustificada : periodosFaltasJustificadas) {
                        qtdDias -= periodoFaltaJustificada.totalDeRepousosEFeriados(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                    }
                }
                if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                    List<Periodo> periodosFaltasNaoJustificadas = parametro.getCalculo().obterPeriodosDeFaltasNaoJustificadas(parametro.getPeriodo());
                    for (Periodo periodoFaltaNaoJustificada : periodosFaltasNaoJustificadas) {
                        qtdDias -= periodoFaltaNaoJustificada.totalDeRepousosEFeriados(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                    }
                }
                if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                    List<Periodo> periodosFeriasGozadas = parametro.getCalculo().obterPeriodosDeFeriasGozadas(parametro.getPeriodo());
                    for (Periodo periodoFeriasGozadas : periodosFeriasGozadas) {
                        qtdDias -= periodoFeriasGozadas.totalDeRepousosEFeriados(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO);
                    }
                }
                return new BigDecimal(qtdDias);
            }
        }
        if (this.tipo == TipoDeQuantidadeEnum.APURADA) {
            return new BigDecimal(parametro.getCalculo().obterQuantidadeAdicionalAvisoPrevio());
        }
        if (this.tipo == TipoDeQuantidadeEnum.AVOS) {
            int avos = 0;
            if (OcorrenciaDePagamentoEnum.DEZEMBRO.equals((Object)parametro.getVerbaDeCalculo().getOcorrenciaDePagamento())) {
                int ano = HelperDate.getInstance(parametro.getPeriodo().getInicial()).getYear();
                HelperDate dataInicial = HelperDate.getInstance(ano, 0, 1);
                if (parametro.getCalculo().getLimitarAvosAoPeriodoDoCalculo().booleanValue()) {
                    if (HelperDate.dateAfter(parametro.getVerbaDeCalculo().getPeriodoInicial(), dataInicial.getDate())) {
                        Date primeiroDiaDoMesDoPeriodoInicialDaVerbaDeCalculo = HelperDate.getInstance(parametro.getVerbaDeCalculo().getPeriodoInicial()).setDay(1).getDate();
                        dataInicial = HelperDate.dateAfter(parametro.getCalculo().getDataAdmissao(), primeiroDiaDoMesDoPeriodoInicialDaVerbaDeCalculo) ? HelperDate.getInstance(parametro.getCalculo().getDataAdmissao()) : HelperDate.getInstance(primeiroDiaDoMesDoPeriodoInicialDaVerbaDeCalculo);
                    }
                } else if (HelperDate.dateAfter(parametro.getCalculo().getDataAdmissao(), dataInicial.getDate())) {
                    dataInicial = HelperDate.getInstance(parametro.getCalculo().getDataAdmissao());
                }
                HelperDate dataFinal = HelperDate.getInstance(ano, 11, 31);
                HelperDate dataDemissao = HelperDate.getInstance(parametro.getCalculo().getDataDemissao());
                if (dataDemissao != null) {
                    if (parametro.getCalculo().getProjetaAvisoIndenizado().booleanValue()) {
                        dataDemissao.addDay(parametro.getCalculo().obterQuantidadeAdicionalAvisoPrevio());
                    }
                    if (HelperDate.dateAfter(dataFinal.getDate(), dataDemissao.getDate())) {
                        dataFinal = dataDemissao;
                    } else if (HelperDate.getInstance(parametro.getPeriodo().getFinal()).compareDate(parametro.getCalculo().getDataDemissao())) {
                        dataFinal = dataDemissao;
                        if (HelperDate.getInstance(parametro.getCalculo().getDataDemissao()).getMonth() == 11 && HelperDate.getInstance(parametro.getCalculo().getDataDemissao()).getDay() > 20) {
                            dataInicial = dataFinal.clone();
                            dataInicial.setDay(1);
                            dataInicial.setMonth(0);
                        }
                    }
                }
                List<Periodo> periodos = HelperDate.breakInMonths(dataInicial.getDate(), dataFinal.getDate());
                for (Periodo periodo : periodos) {
                    int quantidadeDias = HelperDate.getInstance(periodo.getFinal()).getDay() - HelperDate.getInstance(periodo.getInicial()).getDay() + 1;
                    if ((quantidadeDias -= parametro.getCalculo().obterFaltasNaoJustificadas(periodo)) < 15) continue;
                    ++avos;
                }
            }
            if (OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO.equals((Object)parametro.getVerbaDeCalculo().getOcorrenciaDePagamento())) {
                int auxiliarDeAvo = 1;
                HelperDate dataAuxiliarDeFimDoAvo = HelperDate.getInstance(parametro.getPeriodoAquisitivo().getInicial()).addMonth(auxiliarDeAvo).addDay(-1);
                Date dataDeCorte = HelperDate.getInstance(parametro.getVerbaDeCalculo().getPeriodoInicial()).addYear(-1).getDate();
                while (HelperDate.dateAfter(parametro.getPeriodoAquisitivo().getFinal(), dataAuxiliarDeFimDoAvo.getDate())) {
                    if (parametro.getCalculo().getLimitarAvosAoPeriodoDoCalculo().booleanValue()) {
                        if (HelperDate.dateBeforeOrEquals(dataDeCorte, dataAuxiliarDeFimDoAvo.getDate())) {
                            ++avos;
                        }
                    } else {
                        ++avos;
                    }
                    dataAuxiliarDeFimDoAvo = HelperDate.getInstance(parametro.getPeriodoAquisitivo().getInicial()).addMonth(++auxiliarDeAvo).addDay(-1);
                }
                HelperDate dataAuxiliarDeInicioDoAvo = HelperDate.getInstance(parametro.getPeriodoAquisitivo().getInicial()).addMonth(auxiliarDeAvo - 1);
                if (parametro.getCalculo().getLimitarAvosAoPeriodoDoCalculo().booleanValue()) {
                    long quantidadeDias;
                    if (HelperDate.dateBeforeOrEquals(dataDeCorte, parametro.getPeriodoAquisitivo().getFinal()) && (quantidadeDias = HelperDate.getInstance(parametro.getPeriodoAquisitivo().getFinal()).subtractDays(dataAuxiliarDeInicioDoAvo) + 1L) >= 15L) {
                        ++avos;
                    }
                } else {
                    long quantidadeDias = HelperDate.getInstance(parametro.getPeriodoAquisitivo().getFinal()).subtractDays(dataAuxiliarDeInicioDoAvo) + 1L;
                    if (quantidadeDias >= 15L) {
                        ++avos;
                    }
                }
            }
            return new BigDecimal(avos);
        }
        if (this.tipo == TipoDeQuantidadeEnum.IMPORTADA_DO_CARTAO) {
            BigDecimal valor = BigDecimal.ZERO;
            for (CartaoDePontoDaVerba cdpv : parametro.getVerbaDeCalculo().getCartoesDePontoDaVerbaQuantidade()) {
                for (OcorrenciaDoCartaoDePonto ocdp : cdpv.getCartaoDePonto().obterOcorrencias()) {
                    if (!HelperDate.compareMonthAndYear(parametro.getPeriodo().getInicial(), ocdp.getDataOcorrencia())) continue;
                    valor = valor.add(ocdp.getValor());
                }
            }
            return valor;
        }
        throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0018, "Quantidade '" + this.tipo.getNome() + "' n\u00e3o dispon\u00edvel para essa vers\u00e3o"));
    }

    public TipoDeQuantidadeEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoDeQuantidadeEnum tipo) {
        this.tipo = tipo;
    }

    public BigDecimal getValorInformado() {
        return this.valorInformado;
    }

    public void setValorInformado(BigDecimal valorInformado) {
        this.valorInformado = valorInformado;
    }

    public TipoDeQuantidadeImportadaDoCartaoDePontoEnum getTipoImportadadoDoCartaoDePonto() {
        return this.tipoImportadadoDoCartaoDePonto;
    }

    public void setTipoImportadadoDoCartaoDePonto(TipoDeQuantidadeImportadaDoCartaoDePontoEnum tipoImportadadoDoCartaoDePonto) {
        this.tipoImportadadoDoCartaoDePonto = tipoImportadadoDoCartaoDePonto;
    }

    public TipoDeQuantidadeImportadaDoCalendarioEnum getTipoImportadaCalendarioEnum() {
        return this.tipoImportadaCalendarioEnum;
    }

    public void setTipoImportadaCalendarioEnum(TipoDeQuantidadeImportadaDoCalendarioEnum tipoImportadaCalendarioEnum) {
        this.tipoImportadaCalendarioEnum = tipoImportadaCalendarioEnum;
    }

    public Boolean getAplicarProporcionalidade() {
        return this.aplicarProporcionalidade;
    }

    public void setAplicarProporcionalidade(Boolean aplicarProporcionalidade) {
        this.aplicarProporcionalidade = aplicarProporcionalidade;
    }

    public Long getId() {
        return this.id;
    }

    public String toString() {
        if (this.tipo == TipoDeQuantidadeEnum.INFORMADA && this.valorInformado != null) {
            return Utils.formatarNumero(this.valorInformado);
        }
        return this.tipo.getNome();
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.aplicarProporcionalidade == null ? 0 : this.aplicarProporcionalidade.hashCode());
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        result = 31 * result + (this.tipo == null ? 0 : this.tipo.hashCode());
        result = 31 * result + (this.tipoImportadaCalendarioEnum == null ? 0 : this.tipoImportadaCalendarioEnum.hashCode());
        result = 31 * result + (this.tipoImportadadoDoCartaoDePonto == null ? 0 : this.tipoImportadadoDoCartaoDePonto.hashCode());
        result = 31 * result + (this.valorInformado == null ? 0 : this.valorInformado.hashCode());
        return result;
    }

    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        Quantidade other = (Quantidade)obj;
        if (this.aplicarProporcionalidade == null ? other.aplicarProporcionalidade != null : !this.aplicarProporcionalidade.equals(other.aplicarProporcionalidade)) {
            return false;
        }
        if (this.id == null ? other.id != null : !this.id.equals(other.id)) {
            return false;
        }
        if (this.tipo != other.tipo) {
            return false;
        }
        if (this.tipoImportadaCalendarioEnum != other.tipoImportadaCalendarioEnum) {
            return false;
        }
        if (this.tipoImportadadoDoCartaoDePonto != other.tipoImportadadoDoCartaoDePonto) {
            return false;
        }
        return !(this.valorInformado == null ? other.valorInformado != null : !this.valorInformado.equals(other.valorInformado));
    }
}

