/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.LegendaDaFormulaDePensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.MaquinaDeCalculoDePensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.RepositorioDePensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBPENSAOALIMENTICIACALCULO")
@SequenceGenerator(name="SQPENSAOALIMENTICIACALCULO", sequenceName="SQPENSAOALIMENTICIACALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="pensaoAlimenticia")
public class PensaoAlimenticia
extends EntidadeBase
implements EventoAtualizacao {
    private static final long serialVersionUID = -4204002353636904090L;
    private static final int PRIORIDADE_ATUALIZACAO = 3;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPENSAOALIMENTICIACALCULO")
    @Column(name="IIDPENSAOALIMENTICIA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SFLAPURARPENSAOALIMENTICIA", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarPensaoAlimenticia = Boolean.FALSE;
    @Column(name="RVLALIQUOTA", precision=5, scale=2)
    private BigDecimal aliquota;
    @Column(name="SFLINCIDIRSOBREJUROS", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidirSobreJuros = Boolean.FALSE;
    @Column(name="RVLBASEVERBAS", precision=19, scale=2)
    private BigDecimal valorBaseVerbas;
    @Column(name="RVLBASEVERBASTRIBUTAVEIS", precision=19, scale=2)
    private BigDecimal valorBaseVerbasTributaveis;
    @Column(name="RVLBASEFGTS", precision=19, scale=2)
    private BigDecimal valorBaseFgts;
    @Column(name="RVLBASEMULTADOFGTS", precision=19, scale=2)
    private BigDecimal valorBaseMultaDoFgts;
    @Column(name="SFLORIGEMREGISTRO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoOrigemRegistroEnum")})
    private TipoOrigemRegistroEnum origemRegistro = TipoOrigemRegistroEnum.CALCULO;
    @Column(name="DDTEVENTOATUALIZACAO")
    @Temporal(value=TemporalType.DATE)
    private Date dataEvento;
    @Column(name="IFOLHAEVENTO", columnDefinition="VARCHAR2(80)")
    private String folhaDoEvento;
    @Column(name="MVLPRINCTRIBCALCEXT", precision=38, scale=25)
    private BigDecimal percPrincipalTributavel;
    @Column(name="MVLPRINCNAOTRIBCALCEXT", precision=38, scale=25)
    private BigDecimal percPrincipalNaoTributavel;
    @Column(name="SFLPRINCTRIBCALCEXT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidirSobrePrincipalTributavel = true;
    @Column(name="SFLPRINCNAOTRIBCALCEXT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidirSobrePrincipalNaoTributavel = false;
    @Transient
    protected MaquinaDeCalculoDePensaoAlimenticia maquinaDeCalculoDePensaoAlimenticia = new MaquinaDeCalculoDePensaoAlimenticia(this);
    @Transient
    protected LegendaDaFormulaDePensaoAlimenticia legendaDaFormula;

    public PensaoAlimenticia() {
        super(RepositorioDePensaoAlimenticia.class);
    }

    public PensaoAlimenticia(Calculo calculo) {
        this();
        this.calculo = calculo;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Date getDataEvento() {
        return this.dataEvento;
    }

    public void setDataEvento(Date dataEvento) {
        this.dataEvento = dataEvento;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public Boolean getApurarPensaoAlimenticia() {
        return this.apurarPensaoAlimenticia;
    }

    public void setApurarPensaoAlimenticia(Boolean apurarPensaoAlimenticia) {
        this.apurarPensaoAlimenticia = apurarPensaoAlimenticia;
    }

    public BigDecimal getAliquota() {
        return this.aliquota;
    }

    public void setAliquota(BigDecimal aliquota) {
        this.aliquota = aliquota;
    }

    public Boolean getIncidirSobreJuros() {
        return this.incidirSobreJuros;
    }

    public void setIncidirSobreJuros(Boolean incidirSobreJuros) {
        this.incidirSobreJuros = incidirSobreJuros;
    }

    public BigDecimal getValorBaseVerbas() {
        return this.valorBaseVerbas;
    }

    public void setValorBaseVerbas(BigDecimal valorBaseVerbas) {
        this.valorBaseVerbas = valorBaseVerbas;
    }

    public BigDecimal getValorBaseVerbasTributaveis() {
        return this.valorBaseVerbasTributaveis;
    }

    public void setValorBaseVerbasTributaveis(BigDecimal valorBaseVerbasTributaveis) {
        this.valorBaseVerbasTributaveis = valorBaseVerbasTributaveis;
    }

    public BigDecimal getValorBaseFgts() {
        return this.valorBaseFgts;
    }

    public void setValorBaseFgts(BigDecimal valorBaseFgts) {
        this.valorBaseFgts = valorBaseFgts;
    }

    public BigDecimal getValorBaseMultaDoFgts() {
        return this.valorBaseMultaDoFgts;
    }

    public void setValorBaseMultaDoFgts(BigDecimal valorBaseMultaDoFgts) {
        this.valorBaseMultaDoFgts = valorBaseMultaDoFgts;
    }

    public TipoOrigemRegistroEnum getOrigemRegistro() {
        return this.origemRegistro;
    }

    public void setOrigemRegistro(TipoOrigemRegistroEnum origemRegistro) {
        this.origemRegistro = origemRegistro;
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

    public String getFolhaDoEvento() {
        return this.folhaDoEvento;
    }

    public void setFolhaDoEvento(String folhaDoEvento) {
        this.folhaDoEvento = folhaDoEvento;
    }

    @Override
    public void salvar() {
        this.validar();
        this.configurarValoresPadroes();
        super.salvar();
    }

    public void resetar() {
        this.setOrigemRegistro(TipoOrigemRegistroEnum.CALCULO);
        this.setIncidirSobreJuros(false);
        this.setAliquota(null);
        this.setFolhaDoEvento(null);
        this.setDataEvento(null);
        this.setApurarPensaoAlimenticia(false);
        this.setValorBaseFgts(null);
        this.setValorBaseMultaDoFgts(null);
        this.setValorBaseVerbas(null);
    }

    private void configurarValoresPadroes() {
        if (!this.getApurarPensaoAlimenticia().booleanValue()) {
            this.setIncidirSobreJuros(false);
            this.setAliquota(null);
            this.setDataEvento(null);
            this.setFolhaDoEvento(null);
            this.setIncidirSobrePrincipalTributavel(Boolean.FALSE);
            this.setIncidirSobrePrincipalNaoTributavel(Boolean.FALSE);
            this.setPercPrincipalTributavel(null);
            this.setPercPrincipalNaoTributavel(null);
        }
    }

    public void liquidar() {
        this.maquinaDeCalculoDePensaoAlimenticia.liquidar();
    }

    @Override
    public PensaoAlimenticia validar() {
        NegocioException excecao = new NegocioException();
        if (this.apurarPensaoAlimenticia.booleanValue() && Utils.nulo(this.aliquota)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("aliquota", Mensagens.MSG0003, "Al\u00edquota"));
        }
        if (this.apurarPensaoAlimenticia.booleanValue() && this.origemRegistro.equals((Object)TipoOrigemRegistroEnum.ATUALIZACAO)) {
            if (Utils.nulo(this.dataEvento)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataEvento", Mensagens.MSG0003, "Data do Evento"));
            }
            if (Utils.naoNulos(this.getDataEvento(), this.getCalculo().getDataDeLiquidacao()) && HelperDate.dateBefore(this.getDataEvento(), this.getCalculo().getDataDeLiquidacao())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0127, Utils.formatarData(this.getCalculo().getDataDeLiquidacao())));
            }
            if (Utils.naoNulo(this.getDataEvento()) && HelperDate.dateAfter(this.getDataEvento(), new Date())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0128, new Object[0]));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public BigDecimal getTotalDasBases() {
        BigDecimal total = BigDecimal.ZERO;
        if (Utils.naoNulo(this.valorBaseVerbas)) {
            total = total.add(this.valorBaseVerbas, Utils.CONTEXTO_MATEMATICO);
        }
        if (Utils.naoNulo(this.valorBaseFgts)) {
            total = total.add(this.valorBaseFgts, Utils.CONTEXTO_MATEMATICO);
        }
        if (Utils.naoNulo(this.valorBaseMultaDoFgts)) {
            total = total.add(this.valorBaseMultaDoFgts, Utils.CONTEXTO_MATEMATICO);
        }
        return total;
    }

    public BigDecimal getProporcaoBaseTributavel() {
        BigDecimal totalBase = this.getTotalDasBases();
        if (BigDecimal.ZERO.compareTo(totalBase) >= 0) {
            return BigDecimal.ZERO;
        }
        return Utils.dividir(this.valorBaseVerbasTributaveis, totalBase);
    }

    public BigDecimal getValorDevido() {
        if (Utils.nulo(this.aliquota)) {
            return null;
        }
        return this.getTotalDasBases().multiply(this.getAliquota().divide(new BigDecimal("100"), Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getValorDevidoSomenteSobreVerbas() {
        if (Utils.nulo(this.aliquota)) {
            return null;
        }
        if (Utils.naoNulo(this.valorBaseVerbas)) {
            return this.valorBaseVerbas.multiply(this.getAliquota().divide(new BigDecimal("100"), Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO);
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getValorDevidoSomenteSobreVerbasTributaveis() {
        if (Utils.nulo(this.aliquota)) {
            return null;
        }
        if (Utils.naoNulo(this.valorBaseVerbasTributaveis)) {
            return this.valorBaseVerbasTributaveis.multiply(this.getAliquota().divide(new BigDecimal("100"), Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO);
        }
        return BigDecimal.ZERO;
    }

    public LegendaDaFormulaDePensaoAlimenticia getLegendaDaFormula() {
        if (Utils.nulo(this.legendaDaFormula)) {
            this.legendaDaFormula = new LegendaDaFormulaDePensaoAlimenticia(this);
        }
        return this.legendaDaFormula;
    }

    @Override
    public Integer getPrioridade() {
        return 3;
    }

    public BigDecimal getPercPrincipalTributavel() {
        return this.percPrincipalTributavel;
    }

    public void setPercPrincipalTributavel(BigDecimal percPrincipalTributavel) {
        this.percPrincipalTributavel = percPrincipalTributavel;
    }

    public BigDecimal getPercPrincipalNaoTributavel() {
        return this.percPrincipalNaoTributavel;
    }

    public void setPercPrincipalNaoTributavel(BigDecimal percPrincipalNaoTributavel) {
        this.percPrincipalNaoTributavel = percPrincipalNaoTributavel;
    }

    public Boolean getIncidirSobrePrincipalTributavel() {
        return this.incidirSobrePrincipalTributavel;
    }

    public void setIncidirSobrePrincipalTributavel(Boolean incidirSobrePrincipalTributavel) {
        this.incidirSobrePrincipalTributavel = incidirSobrePrincipalTributavel;
    }

    public Boolean getIncidirSobrePrincipalNaoTributavel() {
        return this.incidirSobrePrincipalNaoTributavel;
    }

    public void setIncidirSobrePrincipalNaoTributavel(Boolean incidirSobrePrincipalNaoTributavel) {
        this.incidirSobrePrincipalNaoTributavel = incidirSobrePrincipalNaoTributavel;
    }
}

