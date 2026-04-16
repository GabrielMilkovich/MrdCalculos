/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePontoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaJornadaApuracaoCartao;
import java.io.Serializable;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

public class JornadaDiaria
implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final int TRES_HORAS = 3;
    private final Date data;
    private final List<Turno> turnosDoDia = new ArrayList<Turno>();
    private final ApuracaoCartaoDePonto apuracaoCartaoDePonto;
    private final boolean horarioNoturnoTotal;
    private final BigDecimal cargaHorariaDiaria;

    public JornadaDiaria(BigDecimal[] turnosInMilis, OcorrenciaJornadaApuracaoCartao ocorrencia, boolean horarioNoturnoTotal) {
        this.apuracaoCartaoDePonto = ocorrencia.getApuracaoCartaoDePonto();
        this.horarioNoturnoTotal = horarioNoturnoTotal;
        this.data = ocorrencia.getDataOcorrencia();
        this.cargaHorariaDiaria = ocorrencia.getCargaMillis();
        int proximoTurno = 2;
        for (int i = 0; i < turnosInMilis.length; i += 2) {
            if (turnosInMilis[i] == null || turnosInMilis[i + 1] == null) continue;
            this.turnosDoDia.add(new Turno(turnosInMilis[i], turnosInMilis[i + 1]));
        }
    }

    private boolean isProrrogarHorarioNoturno() {
        return this.apuracaoCartaoDePonto.getHorarioProrrogadoSumula60() != false && (this.horarioNoturnoTotal || this.apuracaoCartaoDePonto.getForcarProrrogacao() != false);
    }

    private BigDecimal getFatorHoraFicta() {
        return this.apuracaoCartaoDePonto.getConsiderarReducaoFictaDaHoraNoturna() != false ? CartaoDePontoUtils.FATOR_HORA_FICTA : BigDecimal.ONE;
    }

    private Date getData() {
        return this.data;
    }

    private List<Turno> getTurnosDoDia() {
        return this.turnosDoDia;
    }

    public BigDecimal getTotalHorasNoturnas() {
        BigDecimal quantidade = BigDecimal.ZERO;
        boolean prorroga = false;
        for (Turno turno : this.getTurnosDoDia()) {
            if (turno.prorrogarHorarioNoturno()) {
                prorroga = true;
            }
            quantidade = quantidade.add(turno.getQuantidadeHorasNoturnas());
            if (!prorroga) continue;
            quantidade = quantidade.add(turno.getQuantidadeHorasDiurnasDepois());
        }
        return quantidade;
    }

    public BigDecimal getTotalHorasExtrasNoturnas() {
        BigDecimal horasExtrasNoturnas = BigDecimal.ZERO;
        BigDecimal cargaHoraria = this.cargaHorariaDiaria;
        boolean teveHoraNoturna = false;
        boolean prorroga = this.isProrrogarHorarioNoturno();
        boolean turnoInicial = true;
        for (Turno turno : this.getTurnosDoDia()) {
            if (turnoInicial && turno.getQuantidadeHorasNoturnasInicial().compareTo(BigDecimal.ZERO) > 0) {
                teveHoraNoturna = true;
                if ((cargaHoraria = cargaHoraria.subtract(turno.getQuantidadeHorasNoturnasInicial())).compareTo(BigDecimal.ZERO) < 0) {
                    horasExtrasNoturnas = horasExtrasNoturnas.add(cargaHoraria.abs());
                    cargaHoraria = BigDecimal.ZERO;
                }
            }
            cargaHoraria = cargaHoraria.subtract(prorroga && teveHoraNoturna ? turno.getQuantidadeHorasDiurnasAntes().multiply(this.getFatorHoraFicta()) : turno.getQuantidadeHorasDiurnasAntes());
            if (prorroga && cargaHoraria.compareTo(BigDecimal.ZERO) < 0 && teveHoraNoturna) {
                horasExtrasNoturnas = horasExtrasNoturnas.add(cargaHoraria.abs());
            }
            if (cargaHoraria.compareTo(BigDecimal.ZERO) < 0) {
                horasExtrasNoturnas = horasExtrasNoturnas.add(turno.getQuantidadeHorasNoturnas());
            } else if ((cargaHoraria = cargaHoraria.subtract(turno.getQuantidadeHorasNoturnas())).compareTo(BigDecimal.ZERO) < 0) {
                horasExtrasNoturnas = horasExtrasNoturnas.add(cargaHoraria.abs());
            }
            if (turno.getQuantidadeHorasNoturnas().compareTo(BigDecimal.ZERO) > 0) {
                teveHoraNoturna = true;
            }
            if (cargaHoraria.compareTo(BigDecimal.ZERO) < 0) {
                cargaHoraria = BigDecimal.ZERO;
            }
            cargaHoraria = cargaHoraria.subtract(prorroga && teveHoraNoturna ? turno.getQuantidadeHorasDiurnasDepois().multiply(this.getFatorHoraFicta()) : turno.getQuantidadeHorasDiurnasDepois());
            if (prorroga && cargaHoraria.compareTo(BigDecimal.ZERO) < 0 && teveHoraNoturna) {
                horasExtrasNoturnas = horasExtrasNoturnas.add(cargaHoraria.abs());
            }
            if (cargaHoraria.compareTo(BigDecimal.ZERO) < 0) {
                cargaHoraria = BigDecimal.ZERO;
            }
            turnoInicial = false;
        }
        return horasExtrasNoturnas;
    }

    private class Turno {
        private final Date entrada;
        private final Date saida;
        private BigDecimal quantidadeHorasNoturnasInicial = BigDecimal.ZERO;
        private BigDecimal quantidadeHorasDiurnasAntes = BigDecimal.ZERO;
        private BigDecimal quantidadeHorasDiurnasDepois = BigDecimal.ZERO;

        public Turno(BigDecimal entrada, BigDecimal saida) {
            Calendar e = Calendar.getInstance();
            Calendar s = Calendar.getInstance();
            e.setTime(new Date(entrada.longValue()));
            s.setTime(new Date(saida.longValue()));
            e.add(10, 3);
            s.add(10, 3);
            this.entrada = e.getTime();
            this.saida = s.getTime();
            this.calcularQuantidadeHorasDiurnas();
        }

        public Date getEntrada() {
            return this.entrada;
        }

        public Date getSaida() {
            return this.saida;
        }

        private boolean prorrogarHorarioNoturno() {
            Date inicioAtividadeNoturna = CartaoDePontoUtils.getInicioAtividadeNoturna(JornadaDiaria.this.apuracaoCartaoDePonto);
            Date fimAtividadeNoturna = CartaoDePontoUtils.getFimAtividadeNoturna(JornadaDiaria.this.apuracaoCartaoDePonto);
            Date fimAtividadeNoturnaVespera = HelperDate.getInstance(fimAtividadeNoturna).addDay(-1).getDate();
            HelperDate helperEntrada = HelperDate.getInstance(this.entrada);
            HelperDate helperSaida = HelperDate.getInstance(this.saida);
            boolean entradaAntesDoFimDaAtividadeNoturnaDaVespera = helperEntrada.lessThen(fimAtividadeNoturnaVespera);
            boolean entradaOuSaidaEntreOInicioEFimDaAtividadeNoturna = helperEntrada.between(inicioAtividadeNoturna, fimAtividadeNoturna) || helperSaida.between(inicioAtividadeNoturna, fimAtividadeNoturna);
            boolean entradaESaidaForaDoIntervaloDeAtividadeNoturna = helperEntrada.lessThanOrEqualsTo(inicioAtividadeNoturna) && helperSaida.greaterThenOrEquals(fimAtividadeNoturna);
            boolean ocorreuTrabalhoNoturno = entradaAntesDoFimDaAtividadeNoturnaDaVespera || entradaOuSaidaEntreOInicioEFimDaAtividadeNoturna || entradaESaidaForaDoIntervaloDeAtividadeNoturna;
            return ocorreuTrabalhoNoturno && JornadaDiaria.this.isProrrogarHorarioNoturno();
        }

        private BigDecimal getQuantidadeHorasDiurnas() {
            return Utils.somar(this.quantidadeHorasDiurnasAntes, this.quantidadeHorasDiurnasDepois);
        }

        private void calcularQuantidadeHorasDiurnas() {
            Date inicioAtividadeNoturna = CartaoDePontoUtils.getInicioAtividadeNoturna(JornadaDiaria.this.apuracaoCartaoDePonto);
            Date fimAtividadeNoturna = CartaoDePontoUtils.getFimAtividadeNoturna(JornadaDiaria.this.apuracaoCartaoDePonto);
            Date fimAtividadeNoturnaVespera = HelperDate.getInstance(fimAtividadeNoturna).addDay(-1).getDate();
            HelperDate helperEntrada = HelperDate.getInstance(this.entrada);
            HelperDate helperSaida = HelperDate.getInstance(this.saida);
            BigDecimal quantidade = BigDecimal.ZERO;
            if (helperEntrada.lessThanOrEqualsTo(fimAtividadeNoturnaVespera) && helperSaida.lessThanOrEqualsTo(fimAtividadeNoturnaVespera)) {
                this.quantidadeHorasNoturnasInicial = Utils.multiplicar(new BigDecimal(this.saida.getTime() - this.entrada.getTime()), JornadaDiaria.this.getFatorHoraFicta());
            } else if (helperEntrada.lessThanOrEqualsTo(fimAtividadeNoturnaVespera)) {
                this.quantidadeHorasNoturnasInicial = Utils.multiplicar(new BigDecimal(fimAtividadeNoturnaVespera.getTime() - this.entrada.getTime()), JornadaDiaria.this.getFatorHoraFicta());
                if (this.prorrogarHorarioNoturno()) {
                    this.quantidadeHorasNoturnasInicial = Utils.somar(this.quantidadeHorasNoturnasInicial, Utils.multiplicar(new BigDecimal(this.saida.getTime() - fimAtividadeNoturnaVespera.getTime()), JornadaDiaria.this.getFatorHoraFicta()));
                }
            } else {
                this.quantidadeHorasNoturnasInicial = BigDecimal.ZERO;
            }
            if (helperEntrada.isBetweenEndExclusive(inicioAtividadeNoturna, fimAtividadeNoturna) && helperSaida.between(inicioAtividadeNoturna, fimAtividadeNoturna)) {
                quantidade = BigDecimal.ZERO;
            } else if (helperEntrada.isBetweenEndExclusive(inicioAtividadeNoturna, fimAtividadeNoturna)) {
                this.quantidadeHorasDiurnasDepois = quantidade = new BigDecimal(this.prorrogarHorarioNoturno() ? 0L : this.saida.getTime() - fimAtividadeNoturna.getTime());
            } else if (helperSaida.isBetweenEndExclusive(inicioAtividadeNoturna, fimAtividadeNoturna)) {
                quantidade = new BigDecimal(inicioAtividadeNoturna.getTime() - this.entrada.getTime());
                this.quantidadeHorasDiurnasAntes = quantidade = Utils.subtrair(quantidade, this.quantidadeHorasNoturnasInicial);
            } else if (helperEntrada.lessThanOrEqualsTo(inicioAtividadeNoturna) && helperSaida.greaterThenOrEquals(fimAtividadeNoturna)) {
                this.quantidadeHorasDiurnasAntes = Utils.zerarSeNegativo(Utils.subtrair(new BigDecimal(inicioAtividadeNoturna.getTime() - this.entrada.getTime()), this.quantidadeHorasNoturnasInicial));
                this.quantidadeHorasDiurnasDepois = new BigDecimal(this.prorrogarHorarioNoturno() ? 0L : this.saida.getTime() - fimAtividadeNoturna.getTime());
            } else {
                quantidade = new BigDecimal(this.saida.getTime() - this.entrada.getTime());
                if (helperEntrada.lessThanOrEqualsTo(inicioAtividadeNoturna)) {
                    this.quantidadeHorasDiurnasAntes = Utils.zerarSeNegativo(Utils.subtrair(quantidade, this.quantidadeHorasNoturnasInicial));
                } else {
                    this.quantidadeHorasDiurnasDepois = quantidade;
                }
            }
        }

        public BigDecimal getQuantidadeHorasNoturnas() {
            Date inicioAtividadeNoturna = CartaoDePontoUtils.getInicioAtividadeNoturna(JornadaDiaria.this.apuracaoCartaoDePonto);
            Date fimAtividadeNoturna = CartaoDePontoUtils.getFimAtividadeNoturna(JornadaDiaria.this.apuracaoCartaoDePonto);
            HelperDate helperEntrada = HelperDate.getInstance(this.entrada);
            HelperDate helperSaida = HelperDate.getInstance(this.saida);
            BigDecimal quantidade = BigDecimal.ZERO;
            if (helperEntrada.isBetweenEndExclusive(inicioAtividadeNoturna, fimAtividadeNoturna) && helperSaida.between(inicioAtividadeNoturna, fimAtividadeNoturna)) {
                quantidade = new BigDecimal(this.saida.getTime() - this.entrada.getTime());
            } else if (helperEntrada.isBetweenEndExclusive(inicioAtividadeNoturna, fimAtividadeNoturna)) {
                quantidade = new BigDecimal((this.prorrogarHorarioNoturno() ? this.saida.getTime() : fimAtividadeNoturna.getTime()) - this.entrada.getTime());
            } else if (helperSaida.isBetweenEndExclusive(inicioAtividadeNoturna, fimAtividadeNoturna)) {
                quantidade = new BigDecimal(this.saida.getTime() - inicioAtividadeNoturna.getTime());
            } else if (helperEntrada.lessThanOrEqualsTo(inicioAtividadeNoturna) && helperSaida.greaterThenOrEquals(fimAtividadeNoturna)) {
                quantidade = new BigDecimal((this.prorrogarHorarioNoturno() ? this.saida.getTime() : fimAtividadeNoturna.getTime()) - inicioAtividadeNoturna.getTime());
            }
            return quantidade.multiply(JornadaDiaria.this.getFatorHoraFicta());
        }

        public BigDecimal getQuantidadeHorasTrabalhadas() {
            return Utils.somar(this.getQuantidadeHorasDiurnas(), this.getQuantidadeHorasNoturnas());
        }

        public BigDecimal getQuantidadeHorasNoturnasInicial() {
            return this.quantidadeHorasNoturnasInicial;
        }

        public BigDecimal getQuantidadeHorasDiurnasAntes() {
            return this.quantidadeHorasDiurnasAntes;
        }

        public BigDecimal getQuantidadeHorasDiurnasDepois() {
            return this.quantidadeHorasDiurnasDepois;
        }

        public String toString() {
            SimpleDateFormat sdfData = new SimpleDateFormat("dd/MM/yyyy");
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm");
            return sdf.format(sdfData.format(JornadaDiaria.this.getData()) + " - " + this.getEntrada()) + " - " + sdf.format(this.getSaida()) + ": " + this.getQuantidadeHorasTrabalhadas() + " horas trabalhadas totais em milisegundos.";
        }
    }
}

