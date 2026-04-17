/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EnumType
 *  javax.persistence.Enumerated
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.historicosalarial;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVariacaoDaParcelaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarialOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.RepositorioDeHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.RepositorioDeOcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.OcorrenciaDeSalarioCategoriaOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.SalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional.SalarioMinimoNacional;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBHISTORICOSALARIAL")
@SequenceGenerator(name="SQHISTORICOSALARIAL", sequenceName="SQHISTORICOSALARIAL", allocationSize=1)
@Name(value="historicoSalarial")
public class HistoricoSalarial
extends EntidadeBase {
    private static final byte GERACAO_OCORRENCIA = 1;
    private static final long serialVersionUID = 2529298038157043563L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQHISTORICOSALARIAL")
    @Column(name="IIDHISTORICOSALARIAL")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SNMHISTORICOSALARIAL", columnDefinition="VARCHAR2(120)", unique=true)
    @Required
    private String nome;
    @Column(name="STPVARIACAOPARCELA", columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoVariacaoDaParcelaEnum")})
    private TipoVariacaoDaParcelaEnum tipoVariacaoParcela = TipoVariacaoDaParcelaEnum.FIXA;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLBASEFGTS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean incidenciaFGTS = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPROPORCIONALIZARFGTS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean aplicarProporcionalidadeFGTS = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLBASEINSS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean incidenciaINSS = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLPROPORCIONALIZARINSS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean aplicarProporcionalidadeINSS = false;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="historicoSalarial")
    private List<OcorrenciaDoHistoricoSalarial> ocorrencias = new ArrayList<OcorrenciaDoHistoricoSalarial>();
    @Transient
    @LimitedTo100Years(groups={1})
    @Required(groups={1})
    private Date competenciaInicial;
    @Transient
    @LimitedTo100Years(groups={1})
    @GreaterOrEqualThan(value="competenciaInicial", groups={1})
    @Required(groups={1})
    private Date competenciaFinal;
    @Transient
    @Required(groups={1}, condition="bean.tipoValor.valor =='I'")
    private BigDecimal valorParaBaseDeCalculo;
    @Transient
    private Boolean sinalizacaoINSSRecolhido = false;
    @Transient
    private Boolean sinalizacaoFGTSRecolhido = false;
    @Transient
    private TipoValorEnum tipoValor = TipoValorEnum.INFORMADO;
    @Transient
    @Required(groups={1}, condition="bean.tipoValor.valor =='C'")
    private BaseDeCalculoDoPrincipalEnum baseDeReferencia;
    @Transient
    @Required(groups={1}, condition="bean.tipoValor.valor =='C' && bean.baseDeReferencia != null && bean.baseDeReferencia.valor =='SC'")
    private SalarioCategoria categoria;
    @Transient
    @Required(groups={1}, condition="bean.tipoValor.valor =='C'")
    private BigDecimal quantidade = BigDecimal.ONE;

    public HistoricoSalarial() {
        super(RepositorioDeHistoricoSalarial.class);
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

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public TipoVariacaoDaParcelaEnum getTipoVariacaoParcela() {
        return this.tipoVariacaoParcela;
    }

    public void setTipoVariacaoParcela(TipoVariacaoDaParcelaEnum tipoVariacaoParcela) {
        this.tipoVariacaoParcela = tipoVariacaoParcela;
    }

    public Boolean getIncidenciaFGTS() {
        return this.incidenciaFGTS;
    }

    public void setIncidenciaFGTS(Boolean incidenciaFGTS) {
        this.incidenciaFGTS = incidenciaFGTS;
    }

    public Boolean getAplicarProporcionalidadeFGTS() {
        return this.aplicarProporcionalidadeFGTS;
    }

    public void setAplicarProporcionalidadeFGTS(Boolean aplicarProporcionalidadeFGTS) {
        this.aplicarProporcionalidadeFGTS = aplicarProporcionalidadeFGTS;
    }

    public Boolean getIncidenciaINSS() {
        return this.incidenciaINSS;
    }

    public void setIncidenciaINSS(Boolean incidenciaINSS) {
        this.incidenciaINSS = incidenciaINSS;
    }

    public Boolean getAplicarProporcionalidadeINSS() {
        return this.aplicarProporcionalidadeINSS;
    }

    public void setAplicarProporcionalidadeINSS(Boolean aplicarProporcionalidadeINSS) {
        this.aplicarProporcionalidadeINSS = aplicarProporcionalidadeINSS;
    }

    public Long getId() {
        return this.id;
    }

    public List<OcorrenciaDoHistoricoSalarial> getOcorrencias() {
        return this.ocorrencias;
    }

    public OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> getListaDeOcorrenciasOtimizada() {
        return new OcorrenciaDoHistoricoSalarialOptimizerListSearch().init((Collection<OcorrenciaDoHistoricoSalarial>)this.getOcorrencias());
    }

    public void setOcorrencias(List<OcorrenciaDoHistoricoSalarial> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public Date getCompetenciaInicial() {
        return this.competenciaInicial;
    }

    public void setCompetenciaInicial(Date competenciaInicial) {
        this.competenciaInicial = competenciaInicial;
    }

    public Date getCompetenciaFinal() {
        return this.competenciaFinal;
    }

    public void setCompetenciaFinal(Date competenciaFinal) {
        this.competenciaFinal = competenciaFinal;
    }

    public BigDecimal getValorParaBaseDeCalculo() {
        return this.valorParaBaseDeCalculo;
    }

    public void setValorParaBaseDeCalculo(BigDecimal valorParaBaseDeCalculo) {
        this.valorParaBaseDeCalculo = valorParaBaseDeCalculo;
    }

    public Boolean getSinalizacaoINSSRecolhido() {
        return this.sinalizacaoINSSRecolhido;
    }

    public void setSinalizacaoINSSRecolhido(Boolean sinalizacaoINSSRecolhido) {
        this.sinalizacaoINSSRecolhido = sinalizacaoINSSRecolhido;
    }

    public Boolean getSinalizacaoFGTSRecolhido() {
        return this.sinalizacaoFGTSRecolhido;
    }

    public void setSinalizacaoFGTSRecolhido(Boolean sinalizacaoFGTSRecolhido) {
        this.sinalizacaoFGTSRecolhido = sinalizacaoFGTSRecolhido;
    }

    public TipoValorEnum getTipoValor() {
        return this.tipoValor;
    }

    public void setTipoValor(TipoValorEnum tipoValor) {
        this.tipoValor = tipoValor;
    }

    public BaseDeCalculoDoPrincipalEnum getBaseDeReferencia() {
        return this.baseDeReferencia;
    }

    public void setBaseDeReferencia(BaseDeCalculoDoPrincipalEnum baseDeReferencia) {
        this.baseDeReferencia = baseDeReferencia;
    }

    public SalarioCategoria getCategoria() {
        return this.categoria;
    }

    public void setCategoria(SalarioCategoria categoria) {
        this.categoria = categoria;
    }

    public BigDecimal getQuantidade() {
        return this.quantidade;
    }

    public void setQuantidade(BigDecimal quantidade) {
        this.quantidade = quantidade;
    }

    public void marcarIncidenciasFGTS() {
        this.setAplicarProporcionalidadeFGTS(this.getIncidenciaFGTS());
        for (OcorrenciaDoHistoricoSalarial o : this.getOcorrencias()) {
            o.setIncidenciaFGTS(this.getIncidenciaFGTS());
        }
    }

    public void marcarIncidenciasContribuicaoSocial() {
        this.setAplicarProporcionalidadeINSS(this.getIncidenciaINSS());
        for (OcorrenciaDoHistoricoSalarial o : this.getOcorrencias()) {
            o.setIncidenciaINSS(this.getIncidenciaINSS());
        }
    }

    public void gerarOcorrencias() {
        GerenciadorDeValidadores.getInstance().validar(HistoricoSalarial.class, this, (byte)1);
        ArrayList<OcorrenciaDoHistoricoSalarial> ocorrenciasAnteriores = new ArrayList<OcorrenciaDoHistoricoSalarial>(this.getOcorrencias());
        if (Utils.naoNulo(this.getCompetenciaInicial()) && Utils.naoNulo(this.getCompetenciaFinal())) {
            this.getOcorrencias().clear();
            OcorrenciaDoHistoricoSalarial ocorrenciaCanditada = null;
            Periodo periodo = new Periodo(this.getCompetenciaInicial(), this.getCompetenciaFinal());
            OptimizerListSearch baseReferenciaOptimizerList = null;
            Competencia compentenciaChave = new Competencia();
            if (this.isTipoValorCalculado()) {
                baseReferenciaOptimizerList = this.getOcorrenciasOptimizerListDaBaseCadastradaNoPeriodo(periodo);
            }
            for (HelperDate competencia : HelperDate.getCompetenceListForPeriod(periodo.getInicial(), periodo.getFinal())) {
                BigDecimal valor = null;
                compentenciaChave.update(competencia.getDate());
                valor = this.isTipoValorCalculado() ? Utils.multiplicar((BigDecimal)baseReferenciaOptimizerList.valueOf(compentenciaChave), this.quantidade) : this.getValorParaBaseDeCalculo();
                ocorrenciaCanditada = new OcorrenciaDoHistoricoSalarial(this, competencia.getDate(), valor, this.getSinalizacaoFGTSRecolhido(), this.getSinalizacaoINSSRecolhido(), this.incidenciaFGTS, this.incidenciaINSS);
                if (!ocorrenciasAnteriores.isEmpty()) {
                    if (ocorrenciasAnteriores.contains(ocorrenciaCanditada)) {
                        OcorrenciaDoHistoricoSalarial ocorrenciaAntiga = (OcorrenciaDoHistoricoSalarial)ocorrenciasAnteriores.get(ocorrenciasAnteriores.indexOf(ocorrenciaCanditada));
                        ocorrenciaAntiga.setValor(valor);
                        ocorrenciaAntiga.setRecolhidoFGTS(this.getSinalizacaoFGTSRecolhido());
                        ocorrenciaAntiga.setRecolhidoINSS(this.getSinalizacaoINSSRecolhido());
                        ocorrenciaAntiga.setIncidenciaFGTS(this.getIncidenciaFGTS());
                        ocorrenciaAntiga.setIncidenciaINSS(this.getIncidenciaINSS());
                        this.getOcorrencias().add(ocorrenciaAntiga);
                        continue;
                    }
                    this.getOcorrencias().add(ocorrenciaCanditada);
                    continue;
                }
                this.getOcorrencias().add(ocorrenciaCanditada);
            }
        }
        if (!ocorrenciasAnteriores.isEmpty()) {
            for (OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial : ocorrenciasAnteriores) {
                if (this.getOcorrencias().contains(ocorrenciaDoHistoricoSalarial)) continue;
                this.getOcorrencias().add(ocorrenciaDoHistoricoSalarial);
            }
        }
        Collections.sort(this.getOcorrencias());
        this.sugerirDatasDasCompetenciasParaDemaisGeracoes();
    }

    private OptimizerListSearch getOcorrenciasOptimizerListDaBaseCadastradaNoPeriodo(Periodo periodo) {
        if (BaseDeCalculoDoPrincipalEnum.SALARIO_MINIMO == this.baseDeReferencia) {
            return SalarioMinimoNacional.obterListaOtimizadaDoPeriodo(periodo.getInicial(), periodo.getFinal());
        }
        if (Utils.naoNulo(this.categoria)) {
            return this.categoria.getListaDeOcorrenciasOtimizada(periodo.getInicial(), periodo.getFinal());
        }
        return new OcorrenciaDeSalarioCategoriaOptimizerListSearch();
    }

    public boolean isTipoValorCalculado() {
        return TipoValorEnum.CALCULADO == this.tipoValor;
    }

    @Override
    protected HistoricoSalarial validar() {
        GerenciadorDeValidadores.getInstance().validar(HistoricoSalarial.class, this);
        if (this.getOcorrencias().isEmpty()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0047, "Ocorr\u00eancias"));
        }
        return this;
    }

    public void sugerirDatasParaCompetencias() {
        if (Utils.naoNulo(this.getCalculo())) {
            Periodo periodo = this.getCalculo().obterPeriodoSugestivoDoCalculo();
            this.setCompetenciaInicial(periodo.getInicial());
            this.setCompetenciaFinal(periodo.getFinal());
        }
    }

    private HistoricoSalarial sugerirDatasDasCompetenciasParaDemaisGeracoes() {
        HelperDate novaData = HelperDate.getInstance(this.competenciaFinal);
        novaData.addMonth(1);
        this.setCompetenciaInicial(novaData.getDate());
        this.setCompetenciaFinal(novaData.getDate());
        return this;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    @Override
    public void salvar(boolean flush) {
        this.validar();
        super.salvar(flush);
    }

    public static void remover(HistoricoSalarial historicoSalarial) {
        HistoricoSalarial.remover(RepositorioDeHistoricoSalarial.class, historicoSalarial, Boolean.TRUE);
    }

    public static void remover(HistoricoSalarial historicoSalarial, boolean flush) {
        HistoricoSalarial.remover(RepositorioDeHistoricoSalarial.class, historicoSalarial, flush);
    }

    public HistoricoSalarial removerDeOcorrencias(OcorrenciaDoHistoricoSalarial ocorrencia) {
        return HistoricoSalarial.getRepositorio(RepositorioDeHistoricoSalarial.class).removerDeOcorrencias(this, ocorrencia);
    }

    public void removerDeOcorrencias(List<OcorrenciaDoHistoricoSalarial> filhos, boolean flush) {
        HistoricoSalarial.getRepositorio(RepositorioDeHistoricoSalarial.class).removerDeOcorrencias(this, filhos, flush);
    }

    public static HistoricoSalarial obter(Object id) {
        return (HistoricoSalarial)HistoricoSalarial.obter(RepositorioDeHistoricoSalarial.class, id);
    }

    public static Set<VerbaDeCalculo> obterVerbasVinculadasAoHistorico(HistoricoSalarial historicoSalarial) {
        HashSet<VerbaDeCalculo> verbasVinculadas = new HashSet<VerbaDeCalculo>();
        for (HistoricoSalarialDaVerba historicoSalarialDaVerba : HistoricoSalarial.getRepositorio(RepositorioDeHistoricoSalarial.class).obterHistoricosDaVerba(historicoSalarial)) {
            verbasVinculadas.add(historicoSalarialDaVerba.getVerbaDeCalculo());
        }
        return verbasVinculadas;
    }

    public static List<HistoricoSalarial> obterHistoricosDoCalculo(Calculo calculo) {
        return HistoricoSalarial.getRepositorio(RepositorioDeHistoricoSalarial.class).obterHistoricosDoCalculo(calculo);
    }

    public List<OcorrenciaDoHistoricoSalarial> obterOcorrenciasPorCompetencia(Date competencia) {
        return HistoricoSalarial.getRepositorio(RepositorioDeOcorrenciaDoHistoricoSalarial.class).obterOcorrenciasPorCompetencia(this, competencia);
    }
}

