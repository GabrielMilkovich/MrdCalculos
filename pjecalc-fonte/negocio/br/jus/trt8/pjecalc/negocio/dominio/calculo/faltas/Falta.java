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
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.RepositorioDeFalta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.regras.PeriodoDaFaltaValidRule;
import java.util.Date;
import java.util.List;
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
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBFALTACALCULO")
@SequenceGenerator(name="SQFALTACALCULO", sequenceName="SQFALTACALCULO", allocationSize=1)
@Name(value="falta")
public class Falta
extends EntidadeBase
implements Comparable<Falta> {
    private static final long serialVersionUID = 6559657892926679073L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQFALTACALCULO")
    @Column(name="IIDFALTACALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="DDTINICIOPERIODOFALTA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @Required
    @LimitedTo100Years
    @ValidValue(validRule=PeriodoDaFaltaValidRule.class, flag=0)
    private Date dataInicioPeriodoFalta;
    @Column(name="DDTTERMINOPERIODOFALTA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @Required
    @GreaterOrEqualThan(value="dataInicioPeriodoFalta")
    @LimitedTo100Years
    @ValidValue(validRule=PeriodoDaFaltaValidRule.class, flag=1)
    private Date dataTerminoPeriodoFalta;
    @Column(name="SFLFALTAJUSTIFICADA", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean faltaJustificada = false;
    @Column(name="SDSJUSTIFICATIVAFALTA", columnDefinition="VARCHAR2(200)")
    private String justificativaDaFalta;
    @Column(name="SFLREINICIAFERIAS", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean reiniciarFerias = false;
    @Transient
    private final boolean arquivoExterno;

    public Falta() {
        super(RepositorioDeFalta.class);
        this.arquivoExterno = false;
    }

    public Falta(boolean arquivoExterno) {
        super(RepositorioDeFalta.class);
        this.arquivoExterno = arquivoExterno;
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

    public Date getDataInicioPeriodoFalta() {
        return this.dataInicioPeriodoFalta;
    }

    public void setDataInicioPeriodoFalta(Date dataInicioPeriodoFalta) {
        this.dataInicioPeriodoFalta = dataInicioPeriodoFalta;
    }

    public Date getDataTerminoPeriodoFalta() {
        return this.dataTerminoPeriodoFalta;
    }

    public void setDataTerminoPeriodoFalta(Date dataTerminoPeriodoFalta) {
        this.dataTerminoPeriodoFalta = dataTerminoPeriodoFalta;
    }

    public Boolean getFaltaJustificada() {
        return this.faltaJustificada;
    }

    public void setFaltaJustificada(Boolean faltaJustificada) {
        this.faltaJustificada = faltaJustificada;
    }

    public String getJustificativaDaFalta() {
        return this.justificativaDaFalta;
    }

    public void setJustificativaDaFalta(String justificativaDaFalta) {
        this.justificativaDaFalta = justificativaDaFalta;
    }

    public Boolean getReiniciarFerias() {
        return this.reiniciarFerias;
    }

    public void setReiniciarFerias(Boolean reiniciarFerias) {
        this.reiniciarFerias = reiniciarFerias;
    }

    public Long getId() {
        return this.id;
    }

    public Periodo getPeriodoDaExcecao() {
        if (Utils.naoNulo(this.dataInicioPeriodoFalta) && Utils.naoNulo(this.dataTerminoPeriodoFalta)) {
            return new Periodo(this.dataInicioPeriodoFalta, this.dataTerminoPeriodoFalta);
        }
        return null;
    }

    public boolean isPeriodoCoincidenteCom(Falta falta) {
        return this.getPeriodoDaExcecao().isDatasCoincidentesCom(falta.getPeriodoDaExcecao());
    }

    public void sugerirDataTermino() {
        if (Utils.naoNulo(this.dataInicioPeriodoFalta)) {
            this.setDataTerminoPeriodoFalta(this.getDataInicioPeriodoFalta());
        } else {
            this.setDataTerminoPeriodoFalta(null);
        }
    }

    public void remover() {
        Falta.remover(RepositorioDeFalta.class, this);
    }

    @Override
    public Falta validar() {
        if (this.arquivoExterno) {
            return this;
        }
        GerenciadorDeValidadores.getInstance().validar(Falta.class, this);
        for (Falta falta : Falta.obterTodosPor(this.calculo)) {
            if (!this.isPeriodoCoincidenteCom(falta)) continue;
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0024, new Object[0]));
        }
        return this;
    }

    public static List<Falta> obterTodosPor(Calculo calculo) {
        return Falta.getRepositorio(RepositorioDeFalta.class).obterTodosPor(calculo);
    }

    @Override
    public int compareTo(Falta o) {
        return this.dataInicioPeriodoFalta.compareTo(o.getDataInicioPeriodoFalta());
    }

    public String toString() {
        return "Falta [dataInicioPeriodoFalta=" + this.dataInicioPeriodoFalta + ", dataTerminoPeriodoFalta=" + this.dataTerminoPeriodoFalta + ", faltaJustificada=" + this.faltaJustificada + ", justificativaDaFalta=" + this.justificativaDaFalta + ", reiniciarFerias=" + this.reiniciarFerias + "]";
    }
}

