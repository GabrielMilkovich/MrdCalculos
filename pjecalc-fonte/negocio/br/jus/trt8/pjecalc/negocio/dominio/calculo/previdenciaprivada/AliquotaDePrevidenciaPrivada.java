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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.PrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.RepositorioDeAliquotaDePrevidenciaPrivada;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBALIQUOTAPREVIDENCIAPRIVADA")
@SequenceGenerator(name="SQALIQUOTAPREVIDENCIAPRIVADA", sequenceName="SQALIQUOTAPREVIDENCIAPRIVADA", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="aliquotaDePrevidenciaPrivada")
public class AliquotaDePrevidenciaPrivada
extends EntidadeBase {
    private static final long serialVersionUID = -671575962989784105L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQALIQUOTAPREVIDENCIAPRIVADA")
    @Column(name="IIDALIQUOTAPREVIDENCIA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDPREVIDENCIAPRIVADA")
    private PrevidenciaPrivada previdenciaPrivada;
    @Column(name="DDTINICIAL", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @LimitedTo100Years
    @Required
    private Date dataInicioPeriodo;
    @Column(name="DDTFINAL", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @Required
    @GreaterOrEqualThan(value="dataInicioPeriodo")
    @LimitedTo100Years
    private Date dataTerminoPeriodo;
    @Column(name="RVLALIQUOTA", precision=5, scale=2)
    @Required
    private BigDecimal aliquota;

    public AliquotaDePrevidenciaPrivada() {
        super(RepositorioDeAliquotaDePrevidenciaPrivada.class);
    }

    public AliquotaDePrevidenciaPrivada(PrevidenciaPrivada previdenciaPrivada) {
        this();
        this.previdenciaPrivada = previdenciaPrivada;
        this.sugerirDatasParaCompetencias();
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

    public PrevidenciaPrivada getPrevidenciaPrivada() {
        return this.previdenciaPrivada;
    }

    public void setPrevidenciaPrivada(PrevidenciaPrivada previdenciaPrivada) {
        this.previdenciaPrivada = previdenciaPrivada;
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

    public BigDecimal getAliquota() {
        return this.aliquota;
    }

    public void setAliquota(BigDecimal aliquota) {
        this.aliquota = aliquota;
    }

    public Long getId() {
        return this.id;
    }

    public Periodo getPeriodo() {
        if (Utils.naoNulo(this.dataInicioPeriodo) && Utils.naoNulo(this.dataTerminoPeriodo)) {
            return new Periodo(this.dataInicioPeriodo, this.dataTerminoPeriodo);
        }
        return null;
    }

    public boolean isPeriodoCoincidenteCom(AliquotaDePrevidenciaPrivada aliquotaDePrevidencia) {
        if (Utils.nulo(this.getPeriodo())) {
            return false;
        }
        return this.getPeriodo().isDatasCoincidentesCom(aliquotaDePrevidencia.getPeriodo());
    }

    @Override
    public AliquotaDePrevidenciaPrivada validar() {
        GerenciadorDeValidadores.getInstance().validar(AliquotaDePrevidenciaPrivada.class, this);
        NegocioException excecao = new NegocioException();
        Periodo periodo = this.previdenciaPrivada.getCalculo().obterPeriodoDoCalculoParaRestricao(Boolean.TRUE, Boolean.FALSE);
        periodo.setInicial(periodo.obterDataInicialHelper().setDay(1).getDate());
        periodo.setFinal(periodo.obterDataFinalHelper().lastDayOfTheMonth().getDate());
        if (!periodo.isPeriodoContemEsta(this.dataInicioPeriodo)) {
            if (periodo.isDataMenorQueIncial(this.dataInicioPeriodo)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataInicioPeriodo", Mensagens.MSG0008, "Compet\u00eancia Inicial", periodo.getLabelDataIncial()));
            } else {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataInicioPeriodo", Mensagens.MSG0010, "Compet\u00eancia Inicial", periodo.getLabelDataFinal()));
            }
        }
        if (!periodo.isPeriodoContemEsta(this.dataTerminoPeriodo)) {
            if (periodo.isDataMaiorQueFinal(this.dataTerminoPeriodo)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataTerminoPeriodo", Mensagens.MSG0010, "Compet\u00eancia Final", periodo.getLabelDataFinal()));
            } else {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataTerminoPeriodo", Mensagens.MSG0008, "Compet\u00eancia Final", periodo.getLabelDataIncial()));
            }
        }
        for (AliquotaDePrevidenciaPrivada aliquota : this.previdenciaPrivada.getAliquotas()) {
            if (!this.isPeriodoCoincidenteCom(aliquota)) continue;
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataTerminoPeriodo", Mensagens.MSG0024, new Object[0]));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    private void sugerirDatasParaCompetencias() {
        if (Utils.naoNulo(this.previdenciaPrivada) && Utils.naoNulo(this.previdenciaPrivada.getCalculo())) {
            Periodo periodo = this.previdenciaPrivada.getCalculo().obterPeriodoSugestivoDoCalculo(Boolean.TRUE, Boolean.FALSE);
            this.setDataInicioPeriodo(periodo.getInicial());
            this.setDataTerminoPeriodo(periodo.getFinal());
        }
    }
}

