/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.JurosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeJurosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeDeJurosBaseEnum;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

public class PeriodoDeJuros
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Date dataInicial;
    private Date dataFinal;
    private BigDecimal aliquota;
    private TipoDeQuantidadeDeJurosBaseEnum tipoDeQuantidade;
    private TipoDeJurosEnum tipoDeJuros;
    private PeriodoDeJuros proximoPeriodo;
    private boolean fazendaPublica;
    private JurosEnum tabelaJuros;
    private BigDecimal meses;
    private BigDecimal taxa;

    public PeriodoDeJuros() {
    }

    public PeriodoDeJuros(Date dataInicial, Date dataFinal, BigDecimal aliquota, TipoDeQuantidadeDeJurosBaseEnum tipoDeQuantidade, TipoDeJurosEnum tipoDeJuros, boolean fazendaPublica, JurosEnum tabelaJuros) {
        this.dataInicial = dataInicial;
        this.dataFinal = dataFinal;
        this.aliquota = aliquota;
        this.tipoDeQuantidade = tipoDeQuantidade;
        this.tipoDeJuros = tipoDeJuros;
        this.fazendaPublica = fazendaPublica;
        this.tabelaJuros = tabelaJuros;
    }

    public PeriodoDeJuros clone() {
        return new PeriodoDeJuros(this.dataInicial, this.dataFinal, this.aliquota, this.tipoDeQuantidade, this.tipoDeJuros, this.fazendaPublica, this.tabelaJuros);
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

    public BigDecimal getAliquota() {
        return this.aliquota;
    }

    public void setAliquota(BigDecimal aliquota) {
        this.aliquota = aliquota;
    }

    public TipoDeQuantidadeDeJurosBaseEnum getTipoDeQuantidade() {
        return this.tipoDeQuantidade;
    }

    public void setTipoDeQuantidade(TipoDeQuantidadeDeJurosBaseEnum tipoDeQuantidade) {
        this.tipoDeQuantidade = tipoDeQuantidade;
    }

    public TipoDeJurosEnum getTipoDeJuros() {
        return this.tipoDeJuros;
    }

    public void setTipoDeJuros(TipoDeJurosEnum tipoDeJuros) {
        this.tipoDeJuros = tipoDeJuros;
    }

    public PeriodoDeJuros getProximoPeriodo() {
        return this.proximoPeriodo;
    }

    public void setProximoPeriodo(PeriodoDeJuros proximoPeriodo) {
        this.proximoPeriodo = proximoPeriodo;
    }

    public long getDias() {
        return HelperDate.countDays(this.dataInicial, this.dataFinal) + 1L;
    }

    public BigDecimal getMeses() {
        if (this.meses == null) {
            HelperDate hdInicial = HelperDate.getInstance(this.dataInicial);
            HelperDate hdFinal = HelperDate.getInstance(this.dataFinal);
            this.meses = new BigDecimal(Long.valueOf(HelperDate.countMonths(this.dataInicial, this.dataFinal)).toString());
            long quantDias = HelperDate.countDays(this.dataInicial, hdInicial.lastDayOfTheMonth().getDate()) + 1L;
            if (TipoDeQuantidadeDeJurosBaseEnum.FRACAO.equals((Object)this.tipoDeQuantidade)) {
                BigDecimal fracao;
                int totalDiasMes = hdInicial.daysInMonth();
                if (quantDias < (long)totalDiasMes) {
                    fracao = new BigDecimal(quantDias).divide(new BigDecimal(totalDiasMes), Utils.CONTEXTO_MATEMATICO);
                    this.meses = this.meses.subtract(BigDecimal.ONE, Utils.CONTEXTO_MATEMATICO).add(fracao, Utils.CONTEXTO_MATEMATICO);
                }
                if ((quantDias = (long)hdFinal.getDay()) < (long)(totalDiasMes = hdFinal.daysInMonth())) {
                    fracao = new BigDecimal(quantDias).divide(new BigDecimal(totalDiasMes), Utils.CONTEXTO_MATEMATICO);
                    this.meses = this.meses.subtract(BigDecimal.ONE, Utils.CONTEXTO_MATEMATICO).add(fracao, Utils.CONTEXTO_MATEMATICO);
                }
            } else {
                if (quantDias < 15L) {
                    this.meses = this.meses.subtract(BigDecimal.ONE, Utils.CONTEXTO_MATEMATICO);
                }
                if (hdFinal.getDay() < 15) {
                    this.meses = this.meses.subtract(BigDecimal.ONE, Utils.CONTEXTO_MATEMATICO);
                }
            }
        }
        return this.meses;
    }

    public BigDecimal getTaxa() {
        if (this.taxa == null) {
            if (JurosEnum.JUROS_ZERO_TRINTA_TRES.equals((Object)this.getTabelaJuros())) {
                this.taxa = Utils.multiplicar(this.getAliquota(), new BigDecimal(this.getDias()));
            } else if (TipoDeJurosEnum.SIMPLES.equals((Object)this.tipoDeJuros)) {
                this.taxa = this.getAliquota().multiply(this.getMeses(), Utils.CONTEXTO_MATEMATICO);
            } else {
                this.taxa = BigDecimal.ONE.divide(new BigDecimal("100"), Utils.CONTEXTO_MATEMATICO).add(BigDecimal.ONE, Utils.CONTEXTO_MATEMATICO);
                this.taxa = new BigDecimal(Double.valueOf(Math.pow(this.taxa.doubleValue(), this.getMeses().doubleValue())).toString()).subtract(BigDecimal.ONE, Utils.CONTEXTO_MATEMATICO).multiply(new BigDecimal("100"), Utils.CONTEXTO_MATEMATICO);
            }
        }
        return this.taxa;
    }

    public boolean isFazendaPublica() {
        return this.fazendaPublica;
    }

    public void setFazendaPublica(boolean fazendaPublica) {
        this.fazendaPublica = fazendaPublica;
    }

    public JurosEnum getTabelaJuros() {
        return this.tabelaJuros;
    }

    public void setTabelaJuros(JurosEnum tabelaJuros) {
        this.tabelaJuros = tabelaJuros;
    }

    public String toString() {
        return String.format("[periodo: %s - %s, meses: %s, taxa: %s]", Utils.naoNulo(this.dataInicial) ? HelperDate.getInstance(this.dataInicial).format("dd/MM/yyyy") : "", Utils.naoNulo(this.dataFinal) ? HelperDate.getInstance(this.dataFinal).format("dd/MM/yyyy") : "", this.getMeses().toString(), this.getTaxa().toString());
    }
}

