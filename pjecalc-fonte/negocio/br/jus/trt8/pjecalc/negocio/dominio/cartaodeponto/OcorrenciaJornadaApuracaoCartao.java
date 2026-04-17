/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePontoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.Jornada;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioDeOcorrenciaJornadaApuracaoCartao;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBOCORRENCIAJORNADA")
@SequenceGenerator(name="SQOCORRENCIAJORNADA", sequenceName="SQOCORRENCIAJORNADA", allocationSize=1)
@Name(value="ocorrenciaJornadaApuracaoCartao")
public class OcorrenciaJornadaApuracaoCartao
extends EntidadeBase
implements Comparable<OcorrenciaJornadaApuracaoCartao>,
Jornada {
    private static final long serialVersionUID = -8065420814118036939L;
    private static final String FORMATO_DATA = "dd/MM/yyyy";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAJORNADA")
    @Column(name="IIDOCORRENCIAJORNADA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne
    @JoinColumn(name="IIDAPURACAOCARTAODEPONTO")
    private ApuracaoCartaoDePonto apuracaoCartaoDePonto;
    @Column(name="DDTOCORRENCIA")
    @Temporal(value=TemporalType.DATE)
    private Date dataOcorrencia;
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
    @Column(name="SFLALTERADA", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean alteradaManualmente = Boolean.FALSE;
    @Transient
    private BigDecimal cargaMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal toleranciaMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal qtHorasTotalMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal qtHorasDiurnaMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal qtHorasNoturnaMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal qtHorasProrrogacaoNoturnaMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal qtHorasTotalSemFictaMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal primeirasHorasExtrasEmSeparadoMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal adicionalSumula85Millis = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasExtrasMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasExtrasNoturnasMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasExtrasRepouso = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasExtrasNoturnasRepouso = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasExtrasFeriado = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasExtrasNoturnasFeriado = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasExtrasFeriadoRepouso = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasIntrajornadaMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasExcessoIntrajornadaMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasInterjornadasMillis = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasArtigo384Millis = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasArtigo253Millis = BigDecimal.ZERO;
    @Transient
    private BigDecimal horasArtigo72Millis = BigDecimal.ZERO;
    @Transient
    private boolean inicioNoturna = false;

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public OcorrenciaJornadaApuracaoCartao() {
        super(RepositorioDeOcorrenciaJornadaApuracaoCartao.class);
    }

    public OcorrenciaJornadaApuracaoCartao(OcorrenciaJornadaApuracaoCartao ocorrenciaJornadaApuracaoCartao) {
        super(RepositorioDeOcorrenciaJornadaApuracaoCartao.class);
        this.clonar(ocorrenciaJornadaApuracaoCartao);
    }

    public void clonar(OcorrenciaJornadaApuracaoCartao ocorrenciaJornadaApuracaoCartao) {
        this.setApuracaoCartaoDePonto(ocorrenciaJornadaApuracaoCartao.getApuracaoCartaoDePonto());
        this.setDataOcorrencia(ocorrenciaJornadaApuracaoCartao.getDataOcorrencia());
        this.setHrEntrada1(ocorrenciaJornadaApuracaoCartao.getHrEntrada1());
        this.setHrSaida1(ocorrenciaJornadaApuracaoCartao.getHrSaida1());
        this.setHrEntrada2(ocorrenciaJornadaApuracaoCartao.getHrEntrada2());
        this.setHrSaida2(ocorrenciaJornadaApuracaoCartao.getHrSaida2());
        this.setHrEntrada3(ocorrenciaJornadaApuracaoCartao.getHrEntrada3());
        this.setHrSaida3(ocorrenciaJornadaApuracaoCartao.getHrSaida3());
        this.setHrEntrada4(ocorrenciaJornadaApuracaoCartao.getHrEntrada4());
        this.setHrSaida4(ocorrenciaJornadaApuracaoCartao.getHrSaida4());
        this.setHrEntrada5(ocorrenciaJornadaApuracaoCartao.getHrEntrada5());
        this.setHrSaida5(ocorrenciaJornadaApuracaoCartao.getHrSaida5());
        this.setHrEntrada6(ocorrenciaJornadaApuracaoCartao.getHrEntrada6());
        this.setHrSaida6(ocorrenciaJornadaApuracaoCartao.getHrSaida6());
    }

    public Long getId() {
        return this.id;
    }

    public String getDiaDaSemana() {
        return HelperDate.getInstance(this.getDataOcorrencia()).getTipoDeDia(this.getApuracaoCartaoDePonto().getConsiderarFeriados());
    }

    @Override
    public ApuracaoCartaoDePonto getApuracaoCartaoDePonto() {
        return this.apuracaoCartaoDePonto;
    }

    public void setApuracaoCartaoDePonto(ApuracaoCartaoDePonto apuracaoCartaoDePonto) {
        this.apuracaoCartaoDePonto = apuracaoCartaoDePonto;
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
    public Date getDataOcorrencia() {
        return this.dataOcorrencia;
    }

    public void setDataOcorrencia(Date dataOcorrencia) {
        this.dataOcorrencia = dataOcorrencia;
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

    public Boolean isAlteradaManualmente() {
        return this.alteradaManualmente;
    }

    public void setAlteradaManualmente(Boolean alteradaManualmente) {
        this.alteradaManualmente = alteradaManualmente;
    }

    public BigDecimal getCargaMillis() {
        return this.cargaMillis;
    }

    public void setCargaMillis(BigDecimal cargaMillis) {
        this.cargaMillis = cargaMillis;
    }

    public BigDecimal getToleranciaMillis() {
        return this.toleranciaMillis;
    }

    public void setToleranciaMillis(BigDecimal toleranciaMillis) {
        this.toleranciaMillis = toleranciaMillis;
    }

    public BigDecimal getQtHorasTotalMillis() {
        return this.qtHorasTotalMillis;
    }

    public void setQtHorasTotalMillis(BigDecimal qtHorasTotalMillis) {
        this.qtHorasTotalMillis = qtHorasTotalMillis;
    }

    public BigDecimal getQtHorasDiurnaMillis() {
        return this.qtHorasDiurnaMillis;
    }

    public void setQtHorasDiurnaMillis(BigDecimal qtHorasDiurnaMillis) {
        this.qtHorasDiurnaMillis = qtHorasDiurnaMillis;
    }

    public BigDecimal getQtHorasNoturnaMillis() {
        return this.qtHorasNoturnaMillis;
    }

    public void setQtHorasNoturnaMillis(BigDecimal qtHorasNoturnaMillis) {
        this.qtHorasNoturnaMillis = qtHorasNoturnaMillis;
    }

    public BigDecimal getQtHorasProrrogacaoNoturnaMillis() {
        return this.qtHorasProrrogacaoNoturnaMillis;
    }

    public void setQtHorasProrrogacaoNoturnaMillis(BigDecimal qtHorasProrrogacaoNoturnaMillis) {
        this.qtHorasProrrogacaoNoturnaMillis = qtHorasProrrogacaoNoturnaMillis;
    }

    public BigDecimal getQtHorasTotalSemFictaMillis() {
        return this.qtHorasTotalSemFictaMillis;
    }

    public void setQtHorasTotalSemFictaMillis(BigDecimal qtHorasTotalSemFictaMillis) {
        this.qtHorasTotalSemFictaMillis = qtHorasTotalSemFictaMillis;
    }

    public BigDecimal getPrimeirasHorasExtrasEmSeparadoMillis() {
        return this.primeirasHorasExtrasEmSeparadoMillis;
    }

    public void setPrimeirasHorasExtrasEmSeparadoMillis(BigDecimal primeirasHorasExtrasEmSeparadoMillis) {
        this.primeirasHorasExtrasEmSeparadoMillis = primeirasHorasExtrasEmSeparadoMillis;
    }

    public BigDecimal getAdicionalSumula85Millis() {
        return this.adicionalSumula85Millis;
    }

    public void setAdicionalSumula85Millis(BigDecimal adicionalSumula85Millis) {
        this.adicionalSumula85Millis = adicionalSumula85Millis;
    }

    public BigDecimal getHorasExtrasMillis() {
        return this.horasExtrasMillis;
    }

    public void setHorasExtrasMillis(BigDecimal horasExtrasMillis) {
        this.horasExtrasMillis = horasExtrasMillis;
    }

    public BigDecimal getHorasExtrasNoturnasMillis() {
        return this.horasExtrasNoturnasMillis;
    }

    public void setHorasExtrasNoturnasMillis(BigDecimal horasExtrasNoturnasMillis) {
        this.horasExtrasNoturnasMillis = horasExtrasNoturnasMillis;
    }

    public BigDecimal getHorasExtrasRepouso() {
        return this.horasExtrasRepouso;
    }

    public void setHorasExtrasRepouso(BigDecimal horasExtrasRepouso) {
        this.horasExtrasRepouso = horasExtrasRepouso;
    }

    public BigDecimal getHorasExtrasFeriado() {
        return this.horasExtrasFeriado;
    }

    public void setHorasExtrasFeriado(BigDecimal horasExtrasFeriado) {
        this.horasExtrasFeriado = horasExtrasFeriado;
    }

    public BigDecimal getHorasExtrasFeriadoRepouso() {
        return this.horasExtrasFeriadoRepouso;
    }

    public void setHorasExtrasFeriadoRepouso(BigDecimal horasExtrasFeriadoRepouso) {
        this.horasExtrasFeriadoRepouso = horasExtrasFeriadoRepouso;
    }

    public BigDecimal getHorasIntrajornadaMillis() {
        return this.horasIntrajornadaMillis;
    }

    public void setHorasIntrajornadaMillis(BigDecimal horasIntrajornadaMillis) {
        this.horasIntrajornadaMillis = horasIntrajornadaMillis;
    }

    public BigDecimal getHorasExcessoIntrajornadaMillis() {
        return this.horasExcessoIntrajornadaMillis;
    }

    public void setHorasExcessoIntrajornadaMillis(BigDecimal horasExcessoIntrajornadaMillis) {
        this.horasExcessoIntrajornadaMillis = horasExcessoIntrajornadaMillis;
    }

    public BigDecimal getHorasInterjornadasMillis() {
        return this.horasInterjornadasMillis;
    }

    public void setHorasInterjornadasMillis(BigDecimal horasInterjornadasMillis) {
        this.horasInterjornadasMillis = horasInterjornadasMillis;
    }

    public BigDecimal getHorasArtigo384Millis() {
        return this.horasArtigo384Millis;
    }

    public void setHorasArtigo384Millis(BigDecimal horasArtigo384Millis) {
        this.horasArtigo384Millis = horasArtigo384Millis;
    }

    public BigDecimal getHorasArtigo253Millis() {
        return this.horasArtigo253Millis;
    }

    public void setHorasArtigo253Millis(BigDecimal horasArtigo253Millis) {
        this.horasArtigo253Millis = horasArtigo253Millis;
    }

    public BigDecimal getHorasArtigo72Millis() {
        return this.horasArtigo72Millis;
    }

    public void setHorasArtigo72Millis(BigDecimal horasArtigo72Millis) {
        this.horasArtigo72Millis = horasArtigo72Millis;
    }

    public boolean isInicioNoturna() {
        return this.inicioNoturna;
    }

    public void setInicioNoturna(boolean inicioNoturna) {
        this.inicioNoturna = inicioNoturna;
    }

    public boolean validarHorasDeEntradaSaida() {
        ArrayList<Turno> turnos = new ArrayList<Turno>();
        turnos.add(new Turno(this.getHrEntrada1(), this.getHrSaida1()));
        turnos.add(new Turno(this.getHrEntrada2(), this.getHrSaida2()));
        turnos.add(new Turno(this.getHrEntrada3(), this.getHrSaida3()));
        turnos.add(new Turno(this.getHrEntrada4(), this.getHrSaida4()));
        turnos.add(new Turno(this.getHrEntrada5(), this.getHrSaida5()));
        turnos.add(new Turno(this.getHrEntrada6(), this.getHrSaida6()));
        for (Turno turno : turnos) {
            boolean valido = turno.validarSeHoraEntradaSaidaEstaoCorretas();
            if (valido) continue;
            return false;
        }
        return true;
    }

    public String formatarFrequencia() {
        String saidaFormatada = "";
        if (Utils.naoVazio(this.getHrEntrada1())) {
            saidaFormatada = saidaFormatada + this.getHrEntrada1() + "-" + this.getHrSaida1();
        }
        if (Utils.naoVazio(this.getHrEntrada2())) {
            saidaFormatada = saidaFormatada + "\n" + this.getHrEntrada2() + "-" + this.getHrSaida2();
        }
        if (Utils.naoVazio(this.getHrEntrada3())) {
            saidaFormatada = saidaFormatada + "\n" + this.getHrEntrada3() + "-" + this.getHrSaida3();
        }
        if (Utils.naoVazio(this.getHrEntrada4())) {
            saidaFormatada = saidaFormatada + "\n" + this.getHrEntrada4() + "-" + this.getHrSaida4();
        }
        if (Utils.naoVazio(this.getHrEntrada5())) {
            saidaFormatada = saidaFormatada + "\n" + this.getHrEntrada5() + "-" + this.getHrSaida5();
        }
        if (Utils.naoVazio(this.getHrEntrada6())) {
            saidaFormatada = saidaFormatada + "\n" + this.getHrEntrada6() + "-" + this.getHrSaida6();
        }
        return saidaFormatada.isEmpty() ? "-" : saidaFormatada;
    }

    @Override
    public OcorrenciaJornadaApuracaoCartao validar() {
        GerenciadorDeValidadores.getInstance().validar(OcorrenciaJornadaApuracaoCartao.class, this);
        OcorrenciaJornadaApuracaoCartao p = new OcorrenciaJornadaApuracaoCartao();
        p.setApuracaoCartaoDePonto(this.apuracaoCartaoDePonto);
        p = (OcorrenciaJornadaApuracaoCartao)CartaoDePontoUtils.montarHorariosParaValidacoes(this, p);
        p.setDataOcorrencia(this.getDataOcorrencia());
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
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0187, new SimpleDateFormat(FORMATO_DATA).format(p.getDataOcorrencia())));
            }
            if (CartaoDePontoUtils.isPeriodosSemDescanso(p).booleanValue() || CartaoDePontoUtils.isPeriodoCorrenteDentroDePeriodoJaLancado(p).booleanValue()) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0185, new SimpleDateFormat(FORMATO_DATA).format(p.getDataOcorrencia())));
            }
            if (CartaoDePontoUtils.isPeriodoCorrenteDentroDePeriodoDeDescanso(p).booleanValue()) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0186, new SimpleDateFormat(FORMATO_DATA).format(p.getDataOcorrencia())));
            }
        }
        return this;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    @Override
    public int compareTo(OcorrenciaJornadaApuracaoCartao o) {
        if (HelperDate.dateBefore(this.getDataOcorrencia(), o.getDataOcorrencia())) {
            return -1;
        }
        if (HelperDate.dateAfter(this.getDataOcorrencia(), o.getDataOcorrencia())) {
            return 1;
        }
        return 0;
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
        if (obj == null || !super.equals(obj) || this.getClass() != obj.getClass()) {
            return false;
        }
        OcorrenciaJornadaApuracaoCartao other = (OcorrenciaJornadaApuracaoCartao)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }

    public BigDecimal getHorasExtrasNoturnasRepouso() {
        return this.horasExtrasNoturnasRepouso;
    }

    public void setHorasExtrasNoturnasRepouso(BigDecimal horasExtrasNoturnasRepouso) {
        this.horasExtrasNoturnasRepouso = horasExtrasNoturnasRepouso;
    }

    public BigDecimal getHorasExtrasNoturnasFeriado() {
        return this.horasExtrasNoturnasFeriado;
    }

    public void setHorasExtrasNoturnasFeriado(BigDecimal horasExtrasNoturnasFeriado) {
        this.horasExtrasNoturnasFeriado = horasExtrasNoturnasFeriado;
    }

    private class Turno {
        private final String entrada;
        private final String saida;

        private Turno(String entrada, String saida) {
            this.entrada = entrada;
            this.saida = saida;
        }

        private boolean validarSeHoraEntradaSaidaEstaoCorretas() {
            if (this.entrada != null && this.saida == null || this.entrada == null && this.saida != null) {
                return false;
            }
            if (this.entrada != null && this.saida != null) {
                String[] splitEntrada = this.entrada.split("[:]");
                Integer horaEntrada = Integer.valueOf(splitEntrada[0]);
                Integer minutoEntrada = Integer.valueOf(splitEntrada[1]);
                String[] splitSaida = this.saida.split("[:]");
                Integer horaSaida = Integer.valueOf(splitSaida[0]);
                Integer minutoSaida = Integer.valueOf(splitSaida[1]);
                if (horaEntrada < Utils.VALOR_HORA_MINIMO || horaEntrada > Utils.VALOR_HORA_MAXIMO || horaSaida < Utils.VALOR_HORA_MINIMO || horaSaida > Utils.VALOR_HORA_MAXIMO) {
                    return false;
                }
                if (minutoEntrada < Utils.VALOR_MINUTO_MINIMO || minutoEntrada > Utils.VALOR_MINUTO_MAXIMO || minutoSaida < Utils.VALOR_MINUTO_MINIMO || minutoSaida > Utils.VALOR_MINUTO_MAXIMO) {
                    return false;
                }
            }
            return true;
        }
    }
}

