/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.FetchType
 *  javax.persistence.JoinColumn
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.OneToOne
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.dominio.Data;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeInssSobreSalarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.TotalizadorInssSobreSalarios;
import java.math.BigDecimal;
import java.util.Date;
import java.util.Set;
import javax.persistence.Column;
import javax.persistence.FetchType;
import javax.persistence.JoinColumn;
import javax.persistence.MappedSuperclass;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;

@MappedSuperclass
public abstract class InssSobreSalarios
extends EntidadeBase {
    private static final long serialVersionUID = 1427493860949677011L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDINSSCALCULO")
    private Inss inss;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="DDTINICIAL", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @Required
    @LimitedTo100Years
    private Date dataInicioPeriodo;
    @Column(name="DDTFINAL", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @Required
    @GreaterOrEqualThan(value="dataInicioPeriodo")
    @LimitedTo100Years
    private Date dataTerminoPeriodo;
    @Transient
    private TotalizadorInssSobreSalarios totalizador;

    public InssSobreSalarios() {
    }

    public InssSobreSalarios(Class<? extends RepositorioDeInssSobreSalarios<? extends InssSobreSalarios>> classeDoRepositorio) {
        super(classeDoRepositorio);
    }

    public abstract Set<? extends OcorrenciaDeInss> getOcorrencias();

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public TotalizadorInssSobreSalarios getTotalizador() {
        if (Utils.nulo(this.totalizador)) {
            this.totalizador = new TotalizadorInssSobreSalarios(this);
        }
        return this.totalizador;
    }

    public Inss getInss() {
        return this.inss;
    }

    public void setInss(Inss inss) {
        this.inss = inss;
    }

    public Date getDataInicioPeriodo() {
        return this.dataInicioPeriodo;
    }

    public void setDataInicioPeriodo(Date dataInicioPeriodo) {
        this.dataInicioPeriodo = dataInicioPeriodo;
    }

    public Date getDataTerminoPeriodo() {
        return this.dataTerminoPeriodo;
    }

    public void setDataTerminoPeriodo(Date dataTerminoPeriodo) {
        this.dataTerminoPeriodo = dataTerminoPeriodo;
    }

    public abstract String getDiscriminador();

    public void validar(NegocioException excecao, boolean salarioDevido) {
        if (Utils.nulo(this.dataInicioPeriodo)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial" + this.getDiscriminador(), Mensagens.MSG0003, "Data Inicial"));
        } else if (new Data(this.dataInicioPeriodo).isAnteriorOuPosteriosACemAnos()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial" + this.getDiscriminador(), Mensagens.MSG0011, "Data Inicial"));
        }
        if (Utils.nulo(this.dataTerminoPeriodo)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoFinal" + this.getDiscriminador(), Mensagens.MSG0003, "Data Final"));
        } else if (new Data(this.dataTerminoPeriodo).isAnteriorOuPosteriosACemAnos()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoFinal" + this.getDiscriminador(), Mensagens.MSG0011, "Data Final"));
        }
        if (Utils.naoNulos(this.dataInicioPeriodo, this.dataTerminoPeriodo)) {
            Periodo periodo;
            if (Data.dataComValor(this.dataTerminoPeriodo).isAnteriorA(this.dataInicioPeriodo)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoFinal" + this.getDiscriminador(), Mensagens.MSG0008, "Data Final", "Data Inicial"));
            }
            if (salarioDevido) {
                periodo = this.getDataParaRestricaoSalarioDevido();
                periodo.setInicial(periodo.obterDataInicialHelper().getDate());
                periodo.setFinal(periodo.obterDataFinalHelper().getDate());
            } else {
                periodo = this.getDataParaRestricaoSalarioPago();
                periodo.setInicial(HelperDate.getInstance(this.getInss().getCalculo().getDataAdmissao()).getDate());
                periodo.setFinal(periodo.obterDataFinalHelper().getDate());
            }
            if (!periodo.isPeriodoContemEsta(this.dataInicioPeriodo)) {
                if (periodo.isDataMenorQueIncial(this.dataInicioPeriodo)) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial" + this.getDiscriminador(), Mensagens.MSG0008, "Data Inicial", periodo.getLabelDataIncial()));
                } else {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoInicial" + this.getDiscriminador(), Mensagens.MSG0010, "Data Inicial", periodo.getLabelDataFinal()));
                }
            }
            if (!periodo.isPeriodoContemEsta(this.dataTerminoPeriodo)) {
                if (periodo.isDataMaiorQueFinal(this.dataTerminoPeriodo)) {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoFinal" + this.getDiscriminador(), Mensagens.MSG0010, "Data Final", periodo.getLabelDataFinal()));
                } else {
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("periodoFinal" + this.getDiscriminador(), Mensagens.MSG0008, "Data Final", periodo.getLabelDataIncial()));
                }
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
    }

    public Periodo getDataParaRestricaoSalarioDevido() {
        Periodo periodo = new Periodo();
        HelperDate dataAdmissao = HelperDate.getInstance(this.getInss().getCalculo().getDataAdmissao());
        HelperDate dataInicioDoCalculo = HelperDate.getInstance(this.getInss().getCalculo().getDataInicioCalculo());
        HelperDate dataPrescricaoQuinquenal = null;
        if (this.getInss().getCalculo().getPrescricaoQuinquenal().booleanValue()) {
            dataPrescricaoQuinquenal = HelperDate.getInstance(this.getInss().getCalculo().getDataDePrescricao());
        }
        HelperDate maiorData = dataAdmissao;
        periodo.setInicial(maiorData.getDate());
        periodo.setLabelDataIncial("Data de Admiss\u00e3o");
        if (Utils.naoNulo(dataInicioDoCalculo) && (Utils.nulo(maiorData) || dataInicioDoCalculo.greaterThen(maiorData))) {
            maiorData = dataInicioDoCalculo;
            periodo.setInicial(maiorData.getDate());
            periodo.setLabelDataIncial("Data In\u00edcio do C\u00e1lculo");
        }
        if (Utils.naoNulo(dataPrescricaoQuinquenal) && (Utils.nulo(maiorData) || dataPrescricaoQuinquenal.greaterThen(maiorData))) {
            maiorData = dataPrescricaoQuinquenal;
            periodo.setInicial(maiorData.getDate());
            periodo.setLabelDataIncial("Data Prescri\u00e7\u00e3o Quinquenal");
        }
        HelperDate dataDemissao = HelperDate.getInstance(this.getInss().getCalculo().getDataDemissao());
        HelperDate dataFimDoCalculo = HelperDate.getInstance(this.getInss().getCalculo().getDataTerminoCalculo());
        HelperDate dataFinal = dataDemissao;
        if (Utils.naoNulo(dataFimDoCalculo) && (Utils.nulo(dataDemissao) || dataFimDoCalculo.greaterThen(dataFinal))) {
            dataFinal = dataFimDoCalculo;
            periodo.setFinal(dataFinal.getDate());
            periodo.setLabelDataFinal("Data Fim do C\u00e1lculo");
        } else {
            dataFinal = dataDemissao;
            periodo.setFinal(dataFinal.getDate());
            periodo.setLabelDataFinal("Data de Demiss\u00e3o");
        }
        return periodo;
    }

    public Periodo getDataParaRestricaoSalarioPago() {
        Periodo periodo = new Periodo();
        if (Utils.naoNulo(this.getInss()) && Utils.naoNulo(this.getInss().getCalculo())) {
            periodo.setInicial(this.getInss().getCalculo().getDataAdmissao());
            periodo.setLabelDataIncial("Data de Admiss\u00e3o");
            if (Utils.naoNulo(this.getInss().getCalculo().getDataDemissao())) {
                periodo.setFinal(this.getInss().getCalculo().getDataDemissao());
                periodo.setLabelDataFinal("Data de Demiss\u00e3o");
            } else {
                periodo.setFinal(this.getInss().getCalculo().getDataTerminoCalculo());
                periodo.setLabelDataFinal("Data Fim do C\u00e1lculo");
            }
        }
        return periodo;
    }

    public abstract void sugerirDatas();

    public abstract boolean existemOcorrencias();

    public abstract Boolean getCorrecaoTrabalhista();

    public abstract Date getDataLimiteCorrecaoTrabalhista();

    public abstract Boolean getCorrecao11941();

    public abstract Date getDataLimiteCorrecao11941();

    public abstract Boolean getCorrecaoPrevidenciaria();

    public BigDecimal getValorTotalInssSegurado() {
        return this.getTotalizador().getSeguradoReclamadoCorrigido();
    }

    public BigDecimal getJurosTotalInssSegurado() {
        return this.getTotalizador().getJurosSeguradoReclamadoCorrigido();
    }

    public BigDecimal getMultaTotalInssSegurado() {
        return this.getTotalizador().getMultaSeguradoReclamadoCorrigido();
    }

    public BigDecimal getTotalGeralInssSegurado() {
        return this.getTotalizador().getTotalSeguradoReclamadoCorrigido();
    }

    public BigDecimal getValorTotalInssEmpresa() {
        return this.getTotalizador().getEmpresaFinalCorrigido();
    }

    public BigDecimal getJurosTotalInssEmpresa() {
        return this.getTotalizador().getJurosEmpresaFinalCorrigido();
    }

    public BigDecimal getMultaTotalInssEmpresa() {
        return this.getTotalizador().getMultaEmpresaFinalCorrigido();
    }

    public BigDecimal getTotalGeralInssEmpresa() {
        return this.getTotalizador().getTotalEmpresaFinalCorrigido();
    }

    public BigDecimal getValorTotalInssSAT() {
        return this.getTotalizador().getSatCorrigido();
    }

    public BigDecimal getJurosTotalInssSAT() {
        return this.getTotalizador().getJurosSatCorrigido();
    }

    public BigDecimal getMultaTotalInssSAT() {
        return this.getTotalizador().getMultaSatCorrigido();
    }

    public BigDecimal getTotalGeralInssSAT() {
        return this.getTotalizador().getTotalSatCorrigido();
    }

    public BigDecimal getValorTotalInssTerceiros() {
        return this.getTotalizador().getTerceirosCorrigido();
    }

    public BigDecimal getJurosTotalInssTerceiros() {
        return this.getTotalizador().getJurosTerceirosCorrigido();
    }

    public BigDecimal getMultaTotalInssTerceiros() {
        return this.getTotalizador().getMultaTerceirosCorrigido();
    }

    public BigDecimal getTotalGeralInssTerceiros() {
        return this.getTotalizador().getTotalTerceirosCorrigido();
    }
}

