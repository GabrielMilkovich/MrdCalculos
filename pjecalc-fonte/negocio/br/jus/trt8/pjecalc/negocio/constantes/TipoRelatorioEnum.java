/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoRelatorioEnum {
    DEMONSTRATIVO_CALCULO("calculo", "relatorios/calculo/calculo.jrxml", 'C'),
    PARAMETROS_CALCULO("parametros-calculo", "relatorios/calculo/parametros/parametros-calculo.jrxml", 'C'),
    CALCULO_CONSOLIDADO("consolidado", "relatorios/calculo/consolidado/consolidado.jrxml", 'C'),
    PAGAMENTO_CONSOLIDADO("pagamento-consolidado", "relatorios/atualizacao/consolidado/pagamento-consolidado.jrxml", 'A');

    private final String id;
    private final String uri;
    private final char origem;

    private TipoRelatorioEnum(String id, String uri, char origem) {
        this.id = id;
        this.uri = uri;
        this.origem = origem;
    }

    public String getId() {
        return this.id;
    }

    public String getUri() {
        return this.uri;
    }

    public char getOrigem() {
        return this.origem;
    }

    public boolean isOrigemCalculo() {
        return this.origem == 'C';
    }

    public boolean isOrigemAtualizacao() {
        return this.origem == 'A';
    }
}

