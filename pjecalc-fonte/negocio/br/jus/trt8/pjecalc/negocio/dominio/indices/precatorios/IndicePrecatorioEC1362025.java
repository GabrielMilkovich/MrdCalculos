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
package br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.RepositorioDeIndicePrecatorioEC1362025;
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
@Table(name="TBTABELAPRECATORIOEC1362025")
@Name(value="indicePrecatorioEC1362025")
public class IndicePrecatorioEC1362025
extends IndiceBase {
    private static final long serialVersionUID = 1L;
    private static final String NOME_INDICE = "PRECATORIOEC1362025";
    @Id
    @Column(name="IIDTABELAPRECATORIOEC1362025", nullable=false)
    private Long id;
    @Column(name="RVLPERGRACAINDICE", precision=38, scale=25)
    @NotNull
    private BigDecimal taxaPeriodoDaGraca;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SNMPREVALECEUINDICE", nullable=false)
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    @NotNull
    private IndiceMonetarioEnum indicePrevaleceu;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SNMPERGRACAPREVALECEUINDICE", nullable=false)
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    @NotNull
    private IndiceMonetarioEnum indicePrevaleceuPeriodoDaGraca;
    @Column(name="RVLIPCAINDICE", precision=38, scale=25, nullable=false)
    @NotNull
    private BigDecimal taxaIpca;
    @Column(name="RVLSELICINDICE", precision=38, scale=25, nullable=false)
    @NotNull
    private BigDecimal taxaSelic;

    public IndicePrecatorioEC1362025() {
        super(RepositorioDeIndicePrecatorioEC1362025.class);
    }

    public IndicePrecatorioEC1362025(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndicePrecatorioEC1362025.class, competencia, taxa);
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

    public static List<IndicePrecatorioEC1362025> obterTodos() {
        return IndicePrecatorioEC1362025.getRepositorio(RepositorioDeIndicePrecatorioEC1362025.class).obterTodos();
    }

    public static List<IndicePrecatorioEC1362025> obterPorFiltro(IndicePrecatorioEC1362025 filtro) {
        return IndicePrecatorioEC1362025.getRepositorio(RepositorioDeIndicePrecatorioEC1362025.class).obterPorFiltro(filtro);
    }

    public static void remover(IndicePrecatorioEC1362025 entidade) {
        IndicePrecatorioEC1362025.remover(RepositorioDeIndicePrecatorioEC1362025.class, entidade, true);
    }

    public static List<IndicePrecatorioEC1362025> obterTabela(Periodo periodo, boolean paraCorrecaoDeJuros, boolean paraPeriodoDaGraca) {
        return IndicePrecatorioEC1362025.getRepositorio(RepositorioDeIndicePrecatorioEC1362025.class).obterTabelaPor(periodo, paraCorrecaoDeJuros, paraPeriodoDaGraca);
    }

    @Override
    public boolean existe() {
        return IndicePrecatorioEC1362025.getRepositorio(RepositorioDeIndicePrecatorioEC1362025.class).existe(this);
    }

    @Override
    public IndicePrecatorioEC1362025 validar() {
        return (IndicePrecatorioEC1362025)this.validar(NOME_INDICE);
    }

    @Override
    public IndicePrecatorioEC1362025 validarParaConsulta() {
        return (IndicePrecatorioEC1362025)this.validarParaConsulta(NOME_INDICE);
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
        IndicePrecatorioEC1362025 indice = new IndicePrecatorioEC1362025();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setIndicePrevaleceu(this.getIndicePrevaleceu());
        indice.setTaxaPeriodoDaGraca(this.getTaxaPeriodoDaGraca());
        indice.setIndicePrevaleceuPeriodoDaGraca(this.getIndicePrevaleceuPeriodoDaGraca());
        indice.setTaxaIpca(this.getTaxaIpca());
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

    public BigDecimal getTaxaSelic() {
        return this.taxaSelic;
    }

    public void setTaxaSelic(BigDecimal taxaSelic) {
        this.taxaSelic = taxaSelic;
    }

    public BigDecimal getTaxaPeriodoDaGraca() {
        return this.taxaPeriodoDaGraca;
    }

    public void setTaxaPeriodoDaGraca(BigDecimal taxaPeriodoDaGraca) {
        this.taxaPeriodoDaGraca = taxaPeriodoDaGraca;
    }

    public IndiceMonetarioEnum getIndicePrevaleceuPeriodoDaGraca() {
        return this.indicePrevaleceuPeriodoDaGraca;
    }

    public void setIndicePrevaleceuPeriodoDaGraca(IndiceMonetarioEnum indicePrevaleceuPeriodoDaGraca) {
        this.indicePrevaleceuPeriodoDaGraca = indicePrevaleceuPeriodoDaGraca;
    }

    public BigDecimal getTaxaIpca() {
        return this.taxaIpca;
    }

    public void setTaxaIpca(BigDecimal taxaIpca) {
        this.taxaIpca = taxaIpca;
    }
}

