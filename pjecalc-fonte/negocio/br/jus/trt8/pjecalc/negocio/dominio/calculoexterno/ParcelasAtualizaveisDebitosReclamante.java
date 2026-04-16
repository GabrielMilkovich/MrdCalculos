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
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustas;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamanteUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.RepositorioDeParcelasAtualizaveisDebitosReclamante;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBPARCEATUALIZDEBRMTE")
@SequenceGenerator(name="SQPARCEATUALIZDEBRMTE", sequenceName="SQPARCEATUALIZDEBRMTE", allocationSize=1)
@Name(value="parcelasAtualizaveisDebitosReclamante")
public class ParcelasAtualizaveisDebitosReclamante
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPARCEATUALIZDEBRMTE")
    @Column(name="IIDPARCEATUALIZDEBRMTE")
    private Long id = null;
    @OneToOne
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculoExterno;
    @Column(name="SFLMULTAINDENIZDEVRMTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarMultaIndenizDevReclamante = false;
    @Transient
    private ParcelasAtualizaveisMultaIndenizacao multaIndenizDevReclamante = new ParcelasAtualizaveisMultaIndenizacao();
    @OneToMany(mappedBy="debitosReclamante", cascade={CascadeType.ALL})
    private List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizDevReclamante = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();
    @Column(name="SFLHONORARIOSDEVRMTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarHonorariosDevReclamante = false;
    @Transient
    private ParcelasAtualizaveisHonorario honorariosDevReclamante = new ParcelasAtualizaveisHonorario();
    @OneToMany(mappedBy="debitosReclamante", cascade={CascadeType.ALL})
    private List<ParcelasAtualizaveisHonorario> listaHonorariosDevReclamante = new ArrayList<ParcelasAtualizaveisHonorario>();
    @Column(name="SFLCUSTASCONHECIMDEVRMTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarCustasConhecimentoDevReclamante = false;
    @ManyToOne(cascade={CascadeType.ALL})
    @JoinColumn(name="IIDCUSTASCONHECIMDEVRMTE")
    private ParcelasAtualizaveisCustas custasConhecimentoDevReclamante = new ParcelasAtualizaveisCustas(Utils.VALOR_DOIS);

    public ParcelasAtualizaveisDebitosReclamante() {
        super(RepositorioDeParcelasAtualizaveisDebitosReclamante.class);
    }

    public ParcelasAtualizaveisDebitosReclamante(Calculo calculoExterno) {
        this();
        this.calculoExterno = calculoExterno;
    }

    @Override
    public void salvar(boolean flush) {
        super.salvar(flush);
    }

    public static ParcelasAtualizaveisDebitosReclamante obterDoCalculo(Calculo calculo) {
        return ParcelasAtualizaveisDebitosReclamante.getRepositorio(RepositorioDeParcelasAtualizaveisDebitosReclamante.class).obterDoCalculo(calculo);
    }

    public void consistirDados() {
        ParcelasAtualizaveisDebitosReclamanteUtils.consistirDados(this);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Boolean getMarcarMultaIndenizDevReclamante() {
        return this.marcarMultaIndenizDevReclamante;
    }

    public void setMarcarMultaIndenizDevReclamante(Boolean marcarMultaIndenizDevReclamante) {
        this.marcarMultaIndenizDevReclamante = marcarMultaIndenizDevReclamante;
    }

    public ParcelasAtualizaveisMultaIndenizacao getMultaIndenizDevReclamante() {
        return this.multaIndenizDevReclamante;
    }

    public void setMultaIndenizDevReclamante(ParcelasAtualizaveisMultaIndenizacao multaIndenizDevReclamante) {
        this.multaIndenizDevReclamante = multaIndenizDevReclamante;
    }

    public List<ParcelasAtualizaveisMultaIndenizacao> getListaMultasIndenizDevReclamante() {
        return this.listaMultasIndenizDevReclamante;
    }

    public void setListaMultasIndenizDevReclamante(List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizDevReclamante) {
        this.listaMultasIndenizDevReclamante = listaMultasIndenizDevReclamante;
    }

    public Boolean getMarcarHonorariosDevReclamante() {
        return this.marcarHonorariosDevReclamante;
    }

    public void setMarcarHonorariosDevReclamante(Boolean marcarHonorariosDevReclamante) {
        this.marcarHonorariosDevReclamante = marcarHonorariosDevReclamante;
    }

    public ParcelasAtualizaveisHonorario getHonorariosDevReclamante() {
        return this.honorariosDevReclamante;
    }

    public void setHonorariosDevReclamante(ParcelasAtualizaveisHonorario honorariosDevReclamante) {
        this.honorariosDevReclamante = honorariosDevReclamante;
    }

    public Boolean getMarcarCustasConhecimentoDevReclamante() {
        return this.marcarCustasConhecimentoDevReclamante;
    }

    public void setMarcarCustasConhecimentoDevReclamante(Boolean marcarCustasConhecimentoDevReclamante) {
        this.marcarCustasConhecimentoDevReclamante = marcarCustasConhecimentoDevReclamante;
    }

    public List<ParcelasAtualizaveisHonorario> getListaHonorariosDevReclamante() {
        return this.listaHonorariosDevReclamante;
    }

    public void setListaHonorariosDevReclamante(List<ParcelasAtualizaveisHonorario> listaHonorariosDevReclamante) {
        this.listaHonorariosDevReclamante = listaHonorariosDevReclamante;
    }

    public ParcelasAtualizaveisCustas getCustasConhecimentoDevReclamante() {
        return this.custasConhecimentoDevReclamante;
    }

    public void setCustasConhecimentoDevReclamante(ParcelasAtualizaveisCustas custasConhecimentoDevReclamante) {
        this.custasConhecimentoDevReclamante = custasConhecimentoDevReclamante;
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
        for (ParcelasAtualizaveisMultaIndenizacao multa : this.listaMultasIndenizDevReclamante) {
            novaLista.add(multa.clonar());
        }
        return novaLista;
    }

    public List<ParcelasAtualizaveisHonorario> getListaHonorariosDevReclamanteClone() {
        ArrayList<ParcelasAtualizaveisHonorario> novaLista = new ArrayList<ParcelasAtualizaveisHonorario>();
        for (ParcelasAtualizaveisHonorario honorario : this.listaHonorariosDevReclamante) {
            novaLista.add(honorario.clonar());
        }
        return novaLista;
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        ParcelasAtualizaveisDebitosReclamante other = (ParcelasAtualizaveisDebitosReclamante)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

