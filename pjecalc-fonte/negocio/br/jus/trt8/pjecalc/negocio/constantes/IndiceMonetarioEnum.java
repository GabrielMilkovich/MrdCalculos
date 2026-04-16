/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum IndiceMonetarioEnum {
    INDICE_TRABALHISTA("\u00cdndice Trabalhista", "INDTR"),
    TUACDT("Tabela \u00danica de Atualiza\u00e7\u00e3o e Convers\u00e3o de D\u00e9bitos Trabalhistas", "TUACDT"),
    TABELA_DEVEDOR_FAZENDA("Devedor Fazenda P\u00fablica", "DFP"),
    TABELA_INDEBITO_TRIBUTARIO("Repeti\u00e7\u00e3o de Ind\u00e9bito Tribut\u00e1rio", "IT"),
    TABELA_UNICA_JT_MENSAL("Tabela JT Mensal", "TUJTM"),
    TABELA_UNICA_JT_DIARIO("Tabela JT Di\u00e1ria", "TUJTD"),
    TR("TR", "TR"),
    IGPM("IGP-M", "IGPM"),
    INPC("INPC", "INPC"),
    IPC("IPC", "IPC"),
    IPCA("IPCA", "IPCA"),
    IPCAE("IPCA-E", "IPCAE"),
    IPCAETR("IPCA-E/TR", "IPCAETR"),
    JAM("JAM", "JAM"),
    SELIC("SELIC (Receita Federal)", "SELIC"),
    SELIC_FAZENDA("SELIC Simples", "SELFAZ"),
    SELIC_BACEN("SELIC Composta", "SELBAC"),
    SEM_CORRECAO("Sem Corre\u00e7\u00e3o", "SEMCO");

    private String nome;
    private String valor;

    private IndiceMonetarioEnum(String nome, String valor) {
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

