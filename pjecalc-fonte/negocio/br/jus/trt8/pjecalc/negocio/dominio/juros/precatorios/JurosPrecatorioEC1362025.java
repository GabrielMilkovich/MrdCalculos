/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EnumType
 *  javax.persistence.Enumerated
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.precatorios;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.juros.precatorios.RepositorioDeJurosPrecatorioEC1362025;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Table;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBJUROSPRECATORIOEC1362025")
@Name(value="jurosPrecatorioEC1362025")
public class JurosPrecatorioEC1362025
extends IndiceBase {
    private static final long serialVersionUID = 1L;
    private static final String NOME_INDICE = "JurosPrecatorioEC1362025";
    @Id
    @Column(name="IIDJUROSPRECATORIOEC1362025", nullable=false)
    private Long id;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SNMPREVALECEUINDICE", nullable=false)
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    @NotNull
    private IndiceMonetarioEnum indicePrevaleceu;
    @Column(name="RVLIPCAINDICE", precision=38, scale=25, nullable=false)
    @NotNull
    private BigDecimal taxaIpca2aa;
    @Column(name="RVLSELICINDICE", precision=38, scale=25, nullable=false)
    @NotNull
    private BigDecimal taxaSelic;

    public JurosPrecatorioEC1362025() {
        super(RepositorioDeJurosPrecatorioEC1362025.class);
    }

    public JurosPrecatorioEC1362025(Date competencia, BigDecimal taxa) {
        super(RepositorioDeJurosPrecatorioEC1362025.class, competencia, taxa);
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

    public static List<JurosPrecatorioEC1362025> obterTodos() {
        return JurosPrecatorioEC1362025.getRepositorio(RepositorioDeJurosPrecatorioEC1362025.class).obterTodosSemLimite();
    }

    public static List<JurosPrecatorioEC1362025> obterPorFiltro(JurosPrecatorioEC1362025 filtro) {
        return JurosPrecatorioEC1362025.getRepositorio(RepositorioDeJurosPrecatorioEC1362025.class).obterPorFiltro(filtro);
    }

    public static JurosPrecatorioEC1362025 obterPorCompetencia(Date competencia) {
        return (JurosPrecatorioEC1362025)JurosPrecatorioEC1362025.getRepositorio(RepositorioDeJurosPrecatorioEC1362025.class).obterPorCompetencia(competencia);
    }

    public static List<JurosPrecatorioEC1362025> obterTabela(Periodo periodo) {
        return JurosPrecatorioEC1362025.getRepositorio(RepositorioDeJurosPrecatorioEC1362025.class).obterTabelaPor(periodo);
    }

    public static void remover(JurosPrecatorioEC1362025 entidade) {
        JurosPrecatorioEC1362025.remover(RepositorioDeJurosPrecatorioEC1362025.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return JurosPrecatorioEC1362025.getRepositorio(RepositorioDeJurosPrecatorioEC1362025.class).existe(this);
    }

    @Override
    public JurosPrecatorioEC1362025 validar() {
        return (JurosPrecatorioEC1362025)this.validar(NOME_INDICE);
    }

    @Override
    public JurosPrecatorioEC1362025 validarParaConsulta() {
        return (JurosPrecatorioEC1362025)this.validarParaConsulta(NOME_INDICE);
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
        JurosPrecatorioEC1362025 indice = new JurosPrecatorioEC1362025();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setIndicePrevaleceu(this.getIndicePrevaleceu());
        indice.setTaxaIpca2aa(this.getTaxaIpca2aa());
        indice.setTaxaSelic(this.getTaxaSelic());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }

    public IndiceMonetarioEnum getIndicePrevaleceu() {
        return this.indicePrevaleceu;
    }

    public void setIndicePrevaleceu(IndiceMonetarioEnum indicePrevaleceu) {
        this.indicePrevaleceu = indicePrevaleceu;
    }

    public BigDecimal getTaxaIpca2aa() {
        return this.taxaIpca2aa;
    }

    public void setTaxaIpca2aa(BigDecimal taxaIpca2aa) {
        this.taxaIpca2aa = taxaIpca2aa;
    }

    public BigDecimal getTaxaSelic() {
        return this.taxaSelic;
    }

    public void setTaxaSelic(BigDecimal taxaSelic) {
        this.taxaSelic = taxaSelic;
    }
}

