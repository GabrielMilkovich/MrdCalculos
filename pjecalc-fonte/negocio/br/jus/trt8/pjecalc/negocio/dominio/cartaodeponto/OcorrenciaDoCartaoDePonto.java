/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
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
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioDeOcorrenciaDoCartaoDePonto;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
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
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBOCORRENCIACARTAODEPONTO")
@SequenceGenerator(name="SQOCORRENCIACARTAODEPONTO", sequenceName="SQOCORRENCIACARTAODEPONTO", allocationSize=1)
@Name(value="ocorrenciaDoCartaoDePonto")
public class OcorrenciaDoCartaoDePonto
extends EntidadeBase
implements Serializable,
Comparable<OcorrenciaDoCartaoDePonto> {
    private static final long serialVersionUID = 9184426831043583732L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIACARTAODEPONTO")
    @Column(name="IIDOCORRENCIACARTAODEPONTO")
    private final Long id = null;
    @ManyToOne
    @JoinColumn(name="IIDCARTAODEPONTO")
    private CartaoDePonto cartaoDePonto;
    @Column(name="DDTOCORRENCIA")
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataOcorrencia;
    @Column(name="MVLOCORRENCIA", precision=12, scale=4)
    @NotNull
    private BigDecimal valor;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;

    public OcorrenciaDoCartaoDePonto() {
        super(RepositorioDeOcorrenciaDoCartaoDePonto.class);
    }

    public OcorrenciaDoCartaoDePonto(CartaoDePonto cartaoDePonto, Date dataOcorrencia, BigDecimal valor) {
        super(RepositorioDeOcorrenciaDoCartaoDePonto.class);
        this.cartaoDePonto = cartaoDePonto;
        this.dataOcorrencia = dataOcorrencia;
        this.valor = valor;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public CartaoDePonto getCartaoDePonto() {
        return this.cartaoDePonto;
    }

    public void setCartaoDePonto(CartaoDePonto cartaoDePonto) {
        this.cartaoDePonto = cartaoDePonto;
    }

    public Date getDataOcorrencia() {
        return this.dataOcorrencia;
    }

    public void setDataOcorrencia(Date dataOcorrencia) {
        this.dataOcorrencia = dataOcorrencia;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
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

    @Override
    public int compareTo(OcorrenciaDoCartaoDePonto o) {
        return this.dataOcorrencia.compareTo(o.getDataOcorrencia());
    }
}

