/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeJurosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeDeJurosBaseEnum;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.MappedSuperclass;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;

@MappedSuperclass
public abstract class JurosBase
extends EntidadeBase {
    private static final long serialVersionUID = 421427250309047448L;
    @Column(name="DDTINICIO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataInicio;
    @Column(name="DDTFIM", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataFim;
    @Column(name="RVLTAXA", precision=8, scale=4)
    @NotNull
    private BigDecimal aliquota;
    @Column(name="STPJUROS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeJurosEnum")})
    private TipoDeJurosEnum tipoDeJuros = TipoDeJurosEnum.SIMPLES;
    @Column(name="STPQUANTIDADE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeQuantidadeDeJurosBaseEnum")})
    private TipoDeQuantidadeDeJurosBaseEnum tipoDeQuantidade = TipoDeQuantidadeDeJurosBaseEnum.FRACAO;

    public JurosBase(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio) {
        super(classeDoRepositorio);
    }

    public JurosBase(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio, Date dataInicio, Date dataFim, BigDecimal aliquota, TipoDeJurosEnum tipoDeJuros) {
        super(classeDoRepositorio);
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
        this.aliquota = aliquota;
        this.tipoDeJuros = tipoDeJuros;
    }

    public Date getDataInicio() {
        return this.dataInicio;
    }

    public void setDataInicio(Date dataInicio) {
        this.dataInicio = dataInicio;
    }

    public Date getDataFim(Date dataDefault) {
        return this.dataFim != null ? this.dataFim : dataDefault;
    }

    public Date getDataFim() {
        return this.dataFim;
    }

    public void setDataFim(Date dataFim) {
        this.dataFim = dataFim;
    }

    public BigDecimal getAliquota() {
        return this.aliquota;
    }

    public void setAliquota(BigDecimal aliquota) {
        this.aliquota = aliquota;
    }

    public TipoDeJurosEnum getTipoDeJuros() {
        return this.tipoDeJuros;
    }

    public void setTipoDeJuros(TipoDeJurosEnum tipoDeJuros) {
        this.tipoDeJuros = tipoDeJuros;
    }

    public TipoDeQuantidadeDeJurosBaseEnum getTipoDeQuantidade() {
        return this.tipoDeQuantidade;
    }

    public void setTipoDeQuantidade(TipoDeQuantidadeDeJurosBaseEnum tipoDeQuantidade) {
        this.tipoDeQuantidade = tipoDeQuantidade;
    }

    protected JurosBase validar(String nomeJuros) {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.dataInicio)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataInicio" + nomeJuros, Mensagens.MSG0003, "Data Inicial de Vig\u00eancia"));
        }
        if (Utils.nulo(this.aliquota)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "aliquota" + nomeJuros, Mensagens.MSG0003, "Al\u00edquota"));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    @Override
    public abstract JurosBase validar();

    public abstract void salvarNovoRegistro();

    @Override
    public void salvar() {
        super.salvar();
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.aliquota == null ? 0 : this.aliquota.hashCode());
        result = 31 * result + (this.dataFim == null ? 0 : this.dataFim.hashCode());
        result = 31 * result + (this.dataInicio == null ? 0 : this.dataInicio.hashCode());
        result = 31 * result + (this.tipoDeJuros == null ? 0 : this.tipoDeJuros.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || !super.equals(obj) || this.getClass() != obj.getClass()) {
            return false;
        }
        JurosBase other = (JurosBase)obj;
        if (this.aliquota == null && other.aliquota != null || this.aliquota != null && !this.aliquota.equals(other.aliquota)) {
            return false;
        }
        if (this.dataFim == null && other.dataFim != null || this.dataFim != null && !this.dataFim.equals(other.dataFim)) {
            return false;
        }
        if (this.dataInicio == null && other.dataInicio != null || this.dataInicio != null && !this.dataInicio.equals(other.dataInicio)) {
            return false;
        }
        boolean tiposIguais = true;
        if (this.tipoDeJuros != other.tipoDeJuros) {
            tiposIguais = false;
        }
        return tiposIguais;
    }
}

