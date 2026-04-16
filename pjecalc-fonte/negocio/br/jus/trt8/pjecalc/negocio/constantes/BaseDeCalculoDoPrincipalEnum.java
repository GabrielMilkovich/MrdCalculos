/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.termo.HistoricoSalarialProxy;
import br.jus.trt8.pjecalc.negocio.dominio.termo.MaiorRemuneracaoProxy;
import br.jus.trt8.pjecalc.negocio.dominio.termo.SalarioDaCategoriaProxy;
import br.jus.trt8.pjecalc.negocio.dominio.termo.SalarioMinimoProxy;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.UltimaRemuneracaoProxy;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ValeTransporteProxy;

public enum BaseDeCalculoDoPrincipalEnum {
    ULTIMA_REMUNERACAO("\u00daltima Remunera\u00e7\u00e3o", "UR"),
    MAIOR_REMUNERACAO("Maior Remunera\u00e7\u00e3o", "MR"),
    HISTORICO_SALARIAL("Hist\u00f3rico Salarial", "HS"),
    SALARIO_DA_CATEGORIA("Piso Salarial", "SC"),
    SALARIO_MINIMO("Sal\u00e1rio M\u00ednimo", "SM"),
    VALE_TRANSPORTE("Vale Transporte", "VT");

    private String nome;
    private String valor;

    private BaseDeCalculoDoPrincipalEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public Termo criarProxyDeTermoParaFormula() {
        switch (this) {
            case MAIOR_REMUNERACAO: {
                return new MaiorRemuneracaoProxy();
            }
            case ULTIMA_REMUNERACAO: {
                return new UltimaRemuneracaoProxy();
            }
            case HISTORICO_SALARIAL: {
                return new HistoricoSalarialProxy();
            }
            case SALARIO_MINIMO: {
                return new SalarioMinimoProxy();
            }
            case SALARIO_DA_CATEGORIA: {
                return new SalarioDaCategoriaProxy();
            }
            case VALE_TRANSPORTE: {
                return new ValeTransporteProxy();
            }
        }
        throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0018, "Base Tabelada '" + this.getNome() + "' n\u00e3o dispon\u00edvel para essa vers\u00e3o"));
    }
}

