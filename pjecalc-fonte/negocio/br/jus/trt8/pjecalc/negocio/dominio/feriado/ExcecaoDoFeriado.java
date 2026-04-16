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
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.feriado;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.dominio.Data;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.Feriado;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.RepositorioDeExcecaoFeriado;
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
import javax.persistence.Transient;
import javax.persistence.Version;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBEXCECAOFERIADO")
@SequenceGenerator(name="SQEXCECAOFERIADO", sequenceName="SQEXCECAOFERIADO", allocationSize=1)
@Name(value="excecaoDoFeriado")
public class ExcecaoDoFeriado
extends EntidadeBase
implements Comparable<ExcecaoDoFeriado> {
    private static final long serialVersionUID = 1059451129029985292L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQEXCECAOFERIADO")
    @Column(name="IIDEXCECAOFERIADO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDFERIADO")
    private Feriado feriado;
    @Column(name="DDTEXCECAOFERIADO")
    @Temporal(value=TemporalType.DATE)
    private Date data;
    @Transient
    private Data dataHelper;

    public ExcecaoDoFeriado() {
        super(RepositorioDeExcecaoFeriado.class);
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Feriado getFeriado() {
        return this.feriado;
    }

    public void setFeriado(Feriado feriado) {
        this.feriado = feriado;
    }

    public Date getData() {
        return this.data;
    }

    public void setData(Date data) {
        this.data = data;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Data getDataHelper() {
        if (Utils.nulo(this.dataHelper)) {
            this.dataHelper = new Data();
        }
        return this.dataHelper.comValor(this.getData());
    }

    @Override
    public ExcecaoDoFeriado validar() {
        NegocioException exception = new NegocioException();
        if (Utils.nulo(this.getData())) {
            exception.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataFeriado", Mensagens.MSG0003, "Data"));
        } else {
            if (Utils.nulo(this.getFeriado().getInicioVigencia())) {
                exception.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataFeriado", Mensagens.MSG0062, "Datas", "Data In\u00edcio da Vig\u00eancia"));
            } else if (HelperDate.dateBefore(this.getData(), this.getFeriado().getInicioVigencia())) {
                exception.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataFeriado", Mensagens.MSG0062, "Datas", HelperDate.getInstance(this.getFeriado().getInicioVigencia()).format("dd/MM/yyyy")));
            }
            if (Utils.naoNulo(this.getFeriado().getFimVigencia()) && HelperDate.dateAfter(this.getData(), this.getFeriado().getFimVigencia())) {
                exception.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataFeriado", Mensagens.MSG0010, "Data", HelperDate.getInstance(this.getFeriado().getFimVigencia()).format("dd/MM/yyyy")));
            }
        }
        if (!exception.getMensagensDeRecurso().isEmpty()) {
            throw exception;
        }
        return this;
    }

    @Override
    public int compareTo(ExcecaoDoFeriado o) {
        return o.getData().compareTo(this.data);
    }
}

