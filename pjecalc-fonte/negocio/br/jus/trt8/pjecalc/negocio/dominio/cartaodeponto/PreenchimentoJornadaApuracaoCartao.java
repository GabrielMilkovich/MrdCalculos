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
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.SemanaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPreenchimentoJornadaCartaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePontoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.Jornada;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioDePreenchimentoJornadaApuracaoCartao;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBPREENCHIMENTOCARTAO")
@SequenceGenerator(name="SQPREENCHIMENTOCARTAO", sequenceName="SQPREENCHIMENTOCARTAO", allocationSize=1)
@Name(value="preenchimentoJornadaApuracaoCartao")
public class PreenchimentoJornadaApuracaoCartao
extends EntidadeBase
implements Jornada {
    private static final int ENTRADA_PRIMEIRO_TURNO = 0;
    private static final int SAIDA_PRIMEIRO_TURNO = 1;
    private static final int ENTRADA_SEGUNDO_TURNO = 2;
    private static final int SAIDA_SEGUNDO_TURNO = 3;
    private static final int ENTRADA_TERCEIRO_TURNO = 4;
    private static final int SAIDA_TERCEIRO_TURNO = 5;
    private static final int ENTRADA_QUARTO_TURNO = 6;
    private static final int SAIDA_QUARTO_TURNO = 7;
    private static final int ENTRADA_QUINTO_TURNO = 8;
    private static final int SAIDA_QUINTO_TURNO = 9;
    private static final int ENTRADA_SEXTO_TURNO = 10;
    private static final int SAIDA_SEXTO_TURNO = 11;
    private static final int NUMERO_MAXIMO_DE_ENTRADAS_E_SAIDAS_DE_TURNOS = 12;
    private static final long serialVersionUID = 5892840019447796391L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPREENCHIMENTOCARTAO")
    @Column(name="IIDPREENCHIMENTOCARTAO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDAPURACAOCARTAODEPONTO")
    private ApuracaoCartaoDePonto apuracaoCartaoDePonto;
    @Column(name="ISEQUENCIA", nullable=true)
    private Integer sequencial;
    @Column(name="STPPREENCHIMENTO", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoPreenchimentoJornadaCartaoEnum")})
    private TipoPreenchimentoJornadaCartaoEnum tipoPreenchimentoJornadaCartao = TipoPreenchimentoJornadaCartaoEnum.SEMANAL;
    @Column(name="MVLENTRADA1", columnDefinition="VARCHAR2(5)")
    private String hrEntrada1;
    @Column(name="MVLSAIDA1", columnDefinition="VARCHAR2(5)")
    private String hrSaida1;
    @Column(name="MVLENTRADA2", columnDefinition="VARCHAR2(5)")
    private String hrEntrada2;
    @Column(name="MVLSAIDA2", columnDefinition="VARCHAR2(5)")
    private String hrSaida2;
    @Column(name="MVLENTRADA3", columnDefinition="VARCHAR2(5)")
    private String hrEntrada3;
    @Column(name="MVLSAIDA3", columnDefinition="VARCHAR2(5)")
    private String hrSaida3;
    @Column(name="MVLENTRADA4", columnDefinition="VARCHAR2(5)")
    private String hrEntrada4;
    @Column(name="MVLSAIDA4", columnDefinition="VARCHAR2(5)")
    private String hrSaida4;
    @Column(name="MVLENTRADA5", columnDefinition="VARCHAR2(5)")
    private String hrEntrada5;
    @Column(name="MVLSAIDA5", columnDefinition="VARCHAR2(5)")
    private String hrSaida5;
    @Column(name="MVLENTRADA6", columnDefinition="VARCHAR2(5)")
    private String hrEntrada6;
    @Column(name="MVLSAIDA6", columnDefinition="VARCHAR2(5)")
    private String hrSaida6;
    @Column(name="SFLEDITAVEL", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean editavel = Boolean.TRUE;

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public PreenchimentoJornadaApuracaoCartao() {
        super(RepositorioDePreenchimentoJornadaApuracaoCartao.class);
    }

    public PreenchimentoJornadaApuracaoCartao(ApuracaoCartaoDePonto apuracaoCartaoDePonto, Integer sequencial, TipoPreenchimentoJornadaCartaoEnum tipoPreenchimentoJornadaCartao) {
        this(apuracaoCartaoDePonto, sequencial, tipoPreenchimentoJornadaCartao, new String[]{"", "", "", "", "", "", "", "", "", "", "", ""});
    }

    public PreenchimentoJornadaApuracaoCartao(ApuracaoCartaoDePonto apuracaoCartaoDePonto, Integer sequencial, TipoPreenchimentoJornadaCartaoEnum tipoPreenchimentoJornadaCartao, String[] horarios) {
        super(RepositorioDePreenchimentoJornadaApuracaoCartao.class);
        this.apuracaoCartaoDePonto = apuracaoCartaoDePonto;
        this.sequencial = sequencial;
        this.tipoPreenchimentoJornadaCartao = tipoPreenchimentoJornadaCartao;
        if (Utils.naoNulo(horarios) && horarios.length == 12) {
            this.hrEntrada1 = horarios[0];
            this.hrSaida1 = horarios[1];
            this.hrEntrada2 = horarios[2];
            this.hrSaida2 = horarios[3];
            this.hrEntrada3 = horarios[4];
            this.hrSaida3 = horarios[5];
            this.hrEntrada4 = horarios[6];
            this.hrSaida4 = horarios[7];
            this.hrEntrada5 = horarios[8];
            this.hrSaida5 = horarios[9];
            this.hrEntrada6 = horarios[10];
            this.hrSaida6 = horarios[11];
        }
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public ApuracaoCartaoDePonto getApuracaoCartaoDePonto() {
        return this.apuracaoCartaoDePonto;
    }

    public void setApuracaoCartaoDePonto(ApuracaoCartaoDePonto apuracaoCartaoDePonto) {
        this.apuracaoCartaoDePonto = apuracaoCartaoDePonto;
    }

    @Override
    public Date getDataOcorrencia() {
        return null;
    }

    public String getDiaDaSemana() {
        SemanaEnum semanaEnum = SemanaEnum.getFromSequencial(this.getSequencial());
        if (semanaEnum == null) {
            return "-";
        }
        return semanaEnum.getNome();
    }

    public Integer getSequencial() {
        return this.sequencial;
    }

    public void setSequencial(Integer sequencial) {
        this.sequencial = sequencial;
    }

    public TipoPreenchimentoJornadaCartaoEnum getTipoPreenchimentoJornadaCartao() {
        return this.tipoPreenchimentoJornadaCartao;
    }

    public void setTipoPreenchimentoJornadaCartao(TipoPreenchimentoJornadaCartaoEnum tipoPreenchimentoJornadaCartao) {
        this.tipoPreenchimentoJornadaCartao = tipoPreenchimentoJornadaCartao;
    }

    @Override
    public String getHrEntrada1() {
        return Utils.getHoraSeValida(this.hrEntrada1);
    }

    @Override
    public void setHrEntrada1(String hrEntrada1) {
        this.hrEntrada1 = Utils.getHoraSeValida(hrEntrada1);
    }

    @Override
    public String getHrSaida1() {
        return Utils.getHoraSeValida(this.hrSaida1);
    }

    @Override
    public void setHrSaida1(String hrSaida1) {
        this.hrSaida1 = Utils.getHoraSeValida(hrSaida1);
    }

    @Override
    public String getHrEntrada2() {
        return Utils.getHoraSeValida(this.hrEntrada2);
    }

    @Override
    public void setHrEntrada2(String hrEntrada2) {
        this.hrEntrada2 = Utils.getHoraSeValida(hrEntrada2);
    }

    @Override
    public String getHrSaida2() {
        return Utils.getHoraSeValida(this.hrSaida2);
    }

    @Override
    public void setHrSaida2(String hrSaida2) {
        this.hrSaida2 = Utils.getHoraSeValida(hrSaida2);
    }

    @Override
    public String getHrEntrada3() {
        return Utils.getHoraSeValida(this.hrEntrada3);
    }

    @Override
    public void setHrEntrada3(String hrEntrada3) {
        this.hrEntrada3 = Utils.getHoraSeValida(hrEntrada3);
    }

    @Override
    public String getHrSaida3() {
        return Utils.getHoraSeValida(this.hrSaida3);
    }

    @Override
    public void setHrSaida3(String hrSaida3) {
        this.hrSaida3 = Utils.getHoraSeValida(hrSaida3);
    }

    @Override
    public String getHrEntrada4() {
        return Utils.getHoraSeValida(this.hrEntrada4);
    }

    @Override
    public void setHrEntrada4(String hrEntrada4) {
        this.hrEntrada4 = Utils.getHoraSeValida(hrEntrada4);
    }

    @Override
    public String getHrSaida4() {
        return Utils.getHoraSeValida(this.hrSaida4);
    }

    @Override
    public void setHrSaida4(String hrSaida4) {
        this.hrSaida4 = Utils.getHoraSeValida(hrSaida4);
    }

    @Override
    public String getHrEntrada5() {
        return Utils.getHoraSeValida(this.hrEntrada5);
    }

    @Override
    public void setHrEntrada5(String hrEntrada5) {
        this.hrEntrada5 = Utils.getHoraSeValida(hrEntrada5);
    }

    @Override
    public String getHrSaida5() {
        return Utils.getHoraSeValida(this.hrSaida5);
    }

    @Override
    public void setHrSaida5(String hrSaida5) {
        this.hrSaida5 = Utils.getHoraSeValida(hrSaida5);
    }

    @Override
    public String getHrEntrada6() {
        return Utils.getHoraSeValida(this.hrEntrada6);
    }

    @Override
    public void setHrEntrada6(String hrEntrada6) {
        this.hrEntrada6 = Utils.getHoraSeValida(hrEntrada6);
    }

    @Override
    public String getHrSaida6() {
        return Utils.getHoraSeValida(this.hrSaida6);
    }

    @Override
    public void setHrSaida6(String hrSaida6) {
        this.hrSaida6 = Utils.getHoraSeValida(hrSaida6);
    }

    public Boolean getEditavel() {
        return this.editavel;
    }

    public void setEditavel(Boolean editavel) {
        this.editavel = editavel;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    public boolean verificarPeloMenosUmHorarioNaoVazio() {
        if (Utils.naoVazio(this.getHrEntrada1()) || Utils.naoVazio(this.getHrEntrada2())) {
            return true;
        }
        if (Utils.naoVazio(this.getHrEntrada3()) || Utils.naoVazio(this.getHrEntrada4())) {
            return true;
        }
        if (Utils.naoVazio(this.getHrEntrada5()) || Utils.naoVazio(this.getHrEntrada6())) {
            return true;
        }
        return this.verificarPeloMenosUmHorarioNaoVazioSaidas();
    }

    private boolean verificarPeloMenosUmHorarioNaoVazioSaidas() {
        if (Utils.naoVazio(this.getHrSaida1()) || Utils.naoVazio(this.getHrSaida2())) {
            return true;
        }
        if (Utils.naoVazio(this.getHrSaida3()) || Utils.naoVazio(this.getHrSaida4())) {
            return true;
        }
        return Utils.naoVazio(this.getHrSaida5()) || Utils.naoVazio(this.getHrSaida6());
    }

    @Override
    public PreenchimentoJornadaApuracaoCartao validar() {
        GerenciadorDeValidadores.getInstance().validar(PreenchimentoJornadaApuracaoCartao.class, this);
        boolean preenchimentoErradoPrimeiroTurno = Utils.isVazio(this.getHrEntrada1()) != false && Utils.naoVazio(this.getHrSaida1()) || Utils.naoVazio(this.getHrEntrada1()) && Utils.isVazio(this.getHrSaida1()) != false;
        boolean preenchimentoErradoSegundoTurno = Utils.isVazio(this.getHrEntrada2()) != false && Utils.naoVazio(this.getHrSaida2()) || Utils.naoVazio(this.getHrEntrada2()) && Utils.isVazio(this.getHrSaida2()) != false;
        boolean preenchimentoErradoTerceiroTurno = Utils.isVazio(this.getHrEntrada3()) != false && Utils.naoVazio(this.getHrSaida3()) || Utils.naoVazio(this.getHrEntrada3()) && Utils.isVazio(this.getHrSaida3()) != false;
        boolean preenchimentoErradoQuartoTurno = Utils.isVazio(this.getHrEntrada4()) != false && Utils.naoVazio(this.getHrSaida4()) || Utils.naoVazio(this.getHrEntrada4()) && Utils.isVazio(this.getHrSaida4()) != false;
        boolean preenchimentoErradoQuintoTurno = Utils.isVazio(this.getHrEntrada5()) != false && Utils.naoVazio(this.getHrSaida5()) || Utils.naoVazio(this.getHrEntrada5()) && Utils.isVazio(this.getHrSaida5()) != false;
        boolean preenchimentoErradoSextoTurno = Utils.isVazio(this.getHrEntrada6()) != false && Utils.naoVazio(this.getHrSaida6()) || Utils.naoVazio(this.getHrEntrada6()) && Utils.isVazio(this.getHrSaida6()) != false;
        boolean preenchimentoErrado = preenchimentoErradoPrimeiroTurno || preenchimentoErradoSegundoTurno || preenchimentoErradoTerceiroTurno;
        boolean bl = preenchimentoErrado = preenchimentoErrado || preenchimentoErradoQuartoTurno || preenchimentoErradoQuintoTurno || preenchimentoErradoSextoTurno;
        if (preenchimentoErrado) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0146, new Object[0]));
        }
        if (this.isPreenchimentoInvalido()) {
            String dia = TipoPreenchimentoJornadaCartaoEnum.ESCALA.equals((Object)this.getTipoPreenchimentoJornadaCartao()) ? "Dia " + this.getSequencial() : this.getDiaDaSemana();
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0004, "Preenchimento de Jornadas - " + dia));
        }
        Jornada p = new PreenchimentoJornadaApuracaoCartao(this.apuracaoCartaoDePonto, this.sequencial, this.tipoPreenchimentoJornadaCartao);
        p = CartaoDePontoUtils.montarHorariosParaValidacoes(this, p);
        String saidaDia = null;
        if (Utils.naoVazio(p.getHrSaida6())) {
            saidaDia = p.getHrSaida6();
        } else if (Utils.naoVazio(p.getHrSaida5())) {
            saidaDia = p.getHrSaida5();
        } else if (Utils.naoVazio(p.getHrSaida4())) {
            saidaDia = p.getHrSaida4();
        } else if (Utils.naoVazio(p.getHrSaida3())) {
            saidaDia = p.getHrSaida3();
        } else if (Utils.naoVazio(p.getHrSaida2())) {
            saidaDia = p.getHrSaida2();
        } else if (Utils.naoVazio(p.getHrSaida1())) {
            saidaDia = p.getHrSaida1();
        }
        if (Utils.naoVazio(saidaDia)) {
            if (CartaoDePontoUtils.isJornadaDeMaisDeDoisDias(p)) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0188, new Object[0]));
            }
            if (CartaoDePontoUtils.isPeriodosSemDescanso(p).booleanValue() || CartaoDePontoUtils.isPeriodoCorrenteDentroDePeriodoJaLancado(p).booleanValue()) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0148, new Object[0]));
            }
            if (CartaoDePontoUtils.isPeriodoCorrenteDentroDePeriodoDeDescanso(p).booleanValue()) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0149, new Object[0]));
            }
        }
        return this;
    }

    private boolean isPreenchimentoInvalido() {
        boolean preenchimentoInvalido = false;
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrEntrada1()) && !Utils.isHoraValida(this.getHrEntrada1())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrSaida1()) && !Utils.isHoraValida(this.getHrSaida1())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrEntrada2()) && !Utils.isHoraValida(this.getHrEntrada2())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrSaida2()) && !Utils.isHoraValida(this.getHrSaida2())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrEntrada3()) && !Utils.isHoraValida(this.getHrEntrada3())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrSaida3()) && !Utils.isHoraValida(this.getHrSaida3())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrEntrada4()) && !Utils.isHoraValida(this.getHrEntrada4())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrSaida4()) && !Utils.isHoraValida(this.getHrSaida4())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrEntrada5()) && !Utils.isHoraValida(this.getHrEntrada5())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrSaida5()) && !Utils.isHoraValida(this.getHrSaida5())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrEntrada6()) && !Utils.isHoraValida(this.getHrEntrada6())) {
            preenchimentoInvalido = true;
        }
        if (!preenchimentoInvalido && Utils.naoVazio(this.getHrSaida6()) && !Utils.isHoraValida(this.getHrSaida6())) {
            preenchimentoInvalido = true;
        }
        return preenchimentoInvalido;
    }
}

