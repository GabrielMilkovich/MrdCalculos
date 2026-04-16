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
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss;

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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.RepositorioDeAliquotasDoEmpregadorPorPeriodo;
import java.math.BigDecimal;
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
import javax.persistence.Version;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBALIQUOTAEMPREGADORPERIODO")
@SequenceGenerator(name="SQALIQUOTAEMPREGADORPERIODO", sequenceName="SQALIQUOTAEMPREGADORPERIODO", allocationSize=1)
@Name(value="aliquotasDoEmpregadorPorPeriodo")
public class AliquotasDoEmpregadorPorPeriodo
extends EntidadeBase {
    private static final long serialVersionUID = -1518407162321747370L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQALIQUOTAEMPREGADORPERIODO")
    @Column(name="IIDALIQUOTAEMPREGADORPERIODO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDINSSCALCULO")
    private Inss inss;
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
    @Column(name="RVLALIQUOTAEMPRESA", precision=7, scale=4)
    private BigDecimal aliquotaEmpresa;
    @Column(name="RVLALIQUOTARAT", precision=7, scale=4)
    private BigDecimal aliquotaRAT;
    @Column(name="RVLALIQUOTATERCEIROS", precision=7, scale=4)
    private BigDecimal aliquotaTerceiros;

    public AliquotasDoEmpregadorPorPeriodo() {
        super(RepositorioDeAliquotasDoEmpregadorPorPeriodo.class);
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

    public Long getId() {
        return this.id;
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

    public BigDecimal getAliquotaEmpresa() {
        return this.aliquotaEmpresa;
    }

    public void setAliquotaEmpresa(BigDecimal aliquotaEmpresa) {
        this.aliquotaEmpresa = aliquotaEmpresa;
    }

    public BigDecimal getAliquotaRAT() {
        return this.aliquotaRAT;
    }

    public void setAliquotaRAT(BigDecimal aliquotaRAT) {
        this.aliquotaRAT = aliquotaRAT;
    }

    public BigDecimal getAliquotaTerceiros() {
        return this.aliquotaTerceiros;
    }

    public void setAliquotaTerceiros(BigDecimal aliquotaTerceiros) {
        this.aliquotaTerceiros = aliquotaTerceiros;
    }

    public Periodo getPeriodo() {
        if (Utils.naoNulo(this.dataInicioPeriodo) && Utils.naoNulo(this.dataTerminoPeriodo)) {
            return new Periodo(this.dataInicioPeriodo, this.dataTerminoPeriodo);
        }
        return null;
    }

    public boolean isPeriodoCoincidenteCom(AliquotasDoEmpregadorPorPeriodo aliquotasDoEmpregador) {
        return this.getPeriodo().isDatasCoincidentesCom(aliquotasDoEmpregador.getPeriodo());
    }

    @Override
    public AliquotasDoEmpregadorPorPeriodo validar() {
        GerenciadorDeValidadores.getInstance().validar(AliquotasDoEmpregadorPorPeriodo.class, this);
        if (Utils.nulo(this.aliquotaEmpresa) && Utils.nulo(this.aliquotaRAT) && Utils.nulo(this.aliquotaTerceiros)) {
            NegocioException excecao = new NegocioException();
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("aliquotaEmpresaPorPeriodo", Mensagens.MSG0045, new Object[0]));
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("aliquotaRatPorPeriodo", Mensagens.MSG0045, new Object[0]));
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("aliquotaTerceirosPorPeriodo", Mensagens.MSG0045, new Object[0]));
            throw excecao;
        }
        for (AliquotasDoEmpregadorPorPeriodo aliquotasDoEmpregador : this.inss.getAliquotasPorPeriodos()) {
            if (!this.isPeriodoCoincidenteCom(aliquotasDoEmpregador)) continue;
            throw new NegocioException(new MensagemDeRecurso("dataTerminoPeriodo", Mensagens.MSG0024, new Object[0]));
        }
        return this;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    public static List<AliquotasDoEmpregadorPorPeriodo> obterTodosPor(Inss inss) {
        return AliquotasDoEmpregadorPorPeriodo.getRepositorio(RepositorioDeAliquotasDoEmpregadorPorPeriodo.class).obterTodosPor(inss);
    }
}

