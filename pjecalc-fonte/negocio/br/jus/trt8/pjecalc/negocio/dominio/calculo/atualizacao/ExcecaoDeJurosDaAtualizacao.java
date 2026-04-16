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
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.PeriodoParaExcecao;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.RepositorioDeExcecaoDeJurosDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.regras.DataEspecificaJurosMoraParametrosAtualizacaoValidRule;
import java.util.ArrayList;
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
@Table(name="TBEXCECAOJUROSATUALICALCULO")
@SequenceGenerator(name="SQEXCECAOJUROSATUALICALCULO", sequenceName="SQEXCECAOJUROSATUALICALCULO", allocationSize=1)
@Name(value="excecaoDeJurosDaAtualizacao")
public class ExcecaoDeJurosDaAtualizacao
extends EntidadeBase
implements PeriodoParaExcecao {
    private static final long serialVersionUID = 6394543157859308463L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQEXCECAOJUROSATUALICALCULO")
    @Column(name="IIDEXCECAOJUROSATUALICALCULO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDPARAMATUALIZACAOCALCULO")
    private ParametrosDeAtualizacao parametrosDeAtualizacao;
    @Column(name="DDTINICIO")
    @Temporal(value=TemporalType.DATE)
    @Required
    @ValidValue(validRule=DataEspecificaJurosMoraParametrosAtualizacaoValidRule.class)
    private Date dataInicio;
    @Column(name="DDTFIM")
    @Temporal(value=TemporalType.DATE)
    @Required
    @GreaterOrEqualThan(value="dataInicio")
    private Date dataFim;

    public ExcecaoDeJurosDaAtualizacao() {
        super(RepositorioDeExcecaoDeJurosDaAtualizacao.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    protected EntidadeBase validar() {
        GerenciadorDeValidadores.getInstance().validar(ExcecaoDeJurosDaAtualizacao.class, this);
        return super.validar();
    }

    public static void remover(ExcecaoDeJurosDaAtualizacao excecaoDeJurosDaAtualizacao) {
        ExcecaoDeJurosDaAtualizacao.remover(RepositorioDeExcecaoDeJurosDaAtualizacao.class, excecaoDeJurosDaAtualizacao, true);
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public ParametrosDeAtualizacao getParametrosDeAtualizacao() {
        return this.parametrosDeAtualizacao;
    }

    public void setParametrosDeAtualizacao(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        this.parametrosDeAtualizacao = parametrosDeAtualizacao;
    }

    public Date getDataInicio() {
        return this.dataInicio;
    }

    public void setDataInicio(Date dataInicio) {
        this.dataInicio = dataInicio;
    }

    public Date getDataFim() {
        return this.dataFim;
    }

    public void setDataFim(Date dataFim) {
        this.dataFim = dataFim;
    }

    public static List<ExcecaoDeJurosDaAtualizacao> obterPeriodoDeExcecaoDeJurosDaAtualizacao(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        if (parametrosDeAtualizacao.getId() == null) {
            return new ArrayList<ExcecaoDeJurosDaAtualizacao>();
        }
        return ExcecaoDeJurosDaAtualizacao.getRepositorio(RepositorioDeExcecaoDeJurosDaAtualizacao.class).obterPeriodoDeExcecaoDeJurosDaAtualizacao(parametrosDeAtualizacao);
    }

    public static List<ExcecaoDeJurosDaAtualizacao> obterPeriodoDeExcecaoDeJurosDaAtualizacao(ParametrosDeAtualizacao parametrosDeAtualizacao, Date dataInicio, Date dataFim) {
        return ExcecaoDeJurosDaAtualizacao.getRepositorio(RepositorioDeExcecaoDeJurosDaAtualizacao.class).obterPeriodoDeExcecaoDeJurosDaAtualizacao(parametrosDeAtualizacao, dataInicio, dataFim);
    }

    @Override
    public Periodo getPeriodo() {
        if (Utils.naoNulo(this.dataInicio) && Utils.naoNulo(this.dataFim)) {
            return new Periodo(this.dataInicio, this.dataFim);
        }
        return null;
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }
}

