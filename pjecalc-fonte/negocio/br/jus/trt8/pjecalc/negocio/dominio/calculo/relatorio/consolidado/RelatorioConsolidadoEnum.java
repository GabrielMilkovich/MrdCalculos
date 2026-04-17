/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoRelatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import java.util.ArrayList;
import java.util.List;

public enum RelatorioConsolidadoEnum {
    RESUMO_PRECATORIO(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Resumo Precat\u00f3rio / RPV", new String[]{"relatorios/calculo/precatorio/calculo-resumo-precatorio.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-bruto-devido-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-credito-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-debito-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-debito-reclamado.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-fora-do-principal.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-custas-debito-reclamado.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-debito-sem-custas-reclamado.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-secao-debito-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-secao-outros-debitos-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-secao-outros-debitos-reclamada.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return true;
        }
    }
    ,
    RESUMO_DE_CALCULO(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Resumo de C\u00e1lculo", new String[]{"relatorios/calculo/resumo/calculo-resumo.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-bruto-devido-reclamante.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-reclamante.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-credito-reclamante.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-debito-reclamante.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-debito-reclamado.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-fora-do-principal.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-custas-debito-reclamado.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-debito-sem-custas-reclamado.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-secao-debito-reclamante.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return true;
        }
    }
    ,
    JUSTIFICATIVA(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Crit\u00e9rio de C\u00e1lculo e Fundamenta\u00e7\u00e3o Legal", new String[]{"relatorios/calculo/calculo-justificativas.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return true;
        }
    }
    ,
    DADOS_DO_CALCULO(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Dados do C\u00e1lculo", new String[]{"relatorios/calculo/parametros/dadoscalculo/dados-calculo.jrxml", "relatorios/calculo/parametros/dadoscalculo/excecoes-carga-horaria.jrxml", "relatorios/calculo/parametros/dadoscalculo/excecoes-sabado-dia-util.jrxml", "relatorios/calculo/parametros/dadoscalculo/pontos-facultativos.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return true;
        }
    }
    ,
    FALTAS_E_FERIAS(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Faltas e F\u00e9rias", new String[]{"relatorios/calculo/parametros/faltaseferias/parametros-calculo-faltas-ferias.jrxml", "relatorios/calculo/parametros/faltaseferias/faltas.jrxml", "relatorios/calculo/parametros/faltaseferias/ferias.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return Utils.naoNulo(calculo.getFaltas()) && !calculo.getFaltas().isEmpty() || Utils.naoNulo(calculo.getListaDeFerias()) && !calculo.getListaDeFerias().isEmpty();
        }
    }
    ,
    CARTAO_DIARIO(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Cart\u00e3o de Ponto Di\u00e1rio", new String[]{""}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getApuracoesDiariasCartaoDePonto().isEmpty();
        }
    }
    ,
    CARTAO_MENSAL(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Cart\u00e3o de Ponto Mensal", new String[]{""}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getCartoesDePonto().isEmpty();
        }
    }
    ,
    HISTORICO_SALARIAL(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Hist\u00f3rico Salarial", new String[]{""}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getHistoricosSalariais().isEmpty();
        }
    }
    ,
    DEMONSTRATIVO_DE_CALCULO(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Verbas", new String[]{"relatorios/calculo/calculo-demonstrativo.jrxml", "relatorios/calculo/calculo-demonstrativo-ocorrencias.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getVerbasAtivas().isEmpty();
        }
    }
    ,
    APURACAO_DE_JUROS(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Juros sobre Verbas", new String[]{"relatorios/calculo/calculo-apuracao-juros.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getParametrosDeAtualizacao().isJurosHabilitado() && !calculo.getVerbasAtivas().isEmpty();
        }
    }
    ,
    SALARIO_FAMILIA(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Sal\u00e1rio-fam\u00edlia", new String[]{"relatorios/calculo/calculo-salario-familia.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getSalarioFamilia().existemDadosParaRelatorio();
        }
    }
    ,
    SEGURO_DESEMPREGO(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Seguro-desemprego", new String[]{"relatorios/calculo/calculo-seguro-desemprego.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getSeguroDesemprego().existemDadosParaRelatorio();
        }
    }
    ,
    DEMONSTRATIVO_FGTS(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "FGTS", new String[]{"relatorios/calculo/calculo-fgts.jrxml", "relatorios/calculo/calculo-fgts-ocorrencias.jrxml", "relatorios/calculo/calculo-fgts-operacao.jrxml", "relatorios/calculo/calculo-fgts-contribuicao-social.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getFgts().existemDadosParaRelatorio();
        }
    }
    ,
    DEMONSTRATIVO_INSS(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Contribui\u00e7\u00e3o Social", new String[]{"relatorios/calculo/inss/calculo-inss.jrxml", "relatorios/calculo/inss/ocorrencias-devido-reclamante.jrxml", "relatorios/calculo/inss/ocorrencias-devido-reclamado.jrxml", "relatorios/calculo/inss/ocorrencias-devido-empresa.jrxml", "relatorios/calculo/inss/ocorrencias-devido-empresa1986.jrxml", "relatorios/calculo/inss/ocorrencias-devido-sat.jrxml", "relatorios/calculo/inss/ocorrencias-devido-terceiros.jrxml", "relatorios/calculo/inss/ocorrencias-pago-segurado.jrxml", "relatorios/calculo/inss/ocorrencias-pago-empresa.jrxml", "relatorios/calculo/inss/ocorrencias-pago-empresa1986.jrxml", "relatorios/calculo/inss/ocorrencias-pago-sat.jrxml", "relatorios/calculo/inss/ocorrencias-pago-terceiros.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getInss().existemDadosParaRelatorio();
        }
    }
    ,
    DEMONSTRATIVO_ESOCIAL_INSS_FGTS(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "eSocial - Evento S-2500", new String[]{"relatorios/calculo/esocial/evento-s2500.jrxml", "relatorios/calculo/esocial/ocorrencias-s2500-detalhadas.jrxml", "relatorios/calculo/esocial/ocorrencias-s2500-gerais.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getInss().existemDadosParaRelatorio() || calculo.getFgts().existemDadosParaRelatorio();
        }
    }
    ,
    PREVIDENCIA_PRIVADA(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Previd\u00eancia Privada", new String[]{"relatorios/calculo/calculo-previdencia-privada.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada();
        }
    }
    ,
    PENSAO_ALIMENTICIA(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Pens\u00e3o Aliment\u00edcia", new String[]{"relatorios/calculo/calculo-pensao-alimenticia.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            PensaoAlimenticia pensaoAlimenticia = calculo.getPensaoAlimenticiaDoCalculo();
            if (pensaoAlimenticia != null) {
                return pensaoAlimenticia.getApurarPensaoAlimenticia();
            }
            return false;
        }
    }
    ,
    DEMONSTRATIVO_IRPF(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Imposto de Renda", new String[]{"relatorios/calculo/calculo-irpf.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getIrpf().getApurarImpostoRenda() != false && Utils.naoNulo(calculo.getIrpf().getOcorrencias()) && !calculo.getIrpf().getOcorrencias().isEmpty();
        }
    }
    ,
    DEMONSTRATIVO_MULTA(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Multas / Indeniza\u00e7\u00f5es", new String[]{"relatorios/calculo/multa/calculo-multa.jrxml", "relatorios/calculo/multa/ocorrencias-multa-informada.jrxml", "relatorios/calculo/multa/ocorrencias-multa-calculada.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getMultasDoCalculo().isEmpty();
        }
    }
    ,
    DEMONSTRATIVO_HONORARIO(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Honor\u00e1rios", new String[]{"relatorios/calculo/honorario/calculo-honorario.jrxml", "relatorios/calculo/honorario/ocorrencias-honorario-informada.jrxml", "relatorios/calculo/honorario/ocorrencias-honorario-calculada.jrxml", "relatorios/calculo/honorario/ocorrencias-irpf-honorarios.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getHonorariosDoCalculo().isEmpty();
        }
    }
    ,
    DEMONSTRATIVO_CUSTAS(TipoRelatorioEnum.CALCULO_CONSOLIDADO, "Custas Judiciais", new String[]{"relatorios/calculo/custa/calculo-custa.jrxml", "relatorios/calculo/custa/ocorrencias-custa-fixas.jrxml", "relatorios/calculo/custa/ocorrencias-custa-autos.jrxml", "relatorios/calculo/custa/ocorrencias-custa-armazenamento.jrxml", "relatorios/calculo/custa/ocorrencias-custa-recolhida.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getCustasJudiciais().existemDadosParaRelatorio();
        }
    };

    private TipoRelatorioEnum tipo;
    private String nome;
    private String[] uri;
    private static final List<RelatorioConsolidadoEnum> RELATORIOS_CONSOLIDADO;

    private RelatorioConsolidadoEnum(TipoRelatorioEnum tipo, String nome, String[] uri) {
        this.nome = nome;
        this.uri = uri;
        this.tipo = tipo;
    }

    public String getNome() {
        return this.nome;
    }

    public String[] getUri() {
        return this.uri;
    }

    public TipoRelatorioEnum getTipo() {
        return this.tipo;
    }

    public abstract boolean isSelecionado(Calculo var1);

    public boolean isConsolidado() {
        return this.tipo == TipoRelatorioEnum.CALCULO_CONSOLIDADO;
    }

    public static List<RelatorioConsolidadoEnum> getRelatoriosConsolidado() {
        return RELATORIOS_CONSOLIDADO;
    }

    static {
        RELATORIOS_CONSOLIDADO = new ArrayList<RelatorioConsolidadoEnum>();
        for (RelatorioConsolidadoEnum r : RelatorioConsolidadoEnum.values()) {
            if (!r.isConsolidado()) continue;
            RELATORIOS_CONSOLIDADO.add(r);
        }
    }
}

