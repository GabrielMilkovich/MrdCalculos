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
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.annotations.Where
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.log.Log
 *  org.jboss.seam.log.Logging
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.FormaDeApuracaoCartaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.HorarioNoturnoApuracaroCartaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.PreenchimentoJornadasCartaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoEscalaPreenchimentoJornadaCartaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPreenchimentoJornadaCartaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.Falta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.RepositorioDeFalta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.RepositorioDeFerias;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePontoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaJornadaApuracaoCartao;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.PreenchimentoJornadaApuracaoCartao;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioDeApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.Where;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.log.Log;
import org.jboss.seam.log.Logging;

@Entity
@Table(name="TBAPURACAOCARTAODEPONTO")
@SequenceGenerator(name="SQAPURACAOCARTAODEPONTO", sequenceName="SQAPURACAOCARTAODEPONTO", allocationSize=1)
@Name(value="apuracaoCartaoDePonto")
public class ApuracaoCartaoDePonto
extends EntidadeBase {
    private static final long serialVersionUID = -5400996525676095529L;
    private static final String FORMATO_DATA_PADRAO = "dd/MM/yyyy";
    private static final Log LOGGER = Logging.getLog(ApuracaoCartaoDePonto.class);
    private static final String DUAS_HORAS = "02:00";
    private static final String ZERO_HORA = "00:00";
    private static final String CINCO_MIN = "00:05";
    private static final String DEZ_MIN = "00:10";
    private static final String QUINZE_MIN = "00:15";
    private static final String UMA_HORA = "01:00";
    public static final String ONZE_HORAS = "11:00";
    public static final String TRINTA_CINCO_HORAS = "35:00";
    private static final String UMA_HORA_E_QUARENTA_MINUTOS_MILLIS = "01:40";
    private static final String VINTE_MINUTOS_MILLIS = "00:20";
    private static final Integer INDEX_ENTRADA1 = 1;
    private static final Integer INDEX_SAIDA1 = 2;
    private static final Integer INDEX_ENTRADA2 = 3;
    private static final Integer INDEX_SAIDA2 = 4;
    private static final Integer INDEX_ENTRADA3 = 5;
    private static final Integer INDEX_SAIDA3 = 6;
    private static final Integer INDEX_ENTRADA4 = 7;
    private static final Integer INDEX_SAIDA4 = 8;
    private static final Integer INDEX_ENTRADA5 = 9;
    private static final Integer INDEX_SAIDA5 = 10;
    private static final Integer INDEX_ENTRADA6 = 11;
    private static final Integer INDEX_SAIDA6 = 12;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQAPURACAOCARTAODEPONTO")
    @Column(name="IIDAPURACAOCARTAODEPONTO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="DDTINICIAL")
    @Temporal(value=TemporalType.DATE)
    private Date dataInicial;
    @Column(name="DDTFINAL")
    @Temporal(value=TemporalType.DATE)
    private Date dataFinal;
    @Column(name="IQTEXPEDIENTES", nullable=true)
    private Integer qtExpedientes;
    @Column(name="STPFORMAAPURACAO", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="FormaDeApuracaoCartaoEnum")})
    @Required
    private FormaDeApuracaoCartaoEnum formaDeApuracaoCartao = FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_PELO_CRITERIO_MAIS_FAVORAVEL;
    @Column(name="SQTHORASSUMULATST", columnDefinition="VARCHAR2(5)")
    private String qtHorasExtasSumulaTST = "02:00";
    @Column(name="SQTPRIMEIRASEXTRASSEPARADO", columnDefinition="VARCHAR2(5)")
    private String qtPrimeirasHorasExtrasSeparado = "02:00";
    @Column(name="SFLDESCANSOSEPARADO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean extraDescansoSeparado = Boolean.FALSE;
    @Column(name="SFLFERIADOSEPARADO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean extraFeriadoSeparado = Boolean.FALSE;
    @Column(name="SFLSABADODOMINGOSEPARADO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean extraSabadoDomingoSeparado = Boolean.FALSE;
    @Column(name="SFLCONSIDERARFERIADOS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean considerarFeriados = Boolean.TRUE;
    @Column(name="SFLTOLERANCIA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean tolerancia = Boolean.FALSE;
    @Column(name="MVLTOLERANCIAPORTURNO", columnDefinition="VARCHAR2(5)")
    private String toleranciaPorTurno = "00:05";
    @Column(name="MVLTOLERANCIAPORDIA", columnDefinition="VARCHAR2(5)")
    private String toleranciaPorDia = "00:10";
    @Column(name="MVLJORNADADIARIASEG", columnDefinition="VARCHAR2(5)")
    private String valorJornadaDiariaSegundaFeira;
    @Column(name="MVLJORNADADIARIATER", columnDefinition="VARCHAR2(5)")
    private String valorJornadaDiariaTercaFeira;
    @Column(name="MVLJORNADADIARIAQUA", columnDefinition="VARCHAR2(5)")
    private String valorJornadaDiariaQuartaFeira;
    @Column(name="MVLJORNADADIARIAQUI", columnDefinition="VARCHAR2(5)")
    private String valorJornadaDiariaQuintaFeira;
    @Column(name="MVLJORNADADIARIASEX", columnDefinition="VARCHAR2(5)")
    private String valorJornadaDiariaSextaFeira;
    @Column(name="MVLJORNADADIARIASAB", columnDefinition="VARCHAR2(5)")
    private String valorJornadaDiariaSab;
    @Column(name="MVLJORNADADIARIADOM", columnDefinition="VARCHAR2(5)")
    private String valorJornadaDiariaDom = "00:00";
    @Column(name="IQTJORNADASEMANAL", precision=12, scale=4)
    private BigDecimal qtJornadaSemanal;
    @Column(name="IQTJORNADAMENSAL", precision=12, scale=4)
    private BigDecimal qtJornadaMensal;
    @Column(name="SFLJORNDIARFERIADOTRAB", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean considerarJornadaDiariaFeriadoTrabalhado = Boolean.FALSE;
    @Column(name="SFLJORNDIARFERIADONAOTRAB", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean considerarJornadaDiariaFeriadoNaoTrabalhado = Boolean.FALSE;
    @Column(name="SFLINTERQUATROASEIS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean intervaloIntraJornadaSupQuatroSeis = Boolean.FALSE;
    @Column(name="MVLINTERQUATROASEIS", columnDefinition="VARCHAR2(5)")
    private String valorIntervaloIntraJornadaSupQuatroSeis = "00:15";
    @Column(name="SFLINTERSUPSEIS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean intervalorIntraJornadaSupSeis = Boolean.FALSE;
    @Column(name="MVLINTERSUPSEIS", columnDefinition="VARCHAR2(5)")
    private String valorIntervalorIntraJornadaSupSeis = "01:00";
    @Column(name="MVLTOLERANCIAINTERSUPSEIS", columnDefinition="VARCHAR2(5)")
    private String toleranciaIntervaloIntraJornadaSupSeis = "00:05";
    @Column(name="SFLSUPRESSAOINTRAINT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarSupressaoIntervaloIntraIntegral = Boolean.FALSE;
    @Column(name="SFLSUPRESSAOINTRAREFORMA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarSupressaoIntervaloIntraReforma = Boolean.FALSE;
    @Column(name="SFLFRACIONAMENTOINTRA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean considerarFracionamentoIntervaloIntra = Boolean.FALSE;
    @Column(name="SFLEXCESSOINTERVALOINTRA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarExcessoIntervaloIntra = Boolean.FALSE;
    @Column(name="MVLINTERVALOINTRAMAXIMO", columnDefinition="VARCHAR2(5)")
    private String intervaloIntrajornadaMaximo = "02:00";
    @Column(name="SFLAPENASEXCESSOACIMAJORNADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarApenasExcessoAcimaJornada = Boolean.FALSE;
    @Column(name="SFLSUPRESSAOART253", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarSupressaoIntervaloArt253 = Boolean.FALSE;
    @Column(name="MVLTEMPOTRABALHOART253", columnDefinition="VARCHAR2(5)")
    private String valorTrabalhoArt253 = "01:40";
    @Column(name="MVLTEMPODESCANSOART253", columnDefinition="VARCHAR2(5)")
    private String valorDescansoArt253 = "00:20";
    @Column(name="SFLSUPRESSAOART384", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarSupressaoIntervalo384 = Boolean.FALSE;
    @Column(name="SFLSUPRESSAOART72", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarSupressaoIntervalo72 = Boolean.FALSE;
    @Column(name="SFLDESCANSOENTREJORNADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean descansoEntreJornadas = Boolean.FALSE;
    @Column(name="MVLDESCANSOENTREJORNADA", columnDefinition="VARCHAR2(5)")
    private String valorDescansoEntreJornadas = "11:00";
    @Column(name="MVLDESCANSOENTRESEMANAS", columnDefinition="VARCHAR2(5)")
    private String valorDescansoEntreSemanas = "35:00";
    @Column(name="SFLAPURARFERIADOSTRAB", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarFeriadosTrabalhados = Boolean.FALSE;
    @Column(name="SFLAPURARSABADODOMINGOTRAB", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarSabadosDomingosTrabalhados = Boolean.FALSE;
    @Column(name="SFLAPURARDOMINGOSTRAB", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarDomingosTrabalhados = Boolean.FALSE;
    @Column(name="STPHORARIONOTURNOATIVIDADE", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="HorarioNoturnoApuracaroCartaoEnum")})
    @Required
    private HorarioNoturnoApuracaroCartaoEnum horarioNoturnoApuracaroCartao = HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA;
    @Column(name="SFLPRORROGADOSUMULA60", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean horarioProrrogadoSumula60 = Boolean.FALSE;
    @Column(name="SFLFORCARPRORROGACAO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean forcarProrrogacao = Boolean.FALSE;
    @Column(name="SFLCONSIDERARREDUCAO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean considerarReducaoFictaDaHoraNoturna = Boolean.TRUE;
    @Column(name="SFLAPURAREXTRANOTURNA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarHorasExtrasNoturnas = Boolean.FALSE;
    @Column(name="SFLAPURARHORASNOTURNAS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarHorasNoturnas = Boolean.FALSE;
    @Column(name="STPPREENCHIMENTOJORNADA", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="PreenchimentoJornadasCartaoEnum")})
    @Required
    private PreenchimentoJornadasCartaoEnum preenchimentoJornadasCartao = PreenchimentoJornadasCartaoEnum.LIVRE;
    @Where(clause="STPPREENCHIMENTO = 'S' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="apuracaoCartaoDePonto")
    @OrderBy(value="id")
    private List<PreenchimentoJornadaApuracaoCartao> preenchimentoJornadaSemanalApuracaoCartao;
    @Where(clause="STPPREENCHIMENTO = 'E' ")
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="apuracaoCartaoDePonto")
    @OrderBy(value="id")
    private List<PreenchimentoJornadaApuracaoCartao> preenchimentoJornadaEscalaApuracaoCartao;
    @Column(name="IQTEXPEDIENTESESCALA", nullable=true)
    private Integer qtdExpedientesEscala;
    @Column(name="IQTEXPEDIENTESSEMANAL", nullable=true)
    private Integer qtdExpedientesSemanal;
    @Column(name="IQTDIATRABALHADOS", nullable=true)
    private Integer qtdDiasTrabalhados;
    @Column(name="STPESCALA", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoEscalaPreenchimentoJornadaCartaoEnum")})
    private TipoEscalaPreenchimentoJornadaCartaoEnum tipoEscalaPreenchimentoJornadaCartaoEnum = TipoEscalaPreenchimentoJornadaCartaoEnum.OUTRA;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="apuracaoCartaoDePonto")
    @OrderBy(value="dataOcorrencia")
    private List<OcorrenciaJornadaApuracaoCartao> ocorrenciasJornadaApuracaoCartao = new ArrayList<OcorrenciaJornadaApuracaoCartao>();
    @Column(name="MVLHORAINICIOESCALA", columnDefinition="VARCHAR2(5)")
    private String valorHoraInicioEscala;

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public ApuracaoCartaoDePonto() {
        super(RepositorioDeApuracaoCartaoDePonto.class);
    }

    public void removerOcorrenciasDePreenchimentoPreExistentes() {
        List<PreenchimentoJornadaApuracaoCartao> pSemanais = this.obterOcorrenciasPreenchimentos(TipoPreenchimentoJornadaCartaoEnum.SEMANAL);
        List<PreenchimentoJornadaApuracaoCartao> pEscala = this.obterOcorrenciasPreenchimentos(TipoPreenchimentoJornadaCartaoEnum.ESCALA);
        if (Utils.naoNulo(pSemanais) && !pSemanais.isEmpty()) {
            this.removerDeOcorrenciasSemanal(pSemanais, false);
        }
        if (Utils.naoNulo(pEscala) && !pEscala.isEmpty()) {
            this.removerDeOcorrenciasEscala(pEscala, false);
        }
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    @Override
    public ApuracaoCartaoDePonto validar() {
        NegocioException excecao = new NegocioException();
        Calculo calculo = ServicoDeCalculo.getInstancia().obterCalculoAberto();
        for (ApuracaoCartaoDePonto acp : calculo.getApuracoesCartaoDePonto()) {
            if (Utils.naoNulo(this.getId()) && acp.getId().equals(this.getId()) || !this.getPeriodo().isDatasCoincidentesCom(acp.getPeriodo())) continue;
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("competenciaFinal", Mensagens.MSG0024, new Object[0]));
        }
        excecao = this.validarHoras(excecao);
        if (Utils.naoNulo(this.getPreenchimentoJornadaSemanalApuracaoCartao()) && !this.getPreenchimentoJornadaSemanalApuracaoCartao().isEmpty()) {
            excecao = CartaoDePontoUtils.validarListaDeJornadas(excecao, this.getPreenchimentoJornadaSemanalApuracaoCartao(), Boolean.TRUE, Boolean.TRUE);
        }
        if (Utils.naoNulo(this.getPreenchimentoJornadaEscalaApuracaoCartao()) && !this.getPreenchimentoJornadaEscalaApuracaoCartao().isEmpty()) {
            excecao = CartaoDePontoUtils.validarListaDeJornadas(excecao, this.getPreenchimentoJornadaEscalaApuracaoCartao(), Boolean.TRUE, Boolean.FALSE);
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    private NegocioException validarHoras(NegocioException excecao) {
        if (Utils.naoVazio(this.getQtHorasExtasSumulaTST()) && !Utils.isHoraValida(this.getQtHorasExtasSumulaTST())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("qtsumulatst", Mensagens.MSG0004, "Quantidade de Horas Extras"));
        }
        if (Utils.naoVazio(this.getQtPrimeirasHorasExtrasSeparado()) && !Utils.isHoraValida(this.getQtPrimeirasHorasExtrasSeparado())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("qthoraseparado", Mensagens.MSG0004, "Quantidade de Horas Extras"));
        }
        if (Utils.naoVazio(this.getToleranciaPorTurno()) && !Utils.isHoraValida(this.getToleranciaPorTurno())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("toleranciaPorTurno", Mensagens.MSG0004, "Toler\u00e2ncia Por Turno"));
        }
        if (Utils.naoVazio(this.getToleranciaPorDia()) && !Utils.isHoraValida(this.getToleranciaPorDia())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("toleranciaPorDia", Mensagens.MSG0004, "Toler\u00e2ncia Por Dia"));
        }
        if (Utils.naoVazio(this.getValorJornadaDiariaSegundaFeira()) && !Utils.isHoraValida(this.getValorJornadaDiariaSegundaFeira())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorJornadaSegunda", Mensagens.MSG0004, "Jornada di\u00e1ria (segunda-feira)"));
        }
        if (Utils.naoVazio(this.getValorJornadaDiariaTercaFeira()) && !Utils.isHoraValida(this.getValorJornadaDiariaTercaFeira())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorJornadaTerca", Mensagens.MSG0004, "Jornada di\u00e1ria (ter\u00e7a-feira)"));
        }
        if (Utils.naoVazio(this.getValorJornadaDiariaQuartaFeira()) && !Utils.isHoraValida(this.getValorJornadaDiariaQuartaFeira())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorJornadaQuarta", Mensagens.MSG0004, "Jornada di\u00e1ria (quarta-feira)"));
        }
        if (Utils.naoVazio(this.getValorJornadaDiariaQuintaFeira()) && !Utils.isHoraValida(this.getValorJornadaDiariaQuintaFeira())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorJornadaQuinta", Mensagens.MSG0004, "Jornada di\u00e1ria (quinta-feira)"));
        }
        if (Utils.naoVazio(this.getValorJornadaDiariaSextaFeira()) && !Utils.isHoraValida(this.getValorJornadaDiariaSextaFeira())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorJornadaSexta", Mensagens.MSG0004, "Jornada di\u00e1ria (sexta-feira)"));
        }
        if (Utils.naoVazio(this.getValorJornadaDiariaSab()) && !Utils.isHoraValida(this.getValorJornadaDiariaSab())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorJornadaDiariaSabado", Mensagens.MSG0004, "Jornada di\u00e1ria (s\u00e1bado)"));
        }
        if (Utils.naoVazio(this.getValorJornadaDiariaDom()) && !Utils.isHoraValida(this.getValorJornadaDiariaDom())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorJornadaDiariaDom", Mensagens.MSG0004, "Jornada di\u00e1ria (domingo)"));
        }
        if (Utils.naoVazio(this.getValorDescansoEntreJornadas()) && !Utils.isHoraValida(this.getValorDescansoEntreJornadas())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorDescansoEntreJornadas", Mensagens.MSG0004, "Descanso Entre Jornadas"));
        }
        if (Utils.naoVazio(this.getValorDescansoEntreSemanas()) && !Utils.isHoraValida(this.getValorDescansoEntreSemanas(), false)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorDescansoEntreSemanas", Mensagens.MSG0004, "Descanso Entre Semanas"));
        }
        if (Utils.naoVazio(this.getValorIntervaloIntraJornadaSupQuatroSeis()) && !Utils.isHoraValida(this.getValorIntervaloIntraJornadaSupQuatroSeis())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorIntervaloIntraJornadaSupQuatroSeis", Mensagens.MSG0004, "Intervalo Intrajornada em Jornada de Quatro a Seis Horas"));
        }
        if (Utils.naoVazio(this.getValorIntervalorIntraJornadaSupSeis()) && !Utils.isHoraValida(this.getValorIntervalorIntraJornadaSupSeis())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorIntervalorIntraJornadaSupSeis", Mensagens.MSG0004, "Intervalo Intrajornada em Jornada Superior a Seis Horas"));
        }
        if (Utils.naoVazio(this.getValorTrabalhoArt253()) && !Utils.isHoraValida(this.getValorTrabalhoArt253())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorTrabalhoArt253", Mensagens.MSG0004, "Tempo Trabalho"));
        }
        if (Utils.naoVazio(this.getValorDescansoArt253()) && !Utils.isHoraValida(this.getValorDescansoArt253())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("valorDescansoArt253", Mensagens.MSG0004, "Tempo Descanso"));
        }
        if (Utils.naoVazio(this.getToleranciaIntervaloIntraJornadaSupSeis()) && !Utils.isHoraValida(this.getToleranciaIntervaloIntraJornadaSupSeis())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("toleranciaIntervaloIntraJornadaSupSeis", Mensagens.MSG0004, "Toler\u00e2ncia"));
        }
        return excecao;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    public String getValorDescansoEntreSemanas() {
        return this.valorDescansoEntreSemanas;
    }

    public void setValorDescansoEntreSemanas(String valorDescansoEntreSemanas) {
        this.valorDescansoEntreSemanas = valorDescansoEntreSemanas;
    }

    public String getValorHoraInicioEscala() {
        return this.valorHoraInicioEscala;
    }

    public void setValorHoraInicioEscala(String valorHoraInicioEscala) {
        this.valorHoraInicioEscala = valorHoraInicioEscala;
    }

    public Boolean getTolerancia() {
        return this.tolerancia;
    }

    public void setTolerancia(Boolean tolerancia) {
        this.tolerancia = tolerancia;
    }

    public String getToleranciaPorTurno() {
        return this.toleranciaPorTurno;
    }

    public void setToleranciaPorTurno(String toleranciaPorTurno) {
        this.toleranciaPorTurno = toleranciaPorTurno;
    }

    public String getToleranciaPorDia() {
        return this.toleranciaPorDia;
    }

    public void setToleranciaPorDia(String toleranciaPorDia) {
        this.toleranciaPorDia = toleranciaPorDia;
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

    public Periodo getPeriodo() {
        return new Periodo(this.dataInicial, this.dataFinal);
    }

    public Date getDataInicial() {
        return this.dataInicial;
    }

    public void setDataInicial(Date dataInicial) {
        this.dataInicial = dataInicial;
    }

    public Date getDataFinal() {
        return this.dataFinal;
    }

    public void setDataFinal(Date dataFinal) {
        this.dataFinal = dataFinal;
    }

    public Integer getQtExpedientes() {
        return this.qtExpedientes;
    }

    public void setQtExpedientes(Integer qtExpedientes) {
        this.qtExpedientes = qtExpedientes;
    }

    public FormaDeApuracaoCartaoEnum getFormaDeApuracaoCartao() {
        return this.formaDeApuracaoCartao;
    }

    public void setFormaDeApuracaoCartao(FormaDeApuracaoCartaoEnum formaDeApuracaoCartao) {
        this.formaDeApuracaoCartao = formaDeApuracaoCartao;
    }

    public String getQtHorasExtasSumulaTST() {
        return this.qtHorasExtasSumulaTST;
    }

    public void setQtHorasExtasSumulaTST(String qtHorasExtasSumulaTST) {
        this.qtHorasExtasSumulaTST = qtHorasExtasSumulaTST;
    }

    public String getQtPrimeirasHorasExtrasSeparado() {
        return this.qtPrimeirasHorasExtrasSeparado;
    }

    public void setQtPrimeirasHorasExtrasSeparado(String qtPrimeirasHorasExtrasSeparado) {
        this.qtPrimeirasHorasExtrasSeparado = qtPrimeirasHorasExtrasSeparado;
    }

    public Boolean getExtraDescansoSeparado() {
        return this.extraDescansoSeparado;
    }

    public void setExtraDescansoSeparado(Boolean extraDescansoSeparado) {
        this.extraDescansoSeparado = extraDescansoSeparado;
    }

    public Boolean getExtraFeriadoSeparado() {
        return this.extraFeriadoSeparado;
    }

    public void setExtraFeriadoSeparado(Boolean extraFeriadoSeparado) {
        this.extraFeriadoSeparado = extraFeriadoSeparado;
    }

    public Boolean getExtraSabadoDomingoSeparado() {
        return this.extraSabadoDomingoSeparado;
    }

    public void setExtraSabadoDomingoSeparado(Boolean extraSabadoDomingoSeparado) {
        this.extraSabadoDomingoSeparado = extraSabadoDomingoSeparado;
    }

    public Boolean getConsiderarFeriados() {
        return this.considerarFeriados;
    }

    public void setConsiderarFeriados(Boolean considerarFeriados) {
        this.considerarFeriados = considerarFeriados;
    }

    public BigDecimal getQtJornadaSemanal() {
        return this.qtJornadaSemanal;
    }

    public void setQtJornadaSemanal(BigDecimal qtJornadaSemanal) {
        this.qtJornadaSemanal = qtJornadaSemanal;
    }

    public BigDecimal getQtJornadaMensal() {
        return this.qtJornadaMensal;
    }

    public void setQtJornadaMensal(BigDecimal qtJornadaMensal) {
        this.qtJornadaMensal = qtJornadaMensal;
    }

    public Boolean getIntervaloIntraJornadaSupQuatroSeis() {
        return this.intervaloIntraJornadaSupQuatroSeis;
    }

    public void setIntervaloIntraJornadaSupQuatroSeis(Boolean intervaloIntraJornadaSupQuatroSeis) {
        this.intervaloIntraJornadaSupQuatroSeis = intervaloIntraJornadaSupQuatroSeis;
    }

    public Boolean getIntervalorIntraJornadaSupSeis() {
        return this.intervalorIntraJornadaSupSeis;
    }

    public void setIntervalorIntraJornadaSupSeis(Boolean intervalorIntraJornadaSupSeis) {
        this.intervalorIntraJornadaSupSeis = intervalorIntraJornadaSupSeis;
    }

    public Boolean getApurarSupressaoIntervaloIntraIntegral() {
        return this.apurarSupressaoIntervaloIntraIntegral;
    }

    public void setApurarSupressaoIntervaloIntraIntegral(Boolean apurarSupressaoIntervaloIntraIntegral) {
        this.apurarSupressaoIntervaloIntraIntegral = apurarSupressaoIntervaloIntraIntegral;
    }

    public Boolean getApurarSupressaoIntervaloIntraReforma() {
        return this.apurarSupressaoIntervaloIntraReforma;
    }

    public void setApurarSupressaoIntervaloIntraReforma(Boolean apurarSupressaoIntervaloIntraReforma) {
        this.apurarSupressaoIntervaloIntraReforma = apurarSupressaoIntervaloIntraReforma;
    }

    public Boolean getConsiderarFracionamentoIntervaloIntra() {
        return this.considerarFracionamentoIntervaloIntra;
    }

    public void setConsiderarFracionamentoIntervaloIntra(Boolean considerarFracionamentoIntervaloIntra) {
        this.considerarFracionamentoIntervaloIntra = considerarFracionamentoIntervaloIntra;
    }

    public Boolean getApurarExcessoIntervaloIntra() {
        return this.apurarExcessoIntervaloIntra;
    }

    public void setApurarExcessoIntervaloIntra(Boolean apurarExcessoIntervaloIntra) {
        this.apurarExcessoIntervaloIntra = apurarExcessoIntervaloIntra;
    }

    public String getIntervaloIntrajornadaMaximo() {
        return this.intervaloIntrajornadaMaximo;
    }

    public void setIntervaloIntrajornadaMaximo(String intervaloIntrajornadaMaximo) {
        this.intervaloIntrajornadaMaximo = intervaloIntrajornadaMaximo;
    }

    public Boolean getApurarApenasExcessoAcimaJornada() {
        return this.apurarApenasExcessoAcimaJornada;
    }

    public void setApurarApenasExcessoAcimaJornada(Boolean apurarApenasExcessoAcimaJornada) {
        this.apurarApenasExcessoAcimaJornada = apurarApenasExcessoAcimaJornada;
    }

    public Boolean getApurarSupressaoIntervaloArt253() {
        return this.apurarSupressaoIntervaloArt253;
    }

    public void setApurarSupressaoIntervaloArt253(Boolean apurarSupressaoIntervaloArt253) {
        this.apurarSupressaoIntervaloArt253 = apurarSupressaoIntervaloArt253;
    }

    public String getValorTrabalhoArt253() {
        return this.valorTrabalhoArt253;
    }

    public void setValorTrabalhoArt253(String valorTrabalhoArt253) {
        this.valorTrabalhoArt253 = valorTrabalhoArt253;
    }

    public String getValorDescansoArt253() {
        return this.valorDescansoArt253;
    }

    public void setValorDescansoArt253(String valorDescansoArt253) {
        this.valorDescansoArt253 = valorDescansoArt253;
    }

    public Boolean getApurarSupressaoIntervalo384() {
        return this.apurarSupressaoIntervalo384;
    }

    public void setApurarSupressaoIntervalo384(Boolean apurarSupressaoIntervalo384) {
        this.apurarSupressaoIntervalo384 = apurarSupressaoIntervalo384;
    }

    public Boolean getApurarSupressaoIntervalo72() {
        return this.apurarSupressaoIntervalo72;
    }

    public void setApurarSupressaoIntervalo72(Boolean apurarSupressaoIntervalo72) {
        this.apurarSupressaoIntervalo72 = apurarSupressaoIntervalo72;
    }

    public Boolean getDescansoEntreJornadas() {
        return this.descansoEntreJornadas;
    }

    public void setDescansoEntreJornadas(Boolean descansoEntreJornadas) {
        this.descansoEntreJornadas = descansoEntreJornadas;
    }

    public String getValorJornadaDiariaSegundaFeira() {
        return this.valorJornadaDiariaSegundaFeira;
    }

    public void setValorJornadaDiariaSegundaFeira(String valorJornadaDiariaSegundaFeira) {
        this.valorJornadaDiariaSegundaFeira = valorJornadaDiariaSegundaFeira;
    }

    public String getValorJornadaDiariaTercaFeira() {
        return this.valorJornadaDiariaTercaFeira;
    }

    public void setValorJornadaDiariaTercaFeira(String valorJornadaDiariaTercaFeira) {
        this.valorJornadaDiariaTercaFeira = valorJornadaDiariaTercaFeira;
    }

    public String getValorJornadaDiariaQuartaFeira() {
        return this.valorJornadaDiariaQuartaFeira;
    }

    public void setValorJornadaDiariaQuartaFeira(String valorJornadaDiariaQuartaFeira) {
        this.valorJornadaDiariaQuartaFeira = valorJornadaDiariaQuartaFeira;
    }

    public String getValorJornadaDiariaQuintaFeira() {
        return this.valorJornadaDiariaQuintaFeira;
    }

    public void setValorJornadaDiariaQuintaFeira(String valorJornadaDiariaQuintaFeira) {
        this.valorJornadaDiariaQuintaFeira = valorJornadaDiariaQuintaFeira;
    }

    public String getValorJornadaDiariaSextaFeira() {
        return this.valorJornadaDiariaSextaFeira;
    }

    public void setValorJornadaDiariaSextaFeira(String valorJornadaDiariaSextaFeira) {
        this.valorJornadaDiariaSextaFeira = valorJornadaDiariaSextaFeira;
    }

    public Boolean getConsiderarJornadaDiariaFeriadoTrabalhado() {
        return this.considerarJornadaDiariaFeriadoTrabalhado;
    }

    public void setConsiderarJornadaDiariaFeriadoTrabalhado(Boolean considerarJornadaDiariaFeriadoTrabalhado) {
        this.considerarJornadaDiariaFeriadoTrabalhado = considerarJornadaDiariaFeriadoTrabalhado;
    }

    public Boolean getConsiderarJornadaDiariaFeriadoNaoTrabalhado() {
        return this.considerarJornadaDiariaFeriadoNaoTrabalhado;
    }

    public void setConsiderarJornadaDiariaFeriadoNaoTrabalhado(Boolean considerarJornadaDiariaFeriadoNaoTrabalhado) {
        this.considerarJornadaDiariaFeriadoNaoTrabalhado = considerarJornadaDiariaFeriadoNaoTrabalhado;
    }

    public Boolean getApurarFeriadosTrabalhados() {
        return this.apurarFeriadosTrabalhados;
    }

    public void setApurarFeriadosTrabalhados(Boolean apurarFeriadosTrabalhados) {
        this.apurarFeriadosTrabalhados = apurarFeriadosTrabalhados;
    }

    public Boolean getApurarSabadosDomingosTrabalhados() {
        return this.apurarSabadosDomingosTrabalhados;
    }

    public void setApurarSabadosDomingosTrabalhados(Boolean apurarSabadosDomingosTrabalhados) {
        this.apurarSabadosDomingosTrabalhados = apurarSabadosDomingosTrabalhados;
    }

    public Boolean getApurarDomingosTrabalhados() {
        return this.apurarDomingosTrabalhados;
    }

    public void setApurarDomingosTrabalhados(Boolean apurarDomingosTrabalhados) {
        this.apurarDomingosTrabalhados = apurarDomingosTrabalhados;
    }

    public String getValorJornadaDiariaSab() {
        return this.valorJornadaDiariaSab;
    }

    public void setValorJornadaDiariaSab(String valorJornadaDiariaSab) {
        this.valorJornadaDiariaSab = valorJornadaDiariaSab;
    }

    public String getValorJornadaDiariaDom() {
        return this.valorJornadaDiariaDom;
    }

    public void setValorJornadaDiariaDom(String valorJornadaDiariaDom) {
        this.valorJornadaDiariaDom = valorJornadaDiariaDom;
    }

    public String getValorIntervaloIntraJornadaSupQuatroSeis() {
        return this.valorIntervaloIntraJornadaSupQuatroSeis;
    }

    public void setValorIntervaloIntraJornadaSupQuatroSeis(String valorIntervaloIntraJornadaSupQuatroSeis) {
        this.valorIntervaloIntraJornadaSupQuatroSeis = valorIntervaloIntraJornadaSupQuatroSeis;
    }

    public String getValorIntervalorIntraJornadaSupSeis() {
        return this.valorIntervalorIntraJornadaSupSeis;
    }

    public void setValorIntervalorIntraJornadaSupSeis(String valorIntervalorIntraJornadaSupSeis) {
        this.valorIntervalorIntraJornadaSupSeis = valorIntervalorIntraJornadaSupSeis;
    }

    public String getToleranciaIntervaloIntraJornadaSupSeis() {
        return this.toleranciaIntervaloIntraJornadaSupSeis;
    }

    public void setToleranciaIntervaloIntraJornadaSupSeis(String toleranciaIntervaloIntraJornadaSupSeis) {
        this.toleranciaIntervaloIntraJornadaSupSeis = toleranciaIntervaloIntraJornadaSupSeis;
    }

    public String getValorDescansoEntreJornadas() {
        return this.valorDescansoEntreJornadas;
    }

    public void setValorDescansoEntreJornadas(String valorDescansoEntreJornadas) {
        this.valorDescansoEntreJornadas = valorDescansoEntreJornadas;
    }

    public HorarioNoturnoApuracaroCartaoEnum getHorarioNoturnoApuracaroCartao() {
        return this.horarioNoturnoApuracaroCartao;
    }

    public void setHorarioNoturnoApuracaroCartao(HorarioNoturnoApuracaroCartaoEnum horarioNoturnoApuracaroCartaoEnum) {
        this.horarioNoturnoApuracaroCartao = horarioNoturnoApuracaroCartaoEnum;
    }

    public String obterInicioAtividadeHorarioNoturno() {
        if (HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_AGRICOLA.equals((Object)this.getHorarioNoturnoApuracaroCartao())) {
            return "21:00";
        }
        if (HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_PECUARIA.equals((Object)this.getHorarioNoturnoApuracaroCartao())) {
            return "20:00";
        }
        return "22:00";
    }

    public String obterFimAtividadeHorarioNoturno() {
        if (HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_AGRICOLA.equals((Object)this.getHorarioNoturnoApuracaroCartao())) {
            return "05:00";
        }
        if (HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_PECUARIA.equals((Object)this.getHorarioNoturnoApuracaroCartao())) {
            return "04:00";
        }
        return "05:00";
    }

    public Boolean getHorarioProrrogadoSumula60() {
        return this.horarioProrrogadoSumula60;
    }

    public void setHorarioProrrogadoSumula60(Boolean horarioProrrogadoSumula60) {
        this.horarioProrrogadoSumula60 = horarioProrrogadoSumula60;
    }

    public Boolean getForcarProrrogacao() {
        return this.forcarProrrogacao;
    }

    public void setForcarProrrogacao(Boolean forcarProrrogacao) {
        this.forcarProrrogacao = forcarProrrogacao;
    }

    public Boolean getConsiderarReducaoFictaDaHoraNoturna() {
        return this.considerarReducaoFictaDaHoraNoturna;
    }

    public void setConsiderarReducaoFictaDaHoraNoturna(Boolean considerarReducaoFictaDaHoraNoturna) {
        this.considerarReducaoFictaDaHoraNoturna = considerarReducaoFictaDaHoraNoturna;
    }

    public Boolean getApurarHorasExtrasNoturnas() {
        return this.apurarHorasExtrasNoturnas;
    }

    public void setApurarHorasExtrasNoturnas(Boolean apurarHorasExtrasNoturnas) {
        this.apurarHorasExtrasNoturnas = apurarHorasExtrasNoturnas;
    }

    public Boolean getApurarHorasNoturnas() {
        return this.apurarHorasNoturnas;
    }

    public void setApurarHorasNoturnas(Boolean apurarHorasNoturnas) {
        this.apurarHorasNoturnas = apurarHorasNoturnas;
    }

    public PreenchimentoJornadasCartaoEnum getPreenchimentoJornadasCartao() {
        return this.preenchimentoJornadasCartao;
    }

    public void setPreenchimentoJornadasCartao(PreenchimentoJornadasCartaoEnum preenchimentoJornadasCartaoEnum) {
        this.preenchimentoJornadasCartao = preenchimentoJornadasCartaoEnum;
    }

    public Integer getQtdExpedientesEscala() {
        return this.qtdExpedientesEscala;
    }

    public void setQtdExpedientesEscala(Integer qtdExpedientesEscala) {
        this.qtdExpedientesEscala = qtdExpedientesEscala;
    }

    public Integer getQtdExpedientesSemanal() {
        return this.qtdExpedientesSemanal;
    }

    public void setQtdExpedientesSemanal(Integer qtdExpedientesSemanal) {
        this.qtdExpedientesSemanal = qtdExpedientesSemanal;
    }

    public Integer getQtdDiasTrabalhados() {
        return this.qtdDiasTrabalhados;
    }

    public void setQtdDiasTrabalhados(Integer qtdDiasTrabalhados) {
        this.qtdDiasTrabalhados = qtdDiasTrabalhados;
    }

    public static long getSerialversionuid() {
        return -5400996525676095529L;
    }

    public TipoEscalaPreenchimentoJornadaCartaoEnum getTipoEscalaPreenchimentoJornadaCartaoEnum() {
        return this.tipoEscalaPreenchimentoJornadaCartaoEnum;
    }

    public void setTipoEscalaPreenchimentoJornadaCartaoEnum(TipoEscalaPreenchimentoJornadaCartaoEnum tipoEscalaPreenchimentoJornadaCartaoEnum) {
        this.tipoEscalaPreenchimentoJornadaCartaoEnum = tipoEscalaPreenchimentoJornadaCartaoEnum;
    }

    public void removerDeOcorrencias(List<OcorrenciaJornadaApuracaoCartao> filhos, boolean flush) {
        ApuracaoCartaoDePonto.getRepositorio(RepositorioDeApuracaoCartaoDePonto.class).removerDeOcorrencias(this, filhos, flush);
    }

    public void removerDeOcorrenciasEscala(List<PreenchimentoJornadaApuracaoCartao> filhos, boolean flush) {
        ApuracaoCartaoDePonto.getRepositorio(RepositorioDeApuracaoCartaoDePonto.class).removerDeOcorrenciasEscala(this, filhos, flush);
    }

    public void removerDeOcorrenciasSemanal(List<PreenchimentoJornadaApuracaoCartao> filhos, boolean flush) {
        ApuracaoCartaoDePonto.getRepositorio(RepositorioDeApuracaoCartaoDePonto.class).removerDeOcorrenciasSemanal(this, filhos, flush);
    }

    public List<PreenchimentoJornadaApuracaoCartao> obterOcorrenciasPreenchimentos(TipoPreenchimentoJornadaCartaoEnum tipoPreencimento) {
        return ApuracaoCartaoDePonto.getRepositorio(RepositorioDeApuracaoCartaoDePonto.class).obterOcorrenciasPreenchimentoPorTipo(this, tipoPreencimento);
    }

    public static void remover(ApuracaoCartaoDePonto apuracaoCartaoDePonto) {
        ApuracaoCartaoDePonto acp = ApuracaoCartaoDePonto.obter(apuracaoCartaoDePonto.getId());
        acp.getCalculo().getApuracoesCartaoDePonto().remove(acp);
        ApuracaoCartaoDePonto.remover(RepositorioDeApuracaoCartaoDePonto.class, acp, Boolean.TRUE);
    }

    public static ApuracaoCartaoDePonto obter(Object id) {
        return (ApuracaoCartaoDePonto)ApuracaoCartaoDePonto.obter(RepositorioDeApuracaoCartaoDePonto.class, id);
    }

    public static List<ApuracaoCartaoDePonto> obterApuracoesCartaoDePontoDoCalculo(Calculo calculo) {
        return ApuracaoCartaoDePonto.getRepositorio(RepositorioDeApuracaoCartaoDePonto.class).obterApuracoesDeCartaoDoCalculo(calculo);
    }

    public List<PreenchimentoJornadaApuracaoCartao> getPreenchimentoJornadaSemanalApuracaoCartao() {
        return this.preenchimentoJornadaSemanalApuracaoCartao;
    }

    public void setPreenchimentoJornadaSemanalApuracaoCartao(List<PreenchimentoJornadaApuracaoCartao> preenchimentoJornadaSemanalApuracaoCartao) {
        this.preenchimentoJornadaSemanalApuracaoCartao = preenchimentoJornadaSemanalApuracaoCartao;
    }

    public List<PreenchimentoJornadaApuracaoCartao> getPreenchimentoJornadaEscalaApuracaoCartao() {
        return this.preenchimentoJornadaEscalaApuracaoCartao;
    }

    public void setPreenchimentoJornadaEscalaApuracaoCartao(List<PreenchimentoJornadaApuracaoCartao> preenchimentoJornadaEscalaApuracaoCartao) {
        this.preenchimentoJornadaEscalaApuracaoCartao = preenchimentoJornadaEscalaApuracaoCartao;
    }

    public List<OcorrenciaJornadaApuracaoCartao> getOcorrenciasJornadaApuracaoCartao() {
        return this.ocorrenciasJornadaApuracaoCartao;
    }

    public void setOcorrenciasJornadaApuracaoCartao(List<OcorrenciaJornadaApuracaoCartao> ocorrenciasJornadaApuracaoCartao) {
        this.ocorrenciasJornadaApuracaoCartao = ocorrenciasJornadaApuracaoCartao;
    }

    public List<String> getListMesesAno() {
        LinkedHashSet<Date> mesesAno = new LinkedHashSet<Date>();
        ArrayList<String> mesAno = new ArrayList<String>();
        for (OcorrenciaJornadaApuracaoCartao o : this.getOcorrenciasJornadaApuracaoCartao()) {
            mesesAno.add(HelperDate.getCurrentCompetence(o.getDataOcorrencia()).getDate());
        }
        for (Date d : mesesAno) {
            mesAno.add(HelperDate.getInstance(d).getMonth() + 1 + "/" + HelperDate.getInstance(d).getYear());
        }
        return mesAno;
    }

    public void gerarOcorrenciasDeJornada() {
        ArrayList<OcorrenciaJornadaApuracaoCartao> ocorrenciasParaRemover = new ArrayList<OcorrenciaJornadaApuracaoCartao>();
        ArrayList<Date> datasAlteradasManualmente = new ArrayList<Date>();
        for (OcorrenciaJornadaApuracaoCartao ojacAnterior : this.getOcorrenciasJornadaApuracaoCartao()) {
            if (ojacAnterior.isAlteradaManualmente().booleanValue()) {
                datasAlteradasManualmente.add(ojacAnterior.getDataOcorrencia());
                continue;
            }
            ocorrenciasParaRemover.add(ojacAnterior);
        }
        if (!ocorrenciasParaRemover.isEmpty()) {
            this.removerDeOcorrencias(ocorrenciasParaRemover, Boolean.FALSE);
        }
        this.setOcorrenciasJornadaApuracaoCartao(new ArrayList<OcorrenciaJornadaApuracaoCartao>());
        switch (this.getPreenchimentoJornadasCartao()) {
            case LIVRE: {
                this.tratarGeracaoDeJornadaLivre(datasAlteradasManualmente);
                break;
            }
            case PROGRAMACAO: {
                this.tratarGeracaoDeJornadaProgramacao(datasAlteradasManualmente);
                break;
            }
            case ESCALA: {
                this.tratarGeracaoDeJornadaEscala(datasAlteradasManualmente);
            }
        }
    }

    public void regerarOcorrenciasDeJornada() {
        this.removerDeOcorrencias(this.getOcorrenciasJornadaApuracaoCartao(), Boolean.FALSE);
        this.setOcorrenciasJornadaApuracaoCartao(new ArrayList<OcorrenciaJornadaApuracaoCartao>());
        switch (this.getPreenchimentoJornadasCartao()) {
            case LIVRE: {
                this.tratarGeracaoDeJornadaLivre(null);
                break;
            }
            case PROGRAMACAO: {
                this.tratarGeracaoDeJornadaProgramacao(null);
                break;
            }
            case ESCALA: {
                this.tratarGeracaoDeJornadaEscala(null);
            }
        }
    }

    private void tratarGeracaoDeJornadaLivre(List<Date> datasAlteradasManualmente) {
        HelperDate dataAuxiliar = HelperDate.getInstance(this.getDataInicial());
        while (HelperDate.dateBeforeOrEquals(dataAuxiliar.getDate(), this.getDataFinal())) {
            if (Utils.nulo(datasAlteradasManualmente) || !datasAlteradasManualmente.contains(dataAuxiliar.getDate())) {
                this.adicionarJornada(dataAuxiliar.getDate(), null, null);
            }
            dataAuxiliar.addDay(1);
        }
    }

    private void tratarGeracaoDeJornadaProgramacao(List<Date> datasAlteradasManualmente) {
        Set<Periodo> periodosFaltasEFerias = this.getPeriodosDeFaltasEFerias();
        HelperDate dataAuxiliar = HelperDate.getInstance(this.getDataInicial());
        Map<Integer, PreenchimentoJornadaApuracaoCartao> mapaSemanal = this.montarMapaDeProgramacao(this.getPreenchimentoJornadaSemanalApuracaoCartao());
        while (HelperDate.dateBeforeOrEquals(dataAuxiliar.getDate(), this.getDataFinal())) {
            int programa = 0;
            if (!this.getConsiderarFeriados().booleanValue() || !dataAuxiliar.isHoliday()) {
                programa = dataAuxiliar.getWeekOfDay();
            }
            PreenchimentoJornadaApuracaoCartao p = mapaSemanal.get(programa);
            if (Utils.nulo(datasAlteradasManualmente) || !datasAlteradasManualmente.contains(dataAuxiliar.getDate())) {
                this.adicionarJornada(dataAuxiliar.getDate(), p, periodosFaltasEFerias);
            }
            dataAuxiliar.addDay(1);
        }
    }

    private void tratarGeracaoDeJornadaEscala(List<Date> datasAlteradasManualmente) {
        Set<Periodo> periodosFaltasEFerias = this.getPeriodosDeFaltasEFerias();
        HelperDate dataAuxiliar = HelperDate.getInstance(this.getDataInicial());
        Map<Integer, PreenchimentoJornadaApuracaoCartao> mapaEscala = this.montarMapaDeProgramacao(this.getPreenchimentoJornadaEscalaApuracaoCartao());
        Integer diasTrabalho = mapaEscala.size();
        int contadorTrabalho = 0;
        while (HelperDate.dateBeforeOrEquals(dataAuxiliar.getDate(), this.getDataFinal())) {
            PreenchimentoJornadaApuracaoCartao p = mapaEscala.get(contadorTrabalho + 1);
            if (Utils.nulo(datasAlteradasManualmente) || !datasAlteradasManualmente.contains(dataAuxiliar.getDate())) {
                this.adicionarJornada(dataAuxiliar.getDate(), p, periodosFaltasEFerias);
            }
            dataAuxiliar.addDay(1);
            contadorTrabalho = (contadorTrabalho + 1) % diasTrabalho;
        }
    }

    public boolean verificarExisteAlgumaJornadaEscala() {
        if (this.getPreenchimentoJornadaEscalaApuracaoCartao() == null) {
            return false;
        }
        for (PreenchimentoJornadaApuracaoCartao o : this.getPreenchimentoJornadaEscalaApuracaoCartao()) {
            if (!o.verificarPeloMenosUmHorarioNaoVazio()) continue;
            return true;
        }
        return false;
    }

    public boolean verificarExisteAlgumaJornadaSemanal() {
        if (this.getPreenchimentoJornadaSemanalApuracaoCartao() == null) {
            return false;
        }
        for (PreenchimentoJornadaApuracaoCartao o : this.getPreenchimentoJornadaSemanalApuracaoCartao()) {
            if (!o.verificarPeloMenosUmHorarioNaoVazio()) continue;
            return true;
        }
        return false;
    }

    private void adicionarJornada(Date dataOcorrencia, PreenchimentoJornadaApuracaoCartao preenchimentoJornada, Set<Periodo> periodosFaltasEFerias) {
        OcorrenciaJornadaApuracaoCartao ojac = new OcorrenciaJornadaApuracaoCartao();
        ojac.setApuracaoCartaoDePonto(this);
        ojac.setDataOcorrencia(dataOcorrencia);
        if (Utils.naoNulo(preenchimentoJornada) && !this.isPeriodoFaltaOuFerias(dataOcorrencia, periodosFaltasEFerias)) {
            ojac.setHrEntrada1(preenchimentoJornada.getHrEntrada1());
            ojac.setHrSaida1(preenchimentoJornada.getHrSaida1());
            ojac.setHrEntrada2(preenchimentoJornada.getHrEntrada2());
            ojac.setHrSaida2(preenchimentoJornada.getHrSaida2());
            ojac.setHrEntrada3(preenchimentoJornada.getHrEntrada3());
            ojac.setHrSaida3(preenchimentoJornada.getHrSaida3());
            ojac.setHrEntrada4(preenchimentoJornada.getHrEntrada4());
            ojac.setHrSaida4(preenchimentoJornada.getHrSaida4());
            ojac.setHrEntrada5(preenchimentoJornada.getHrEntrada5());
            ojac.setHrSaida5(preenchimentoJornada.getHrSaida5());
            ojac.setHrEntrada6(preenchimentoJornada.getHrEntrada6());
            ojac.setHrSaida6(preenchimentoJornada.getHrSaida6());
        }
        this.getOcorrenciasJornadaApuracaoCartao().add(ojac);
    }

    private boolean isPeriodoFaltaOuFerias(Date dataOcorrencia, Set<Periodo> periodosFaltasEFerias) {
        if (periodosFaltasEFerias != null) {
            for (Periodo periodo : periodosFaltasEFerias) {
                if (!periodo.isPeriodoContemEsta(dataOcorrencia)) continue;
                return true;
            }
        }
        return false;
    }

    private Set<Periodo> getPeriodosDeFaltasEFerias() {
        List<Falta> faltas = ApuracaoCartaoDePonto.getRepositorio(RepositorioDeFalta.class).obterTodosPor(this.calculo);
        List<Ferias> ferias = ApuracaoCartaoDePonto.getRepositorio(RepositorioDeFerias.class).obterTodasPor(this.calculo);
        HashSet<Periodo> periodosFaltasEFerias = new HashSet<Periodo>();
        for (Falta falta : faltas) {
            if (!Utils.naoNulos(falta.getDataInicioPeriodoFalta(), falta.getDataTerminoPeriodoFalta())) continue;
            periodosFaltasEFerias.add(new Periodo(falta.getDataInicioPeriodoFalta(), falta.getDataTerminoPeriodoFalta()));
        }
        for (Ferias ferias2 : ferias) {
            if (Utils.naoNulos(ferias2.getDataInicialDoPeriodoDeGozo1(), ferias2.getDataFinalDoPeriodoDeGozo1())) {
                periodosFaltasEFerias.add(new Periodo(ferias2.getDataInicialDoPeriodoDeGozo1(), ferias2.getDataFinalDoPeriodoDeGozo1()));
            }
            if (Utils.naoNulos(ferias2.getDataInicialDoPeriodoDeGozo2(), ferias2.getDataFinalDoPeriodoDeGozo2())) {
                periodosFaltasEFerias.add(new Periodo(ferias2.getDataInicialDoPeriodoDeGozo2(), ferias2.getDataFinalDoPeriodoDeGozo2()));
            }
            if (!Utils.naoNulos(ferias2.getDataInicialDoPeriodoDeGozo3(), ferias2.getDataFinalDoPeriodoDeGozo3())) continue;
            periodosFaltasEFerias.add(new Periodo(ferias2.getDataInicialDoPeriodoDeGozo3(), ferias2.getDataFinalDoPeriodoDeGozo3()));
        }
        return periodosFaltasEFerias;
    }

    private Map<Integer, PreenchimentoJornadaApuracaoCartao> montarMapaDeProgramacao(List<PreenchimentoJornadaApuracaoCartao> preenchimentos) {
        HashMap<Integer, PreenchimentoJornadaApuracaoCartao> mapa = new HashMap<Integer, PreenchimentoJornadaApuracaoCartao>();
        for (PreenchimentoJornadaApuracaoCartao p : preenchimentos) {
            mapa.put(p.getSequencial(), p);
        }
        return mapa;
    }

    public ApuracaoCartaoDePonto removerDeOcorrencias(OcorrenciaJornadaApuracaoCartao ocorrencia) {
        return ApuracaoCartaoDePonto.getRepositorio(RepositorioDeApuracaoCartaoDePonto.class).removerDeOcorrencias(this, ocorrencia);
    }

    public void sugerirDatasParaCompetencias() {
        if (Utils.naoNulo(this.getCalculo())) {
            Periodo periodo = this.getCalculo().obterPeriodoSugestivoDoCalculo();
            this.setDataInicial(periodo.getInicial());
            this.setDataFinal(periodo.getFinal());
        }
    }

    public void gerarCartaoDePontoEOcorrenciasDoCartaoDePonto(List<String[]> linhas) {
        if (linhas.isEmpty()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0120, new Object[0]));
        }
        HelperDate competencia = null;
        HelperDate ocorrenciaCompetencia = null;
        for (String[] valores : linhas) {
            competencia = this.converterCompetencia(valores[0].replaceAll("\"", "").replaceAll("'", ""), "dd/MM/yy");
            for (OcorrenciaJornadaApuracaoCartao ocorrenciaJornada : this.getOcorrenciasJornadaApuracaoCartao()) {
                ocorrenciaCompetencia = this.converterCompetencia(ocorrenciaJornada.getDataOcorrencia().toString(), "yyyy-MM-dd");
                if (ocorrenciaCompetencia.getDate().compareTo(competencia.getDate()) != 0) continue;
                ocorrenciaJornada.setHrEntrada1(valores[INDEX_ENTRADA1] == null ? null : valores[INDEX_ENTRADA1].trim());
                ocorrenciaJornada.setHrSaida1(valores[INDEX_SAIDA1] == null ? null : valores[INDEX_SAIDA1].trim());
                ocorrenciaJornada.setHrEntrada2(valores[INDEX_ENTRADA2] == null ? null : valores[INDEX_ENTRADA2].trim());
                ocorrenciaJornada.setHrSaida2(valores[INDEX_SAIDA2] == null ? null : valores[INDEX_SAIDA2].trim());
                ocorrenciaJornada.setHrEntrada3(valores[INDEX_ENTRADA3] == null ? null : valores[INDEX_ENTRADA3].trim());
                ocorrenciaJornada.setHrSaida3(valores[INDEX_SAIDA3] == null ? null : valores[INDEX_SAIDA3].trim());
                ocorrenciaJornada.setHrEntrada4(valores[INDEX_ENTRADA4] == null ? null : valores[INDEX_ENTRADA4].trim());
                ocorrenciaJornada.setHrSaida4(valores[INDEX_SAIDA4] == null ? null : valores[INDEX_SAIDA4].trim());
                ocorrenciaJornada.setHrEntrada5(valores[INDEX_ENTRADA5] == null ? null : valores[INDEX_ENTRADA5].trim());
                ocorrenciaJornada.setHrSaida5(valores[INDEX_SAIDA5] == null ? null : valores[INDEX_SAIDA5].trim());
                ocorrenciaJornada.setHrEntrada6(valores[INDEX_ENTRADA6] == null ? null : valores[INDEX_ENTRADA6].trim());
                ocorrenciaJornada.setHrSaida6(valores[INDEX_SAIDA6] == null ? null : valores[INDEX_SAIDA6].trim());
                if (!ocorrenciaJornada.validarHorasDeEntradaSaida()) {
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0164, new SimpleDateFormat(FORMATO_DATA_PADRAO).format(ocorrenciaJornada.getDataOcorrencia())));
                }
                ocorrenciaJornada.setAlteradaManualmente(Boolean.TRUE);
                ocorrenciaJornada.salvar();
            }
        }
    }

    private HelperDate converterCompetencia(String data, String formatoEntrada) {
        ArrayList<String> formatStrings = new ArrayList<String>(Arrays.asList(FORMATO_DATA_PADRAO, "dd/MM/yy", "dd/MMMM/yy", "dd/MMMM/yyyy"));
        if (formatoEntrada != null) {
            formatStrings.clear();
            formatStrings.add(formatoEntrada);
        }
        for (String formatString : formatStrings) {
            try {
                SimpleDateFormat informat = new SimpleDateFormat(formatString);
                SimpleDateFormat outformat = new SimpleDateFormat(FORMATO_DATA_PADRAO);
                return HelperDate.getInstance(outformat.format(informat.parse(data)));
            }
            catch (ParseException e) {
                LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            }
        }
        throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0122, new Object[0]));
    }
}

