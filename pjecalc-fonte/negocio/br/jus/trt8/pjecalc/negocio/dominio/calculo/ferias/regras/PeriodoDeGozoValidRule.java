/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.regras;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.SituacaoDaFeriasEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import java.util.Date;

public class PeriodoDeGozoValidRule
implements ValidRule {
    public static final int NENHUM_PERIODO = 0;
    public static final int PERIODO1 = 1;
    public static final int PERIODO2 = 2;
    public static final int PERIODO3 = 3;
    public static final int DATA_INICIAL_GOZO1 = 0;
    public static final int DATA_FINAL_GOZO1 = 1;
    public static final int DATA_INICIAL_GOZO2 = 2;
    public static final int DATA_FINAL_GOZO2 = 3;
    public static final int DATA_INICIAL_GOZO3 = 4;
    public static final int DATA_FINAL_GOZO3 = 5;
    public static final String ATRIBUTO_DATA_ADMISSAO = "calculo.dataDemissao";
    public static final String ATRIBUTO_TERMINO_CALCULO = "calculo.dataTerminoCalculo";
    public static final String ATRIBUTO_PERIODO_CONCESSIVO = "dataInicialDoPeriodoConcessivo";
    public static final String ATRIBUTO_PERIODO_AQUISITIVO = "dataInicialDoPeriodoAquisitivo";
    public static final String ATRIBUTO_DATA_INICIAL_GOZO1 = "dataInicialDoPeriodoDeGozo1";
    public static final String ATRIBUTO_DATA_INICIAL_GOZO2 = "dataInicialDoPeriodoDeGozo2";
    public static final String ATRIBUTO_DATA_INICIAL_GOZO3 = "dataInicialDoPeriodoDeGozo3";
    public static final String ATRIBUTO_DATA_FINAL_GOZO1 = "dataFinalDoPeriodoDeGozo1";
    public static final String ATRIBUTO_DATA_FINAL_GOZO2 = "dataFinalDoPeriodoDeGozo2";
    public static final String ATRIBUTO_DATA_FINAL_GOZO3 = "dataFinalDoPeriodoDeGozo3";
    public static final String ATRIBUTO_DATA_HOJE = "dataHoje";
    private ContextoLocal contextoLocal;
    private Mensagens message;

    @Override
    public Mensagens getMessage() {
        return this.message;
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        if (Utils.nulo(context.getValue())) {
            return true;
        }
        this.carregarContextoLocal(validator);
        return this.consistirDataFinalDoPeriodo() && this.consistirDataInicialDoPeriodo() && this.consistenciaDePeriodo() && this.consistenciaDoSomaDosPeriodosDeGozo();
    }

    private void carregarContextoLocal(ValidValueValidator validator) {
        this.contextoLocal = new ContextoLocal();
        Ferias ferias = (Ferias)validator.getBean();
        this.contextoLocal.setCampo(validator.getFlag());
        this.contextoLocal.setFerias(ferias);
        this.contextoLocal.setValidator(validator);
        if (this.contextoLocal.isPeriodoDeGozo1()) {
            this.contextoLocal.setPeriodo(ferias.getPeriodoDeGozo1());
            this.contextoLocal.setAtributoInicial(ATRIBUTO_DATA_INICIAL_GOZO1);
            this.contextoLocal.setAtributoFinal(ATRIBUTO_DATA_FINAL_GOZO1);
        } else if (this.contextoLocal.isPeriodoDeGozo2()) {
            this.contextoLocal.setPeriodo(ferias.getPeriodoDeGozo2());
            this.contextoLocal.setAtributoInicial(ATRIBUTO_DATA_INICIAL_GOZO2);
            this.contextoLocal.setAtributoFinal(ATRIBUTO_DATA_FINAL_GOZO2);
        } else if (this.contextoLocal.isPeriodoDeGozo3()) {
            this.contextoLocal.setPeriodo(ferias.getPeriodoDeGozo3());
            this.contextoLocal.setAtributoInicial(ATRIBUTO_DATA_INICIAL_GOZO3);
            this.contextoLocal.setAtributoFinal(ATRIBUTO_DATA_FINAL_GOZO3);
        }
    }

    public boolean consistirDataInicialDoPeriodo() {
        Periodo periodoDeGozo2;
        if (!this.contextoLocal.isDataInicial()) {
            return true;
        }
        if (this.contextoLocal.isPeriodoDeGozo2()) {
            Periodo periodoDeGozo1 = this.contextoLocal.getFerias().getPeriodoDeGozo1();
            if (Utils.naoNulos(periodoDeGozo1.getFinal(), this.contextoLocal.getPeriodo().getInicial()) && this.contextoLocal.getPeriodo().obterDataInicialHelper().lessThanOrEqualsTo(periodoDeGozo1.getFinal())) {
                this.message = Mensagens.MSG0007;
                this.contextoLocal.getValidator().getParameters().put("1", ATRIBUTO_DATA_FINAL_GOZO1);
                return false;
            }
        } else if (this.contextoLocal.isPeriodoDeGozo3() && Utils.naoNulos((periodoDeGozo2 = this.contextoLocal.getFerias().getPeriodoDeGozo2()).getFinal(), this.contextoLocal.getPeriodo().getInicial()) && this.contextoLocal.getPeriodo().obterDataInicialHelper().lessThanOrEqualsTo(periodoDeGozo2.getFinal())) {
            this.message = Mensagens.MSG0007;
            this.contextoLocal.getValidator().getParameters().put("1", ATRIBUTO_DATA_FINAL_GOZO2);
            return false;
        }
        return true;
    }

    public boolean consistirDataFinalDoPeriodo() {
        if (!this.contextoLocal.isDataFinal()) {
            return true;
        }
        if (this.contextoLocal.getPeriodo().isDataFinalMenorQueInicial()) {
            this.message = Mensagens.MSG0008;
            this.contextoLocal.getValidator().getParameters().put("1", this.contextoLocal.getAtributoInicial());
            return false;
        }
        return true;
    }

    private boolean consistirLimitesDaData(ValidValueValidator validator, Periodo periodo, Periodo periodoValido, String atributoDataInicial, String atributoDataFinal) {
        if (!periodoValido.isPeriodoContemTotalmenteEste(periodo)) {
            validator.getParameters().put("0", atributoDataInicial);
            validator.getParameters().put("1", atributoDataFinal);
            this.message = Mensagens.MSG0039;
            return false;
        }
        return true;
    }

    public boolean consistenciaDePeriodo() {
        if (!this.contextoLocal.isDataFinal()) {
            return true;
        }
        Ferias ferias = this.contextoLocal.getFerias();
        Calculo calculo = this.contextoLocal.getFerias().getCalculo();
        Date dataFinal = calculo.getDataDemissao();
        String atributoDataFinal = ATRIBUTO_DATA_ADMISSAO;
        if (Utils.nulo(dataFinal)) {
            dataFinal = HelperDate.getInstance().removeTime().getDate();
            atributoDataFinal = ATRIBUTO_DATA_HOJE;
        }
        Ferias perimeiraFerias = null;
        if (Utils.naoNulo(calculo.getListaDeFerias())) {
            perimeiraFerias = calculo.getListaDeFerias().iterator().next();
        }
        if (Utils.nulo(perimeiraFerias) || ferias.equals(perimeiraFerias)) {
            return this.consistirLimitesDaData(this.contextoLocal.getValidator(), this.contextoLocal.getPeriodo(), new Periodo(ferias.getDataInicialDoPeriodoAquisitivo(), dataFinal), ATRIBUTO_PERIODO_AQUISITIVO, atributoDataFinal);
        }
        return this.consistirLimitesDaData(this.contextoLocal.getValidator(), this.contextoLocal.getPeriodo(), new Periodo(ferias.getDataInicialDoPeriodoAquisitivo(), dataFinal), ATRIBUTO_PERIODO_AQUISITIVO, atributoDataFinal);
    }

    public boolean consistenciaDoSomaDosPeriodosDeGozo() {
        if (!this.contextoLocal.isDataFinal()) {
            return true;
        }
        Ferias ferias = this.contextoLocal.getFerias();
        Periodo periodoDeGozo1 = ferias.getPeriodoDeGozo1();
        Periodo periodoDeGozo2 = ferias.getPeriodoDeGozo2();
        Periodo periodoDeGozo3 = ferias.getPeriodoDeGozo3();
        int ultimoPeriodoPreenchido = 0;
        if (periodoDeGozo3.isCompleto()) {
            ultimoPeriodoPreenchido = 3;
        } else if (periodoDeGozo2.isCompleto()) {
            ultimoPeriodoPreenchido = 2;
        } else if (periodoDeGozo1.isCompleto()) {
            ultimoPeriodoPreenchido = 1;
        }
        if (!this.contextoLocal.isPeriodo(ultimoPeriodoPreenchido)) {
            return true;
        }
        int somaDosPeriodos = periodoDeGozo1.totalDeDias() + periodoDeGozo2.totalDeDias() + periodoDeGozo3.totalDeDias();
        if (!ferias.getAbono().booleanValue()) {
            if (SituacaoDaFeriasEnum.GOZADAS_PARCIALMENTE.equals((Object)ferias.getSituacao())) {
                this.message = Mensagens.MSG0040;
                return somaDosPeriodos < ferias.getPrazo();
            }
            this.message = Mensagens.MSG0036;
            return somaDosPeriodos == ferias.getPrazo();
        }
        this.message = Mensagens.MSG0037;
        int prazoComAbono = ferias.getPrazo() - ferias.getQuantidadeDiasAbono();
        if (SituacaoDaFeriasEnum.GOZADAS_PARCIALMENTE.equals((Object)ferias.getSituacao())) {
            this.message = Mensagens.MSG0041;
            return somaDosPeriodos < prazoComAbono;
        }
        this.message = Mensagens.MSG0037;
        return somaDosPeriodos == prazoComAbono;
    }

    public boolean consistenciaDoPeriodosDeGozoSuperiorA10Dias() {
        if (!this.contextoLocal.isDataFinal()) {
            return true;
        }
        Ferias ferias = this.contextoLocal.getFerias();
        this.message = Mensagens.MSG0035;
        int totalDeGozo1 = ferias.getPeriodoDeGozo1().totalDeDias();
        int totalDeGozo2 = ferias.getPeriodoDeGozo2().totalDeDias();
        int totalDeGozo3 = ferias.getPeriodoDeGozo3().totalDeDias();
        if (totalDeGozo2 > 0 || totalDeGozo3 > 0) {
            return totalDeGozo1 >= 10 || totalDeGozo2 >= 10 || totalDeGozo3 >= 10;
        }
        return true;
    }

    class ContextoLocal {
        private int campo;
        private ValidValueValidator validator;
        private Periodo periodo;
        private String atributoInicial;
        private String atributoFinal;
        private Ferias ferias;

        public Ferias getFerias() {
            return this.ferias;
        }

        public void setFerias(Ferias ferias) {
            this.ferias = ferias;
        }

        public int getCampo() {
            return this.campo;
        }

        public void setCampo(int campo) {
            this.campo = campo;
        }

        public ValidValueValidator getValidator() {
            return this.validator;
        }

        public void setValidator(ValidValueValidator validator) {
            this.validator = validator;
        }

        public Periodo getPeriodo() {
            return this.periodo;
        }

        public void setPeriodo(Periodo periodo) {
            this.periodo = periodo;
        }

        public String getAtributoInicial() {
            return this.atributoInicial;
        }

        public void setAtributoInicial(String atributoInicial) {
            this.atributoInicial = atributoInicial;
        }

        public String getAtributoFinal() {
            return this.atributoFinal;
        }

        public void setAtributoFinal(String atributoFinal) {
            this.atributoFinal = atributoFinal;
        }

        public boolean isPeriodoDeGozo1() {
            return this.campo == 0 || this.campo == 1;
        }

        public boolean isPeriodoDeGozo2() {
            return this.campo == 2 || this.campo == 3;
        }

        public boolean isPeriodoDeGozo3() {
            return this.campo == 4 || this.campo == 5;
        }

        public boolean isDataInicial() {
            return this.campo == 0 || this.campo == 2 || this.campo == 4;
        }

        public boolean isDataFinal() {
            return this.campo == 1 || this.campo == 3 || this.campo == 5;
        }

        public boolean isPeriodo(int periodo) {
            return this.isPeriodoDeGozo1() && periodo == 1 || this.isPeriodoDeGozo2() && periodo == 2 || this.isPeriodoDeGozo3() && periodo == 3;
        }
    }
}

