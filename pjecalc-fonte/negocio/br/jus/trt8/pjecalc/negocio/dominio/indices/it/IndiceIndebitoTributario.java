/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.it;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.it.RepositorioDeIndiceIndebitoTributario;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBINDEBITOTRIBUTARIO")
@SequenceGenerator(name="SQINDEBITOTRIBUTARIO", sequenceName="SQINDEBITOTRIBUTARIO", allocationSize=1)
@Name(value="indiceIndebitoTributario")
public class IndiceIndebitoTributario
extends IndiceBase {
    private static final long serialVersionUID = -3269081304053918795L;
    private static final String NOME_INDICE = "Devedor n\u00e3o Enquadrado como Fazenda P\u00fablica";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQINDEBITOTRIBUTARIO")
    @Column(name="IIDINDEBITOTRIBUTARIO", nullable=false)
    private Long id;

    public IndiceIndebitoTributario() {
        super(RepositorioDeIndiceIndebitoTributario.class);
    }

    public IndiceIndebitoTributario(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceIndebitoTributario.class, competencia, taxa);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static List<IndiceIndebitoTributario> obterTodos() {
        return IndiceIndebitoTributario.getRepositorio(RepositorioDeIndiceIndebitoTributario.class).obterTodos();
    }

    public static List<IndiceIndebitoTributario> obterPorFiltro(IndiceIndebitoTributario filtro) {
        return IndiceIndebitoTributario.getRepositorio(RepositorioDeIndiceIndebitoTributario.class).obterPorFiltro(filtro);
    }

    public static List<IndiceIndebitoTributario> obterTabela(Periodo periodo) {
        return IndiceIndebitoTributario.getRepositorio(RepositorioDeIndiceIndebitoTributario.class).obterTabelaPor(periodo);
    }

    public static void remover(IndiceIndebitoTributario entidade) {
        IndiceIndebitoTributario.remover(RepositorioDeIndiceIndebitoTributario.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceIndebitoTributario.getRepositorio(RepositorioDeIndiceIndebitoTributario.class).existe(this);
    }

    @Override
    public IndiceIndebitoTributario validar() {
        return (IndiceIndebitoTributario)this.validar(NOME_INDICE);
    }

    @Override
    public IndiceIndebitoTributario validarParaConsulta() {
        return (IndiceIndebitoTributario)this.validarParaConsulta(NOME_INDICE);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    @Override
    public IndiceBase clonar() {
        IndiceIndebitoTributario indice = new IndiceIndebitoTributario();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

