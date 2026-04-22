/**
 * Verba — golden tests (Fase 3)
 *
 * Fidelidade 1-a-1 com Verba.java do PJe-Calc v2.15.1.
 *
 * Estas suites validam:
 *  - defaults do construtor
 *  - mutadores fluentes de característica (COMUM / 13º / Aviso Prévio / Férias)
 *  - `setCaracteristica()` chama o operador polimórfico que redefine a
 *    ocorrência de pagamento
 *  - `permiteAlterarOcorrenciaDePagamento()` retorna true só para COMUM
 *  - `validar()` lança NegocioException com MSG0003/MSG0004 conforme o Java
 *  - `montarNomeCompleto()` gera o nome para PRINCIPAL e REFLEXO
 *  - `aplicarConfiguracaoImplicita()` reproduz o comportamento de `salvar()`
 *    do Java (configurarVerbaInformada / configurarVerbaPrincipal)
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { Verba } from '../verba';
import {
  BaseDeCalculoDoPrincipalEnum,
  CaracteristicaDaVerbaEnum,
  ComportamentoDoReflexoEnumFull,
  DivisorDeVerbaEnum,
  JurosDoAjuizamentoEnum,
  LogicoEnum,
  OcorrenciaDePagamentoEnum,
  PeriodoDaMediaDoReflexoEnum,
  TipoDeGeracaoEnum,
  TipoDeQuantidadeEnum,
  TipoVariacaoDaParcelaEnum,
  ValorDaVerbaEnum,
} from '../../../constantes/enums';
import { TipoDeVerbaEnum } from '../../../constantes/tipo-de-verba-enum';
import {
  operadorDaCaracteristica,
} from '../../../constantes/caracteristica-da-verba-operadores';
import { NegocioException } from '../../../comum/exceptions/negocio-exception';
import { Mensagens } from '../../../comum/mensagens';

describe('Verba — defaults do construtor (paridade Verba.java)', () => {
  const v = new Verba();

  it('valor = CALCULADO', () => { expect(v.getValor()).toBe(ValorDaVerbaEnum.CALCULADO); });
  it('tipo = PRINCIPAL', () => { expect(v.getTipo()).toBe(TipoDeVerbaEnum.PRINCIPAL); });
  it('característica = COMUM', () => {
    expect(v.getCaracteristica()).toBe(CaracteristicaDaVerbaEnum.COMUM);
  });
  it('ocorrência de pagamento = MENSAL', () => {
    expect(v.getOcorrenciaDePagamento()).toBe(OcorrenciaDePagamentoEnum.MENSAL);
  });
  it('juros do ajuizamento = OCORRENCIAS_VENCIDAS', () => {
    expect(v.getJurosDoAjuizamento()).toBe(JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS);
  });
  it('comporPrincipal = SIM', () => {
    expect(v.getComporPrincipal()).toBe(LogicoEnum.SIM);
  });
  it('baseDeCalculoDoPrincipal = HISTORICO_SALARIAL', () => {
    expect(v.getBaseDeCalculoDoPrincipal()).toBe(BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL);
  });
  it('divisor = OUTRO_VALOR', () => { expect(v.getDivisor()).toBe(DivisorDeVerbaEnum.OUTRO_VALOR); });
  it('geracaoReflexo = DIFERENCA', () => {
    expect(v.getGeracaoReflexo()).toBe(TipoDeGeracaoEnum.DIFERENCA);
  });
  it('comportamentoDoReflexo = VALOR_MENSAL', () => {
    expect(v.getComportamentoDoReflexo()).toBe(ComportamentoDoReflexoEnumFull.VALOR_MENSAL);
  });
  it('periodoMediaReflexo = PERIODO_AQUISITIVO', () => {
    expect(v.getPeriodoMediaReflexo()).toBe(PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO);
  });
  it('tipoVariacaoParcela = FIXA', () => {
    expect(v.getTipoVariacaoParcela()).toBe(TipoVariacaoDaParcelaEnum.FIXA);
  });
  it('tipoDaQuantidade = INFORMADA', () => {
    expect(v.getTipoDaQuantidade()).toBe(TipoDeQuantidadeEnum.INFORMADA);
  });
  it('incidências todas = false', () => {
    expect(v.getIncidenciaINSS()).toBe(false);
    expect(v.getIncidenciaIRPF()).toBe(false);
    expect(v.getIncidenciaFGTS()).toBe(false);
    expect(v.getIncidenciaPrevidenciaPrivada()).toBe(false);
    expect(v.getIncidenciaPensaoAlimenticia()).toBe(false);
  });
  it('exclusões todas = false', () => {
    expect(v.getExcluirFaltaJustificada()).toBe(false);
    expect(v.getExcluirFaltaNaoJustificada()).toBe(false);
    expect(v.getExcluirFeriasGozadas()).toBe(false);
  });
  it('nome e descrição vazios retornam string vazia', () => {
    expect(v.getNome()).toBe('');
    expect(v.getDescricao()).toBe('');
  });
  it('basesDeCalculoDoReflexo vazio', () => {
    expect(v.getBasesDeCalculoDoReflexo().size).toBe(0);
  });
});

describe('Verba — mutadores fluentes de característica', () => {
  it('comCaracteristicaComum() troca para COMUM e pagamento MENSAL', () => {
    const v = new Verba();
    v.setCaracteristica(CaracteristicaDaVerbaEnum.AVISO_PREVIO); // primeiro vira AP
    v.comCaracteristicaComum();
    expect(v.isVerbaComum()).toBe(true);
    expect(v.getOcorrenciaDePagamento()).toBe(OcorrenciaDePagamentoEnum.MENSAL);
  });

  it('comCaracteristicaDeDecimoTerceiro() troca para DT e pagamento DEZEMBRO', () => {
    const v = new Verba();
    v.comCaracteristicaDeDecimoTerceiro();
    expect(v.isVerbaDeDecimoTerceiro()).toBe(true);
    expect(v.getOcorrenciaDePagamento()).toBe(OcorrenciaDePagamentoEnum.DEZEMBRO);
  });

  it('comCaracteristicaDeAvisoPrevio() troca para AP e pagamento DESLIGAMENTO', () => {
    const v = new Verba();
    v.comCaracteristicaDeAvisoPrevio();
    expect(v.isVerbaDeAvisoPrevio()).toBe(true);
    expect(v.getOcorrenciaDePagamento()).toBe(OcorrenciaDePagamentoEnum.DESLIGAMENTO);
  });

  it('comCaracteristicaDeFerias() troca para F e pagamento PERIODO_AQUISITIVO', () => {
    const v = new Verba();
    v.comCaracteristicaDeFerias();
    expect(v.isVerbaDeFerias()).toBe(true);
    expect(v.getOcorrenciaDePagamento()).toBe(OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO);
  });
});

describe('Verba — permiteAlterarOcorrenciaDePagamento (só COMUM)', () => {
  it('COMUM permite', () => {
    const v = new Verba().comCaracteristicaComum();
    expect(v.permiteAlterarOcorrenciaDePagamento()).toBe(true);
  });
  it('DECIMO_TERCEIRO não permite', () => {
    const v = new Verba().comCaracteristicaDeDecimoTerceiro();
    expect(v.permiteAlterarOcorrenciaDePagamento()).toBe(false);
  });
  it('AVISO_PREVIO não permite', () => {
    const v = new Verba().comCaracteristicaDeAvisoPrevio();
    expect(v.permiteAlterarOcorrenciaDePagamento()).toBe(false);
  });
  it('FERIAS não permite', () => {
    const v = new Verba().comCaracteristicaDeFerias();
    expect(v.permiteAlterarOcorrenciaDePagamento()).toBe(false);
  });
});

describe('Verba — operadores polimórficos de CaracteristicaDaVerbaEnum', () => {
  it('operadorDaCaracteristica(COMUM).getOcorrenciaDePagamento = MENSAL', () => {
    expect(
      operadorDaCaracteristica(CaracteristicaDaVerbaEnum.COMUM).getOcorrenciaDePagamento(),
    ).toBe(OcorrenciaDePagamentoEnum.MENSAL);
  });
  it('operadorDaCaracteristica(DECIMO_TERCEIRO).getOcorrenciaDePagamento = DEZEMBRO', () => {
    expect(
      operadorDaCaracteristica(CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO).getOcorrenciaDePagamento(),
    ).toBe(OcorrenciaDePagamentoEnum.DEZEMBRO);
  });
  it('operadorDaCaracteristica(AVISO_PREVIO).getOcorrenciaDePagamento = DESLIGAMENTO', () => {
    expect(
      operadorDaCaracteristica(CaracteristicaDaVerbaEnum.AVISO_PREVIO).getOcorrenciaDePagamento(),
    ).toBe(OcorrenciaDePagamentoEnum.DESLIGAMENTO);
  });
  it('operadorDaCaracteristica(FERIAS).getOcorrenciaDePagamento = PERIODO_AQUISITIVO', () => {
    expect(
      operadorDaCaracteristica(CaracteristicaDaVerbaEnum.FERIAS).getOcorrenciaDePagamento(),
    ).toBe(OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO);
  });

  it('definirOcorrenciaDePagamentoPara(null) é seguro (no-op, idêntico ao Java)', () => {
    const op = operadorDaCaracteristica(CaracteristicaDaVerbaEnum.COMUM);
    expect(() => op.definirOcorrenciaDePagamentoPara(null)).not.toThrow();
    expect(op.definirOcorrenciaDePagamentoPara(null)).toBeNull();
  });

  it('permiteAlterarAOcorrenciaDePagamento: COMUM=true, demais=false', () => {
    expect(
      operadorDaCaracteristica(CaracteristicaDaVerbaEnum.COMUM).permiteAlterarAOcorrenciaDePagamento(),
    ).toBe(true);
    expect(
      operadorDaCaracteristica(CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO).permiteAlterarAOcorrenciaDePagamento(),
    ).toBe(false);
    expect(
      operadorDaCaracteristica(CaracteristicaDaVerbaEnum.AVISO_PREVIO).permiteAlterarAOcorrenciaDePagamento(),
    ).toBe(false);
    expect(
      operadorDaCaracteristica(CaracteristicaDaVerbaEnum.FERIAS).permiteAlterarAOcorrenciaDePagamento(),
    ).toBe(false);
  });
});

describe('Verba.validar() — fidelidade 1-a-1 com Java.validar()', () => {
  function construirPrincipalValida(): Verba {
    const v = new Verba();
    v.setBaseDeCalculoDoPrincipal(BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO);
    v.setDivisor(DivisorDeVerbaEnum.OUTRO_VALOR);
    v.setOutroDivisor(new Decimal(30));
    v.setMultiplicador(new Decimal(1));
    v.setGeracaoReflexo(TipoDeGeracaoEnum.DIFERENCA);
    v.setTipoDaQuantidade(TipoDeQuantidadeEnum.INFORMADA);
    v.setValorInformadoDaQuantidade(new Decimal(1));
    return v;
  }

  it('Principal válida não lança', () => {
    const v = construirPrincipalValida();
    expect(() => v.validar()).not.toThrow();
    expect(v.validar()).toBe(v); // retorna `this`
  });

  it('Principal sem multiplicador → NegocioException com MSG0003 em "multiplicadorOutro"', () => {
    const v = construirPrincipalValida();
    v.setMultiplicador(null);
    try {
      v.validar();
      throw new Error('deveria ter lançado NegocioException');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msgs = (e as NegocioException).getMensagensDeRecurso();
      expect(msgs.length).toBeGreaterThan(0);
      const found = msgs.find(m => m.getAtributo() === 'multiplicadorOutro');
      expect(found).toBeDefined();
      expect(found!.getChave()).toBe(Mensagens.MSG0003);
    }
  });

  it('Principal com multiplicador ≤ 0 → MSG0004', () => {
    const v = construirPrincipalValida();
    v.setMultiplicador(new Decimal(-1));
    try {
      v.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso().find(m => m.getAtributo() === 'multiplicadorOutro');
      expect(msg?.getChave()).toBe(Mensagens.MSG0004);
    }
  });

  it('Principal com divisor OUTRO_VALOR sem outroDivisor → MSG0003 em "divisorOutro"', () => {
    const v = construirPrincipalValida();
    v.setOutroDivisor(null);
    try {
      v.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso().find(m => m.getAtributo() === 'divisorOutro');
      expect(msg?.getChave()).toBe(Mensagens.MSG0003);
    }
  });

  it('Principal com outroDivisor ≤ 0 → MSG0004', () => {
    const v = construirPrincipalValida();
    v.setOutroDivisor(new Decimal(0));
    try {
      v.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso().find(m => m.getAtributo() === 'divisorOutro');
      expect(msg?.getChave()).toBe(Mensagens.MSG0004);
    }
  });

  it('Principal com quantidade INFORMADA negativa → MSG0004', () => {
    const v = construirPrincipalValida();
    v.setValorInformadoDaQuantidade(new Decimal(-1));
    try {
      v.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso().find(m => m.getAtributo() === 'valorInformadoDaQuantidade');
      expect(msg?.getChave()).toBe(Mensagens.MSG0004);
    }
  });

  it('Reflexo com multiplicador = 0 → lança imediatamente (Java: throw direto)', () => {
    const v = new Verba();
    v.setTipo(TipoDeVerbaEnum.REFLEXO);
    v.getBasesDeCalculoDoReflexo().add(new Verba());
    v.setDivisor(DivisorDeVerbaEnum.OUTRO_VALOR);
    v.setOutroDivisor(new Decimal(30));
    v.setMultiplicador(new Decimal(0));
    expect(() => v.validar()).toThrow(NegocioException);
  });

  it('Reflexo sem bases de cálculo → MSG0003 em "baseCalculoReflexo"', () => {
    const v = new Verba();
    v.setTipo(TipoDeVerbaEnum.REFLEXO);
    v.setDivisor(DivisorDeVerbaEnum.OUTRO_VALOR);
    v.setOutroDivisor(new Decimal(30));
    v.setMultiplicador(new Decimal(1));
    try {
      v.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso().find(m => m.getAtributo() === 'baseCalculoReflexo');
      expect(msg?.getChave()).toBe(Mensagens.MSG0003);
    }
  });

  it('Valor informado não dispara nenhuma validação (Java: ramo não entra)', () => {
    const v = new Verba();
    v.setValor(ValorDaVerbaEnum.INFORMADO);
    // Sem multiplicador/outroDivisor/geracaoReflexo — mas como é INFORMADA, não deve lançar.
    expect(() => v.validar()).not.toThrow();
  });
});

describe('Verba — montarNomeCompleto (paridade 1-a-1 Java)', () => {
  it('Principal: nome = descricao em upper-case', () => {
    const v = new Verba();
    v.setTipo(TipoDeVerbaEnum.PRINCIPAL);
    v.setDescricao('Horas Extras 50%');
    v.montarNomeCompleto(null);
    expect(v.getNome()).toBe('HORAS EXTRAS 50%');
  });

  it('Reflexo sobre principal encontrada: "<descricao> SOBRE <descricao principal>"', () => {
    const principal = new Verba();
    principal.setTipo(TipoDeVerbaEnum.PRINCIPAL);
    principal.setDescricao('Horas Extras 50%');

    const reflexo = new Verba();
    reflexo.setTipo(TipoDeVerbaEnum.REFLEXO);
    reflexo.setDescricao('Reflexo em DSR');
    reflexo.getBasesDeCalculoDoReflexo().add(principal);

    reflexo.montarNomeCompleto(null);
    expect(reflexo.getNome()).toBe('Reflexo em DSR SOBRE Horas Extras 50%');
  });

  it('Reflexo sem principal nas bases: sufixo " "', () => {
    const reflexo = new Verba();
    reflexo.setTipo(TipoDeVerbaEnum.REFLEXO);
    reflexo.setDescricao('Reflexo em DSR');
    // sem nenhuma base

    reflexo.montarNomeCompleto(null);
    expect(reflexo.getNome()).toBe('Reflexo em DSR ');
  });

  it('verbas parâmetro explícito é respeitado quando !== null', () => {
    const principal = new Verba();
    principal.setTipo(TipoDeVerbaEnum.PRINCIPAL);
    principal.setDescricao('Salário');

    const reflexo = new Verba();
    reflexo.setTipo(TipoDeVerbaEnum.REFLEXO);
    reflexo.setDescricao('Reflexo');

    const verbasExplicitas = new Set<Verba>();
    verbasExplicitas.add(principal);

    reflexo.montarNomeCompleto(verbasExplicitas);
    expect(reflexo.getNome()).toBe('Reflexo SOBRE Salário');
  });
});

describe('Verba.aplicarConfiguracaoImplicita (Java: salvar())', () => {
  it('Valor INFORMADO → configura verba informada (divisor OUTRO_VALOR, bases vazias, etc.)', () => {
    const v = new Verba();
    v.setValor(ValorDaVerbaEnum.INFORMADO);
    v.getBasesDeCalculoDoReflexo().add(new Verba()); // sujeira proposital
    v.setOutroDivisor(new Decimal(99));

    v.aplicarConfiguracaoImplicita();

    expect(v.getTipo()).toBe(TipoDeVerbaEnum.PRINCIPAL);
    expect(v.getGeracaoReflexo()).toBe(TipoDeGeracaoEnum.DIFERENCA);
    expect(v.getBaseDeCalculoDoPrincipal()).toBe(BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO);
    expect(v.getBasesDeCalculoDoReflexo().size).toBe(0);
    expect(v.getDivisor()).toBe(DivisorDeVerbaEnum.OUTRO_VALOR);
    expect(v.getOutroDivisor()).toBeNull();
    expect(v.getMultiplicador()).toBeNull();
    expect(v.getAplicarProporcionalidade()).toBe(false);
  });

  it('CALCULADO + Principal → apenas bases e dados de reflexo zerados', () => {
    const v = new Verba();
    v.setValor(ValorDaVerbaEnum.CALCULADO);
    v.setTipo(TipoDeVerbaEnum.PRINCIPAL);
    v.getBasesDeCalculoDoReflexo().add(new Verba());

    v.aplicarConfiguracaoImplicita();

    expect(v.getBasesDeCalculoDoReflexo().size).toBe(0);
    expect(v.getComportamentoDoReflexo()).toBe(ComportamentoDoReflexoEnumFull.VALOR_MENSAL);
    expect(v.getPeriodoMediaReflexo()).toBe(PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO);
  });

  it('CALCULADO + Reflexo → sem side-effects', () => {
    const v = new Verba();
    v.setValor(ValorDaVerbaEnum.CALCULADO);
    v.setTipo(TipoDeVerbaEnum.REFLEXO);
    const base = new Verba();
    v.getBasesDeCalculoDoReflexo().add(base);

    v.aplicarConfiguracaoImplicita();

    expect(v.getBasesDeCalculoDoReflexo().size).toBe(1);
    expect(v.getBasesDeCalculoDoReflexo().has(base)).toBe(true);
  });
});

describe('Verba — regras de proporcionalidade', () => {
  it('COMUM + MENSAL permite proporcionalidade (base e quantidade)', () => {
    const v = new Verba().comCaracteristicaComum().pagamentoMensal();
    expect(v.isPermiteAplicarPropocionalidadeABase()).toBe(true);
    expect(v.isPermiteAplicarPropocionalidadeAQuantidade()).toBe(true);
  });

  it('COMUM + DESLIGAMENTO permite proporcionalidade', () => {
    const v = new Verba().comCaracteristicaComum().pagamentoNoDesligamento();
    expect(v.isPermiteAplicarPropocionalidadeABase()).toBe(true);
  });

  it('COMUM + DEZEMBRO NÃO permite', () => {
    const v = new Verba().comCaracteristicaComum().pagamentoEmDezembro();
    expect(v.isPermiteAplicarPropocionalidadeABase()).toBe(false);
  });

  it('13º (DEZEMBRO fixo) NÃO permite', () => {
    const v = new Verba().comCaracteristicaDeDecimoTerceiro();
    expect(v.isPermiteAplicarPropocionalidadeABase()).toBe(false);
  });

  it('Férias NÃO permite (característica não é COMUM)', () => {
    const v = new Verba().comCaracteristicaDeFerias();
    expect(v.isPermiteAplicarPropocionalidadeABase()).toBe(false);
  });
});

describe('Verba — helpers de enums', () => {
  it('isInformarDivisor: true apenas para DivisorDeVerbaEnum.OUTRO_VALOR', () => {
    const v = new Verba();
    v.setDivisor(DivisorDeVerbaEnum.OUTRO_VALOR);
    expect(v.isInformarDivisor()).toBe(true);
    v.setDivisor(DivisorDeVerbaEnum.CARGA_HORARIA);
    expect(v.isInformarDivisor()).toBe(false);
  });

  it('tipos de quantidade', () => {
    const v = new Verba();
    v.setTipoDaQuantidade(TipoDeQuantidadeEnum.INFORMADA);
    expect(v.isTipoDaQuantidadeInformada()).toBe(true);
    v.setTipoDaQuantidade(TipoDeQuantidadeEnum.AVOS);
    expect(v.isTipoDaQuantidadeAvos()).toBe(true);
    v.setTipoDaQuantidade(TipoDeQuantidadeEnum.IMPORTADA_DO_CALENDARIO);
    expect(v.isTipoDaQuantidadeImportadaDoCalendario()).toBe(true);
  });

  it('isTipoDaQuantidadeImportadaDoCartaoDePonto SEMPRE retorna false (DV-002)', () => {
    const v = new Verba();
    expect(v.isTipoDaQuantidadeImportadaDoCartaoDePonto()).toBe(false);
    // preservamos paridade com Java que tem essa resposta fixa
    v.setTipoDaQuantidade(TipoDeQuantidadeEnum.AVOS);
    expect(v.isTipoDaQuantidadeImportadaDoCartaoDePonto()).toBe(false);
  });
});
