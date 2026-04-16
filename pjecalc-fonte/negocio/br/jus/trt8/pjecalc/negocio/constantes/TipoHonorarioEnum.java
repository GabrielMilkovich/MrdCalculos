/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoHonorarioEnum {
    ADVOCATICIOS("Honor\u00e1rios Advocat\u00edcios", "0"),
    ASSISTENCIAIS("Honor\u00e1rios Assistenciais", "1"),
    CONTRATUAIS("Honor\u00e1rios Contratuais", "2"),
    PERICIAIS_CONTADOR("Honor\u00e1rios Periciais - Contador", "3"),
    PERICIAIS_DOCUMENTOSCOPIO("Honor\u00e1rios Periciais - Documentosc\u00f3pio", "4"),
    PERICIAIS_ENGENHEIRO("Honor\u00e1rios Periciais - Engenheiro", "5"),
    PERICIAIS_INTERPRETE("Honor\u00e1rios Periciais - Int\u00e9rprete", "6"),
    PERICIAIS_MEDICO("Honor\u00e1rios Periciais - M\u00e9dico", "7"),
    PERICIAIS_OUTROS("Honor\u00e1rios Periciais - Outros", "8"),
    SUCUMBENCIAIS("Honor\u00e1rios de Sucumb\u00eancia", "9"),
    LEILOEIRO("Leiloeiro", "10");

    private final String nome;
    private final String valor;

    private TipoHonorarioEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public static TipoHonorarioEnum get(String valor) {
        for (TipoHonorarioEnum e : TipoHonorarioEnum.values()) {
            if (!e.getValor().equalsIgnoreCase(valor)) continue;
            return e;
        }
        return null;
    }
}

