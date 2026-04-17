/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Embedded
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.hibernate.annotations.Where
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.processo;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.RepositorioDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.participante.Reclamado;
import br.jus.trt8.pjecalc.negocio.dominio.participante.Reclamante;
import br.jus.trt8.pjecalc.negocio.dominio.processo.Advogado;
import br.jus.trt8.pjecalc.negocio.dominio.processo.IdentificadorDoProcesso;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Embedded;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.hibernate.annotations.Where;
import org.jboss.seam.annotations.Name;

@Name(value="processo")
@Entity
@Table(name="TBPROCESSOCALCULO")
@SequenceGenerator(name="SQPROCESSOCALCULO", sequenceName="SQPROCESSOCALCULO", allocationSize=1)
public class Processo
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -2767048358241616979L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPROCESSOCALCULO")
    @Column(name="IIDPROCESSOCALCULO")
    private Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="MVLCAUSA", precision=19, scale=2, nullable=true)
    private BigDecimal valorDaCausa;
    @Column(name="DDTAUTUACAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataAutuacao;
    @OneToOne(mappedBy="processo")
    private Calculo calculo;
    @Embedded
    private IdentificadorDoProcesso identificador;
    @Embedded
    private Reclamante reclamante;
    @Embedded
    private Reclamado reclamado;
    @Where(clause="STPADVOGADO = 'RT' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="processo")
    private List<Advogado> advogadosReclamante = new ArrayList<Advogado>();
    @Where(clause="STPADVOGADO = 'RD' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="processo")
    private List<Advogado> advogadosReclamado = new ArrayList<Advogado>();

    public Processo() {
        super(RepositorioDeCalculo.class);
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

    @Override
    public Processo validar() {
        this.getIdentificadorDoProcesso().consistir();
        this.reclamante.validar();
        super.validar();
        return this;
    }

    public Long getId() {
        return this.id;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public BigDecimal getValorDaCausa() {
        return this.valorDaCausa;
    }

    public void setValorDaCausa(BigDecimal valorDaCausa) {
        this.valorDaCausa = valorDaCausa;
    }

    public Date getDataAutuacao() {
        return this.dataAutuacao;
    }

    public void setDataAutuacao(Date dataAutuacao) {
        this.dataAutuacao = dataAutuacao;
    }

    public IdentificadorDoProcesso getIdentificadorDoProcesso() {
        return Utils.naoNulo(this.identificador) ? this.identificador : (this.identificador = new IdentificadorDoProcesso());
    }

    public Integer getDigitoProcesso() {
        return this.getIdentificadorDoProcesso().getDigito();
    }

    public void setDigitoProcesso(Integer digitoProcesso) {
        this.getIdentificadorDoProcesso().setDigito(digitoProcesso);
    }

    public Integer getNumeroProcesso() {
        return this.getIdentificadorDoProcesso().getNumero();
    }

    public void setNumeroProcesso(Integer numeroProcesso) {
        this.getIdentificadorDoProcesso().setNumero(numeroProcesso);
    }

    public Integer getAnoProcesso() {
        return this.getIdentificadorDoProcesso().getAno();
    }

    public void setAnoProcesso(Integer anoProcesso) {
        this.getIdentificadorDoProcesso().setAno(anoProcesso);
    }

    public Integer getJustica() {
        return this.getIdentificadorDoProcesso().getJustica();
    }

    public void setJustica(Integer justica) {
        this.getIdentificadorDoProcesso().setJustica(justica);
    }

    public Integer getRegiao() {
        return this.getIdentificadorDoProcesso().getRegiao();
    }

    public void setRegiao(Integer regiao) {
        this.getIdentificadorDoProcesso().setRegiao(regiao);
    }

    public Integer getVaraProcesso() {
        return this.getIdentificadorDoProcesso().getVara();
    }

    public void setVaraProcesso(Integer varaProcesso) {
        this.getIdentificadorDoProcesso().setVara(varaProcesso);
    }

    public String getIdentificacao() {
        return this.getIdentificadorDoProcesso().getIdentificacao();
    }

    public Reclamante getReclamante() {
        return Utils.naoNulo(this.reclamante) ? this.reclamante : (this.reclamante = new Reclamante());
    }

    public void setReclamante(Reclamante reclamante) {
        this.reclamante = reclamante;
    }

    public Reclamado getReclamado() {
        return Utils.naoNulo(this.reclamado) ? this.reclamado : (this.reclamado = new Reclamado());
    }

    public void setReclamado(Reclamado reclamado) {
        this.reclamado = reclamado;
    }

    public void limparCampos() {
        this.setValorDaCausa(null);
        this.setDataAutuacao(null);
        this.getIdentificadorDoProcesso().limparCampos();
        this.getReclamado().limparCampos();
        this.getReclamante().limparCampos();
    }

    public String toString() {
        return this.getIdentificadorDoProcesso().getIdentificacao();
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public List<Advogado> getAdvogadosReclamante() {
        return this.advogadosReclamante;
    }

    public void setAdvogadosReclamante(List<Advogado> advogadosReclamante) {
        this.advogadosReclamante = advogadosReclamante;
    }

    public List<Advogado> getAdvogadosReclamado() {
        return this.advogadosReclamado;
    }

    public void setAdvogadosReclamado(List<Advogado> advogadosReclamado) {
        this.advogadosReclamado = advogadosReclamado;
    }

    public void adicionarAdvogadoReclamante(Advogado advogado) {
        advogado.setProcesso(this);
        this.advogadosReclamante.add(advogado);
    }

    public void adicionarAdvogadoReclamado(Advogado advogado) {
        advogado.setProcesso(this);
        this.advogadosReclamado.add(advogado);
    }
}

