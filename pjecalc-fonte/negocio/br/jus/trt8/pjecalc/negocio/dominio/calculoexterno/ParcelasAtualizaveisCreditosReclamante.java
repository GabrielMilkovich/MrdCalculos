/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  org.hibernate.annotations.Type
 *  org.hibernate.annotations.Where
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.AssuntoCnj;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.RepositorioDeAssuntoCnj;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamanteUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.RepositorioDeParcelasAtualizaveisCreditosReclamante;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.Where;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBPARCEATUALIZCREDRMTE")
@SequenceGenerator(name="SQPARCEATUALIZCREDRMTE", sequenceName="SQPARCEATUALIZCREDRMTE", allocationSize=1)
@Name(value="parcelasAtualizaveisCreditosReclamante")
public class ParcelasAtualizaveisCreditosReclamante
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPARCEATUALIZCREDRMTE")
    @Column(name="IIDPARCEATUALIZCREDRMTE")
    private Long id = null;
    @OneToOne
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculoExterno;
    @Column(name="SFLVERBASTRIB", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarVerbasTributavel = false;
    @Column(name="MVLPARCELAVERBASTRIB", precision=19, scale=2)
    private BigDecimal valorParcelaVerbasTributavel;
    @Column(name="MVLJUROSVERBASTRIB", precision=19, scale=2)
    private BigDecimal valorJurosVerbasTributavel;
    @Column(name="SFLVERBASNAOTRIB", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarVerbasNaoTributavel = false;
    @Column(name="MVLPARCELAVERBASNAOTRIB", precision=19, scale=2)
    private BigDecimal valorParcelaVerbasNaoTributavel;
    @Column(name="MVLJUROSVERBASNAOTRIB", precision=19, scale=2)
    private BigDecimal valorJurosVerbasNaoTributavel;
    @Column(name="SFLFGTS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarFgts = false;
    @Column(name="MVLPARCELAFGTS", precision=19, scale=2)
    private BigDecimal valorParcelaFgts;
    @Column(name="MVLJUROSFGTS", precision=19, scale=2)
    private BigDecimal valorJurosFgts;
    @Column(name="SFLMULTAFGTS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarMultaFgts = false;
    @Column(name="MVLPARCELAMULTAFGTS", precision=19, scale=2)
    private BigDecimal valorParcelaMultaFgts;
    @Column(name="MVLJUROSMULTAFGTS", precision=19, scale=2)
    private BigDecimal valorJurosMultaFgts;
    @Column(name="SFLMULTAINDENIZDEVRMTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarMultaIndenizDevReclamante = false;
    @Transient
    private ParcelasAtualizaveisMultaIndenizacao multaIndenizDevReclamante = new ParcelasAtualizaveisMultaIndenizacao();
    @OneToMany(mappedBy="creditosReclamante", cascade={CascadeType.ALL})
    @Where(clause="STPCREDORDEVEDOR IN ('RTRD')")
    private List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizDevReclamante = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();
    @Column(name="SFLMULTAINDENIZDEVRMDO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarMultaIndenizDevReclamado = false;
    @Transient
    private ParcelasAtualizaveisMultaIndenizacao multaIndenizDevReclamado = new ParcelasAtualizaveisMultaIndenizacao();
    @OneToMany(mappedBy="creditosReclamante", cascade={CascadeType.ALL})
    @Where(clause="STPCREDORDEVEDOR IN ('RDRT')")
    private List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizDevReclamado = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();

    public ParcelasAtualizaveisCreditosReclamante() {
        super(RepositorioDeParcelasAtualizaveisCreditosReclamante.class);
    }

    public ParcelasAtualizaveisCreditosReclamante(Calculo calculoExterno) {
        this();
        this.calculoExterno = calculoExterno;
    }

    @Override
    public void salvar(boolean flush) {
        super.salvar(flush);
    }

    public static ParcelasAtualizaveisCreditosReclamante obterDoCalculo(Calculo calculo) {
        return ParcelasAtualizaveisCreditosReclamante.getRepositorio(RepositorioDeParcelasAtualizaveisCreditosReclamante.class).obterDoCalculo(calculo);
    }

    protected AssuntoCnj obterAssuntoCnjParaVerbas() {
        return ParcelasAtualizaveisCreditosReclamante.getRepositorio(RepositorioDeAssuntoCnj.class).obterRaiz();
    }

    public void consistirDados() {
        ParcelasAtualizaveisCreditosReclamanteUtils.consistirDados(this);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Boolean getMarcarVerbasTributavel() {
        return this.marcarVerbasTributavel;
    }

    public void setMarcarVerbasTributavel(Boolean marcarVerbasTributavel) {
        this.marcarVerbasTributavel = marcarVerbasTributavel;
    }

    public BigDecimal getValorParcelaVerbasTributavel() {
        return this.valorParcelaVerbasTributavel;
    }

    public void setValorParcelaVerbasTributavel(BigDecimal valorParcelaVerbasTributavel) {
        this.valorParcelaVerbasTributavel = valorParcelaVerbasTributavel;
    }

    public BigDecimal getValorJurosVerbasTributavel() {
        return this.valorJurosVerbasTributavel;
    }

    public void setValorJurosVerbasTributavel(BigDecimal valorJurosVerbasTributavel) {
        this.valorJurosVerbasTributavel = valorJurosVerbasTributavel;
    }

    public Boolean getMarcarVerbasNaoTributavel() {
        return this.marcarVerbasNaoTributavel;
    }

    public void setMarcarVerbasNaoTributavel(Boolean marcarVerbasNaoTributavel) {
        this.marcarVerbasNaoTributavel = marcarVerbasNaoTributavel;
    }

    public BigDecimal getValorParcelaVerbasNaoTributavel() {
        return this.valorParcelaVerbasNaoTributavel;
    }

    public void setValorParcelaVerbasNaoTributavel(BigDecimal valorParcelaVerbasNaoTributavel) {
        this.valorParcelaVerbasNaoTributavel = valorParcelaVerbasNaoTributavel;
    }

    public BigDecimal getValorJurosVerbasNaoTributavel() {
        return this.valorJurosVerbasNaoTributavel;
    }

    public void setValorJurosVerbasNaoTributavel(BigDecimal valorJurosVerbasNaoTributavel) {
        this.valorJurosVerbasNaoTributavel = valorJurosVerbasNaoTributavel;
    }

    public Boolean getMarcarFgts() {
        return this.marcarFgts;
    }

    public void setMarcarFgts(Boolean marcarFgts) {
        this.marcarFgts = marcarFgts;
    }

    public BigDecimal getValorParcelaFgts() {
        return this.valorParcelaFgts;
    }

    public void setValorParcelaFgts(BigDecimal valorParcelaFgts) {
        this.valorParcelaFgts = valorParcelaFgts;
    }

    public BigDecimal getValorJurosFgts() {
        return this.valorJurosFgts;
    }

    public void setValorJurosFgts(BigDecimal valorJurosFgts) {
        this.valorJurosFgts = valorJurosFgts;
    }

    public Boolean getMarcarMultaFgts() {
        return this.marcarMultaFgts;
    }

    public void setMarcarMultaFgts(Boolean marcarMultaFgts) {
        this.marcarMultaFgts = marcarMultaFgts;
    }

    public BigDecimal getValorParcelaMultaFgts() {
        return this.valorParcelaMultaFgts;
    }

    public void setValorParcelaMultaFgts(BigDecimal valorParcelaMultaFgts) {
        this.valorParcelaMultaFgts = valorParcelaMultaFgts;
    }

    public BigDecimal getValorJurosMultaFgts() {
        return this.valorJurosMultaFgts;
    }

    public void setValorJurosMultaFgts(BigDecimal valorJurosMultaFgts) {
        this.valorJurosMultaFgts = valorJurosMultaFgts;
    }

    public Boolean getMarcarMultaIndenizDevReclamado() {
        return this.marcarMultaIndenizDevReclamado;
    }

    public void setMarcarMultaIndenizDevReclamado(Boolean marcarMultaIndenizDevReclamado) {
        this.marcarMultaIndenizDevReclamado = marcarMultaIndenizDevReclamado;
    }

    public Boolean getMarcarMultaIndenizDevReclamante() {
        return this.marcarMultaIndenizDevReclamante;
    }

    public void setMarcarMultaIndenizDevReclamante(Boolean marcarMultaIndenizDevReclamante) {
        this.marcarMultaIndenizDevReclamante = marcarMultaIndenizDevReclamante;
    }

    public List<ParcelasAtualizaveisMultaIndenizacao> getListaMultasIndenizDevReclamante() {
        return this.listaMultasIndenizDevReclamante;
    }

    public void setListaMultasIndenizDevReclamante(List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizDevReclamante) {
        this.listaMultasIndenizDevReclamante = listaMultasIndenizDevReclamante;
    }

    public ParcelasAtualizaveisMultaIndenizacao getMultaIndenizDevReclamado() {
        return this.multaIndenizDevReclamado;
    }

    public void setMultaIndenizDevReclamado(ParcelasAtualizaveisMultaIndenizacao multaIndenizDevReclamado) {
        this.multaIndenizDevReclamado = multaIndenizDevReclamado;
    }

    public List<ParcelasAtualizaveisMultaIndenizacao> getListaMultasIndenizDevReclamado() {
        return this.listaMultasIndenizDevReclamado;
    }

    public void setListaMultasIndenizDevReclamado(List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizDevReclamado) {
        this.listaMultasIndenizDevReclamado = listaMultasIndenizDevReclamado;
    }

    public ParcelasAtualizaveisMultaIndenizacao getMultaIndenizDevReclamante() {
        return this.multaIndenizDevReclamante;
    }

    public void setMultaIndenizDevReclamante(ParcelasAtualizaveisMultaIndenizacao multaIndenizDevReclamante) {
        this.multaIndenizDevReclamante = multaIndenizDevReclamante;
    }

    public Calculo getCalculoExterno() {
        return this.calculoExterno;
    }

    public void setCalculoExterno(Calculo calculoExterno) {
        this.calculoExterno = calculoExterno;
    }

    public Long getId() {
        return this.id;
    }

    public List<ParcelasAtualizaveisMultaIndenizacao> getListaMultasIndenizDevReclamanteClone() {
        ArrayList<ParcelasAtualizaveisMultaIndenizacao> novaLista = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();
        for (ParcelasAtualizaveisMultaIndenizacao multa : this.getListaMultasIndenizDevReclamante()) {
            novaLista.add(multa.clonar());
        }
        return novaLista;
    }

    public List<ParcelasAtualizaveisMultaIndenizacao> getListaMultasIndenizDevReclamadoClone() {
        ArrayList<ParcelasAtualizaveisMultaIndenizacao> novaLista = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();
        for (ParcelasAtualizaveisMultaIndenizacao multa : this.getListaMultasIndenizDevReclamado()) {
            novaLista.add(multa.clonar());
        }
        return novaLista;
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || !super.equals(obj)) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        ParcelasAtualizaveisCreditosReclamante other = (ParcelasAtualizaveisCreditosReclamante)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

