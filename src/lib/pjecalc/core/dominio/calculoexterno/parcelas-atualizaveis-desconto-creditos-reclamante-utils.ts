/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisDescontoCreditosReclamanteUtils
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamanteUtils
 */
import { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';
import { Mensagens } from '../../comum/mensagens';
import { CredorDevedorMultaEnum } from '../../constantes/enums';
import { ParcelasAtualizaveisDescontoCreditosReclamante } from './parcelas-atualizaveis-desconto-creditos-reclamante';
import { ParcelasAtualizaveisHonorario } from './parcelas-atualizaveis-honorario';
import { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';
import { ParcelasAtualizaveisMultaIndenizacaoUtils } from './parcelas-atualizaveis-multa-indenizacao-utils';
import { ParcelasAtualizaveisUtils } from './parcelas-atualizaveis-utils';

const VALOR_DA_PARCELA = 'Valor da Parcela';

export class ParcelasAtualizaveisDescontoCreditosReclamanteUtils extends ParcelasAtualizaveisUtils {
  static consistirDados(pa: ParcelasAtualizaveisDescontoCreditosReclamante): void {
    const erros = ParcelasAtualizaveisDescontoCreditosReclamanteUtils.validarPreenchimentoFormulario(pa);
    ParcelasAtualizaveisDescontoCreditosReclamanteUtils.lancarErros(erros);

    if (!pa.getMarcarMultaIndenizTerceiroReclamante()) {
      pa.setMultaIndenizTerceiroReclamante(new ParcelasAtualizaveisMultaIndenizacao());
      pa.setListaMultasIndenizTerceiroReclamante([]);
    } else {
      for (const multa of pa.getListaMultasIndenizTerceiroReclamante()) {
        multa.setTipoCredorDevedor(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE);
        multa.setDescontoCreditosReclamante(pa);
        ParcelasAtualizaveisMultaIndenizacaoUtils.consistirDados(multa);
      }
    }

    if (!pa.getMarcarHonorariosDevReclamante()) {
      pa.setHonorariosDevReclamante(new ParcelasAtualizaveisHonorario());
      pa.setListaHonorariosDevReclamante([]);
    } else {
      for (const honorario of pa.getListaHonorariosDevReclamante()) {
        honorario.setDescontoCreditosReclamante(pa);
        // TODO(fase-15): ParcelasAtualizaveisHonorarioUtils.consistirDados(honorario)
      }
    }

    if (!pa.getMarcarContribSocialSegurado()) {
      pa.setValorParcelaContribSocialSegurado(null);
      // TODO(fase-15): calculoExterno.inss.inssSobreSalariosDevidos.setCorrigirDescontoReclamante(true)
    } else {
      // TODO(fase-15): calculoExterno.inss.inssSobreSalariosDevidos.setCorrigirDescontoReclamante(pa.getCorrigirDescontoReclamante())
    }

    ParcelasAtualizaveisDescontoCreditosReclamanteUtils.consistirPrevidenciaPrivada(pa);
    ParcelasAtualizaveisDescontoCreditosReclamanteUtils.consistirPensaoAlimenticia(pa);
    ParcelasAtualizaveisDescontoCreditosReclamanteUtils.consistirCustasConhecimentoReclamante(pa);
  }

  private static validarPreenchimentoFormulario(pa: ParcelasAtualizaveisDescontoCreditosReclamante): MensagemDeRecurso[] {
    const erros: MensagemDeRecurso[] = [];
    // Nota: no Java o ramo `getValorParcelaContribSocialSegurado() == null` nunca dispara,
    // pois o getter retorna ZERO quando o campo é null. Preservamos o comportamento
    // efetivo (nenhum erro adicionado para contribSocialSegurado).
    if (pa.getMarcarPrevidenciaPrivada() && pa.getValorParcelaPrevidenciaPrivada() == null) {
      erros.push(new MensagemDeRecurso('valorParcelaDescCredReclamPrevidenciaPrivada', Mensagens.MSG0003, VALOR_DA_PARCELA));
    }
    if (pa.getMarcarPensaoAlimenticia()) {
      if (pa.getAliquotaPensaoAlimenticia() == null) {
        erros.push(new MensagemDeRecurso('aliquotaPensaoAlimenticia', Mensagens.MSG0003, 'Alíquota'));
      }
      if (
        !pa.getIncidirSobrePrincipalTributavelPensaoAlimenticia() &&
        !pa.getIncidirSobrePrincipalNaoTributavelPensaoAlimenticia() &&
        !pa.getIncidirSobreFgtsPensaoAlimenticia()
      ) {
        erros.push(new MensagemDeRecurso(Mensagens.MSG0171));
      } else {
        if (pa.getIncidirSobrePrincipalTributavelPensaoAlimenticia() && pa.getPercPrincipalTributavelPensaoAlimenticia() == null) {
          erros.push(new MensagemDeRecurso('percPrincipalTribPensaoAliment', Mensagens.MSG0003, 'Percentual Principal Tributável'));
        }
        if (pa.getIncidirSobrePrincipalNaoTributavelPensaoAlimenticia() && pa.getPercPrincipalNaoTributavelPensaoAlimenticia() == null) {
          erros.push(new MensagemDeRecurso('percPrincipalNaoTribPensaoAliment', Mensagens.MSG0003, 'Percentual Principal Não Tributável'));
        }
      }
    }
    // TODO(fase-15): validar piso custas reclamante (depende de Calculo.custasJudiciais portado).
    return erros;
  }

  private static consistirPensaoAlimenticia(pa: ParcelasAtualizaveisDescontoCreditosReclamante): void {
    if (!pa.getMarcarPensaoAlimenticia()) {
      pa.setAliquotaPensaoAlimenticia(null);
      pa.setAplicarJurosPensaoAlimenticia(false);
      pa.setPercPrincipalTributavelPensaoAlimenticia(null);
      pa.setPercPrincipalNaoTributavelPensaoAlimenticia(null);
      pa.setIncidirSobrePrincipalTributavelPensaoAlimenticia(false);
      pa.setIncidirSobrePrincipalNaoTributavelPensaoAlimenticia(false);
      pa.setIncidirSobreFgtsPensaoAlimenticia(false);
      pa.setIncidirSobreMultaPensaoAlimenticia(false);
    }
    // TODO(fase-15): propagar para Calculo.pensaoAlimenticia + Calculo.fgts quando portados.
  }

  /** TODO(fase-15): depende de CustasJudiciais portado. */
  private static consistirCustasConhecimentoReclamante(pa: ParcelasAtualizaveisDescontoCreditosReclamante): void {
    if (!pa.getMarcarCustasConhecimentoReclamante()) {
      pa.setCustasConhecimentoReclamante(null);
    }
  }

  /** TODO(fase-15): depende de PrevidenciaPrivada + Informada + TabelaDeCorrecaoMonetaria portados. */
  private static consistirPrevidenciaPrivada(pa: ParcelasAtualizaveisDescontoCreditosReclamante): void {
    if (!pa.getMarcarPrevidenciaPrivada()) {
      pa.setValorParcelaPrevidenciaPrivada(null);
    }
    // Fluxo completo (criar AliquotaDePrevidenciaPrivada + Informada) fica para fase seguinte.
  }
}
