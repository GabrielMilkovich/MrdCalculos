/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Embeddable
 *  org.apache.commons.lang.builder.CompareToBuilder
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.apache.commons.lang.builder.HashCodeBuilder
 */
package br.jus.trt8.pjecalc.negocio.dominio.processo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import java.io.Serializable;
import java.math.BigInteger;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import org.apache.commons.lang.builder.CompareToBuilder;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;

@Embeddable
public class IdentificadorDoProcesso
implements Serializable,
Comparable<IdentificadorDoProcesso> {
    private static final long serialVersionUID = 5123547454288429516L;
    @Column(name="INRPROCESSOUNICA", length=7)
    private Integer numero;
    @Column(name="INRPROCESSOANOUNICA", length=4)
    private Integer ano;
    @Column(name="INRJUSTICAUNICA", length=1)
    private Integer justica;
    @Column(name="INRREGIAOUNICA", length=2)
    private Integer regiao;
    @Column(name="INRPROCESSOVARAUNICA", length=4)
    private Integer vara;
    @Column(name="INRDIGITOUNICA", length=2)
    private Integer digito;

    public IdentificadorDoProcesso() {
        this.comJustica(5);
    }

    public static Integer calcularDigito(Integer numero, Integer ano, Integer justica, Integer regiao, Integer vara) {
        Integer digito = null;
        if (Utils.naoNulos(numero, ano, justica, regiao, vara)) {
            String numeroCompletoDoProcesso = String.format("%07d", numero) + String.format("%04d", ano) + justica + String.format("%02d", regiao) + String.format("%04d", vara) + "00";
            digito = new BigInteger("98").subtract(new BigInteger(numeroCompletoDoProcesso).mod(new BigInteger("97"))).intValue();
        }
        return digito;
    }

    private Integer calcularDigito() {
        return IdentificadorDoProcesso.calcularDigito(this.numero, this.ano, this.justica, this.regiao, this.vara);
    }

    public String getIdentificacao() {
        if (Utils.naoNulos(this.numero, this.ano, this.justica, this.regiao, this.vara)) {
            return String.format("%07d", this.numero) + "-" + String.format("%02d", this.digito) + "." + String.format("%04d", this.ano) + "." + this.justica + "." + String.format("%02d", this.regiao) + "." + String.format("%04d", this.vara);
        }
        return null;
    }

    public IdentificadorDoProcesso comNumero(Integer numero) {
        this.numero = numero;
        return this;
    }

    public Integer getNumero() {
        return this.numero;
    }

    public void setNumero(Integer numero) {
        this.comNumero(numero);
    }

    public IdentificadorDoProcesso comAno(Integer ano) {
        if (Utils.naoNulo(ano) && ano.toString().length() > 4) {
            throw new NegocioException(new MensagemDeRecurso("ano", Mensagens.MSG0004, "Ano"));
        }
        this.ano = ano;
        return this;
    }

    public Integer getAno() {
        return this.ano;
    }

    public void setAno(Integer ano) {
        this.comAno(ano);
    }

    public IdentificadorDoProcesso comJustica(Integer justica) {
        this.justica = justica;
        return this;
    }

    public Integer getJustica() {
        return this.justica;
    }

    public void setJustica(Integer justica) {
        this.comJustica(justica);
    }

    public IdentificadorDoProcesso comRegiao(Integer regiao) {
        this.regiao = regiao;
        return this;
    }

    public Integer getRegiao() {
        return this.regiao;
    }

    public void setRegiao(Integer regiao) {
        this.comRegiao(regiao);
    }

    public IdentificadorDoProcesso comVara(Integer vara) {
        this.vara = vara;
        return this;
    }

    public Integer getVara() {
        return this.vara;
    }

    public void setVara(Integer vara) {
        this.comVara(vara);
    }

    public Integer getDigito() {
        return this.digito;
    }

    public void setDigito(Integer digito) {
        this.digito = digito;
    }

    public IdentificadorDoProcesso consistirNumero() {
        if (!Utils.nulos(this.ano, this.regiao, this.vara, this.digito) && Utils.nulo(this.numero)) {
            throw new NegocioException(new MensagemDeRecurso("numero", Mensagens.MSG0003, "N\u00famero"));
        }
        return this;
    }

    public IdentificadorDoProcesso consistirAno() {
        if (!Utils.nulos(this.numero, this.regiao, this.vara, this.digito) && Utils.nulo(this.ano)) {
            throw new NegocioException(new MensagemDeRecurso("ano", Mensagens.MSG0003, "Ano"));
        }
        return this;
    }

    public IdentificadorDoProcesso consistirRegiao() {
        if (!Utils.nulos(this.numero, this.ano, this.vara, this.digito) && Utils.nulo(this.regiao)) {
            throw new NegocioException(new MensagemDeRecurso("regiao", Mensagens.MSG0003, "Tribunal"));
        }
        return this;
    }

    public IdentificadorDoProcesso consistirVara() {
        if (!Utils.nulos(this.numero, this.ano, this.regiao, this.digito) && Utils.nulo(this.vara)) {
            throw new NegocioException(new MensagemDeRecurso("vara", Mensagens.MSG0003, "Vara"));
        }
        return this;
    }

    public IdentificadorDoProcesso consistirDigito() {
        Integer digitoCalculado;
        if (!Utils.nulos(this.numero, this.ano, this.regiao, this.vara) && Utils.nulo(this.digito)) {
            throw new NegocioException(new MensagemDeRecurso("digito", Mensagens.MSG0003, "D\u00edgito"));
        }
        if (Utils.naoNulos(this.numero, this.digito, this.ano, this.justica, this.regiao, this.vara) && (Utils.nulo(digitoCalculado = this.calcularDigito()) || this.digito.compareTo(digitoCalculado) != 0)) {
            throw new NegocioException(new MensagemDeRecurso("digito", Mensagens.MSG0109, new Object[0]));
        }
        return this;
    }

    public IdentificadorDoProcesso consistir() {
        NegocioException excecao = new NegocioException();
        try {
            this.consistirNumero();
        }
        catch (NegocioException e) {
            excecao.agregarExcecao(e);
        }
        try {
            this.consistirAno();
        }
        catch (NegocioException e) {
            excecao.agregarExcecao(e);
        }
        try {
            this.consistirRegiao();
        }
        catch (NegocioException e) {
            excecao.agregarExcecao(e);
        }
        try {
            this.consistirVara();
        }
        catch (NegocioException e) {
            excecao.agregarExcecao(e);
        }
        try {
            this.consistirDigito();
        }
        catch (NegocioException e) {
            excecao.agregarExcecao(e);
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public void limparCampos() {
        this.setNumero(null);
        this.setRegiao(null);
        this.setAno(null);
        this.setVara(null);
        this.setDigito(null);
    }

    @Override
    public int compareTo(IdentificadorDoProcesso outro) {
        return new CompareToBuilder().append((Object)this.numero, (Object)outro.getNumero()).append((Object)this.ano, (Object)outro.getAno()).append((Object)this.justica, (Object)outro.getJustica()).append((Object)this.regiao, (Object)outro.getRegiao()).append((Object)this.vara, (Object)outro.getVara()).append((Object)this.digito, (Object)outro.getDigito()).toComparison();
    }

    public int hashCode() {
        return new HashCodeBuilder(1, 31).append((Object)this.numero).append((Object)this.ano).append((Object)this.justica).append((Object)this.regiao).append((Object)this.vara).append((Object)this.digito).toHashCode();
    }

    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (!(obj instanceof IdentificadorDoProcesso)) {
            return false;
        }
        IdentificadorDoProcesso outro = (IdentificadorDoProcesso)obj;
        return new EqualsBuilder().append((Object)this.numero, (Object)outro.getNumero()).append((Object)this.ano, (Object)outro.getAno()).append((Object)this.justica, (Object)outro.getJustica()).append((Object)this.regiao, (Object)outro.getRegiao()).append((Object)this.vara, (Object)outro.getVara()).append((Object)this.digito, (Object)outro.getDigito()).isEquals();
    }

    public String toString() {
        return Utils.objetoParaString(this, "numero", "ano", "digito", "justica", "regiao", "vara");
    }
}

