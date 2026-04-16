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

import br.jus.trt8.pjecalc.base.comum.Competencia;
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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.RepositorioDePeriodoDoINSSComOpcaoSimples;
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
@Table(name="TBINSSOPCAOSIMPLES")
@SequenceGenerator(name="SQINSSOPCAOSIMPLES", sequenceName="SQINSSOPCAOSIMPLES", allocationSize=1)
@Name(value="periodoDoINSSComOpcaoSimples")
public class PeriodoDoINSSComOpcaoSimples
extends EntidadeBase {
    private static final long serialVersionUID = -2616110638111308573L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQINSSOPCAOSIMPLES")
    @Column(name="IIDPERIODOOPCAOSIMPLES")
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
    private Date dataInicioSimples;
    @Column(name="DDTFINAL", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @Required
    @GreaterOrEqualThan(value="dataInicioSimples")
    @LimitedTo100Years
    private Date dataTerminoSimples;

    public PeriodoDoINSSComOpcaoSimples() {
        super(RepositorioDePeriodoDoINSSComOpcaoSimples.class);
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

    public Date getDataInicioSimples() {
        return this.dataInicioSimples;
    }

    public void setDataInicioSimples(Date dataInicioSimples) {
        this.dataInicioSimples = dataInicioSimples;
    }

    public Date getDataTerminoSimples() {
        return this.dataTerminoSimples;
    }

    public void setDataTerminoSimples(Date dataTerminoSimples) {
        this.dataTerminoSimples = dataTerminoSimples;
    }

    public Periodo getPeriodo() {
        if (Utils.naoNulo(this.dataInicioSimples) && Utils.naoNulo(this.dataTerminoSimples)) {
            return new Periodo(this.dataInicioSimples, this.dataTerminoSimples);
        }
        return null;
    }

    public boolean isPeriodoCoincidenteCom(PeriodoDoINSSComOpcaoSimples periodo) {
        return this.getPeriodo().isDatasCoincidentesCom(periodo.getPeriodo());
    }

    @Override
    public PeriodoDoINSSComOpcaoSimples validar() {
        GerenciadorDeValidadores.getInstance().validar(PeriodoDoINSSComOpcaoSimples.class, this);
        NegocioException excecao = new NegocioException();
        if (Utils.naoNulos(this.dataInicioSimples, this.dataTerminoSimples)) {
            Date limite;
            Competencia inicial = Competencia.getInstance(this.dataInicioSimples);
            Competencia termino = Competencia.getInstance(this.dataTerminoSimples);
            Date date = limite = Utils.naoNulo(this.getInss().getCalculo().getDataDemissao()) ? this.getInss().getCalculo().getDataDemissao() : this.getInss().getCalculo().getDataTerminoCalculo();
            if (inicial.isAnteriorA(this.getInss().getCalculo().getDataAdmissao()) || inicial.isApos(limite)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataInicioSimples", Mensagens.MSG0004, "In\u00edcio"));
            }
            if (termino.isAnteriorA(this.getInss().getCalculo().getDataAdmissao()) || termino.isApos(limite)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataTerminoSimples", Mensagens.MSG0004, "Fim"));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        for (PeriodoDoINSSComOpcaoSimples periodo : this.inss.getPeriodosComOpcaoSimples()) {
            if (!this.isPeriodoCoincidenteCom(periodo)) continue;
            throw new NegocioException(new MensagemDeRecurso("dataTerminoSimples", Mensagens.MSG0024, new Object[0]));
        }
        return this;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    public static List<PeriodoDoINSSComOpcaoSimples> obterTodosPor(Inss inss) {
        return PeriodoDoINSSComOpcaoSimples.getRepositorio(RepositorioDePeriodoDoINSSComOpcaoSimples.class).obterTodosPor(inss);
    }
}

