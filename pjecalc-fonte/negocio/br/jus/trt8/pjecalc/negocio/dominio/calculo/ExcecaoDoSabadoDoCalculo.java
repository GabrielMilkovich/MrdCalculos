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
import br.jus.trt8.pjecalc.base.comum.api.PeriodoParaExcecao;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.RepositorioDeExcecaoDoSabadoDoCalculo;
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
@Table(name="TBEXCECAOSABADODIAUTILCALCULO")
@SequenceGenerator(name="SQEXCECAOSABADODIAUTILCALCULO", sequenceName="SQEXCECAOSABADODIAUTILCALCULO", allocationSize=1)
@Name(value="excecaoDoSabadoDoCalculo")
public class ExcecaoDoSabadoDoCalculo
extends EntidadeBase
implements PeriodoParaExcecao {
    private static final long serialVersionUID = 8970162803998381341L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQEXCECAOSABADODIAUTILCALCULO")
    @Column(name="IIDEXCECAOSABADODIAUTILCALCULO")
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
    private Date dataInicioExcecaoSabado;
    @Column(name="DDTTERMINOEXCECAO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @LimitedTo100Years
    @GreaterOrEqualThan(value="dataInicioExcecaoSabado")
    @Required
    private Date dataTerminoExcecaoSabado;

    public ExcecaoDoSabadoDoCalculo() {
        super(RepositorioDeExcecaoDoSabadoDoCalculo.class);
    }

    public ExcecaoDoSabadoDoCalculo(Calculo calculo, Date dataInicioExcecaoSabado, Date dataTerminoExcecaoSabado) {
        super(RepositorioDeExcecaoDoSabadoDoCalculo.class);
        this.calculo = calculo;
        this.dataInicioExcecaoSabado = dataInicioExcecaoSabado;
        this.dataTerminoExcecaoSabado = dataTerminoExcecaoSabado;
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

    public Date getDataInicioExcecaoSabado() {
        return this.dataInicioExcecaoSabado;
    }

    public void setDataInicioExcecaoSabado(Date dataInicioExcecaoSabado) {
        this.dataInicioExcecaoSabado = dataInicioExcecaoSabado;
    }

    public Date getDataTerminoExcecaoSabado() {
        return this.dataTerminoExcecaoSabado;
    }

    public void setDataTerminoExcecaoSabado(Date dataTerminoExcecaoSabado) {
        this.dataTerminoExcecaoSabado = dataTerminoExcecaoSabado;
    }

    public Long getId() {
        return this.id;
    }

    public Periodo getPeriodoDaExcecao() {
        if (Utils.naoNulo(this.dataInicioExcecaoSabado) && Utils.naoNulo(this.dataTerminoExcecaoSabado)) {
            return new Periodo(this.dataInicioExcecaoSabado, this.dataTerminoExcecaoSabado);
        }
        return null;
    }

    public boolean isPeriodoCoincidenteCom(ExcecaoDoSabadoDoCalculo outraExcecao) {
        return this.getPeriodoDaExcecao().isDatasCoincidentesCom(outraExcecao.getPeriodoDaExcecao());
    }

    @Override
    protected ExcecaoDoSabadoDoCalculo validar() {
        GerenciadorDeValidadores.getInstance().validar(ExcecaoDoSabadoDoCalculo.class, this);
        return this;
    }

    @Override
    public Periodo getPeriodo() {
        return this.getPeriodoDaExcecao();
    }
}

