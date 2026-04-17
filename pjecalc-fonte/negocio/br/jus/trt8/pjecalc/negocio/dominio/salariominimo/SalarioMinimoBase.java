/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariominimo;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.MappedSuperclass;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;

@MappedSuperclass
public abstract class SalarioMinimoBase
extends EntidadeBase
implements Comparable<SalarioMinimoBase> {
    private static final long serialVersionUID = -7455248706994990892L;
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Temporal(value=TemporalType.DATE)
    @Column(name="DDTCOMPETENCIA", nullable=false)
    private Date competencia;
    @Column(name="RVLSALARIO", nullable=false)
    private BigDecimal valor;
    @Transient
    private Date competenciaInicial;
    @Transient
    private Date competenciaFinal;

    public SalarioMinimoBase(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio) {
        super(classeDoRepositorio);
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public Date getCompetenciaInicial() {
        return this.competenciaInicial;
    }

    public void setCompetenciaInicial(Date competenciaInicial) {
        this.competenciaInicial = competenciaInicial;
    }

    public Date getCompetenciaFinal() {
        return this.competenciaFinal;
    }

    public void setCompetenciaFinal(Date competenciaFinal) {
        this.competenciaFinal = competenciaFinal;
    }

    public abstract SalarioMinimoBase validarParametrosParaNovosRegistros();

    public abstract String getDiscriminador();

    @Override
    public int compareTo(SalarioMinimoBase o) {
        return o.getCompetencia().compareTo(this.competencia);
    }

    public SalarioMinimoBase validar(NegocioException excecao) {
        if (Utils.nulo(excecao)) {
            excecao = new NegocioException();
        }
        if (Utils.nulo(this.getValor())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valor" + this.getDiscriminador(), Mensagens.MSG0003, "Valor"));
        }
        if (Utils.nulo(this.getCompetenciaInicial())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("competenciaInicial" + this.getDiscriminador(), Mensagens.MSG0003, "M\u00eas/Ano Inicial"));
        }
        if (Utils.nulo(this.getCompetenciaFinal())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("competenciaFinal" + this.getDiscriminador(), Mensagens.MSG0003, "M\u00eas/Ano Final"));
        }
        if (Utils.naoNulo(this.getCompetenciaInicial()) && Utils.naoNulo(this.getCompetenciaFinal()) && HelperDate.dateAfter(this.getCompetenciaInicial(), this.getCompetenciaFinal())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("competenciaFinal" + this.getDiscriminador(), Mensagens.MSG0008, "M\u00eas/Ano Final", "M\u00eas/Ano Inicial"));
        }
        return this;
    }

    @Override
    public void salvar() {
        super.salvar();
    }
}

