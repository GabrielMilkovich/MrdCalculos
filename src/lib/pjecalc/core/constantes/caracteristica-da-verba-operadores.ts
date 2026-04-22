/**
 * PJe-Calc v2.15.1 — Operadores polimórficos de CaracteristicaDaVerbaEnum
 *
 * Porte de: br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum
 *
 * Em Java, o enum define métodos abstratos (`definirOcorrenciaDePagamentoPara`,
 * `getOcorrenciaDePagamento`, `permiteAlterarAOcorrenciaDePagamento`) e os
 * sobrescreve por constante (COMUM, DECIMO_TERCEIRO_SALARIO, AVISO_PREVIO,
 * FERIAS). Em TS esse padrão é expressado como tabela de strategies indexada
 * pelo valor do enum — mantém a mesma semântica, sem heranças.
 *
 * Fidelidade semântica: 1-a-1 com o Java. Qualquer divergência deve ser
 * registrada em docs/PORT-PJECALC-KNOWN-DIVERGENCES.md.
 */
import {
  CaracteristicaDaVerbaEnum,
  OcorrenciaDePagamentoEnum,
} from './enums';

// Interface mínima que o operador precisa da Verba — evita ciclo de import.
// Usada apenas para chamadas fluentes; Verba completa não precisa ser visível
// aqui.
export interface VerbaComOcorrencia {
  pagamentoMensal(): VerbaComOcorrencia;
  pagamentoEmDezembro(): VerbaComOcorrencia;
  pagamentoNoDesligamento(): VerbaComOcorrencia;
  pagamentoNoPeriodoAquisitivo(): VerbaComOcorrencia;
}

export interface CaracteristicaOperador {
  /** Nome humano (ex.: "13º Salário"). */
  readonly nome: string;
  /** Valor persistido (char code — ex.: "DT" para décimo terceiro). */
  readonly valor: string;
  /**
   * Aplica a ocorrência de pagamento padrão à verba dada.
   * Retorna a própria verba para encadeamento (fluent).
   * Se `verba` for null/undefined, retorna o mesmo valor sem efeito colateral
   * (idêntico ao Java, que usa `Utils.nulo(verba)`).
   */
  definirOcorrenciaDePagamentoPara<V extends VerbaComOcorrencia | null | undefined>(verba: V): V;
  /** Ocorrência de pagamento associada à característica. */
  getOcorrenciaDePagamento(): OcorrenciaDePagamentoEnum;
  /**
   * Se o usuário pode alterar a ocorrência de pagamento. Só `COMUM` permite;
   * as demais são rígidas.
   */
  permiteAlterarAOcorrenciaDePagamento(): boolean;
}

export const CaracteristicaDaVerbaOperadores: Record<
  CaracteristicaDaVerbaEnum,
  CaracteristicaOperador
> = {
  [CaracteristicaDaVerbaEnum.COMUM]: {
    nome: 'Comum',
    valor: 'C',
    definirOcorrenciaDePagamentoPara<V extends VerbaComOcorrencia | null | undefined>(verba: V): V {
      if (verba == null) return verba;
      return verba.pagamentoMensal() as V;
    },
    getOcorrenciaDePagamento(): OcorrenciaDePagamentoEnum {
      return OcorrenciaDePagamentoEnum.MENSAL;
    },
    permiteAlterarAOcorrenciaDePagamento(): boolean {
      return true;
    },
  },
  [CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO]: {
    nome: '13º Salário',
    valor: 'DT',
    definirOcorrenciaDePagamentoPara<V extends VerbaComOcorrencia | null | undefined>(verba: V): V {
      if (verba == null) return verba;
      return verba.pagamentoEmDezembro() as V;
    },
    getOcorrenciaDePagamento(): OcorrenciaDePagamentoEnum {
      return OcorrenciaDePagamentoEnum.DEZEMBRO;
    },
    permiteAlterarAOcorrenciaDePagamento(): boolean {
      return false;
    },
  },
  [CaracteristicaDaVerbaEnum.AVISO_PREVIO]: {
    nome: 'Aviso Prévio',
    valor: 'AP',
    definirOcorrenciaDePagamentoPara<V extends VerbaComOcorrencia | null | undefined>(verba: V): V {
      if (verba == null) return verba;
      return verba.pagamentoNoDesligamento() as V;
    },
    getOcorrenciaDePagamento(): OcorrenciaDePagamentoEnum {
      return OcorrenciaDePagamentoEnum.DESLIGAMENTO;
    },
    permiteAlterarAOcorrenciaDePagamento(): boolean {
      return false;
    },
  },
  [CaracteristicaDaVerbaEnum.FERIAS]: {
    nome: 'Férias',
    valor: 'F',
    definirOcorrenciaDePagamentoPara<V extends VerbaComOcorrencia | null | undefined>(verba: V): V {
      if (verba == null) return verba;
      return verba.pagamentoNoPeriodoAquisitivo() as V;
    },
    getOcorrenciaDePagamento(): OcorrenciaDePagamentoEnum {
      return OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO;
    },
    permiteAlterarAOcorrenciaDePagamento(): boolean {
      return false;
    },
  },
};

/** Resolve o operador a partir do enum. */
export function operadorDaCaracteristica(c: CaracteristicaDaVerbaEnum): CaracteristicaOperador {
  return CaracteristicaDaVerbaOperadores[c];
}
