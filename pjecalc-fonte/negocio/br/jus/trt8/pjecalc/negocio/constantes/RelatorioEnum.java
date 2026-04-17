/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceDeCorrecaoDoFGTSEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeApuracaoPrazoDoAvisoPrevioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoRelatorioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import java.util.ArrayList;
import java.util.List;

public enum RelatorioEnum {
    DEMONSTRATIVO_DE_CALCULO(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Verbas", new String[]{"relatorios/calculo/calculo-demonstrativo.jrxml", "relatorios/calculo/calculo-demonstrativo-ocorrencias.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getVerbasAtivas().isEmpty();
        }
    }
    ,
    APURACAO_DE_JUROS(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Juros sobre Verbas", new String[]{"relatorios/calculo/calculo-apuracao-juros.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getParametrosDeAtualizacao().isJurosHabilitado() && !calculo.getVerbasAtivas().isEmpty();
        }
    }
    ,
    SALARIO_FAMILIA(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Sal\u00e1rio Fam\u00edlia", new String[]{"relatorios/calculo/calculo-salario-familia.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getSalarioFamilia().existemDadosParaRelatorio();
        }
    }
    ,
    SEGURO_DESEMPREGO(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Seguro Desemprego", new String[]{"relatorios/calculo/calculo-seguro-desemprego.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getSeguroDesemprego().existemDadosParaRelatorio();
        }
    }
    ,
    DEMONSTRATIVO_FGTS(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "FGTS", new String[]{"relatorios/calculo/calculo-fgts.jrxml", "relatorios/calculo/calculo-fgts-ocorrencias.jrxml", "relatorios/calculo/calculo-fgts-operacao.jrxml", "relatorios/calculo/calculo-fgts-contribuicao-social.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getFgts().existemDadosParaRelatorio();
        }
    }
    ,
    DEMONSTRATIVO_INSS(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Contribui\u00e7\u00e3o Social", new String[]{"relatorios/calculo/inss/calculo-inss.jrxml", "relatorios/calculo/inss/ocorrencias-devido-reclamante.jrxml", "relatorios/calculo/inss/ocorrencias-devido-reclamado.jrxml", "relatorios/calculo/inss/ocorrencias-devido-empresa.jrxml", "relatorios/calculo/inss/ocorrencias-devido-empresa1986.jrxml", "relatorios/calculo/inss/ocorrencias-devido-sat.jrxml", "relatorios/calculo/inss/ocorrencias-devido-terceiros.jrxml", "relatorios/calculo/inss/ocorrencias-pago-segurado.jrxml", "relatorios/calculo/inss/ocorrencias-pago-empresa.jrxml", "relatorios/calculo/inss/ocorrencias-pago-empresa1986.jrxml", "relatorios/calculo/inss/ocorrencias-pago-sat.jrxml", "relatorios/calculo/inss/ocorrencias-pago-terceiros.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getInss().existemDadosParaRelatorio();
        }
    }
    ,
    DEMONSTRATIVO_ESOCIAL_INSS_FGTS(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "E-Social: Contribui\u00e7\u00e3o Social e FGTS", new String[]{"relatorios/calculo/esocial/calculo-inss.jrxml", "relatorios/calculo/esocial/ocorrencias-devido-reclamante.jrxml", "relatorios/calculo/esocial/ocorrencias-devido-reclamado.jrxml", "relatorios/calculo/esocial/ocorrencias-devido-empresa.jrxml", "relatorios/calculo/esocial/ocorrencias-devido-empresa1986.jrxml", "relatorios/calculo/esocial/ocorrencias-devido-sat.jrxml", "relatorios/calculo/esocial/ocorrencias-devido-terceiros.jrxml", "relatorios/calculo/esocial/ocorrencias-pago-segurado.jrxml", "relatorios/calculo/esocial/ocorrencias-pago-empresa.jrxml", "relatorios/calculo/esocial/ocorrencias-pago-empresa1986.jrxml", "relatorios/calculo/esocial/ocorrencias-pago-sat.jrxml", "relatorios/calculo/esocial/ocorrencias-pago-terceiros.jrxml", "relatorios/calculo/esocial/ocorrencias-resumo.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getInss().existemDadosParaRelatorio();
        }
    }
    ,
    PREVIDENCIA_PRIVADA(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Previd\u00eancia Privada", new String[]{"relatorios/calculo/calculo-previdencia-privada.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada();
        }
    }
    ,
    PENSAO_ALIMENTICIA(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Pens\u00e3o Aliment\u00edcia", new String[]{"relatorios/calculo/calculo-pensao-alimenticia.jrxml"}){

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
    DEMONSTRATIVO_MULTA(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Multas / Indeniza\u00e7\u00f5es", new String[]{"relatorios/calculo/multa/calculo-multa.jrxml", "relatorios/calculo/multa/ocorrencias-multa-informada.jrxml", "relatorios/calculo/multa/ocorrencias-multa-calculada.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getMultasDoCalculo().isEmpty();
        }
    }
    ,
    DEMONSTRATIVO_HONORARIO(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Honor\u00e1rios", new String[]{"relatorios/calculo/honorario/calculo-honorario.jrxml", "relatorios/calculo/honorario/ocorrencias-honorario-informada.jrxml", "relatorios/calculo/honorario/ocorrencias-honorario-calculada.jrxml", "relatorios/calculo/honorario/ocorrencias-irpf-honorarios.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getHonorariosDoCalculo().isEmpty();
        }
    }
    ,
    DEMONSTRATIVO_IRPF(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Imposto de Renda", new String[]{"relatorios/calculo/calculo-irpf.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getIrpf().getApurarImpostoRenda() != false && Utils.naoNulo(calculo.getIrpf().getOcorrencias()) && !calculo.getIrpf().getOcorrencias().isEmpty();
        }
    }
    ,
    DEMONSTRATIVO_CUSTAS(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Custas Judiciais", new String[]{"relatorios/calculo/custa/calculo-custa.jrxml", "relatorios/calculo/custa/ocorrencias-custa-fixas.jrxml", "relatorios/calculo/custa/ocorrencias-custa-autos.jrxml", "relatorios/calculo/custa/ocorrencias-custa-armazenamento.jrxml", "relatorios/calculo/custa/ocorrencias-custa-recolhida.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return calculo.getCustasJudiciais().existemDadosParaRelatorio();
        }
    }
    ,
    RESUMO_PRECATORIO(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Resumo Precat\u00f3rio / RPV", new String[]{"relatorios/calculo/precatorio/calculo-resumo-precatorio.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-bruto-devido-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-credito-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-debito-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-debito-reclamado.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-fora-do-principal.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-custas-debito-reclamado.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-debito-sem-custas-reclamado.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-secao-debito-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-secao-outros-debitos-reclamante.jrxml", "relatorios/calculo/precatorio/ocorrencias-resumo-precatorio-secao-outros-debitos-reclamada.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return true;
        }
    }
    ,
    RESUMO_DE_CALCULO(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Resumo de C\u00e1lculo", new String[]{"relatorios/calculo/resumo/calculo-resumo.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-bruto-devido-reclamante.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-reclamante.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-credito-reclamante.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-debito-reclamante.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-debito-reclamado.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-fora-do-principal.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-custas-debito-reclamado.jrxml", "relatorios/calculo/resumo/ocorrencias-resumo-debito-sem-custas-reclamado.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return true;
        }
    }
    ,
    JUSTIFICATIVA(TipoRelatorioEnum.DEMONSTRATIVO_CALCULO, "Crit\u00e9rio de C\u00e1lculo e Fundamenta\u00e7\u00e3o Legal", new String[]{"relatorios/calculo/calculo-justificativas.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return Boolean.TRUE.equals(calculo.getPrescricaoQuinquenal()) || Boolean.TRUE.equals(calculo.getPrescricaoFgts()) || !TipoDeApuracaoPrazoDoAvisoPrevioEnum.NAO_APURAR.equals((Object)calculo.getApuracaoPrazoDoAvisoPrevio()) || Boolean.TRUE.equals(calculo.getProjetaAvisoIndenizado()) || IndiceDeCorrecaoDoFGTSEnum.UTILIZAR_INDICE_JAM.equals((Object)calculo.getParametrosDeAtualizacao().getIndiceDeCorrecaoDoFGTS()) || OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)calculo.getParametrosDeAtualizacao().getIndiceDeCorrecaoDePrevidenciaPrivada()) || this.temMultaInformadaOutrosIndices(calculo) || this.temHonorarioInformadaOutrosIndices(calculo) || Boolean.TRUE.equals(calculo.getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS()) || Boolean.TRUE.equals(calculo.getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosDevidosDoINSS()) || Boolean.TRUE.equals(calculo.getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosPagosDoINSS()) && Boolean.TRUE.equals(calculo.getInss().getApurarInssSobreSalariosPagos()) || Boolean.TRUE.equals(calculo.getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosPagosDoINSS()) && Boolean.TRUE.equals(calculo.getInss().getApurarInssSobreSalariosPagos()) || HelperDate.getInstance("28/07/2010").greaterThenOrEquals(calculo.getDataDeLiquidacao()) || calculo.getIrpf().getAbrangenciaDaApuracao() > -1;
        }

        private boolean temMultaInformadaOutrosIndices(Calculo calculo) {
            for (Multa multa : calculo.getMultasDoCalculo()) {
                if (!TipoValorEnum.INFORMADO.equals((Object)multa.getTipoValorDaMulta()) || !OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)multa.getOpcaoIndiceDeCorrecaoDaMulta())) continue;
                return true;
            }
            return false;
        }

        private boolean temHonorarioInformadaOutrosIndices(Calculo calculo) {
            for (Honorario honorario : calculo.getHonorariosDoCalculo()) {
                if (!TipoValorEnum.INFORMADO.equals((Object)honorario.getTipoValor()) || !OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_OUTRO_INDICE.equals((Object)honorario.getTipoDeIndiceDeCorrecao())) continue;
                return true;
            }
            return false;
        }
    }
    ,
    DADOS_DO_CALCULO(TipoRelatorioEnum.PARAMETROS_CALCULO, "Dados do C\u00e1lculo", new String[]{"relatorios/calculo/parametros/dadoscalculo/dados-calculo.jrxml", "relatorios/calculo/parametros/dadoscalculo/excecoes-carga-horaria.jrxml", "relatorios/calculo/parametros/dadoscalculo/excecoes-sabado-dia-util.jrxml", "relatorios/calculo/parametros/dadoscalculo/pontos-facultativos.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return Boolean.TRUE;
        }
    }
    ,
    HISTORICO_SALARIAL(TipoRelatorioEnum.PARAMETROS_CALCULO, "Hist\u00f3rico Salarial", new String[]{""}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !calculo.getHistoricosSalariais().isEmpty();
        }
    }
    ,
    FALTAS_E_FERIAS(TipoRelatorioEnum.PARAMETROS_CALCULO, "Faltas e F\u00e9rias", new String[]{"relatorios/calculo/parametros/faltaseferias/parametros-calculo-faltas-ferias.jrxml", "relatorios/calculo/parametros/faltaseferias/faltas.jrxml", "relatorios/calculo/parametros/faltaseferias/ferias.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return Utils.naoNulo(calculo.getFaltas()) && !calculo.getFaltas().isEmpty() || Utils.naoNulo(calculo.getListaDeFerias()) && !calculo.getListaDeFerias().isEmpty();
        }
    };

    private TipoRelatorioEnum tipo;
    private String nome;
    private String[] uri;
    private static final List<RelatorioEnum> RELATORIOS_DEMONSTRATIVO_CALCULO;
    private static final List<RelatorioEnum> RELATORIOS_PARAMETROS_CALCULO;

    private RelatorioEnum(TipoRelatorioEnum tipo, String nome, String[] uri) {
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

    public void setTipo(TipoRelatorioEnum tipo) {
        this.tipo = tipo;
    }

    public abstract boolean isSelecionado(Calculo var1);

    public boolean isDemonstrativoCalculo() {
        return this.tipo == TipoRelatorioEnum.DEMONSTRATIVO_CALCULO;
    }

    public boolean isParametrosCalculo() {
        return this.tipo == TipoRelatorioEnum.PARAMETROS_CALCULO;
    }

    public static List<RelatorioEnum> getRelatoriosDemonstrativoCalculo() {
        return RELATORIOS_DEMONSTRATIVO_CALCULO;
    }

    public static List<RelatorioEnum> getRelatoriosParametrosCalculo() {
        return RELATORIOS_PARAMETROS_CALCULO;
    }

    static {
        RELATORIOS_DEMONSTRATIVO_CALCULO = new ArrayList<RelatorioEnum>();
        RELATORIOS_PARAMETROS_CALCULO = new ArrayList<RelatorioEnum>();
        for (RelatorioEnum r : RelatorioEnum.values()) {
            if (r.isDemonstrativoCalculo()) {
                RELATORIOS_DEMONSTRATIVO_CALCULO.add(r);
                continue;
            }
            if (!r.isParametrosCalculo()) continue;
            RELATORIOS_PARAMETROS_CALCULO.add(r);
        }
    }
}

