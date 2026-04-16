/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.RepositorioDeExcecaoDaCargaHorariaDoCalculo;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBEXCECAOCARGAHORARIACALCULO")
@SequenceGenerator(name="SQEXCECAOCARGAHORARIACALCULO", sequenceName="SQEXCECAOCARGAHORARIACALCULO", allocationSize=1)
@Name(value="excecaoDaCargaHorariaDoCalculo")
public class ExcecaoDaCargaHorariaDoCalculo
extends EntidadeBase {
    private static final long serialVersionUID = 4684137436019345533L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQEXCECAOCARGAHORARIACALCULO")
    @Column(name="IIDEXCECAOCARGAHORARIACALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="DDTINICIOEXCECAO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @LimitedTo100Years
    @Required
    private Date dataInicioExcecao;
    @Column(name="DDTTERMINOEXCECAO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @LimitedTo100Years
    @GreaterOrEqualThan(value="dataInicioExcecao")
    @Required
    private Date dataTerminoExcecao;
    @Column(name="RVLCARGAHORARIA", precision=7, scale=4)
    @Required
    private BigDecimal valorCargaHoraria;

    public ExcecaoDaCargaHorariaDoCalculo() {
        super(RepositorioDeExcecaoDaCargaHorariaDoCalculo.class);
    }

    public ExcecaoDaCargaHorariaDoCalculo(Calculo calculo, Date dataInicioExcecao, Date dataTerminoExcecao, BigDecimal valorCargaHoraria) {
        super(RepositorioDeExcecaoDaCargaHorariaDoCalculo.class);
        this.calculo = calculo;
        this.dataInicioExcecao = dataInicioExcecao;
        this.dataTerminoExcecao = dataTerminoExcecao;
        this.valorCargaHoraria = valorCargaHoraria;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public Date getDataInicioExcecao() {
        return this.dataInicioExcecao;
    }

    public void setDataInicioExcecao(Date dataInicioExcecao) {
        this.dataInicioExcecao = dataInicioExcecao;
    }

    public Date getDataTerminoExcecao() {
        return this.dataTerminoExcecao;
    }

    public void setDataTerminoExcecao(Date dataTerminoExcecao) {
        this.dataTerminoExcecao = dataTerminoExcecao;
    }

    public BigDecimal getValorCargaHoraria() {
        return this.valorCargaHoraria;
    }

    public void setValorCargaHoraria(BigDecimal valorCargaHoraria) {
        this.valorCargaHoraria = valorCargaHoraria;
    }

    public Long getId() {
        return this.id;
    }

    public Periodo getPeriodoDaExcecao() {
        if (Utils.naoNulo(this.dataInicioExcecao) && Utils.naoNulo(this.dataTerminoExcecao)) {
            return new Periodo(this.dataInicioExcecao, this.dataTerminoExcecao);
        }
        return null;
    }

    public boolean isPeriodoCoincidenteCom(ExcecaoDaCargaHorariaDoCalculo outraExcecao) {
        return this.getPeriodoDaExcecao().isDatasCoincidentesCom(outraExcecao.getPeriodoDaExcecao());
    }

    @Override
    public ExcecaoDaCargaHorariaDoCalculo validar() {
        GerenciadorDeValidadores.getInstance().validar(ExcecaoDaCargaHorariaDoCalculo.class, this);
        return this;
    }
}

