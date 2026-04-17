/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Fetch
 *  org.hibernate.annotations.FetchMode
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.AliquotaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.LegendaDaFormulaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.MaquinaDeCalculoDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.OcorrenciaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.RepositorioDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.TotalizadorDeProvidenciaPrivada;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.Type;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBPREVIDENCIAPRIVADACALCULO")
@SequenceGenerator(name="SQPREVIDENCIAPRIVADACALCULO", sequenceName="SQPREVIDENCIAPRIVADACALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="previdenciaPrivada")
public class PrevidenciaPrivada
extends EntidadeBase {
    private static final long serialVersionUID = -2515252433071914071L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPREVIDENCIAPRIVADACALCULO")
    @Column(name="IIDPREVIDENCIAPRIVADA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SFLAPURARPREVIDENCIAPRIVADA", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarPrevidenciaPrivada = Boolean.FALSE;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="previdenciaPrivada")
    @OrderBy(value="dataInicioPeriodo")
    private Set<AliquotaDePrevidenciaPrivada> aliquotas;
    @OneToMany(fetch=FetchType.EAGER, cascade={CascadeType.ALL}, mappedBy="previdenciaPrivada")
    @Fetch(value=FetchMode.SELECT)
    @OrderBy(value="competencia")
    private Set<OcorrenciaDePrevidenciaPrivada> ocorrencias;
    @Transient
    protected MaquinaDeCalculoDePrevidenciaPrivada maquinaDeCalculoDePrevidenciaPrivada = new MaquinaDeCalculoDePrevidenciaPrivada(this);
    @Transient
    protected LegendaDaFormulaDePrevidenciaPrivada legendaDaFormula;
    @Transient
    private TotalizadorDeProvidenciaPrivada totalizador;

    public PrevidenciaPrivada() {
        super(RepositorioDePrevidenciaPrivada.class);
    }

    public PrevidenciaPrivada(Calculo calculo) {
        this();
        this.calculo = calculo;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    protected TotalizadorDeProvidenciaPrivada getTotalizador() {
        if (Utils.nulo(this.totalizador)) {
            this.totalizador = new TotalizadorDeProvidenciaPrivada(this);
        }
        return this.totalizador;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public Boolean getApurarPrevidenciaPrivada() {
        return this.apurarPrevidenciaPrivada;
    }

    public void setApurarPrevidenciaPrivada(Boolean apurarPrevidenciaPrivada) {
        this.apurarPrevidenciaPrivada = apurarPrevidenciaPrivada;
    }

    public Set<AliquotaDePrevidenciaPrivada> getAliquotas() {
        if (Utils.nulo(this.aliquotas)) {
            this.aliquotas = new LinkedHashSet<AliquotaDePrevidenciaPrivada>();
        }
        return this.aliquotas;
    }

    public void setAliquotas(Set<AliquotaDePrevidenciaPrivada> aliquotas) {
        this.aliquotas = aliquotas;
    }

    public Set<OcorrenciaDePrevidenciaPrivada> getOcorrencias() {
        if (Utils.nulo(this.ocorrencias)) {
            this.ocorrencias = new LinkedHashSet<OcorrenciaDePrevidenciaPrivada>();
        }
        return this.ocorrencias;
    }

    public void setOcorrencias(Set<OcorrenciaDePrevidenciaPrivada> ocorrencias) {
        this.ocorrencias = ocorrencias;
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

    @Override
    public void salvar() {
        this.validar();
        this.limparOcorrencias();
        this.configurarValoresPadroes();
        super.salvar();
    }

    private void configurarValoresPadroes() {
        if (!this.getApurarPrevidenciaPrivada().booleanValue()) {
            this.setAliquotas(new LinkedHashSet<AliquotaDePrevidenciaPrivada>());
        }
    }

    private void limparOcorrencias() {
        this.getOcorrencias().clear();
    }

    public void liquidar() {
        this.maquinaDeCalculoDePrevidenciaPrivada.liquidar();
    }

    public void limparJuros() {
        if (Utils.naoNulo(this.ocorrencias)) {
            for (OcorrenciaDePrevidenciaPrivada ocorrenciaDePrevidenciaPrivada : this.ocorrencias) {
                ocorrenciaDePrevidenciaPrivada.setTaxaDeJuros(null);
            }
        }
    }

    public void calcularJuros() {
        this.maquinaDeCalculoDePrevidenciaPrivada.calcularJuros();
    }

    public LegendaDaFormulaDePrevidenciaPrivada getLegendaDaFormula() {
        if (Utils.nulo(this.legendaDaFormula)) {
            this.legendaDaFormula = new LegendaDaFormulaDePrevidenciaPrivada(this);
        }
        return this.legendaDaFormula;
    }

    @Override
    public PrevidenciaPrivada validar() {
        NegocioException excecao = new NegocioException();
        if (this.getApurarPrevidenciaPrivada().booleanValue() && this.getAliquotas().isEmpty()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0047, "Al\u00edquota por Per\u00edodos"));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public BigDecimal getTotalDoValorDevido() {
        return this.getTotalizador().getDevido();
    }

    public BigDecimal getTotalDaTaxaDeJuros() {
        return this.getTotalizador().getTaxaJuros();
    }

    public BigDecimal getTotalDoDevidoCorrigido() {
        return this.getTotalizador().getDevidoCorrigido();
    }

    public BigDecimal getTotalDeJuros() {
        return this.getTotalizador().getJuros();
    }

    public BigDecimal getTotalGeral() {
        return this.getTotalizador().getTotal();
    }

    public boolean excluirAliquotas() {
        return this.getApurarPrevidenciaPrivada() == false && !this.getAliquotas().isEmpty();
    }

    public void adicionar(AliquotaDePrevidenciaPrivada aliquota) {
        aliquota.setPrevidenciaPrivada(this);
        aliquota.validar();
        this.getAliquotas().add(aliquota);
    }

    public void removerDeAliquotas(AliquotaDePrevidenciaPrivada aliquota) {
        this.getAliquotas().remove(aliquota);
    }

    public void removerDeOcorrencias(List<OcorrenciaDePrevidenciaPrivada> filhos, boolean flush) {
        PrevidenciaPrivada.getRepositorio(RepositorioDePrevidenciaPrivada.class).removerDeOcorrencias(this, filhos, flush);
    }

    public static PrevidenciaPrivada obter(long id) {
        return (PrevidenciaPrivada)PrevidenciaPrivada.obter(RepositorioDePrevidenciaPrivada.class, id);
    }
}

