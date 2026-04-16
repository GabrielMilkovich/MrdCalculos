/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum JurosEnum {
    JUROS_PADRAO("Juros Padr\u00e3o", "JPA"),
    JUROS_POUPANCA("Juros Caderneta de Poupan\u00e7a", "JPO"),
    FAZENDA_PUBLICA("Juros Fazenda P\u00fablica", "FPU"),
    JUROS_MEIO_PORCENTO("Juros Simples 0,5% a.m.", "JMP"),
    JUROS_UM_PORCENTO("Juros Simples 1,0% a.m.", "JUP"),
    JUROS_ZERO_TRINTA_TRES("Juros Simples 0,0333333% a.d.", "JZT"),
    JUROS_PRECATORIO_EC_136_2025("Juros Precat\u00f3rio EC 136/2025", "JPE"),
    SELIC("SELIC (Receita Federal)", "SEL"),
    SELIC_FAZENDA("SELIC Simples", "SLF"),
    SELIC_BACEN("SELIC Composta", "SLB"),
    TRD_SIMPLES("TRD Juros Simples", "TRS"),
    TRD_COMPOSTOS("TRD Juros Compostos", "TRC"),
    TAXA_LEGAL("Taxa Legal", "TXL"),
    SEM_JUROS("Sem Juros", "SJU");

    private String nome;
    private String valor;

    private JurosEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }
}

