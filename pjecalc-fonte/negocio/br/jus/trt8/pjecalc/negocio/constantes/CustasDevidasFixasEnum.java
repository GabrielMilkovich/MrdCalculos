/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import java.math.BigDecimal;

public enum CustasDevidasFixasEnum {
    ATOS_URBANOS_DO_OFICIAL_DE_JUSTICA("Atos dos Oficiais de Justi\u00e7a - Zona Urbana"){

        @Override
        public BigDecimal getBase(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getValorAtosUrbanos();
        }

        @Override
        public Integer getQuantidade(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getQtdeAtosUrbanos();
        }

        @Override
        public Integer getQuantidade(CustasFixasAtualizacao custasFixasAtualizacao) {
            return custasFixasAtualizacao.getQtdeAtosUrbanos();
        }
    }
    ,
    ATOS_RURAIS_DO_OFICIAL_DE_JUSTICA("Atos dos Oficiais de Justi\u00e7a - Zona Rural"){

        @Override
        public BigDecimal getBase(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getValorAtosRurais();
        }

        @Override
        public Integer getQuantidade(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getQtdeAtosRurais();
        }

        @Override
        public Integer getQuantidade(CustasFixasAtualizacao custasFixasAtualizacao) {
            return custasFixasAtualizacao.getQtdeAtosRurais();
        }
    }
    ,
    AGRAVO_DE_INSTRUMENTO("Agravo de Instrumento"){

        @Override
        public BigDecimal getBase(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getValorAgravoInstrumento();
        }

        @Override
        public Integer getQuantidade(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getQtdeAgravosDeInstrumento();
        }

        @Override
        public Integer getQuantidade(CustasFixasAtualizacao custasFixasAtualizacao) {
            return custasFixasAtualizacao.getQtdeAgravosDeInstrumento();
        }
    }
    ,
    AGRAVO_DE_PETICAO("Agravo de Peti\u00e7\u00e3o"){

        @Override
        public BigDecimal getBase(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getValorAgravoPeticao();
        }

        @Override
        public Integer getQuantidade(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getQtdeAgravosDePeticao();
        }

        @Override
        public Integer getQuantidade(CustasFixasAtualizacao custasFixasAtualizacao) {
            return custasFixasAtualizacao.getQtdeAgravosDePeticao();
        }
    }
    ,
    IMPUGNACAO_SENTENCA_DE_LIQUIDACAO("Impugna\u00e7\u00e3o \u00e0 Senten\u00e7a de Liquida\u00e7\u00e3o"){

        @Override
        public BigDecimal getBase(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getValorImpuganacaoSentenca();
        }

        @Override
        public Integer getQuantidade(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getQtdeImpugnacaoSentenca();
        }

        @Override
        public Integer getQuantidade(CustasFixasAtualizacao custasFixasAtualizacao) {
            return custasFixasAtualizacao.getQtdeImpugnacaoSentenca();
        }
    }
    ,
    EMBARGOS_A_ARREMATACAO("Embargos \u00e0 Arremata\u00e7\u00e3o"){

        @Override
        public BigDecimal getBase(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getValorEmbargosArrematacao();
        }

        @Override
        public Integer getQuantidade(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getQtdeEmbargosArrematacao();
        }

        @Override
        public Integer getQuantidade(CustasFixasAtualizacao custasFixasAtualizacao) {
            return custasFixasAtualizacao.getQtdeEmbargosArrematacao();
        }
    }
    ,
    EMBARGOS_A_EXECUCAO("Embargos \u00e0 Execu\u00e7\u00e3o"){

        @Override
        public BigDecimal getBase(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getValorEmbargosExecucao();
        }

        @Override
        public Integer getQuantidade(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getQtdeEmbargosExecucao();
        }

        @Override
        public Integer getQuantidade(CustasFixasAtualizacao custasFixasAtualizacao) {
            return custasFixasAtualizacao.getQtdeEmbargosExecucao();
        }
    }
    ,
    EMBARGOS_DE_TERCEIROS("Embargos de Terceiros"){

        @Override
        public BigDecimal getBase(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getValorEmbargosTerceiros();
        }

        @Override
        public Integer getQuantidade(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getQtdeEmbargosTerceiros();
        }

        @Override
        public Integer getQuantidade(CustasFixasAtualizacao custasFixasAtualizacao) {
            return custasFixasAtualizacao.getQtdeEmbargosTerceiros();
        }
    }
    ,
    RECURSO_DE_REVISTA("Recurso de Revista"){

        @Override
        public BigDecimal getBase(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getValorRecursoRevista();
        }

        @Override
        public Integer getQuantidade(CustasJudiciais custasJudiciais) {
            return custasJudiciais.getQtdeRecursoRevista();
        }

        @Override
        public Integer getQuantidade(CustasFixasAtualizacao custasFixasAtualizacao) {
            return custasFixasAtualizacao.getQtdeRecursoRevista();
        }
    };

    private String descricao;

    private CustasDevidasFixasEnum(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return this.descricao;
    }

    public abstract BigDecimal getBase(CustasJudiciais var1);

    public abstract Integer getQuantidade(CustasJudiciais var1);

    public abstract Integer getQuantidade(CustasFixasAtualizacao var1);

    public BigDecimal getValor(CustasJudiciais custasJudiciais) {
        BigDecimal base = this.getBase(custasJudiciais);
        Integer quantidade = this.getQuantidade(custasJudiciais);
        if (Utils.naoNulos(base, quantidade)) {
            return base.multiply(new BigDecimal(quantidade.toString()), Utils.CONTEXTO_MATEMATICO);
        }
        return null;
    }
}

