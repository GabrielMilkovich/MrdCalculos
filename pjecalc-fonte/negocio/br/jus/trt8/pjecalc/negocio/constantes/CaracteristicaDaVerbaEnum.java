/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;

public enum CaracteristicaDaVerbaEnum {
    COMUM("Comum", "C"){

        @Override
        public Verba definirOcorrenciaDePagamentoPara(Verba verba) {
            return Utils.nulo(verba) ? verba : verba.pagamentoMensal();
        }

        @Override
        public OcorrenciaDePagamentoEnum getOcorrenciaDePagamento() {
            return OcorrenciaDePagamentoEnum.MENSAL;
        }

        @Override
        public boolean permiteAlterarAOcorrenciaDePagamento() {
            return true;
        }
    }
    ,
    DECIMO_TERCEIRO_SALARIO("13\u00ba Sal\u00e1rio", "DT"){

        @Override
        public Verba definirOcorrenciaDePagamentoPara(Verba verba) {
            return Utils.nulo(verba) ? verba : verba.pagamentoEmDezembro();
        }

        @Override
        public OcorrenciaDePagamentoEnum getOcorrenciaDePagamento() {
            return OcorrenciaDePagamentoEnum.DEZEMBRO;
        }
    }
    ,
    AVISO_PREVIO("Aviso Pr\u00e9vio", "AP"){

        @Override
        public Verba definirOcorrenciaDePagamentoPara(Verba verba) {
            return Utils.nulo(verba) ? verba : verba.pagamentoNoDesligamento();
        }

        @Override
        public OcorrenciaDePagamentoEnum getOcorrenciaDePagamento() {
            return OcorrenciaDePagamentoEnum.DESLIGAMENTO;
        }
    }
    ,
    FERIAS("F\u00e9rias", "F"){

        @Override
        public Verba definirOcorrenciaDePagamentoPara(Verba verba) {
            return Utils.nulo(verba) ? verba : verba.pagamentoNoPeriodoAquisitivo();
        }

        @Override
        public OcorrenciaDePagamentoEnum getOcorrenciaDePagamento() {
            return OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO;
        }
    };

    private String nome;
    private String valor;

    private CaracteristicaDaVerbaEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public boolean permiteAlterarAOcorrenciaDePagamento() {
        return false;
    }

    public abstract Verba definirOcorrenciaDePagamentoPara(Verba var1);

    public abstract OcorrenciaDePagamentoEnum getOcorrenciaDePagamento();
}

