/**
 * OcorrenciaDeFgts — golden tests (Fase 6)
 *
 * Fidelidade 1-a-1 com OcorrenciaDeFgts.java (441 linhas).
 *
 * Cobre:
 *   - Defaults do construtor
 *   - Predicados (isOriginal, isValorCalculado, isValorInformado, isDepositadoInformado)
 *   - Bases (getSomaDasBases com/sem aviso prévio)
 *   - Devido (getValorDevido, getValorDevidoSemAviso)
 *   - Diferença (getDiferenca, clamp negativo, com/sem aviso)
 *   - Diferença corrigida (com índice estratégia)
 *   - Juros e Total
 *   - Contribuição Social LC 110/2001 (janela 01/2002 → 12/2006)
 *   - Cópia (copiar, copiarValoresInformadosAnteriormente, recuperarValorOriginal)
 *   - Igualdade (equalsOcorrencia)
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { OcorrenciaDeFgts } from '../ocorrencia-de-fgts';
import {
  AliquotaDoFgtsEnum,
  TipoDeBaseDoFgtsEnum,
  TipoDeDepositadoDoFgtsEnum,
} from '../../../../constantes/enums';

// Resolver de índice = stub que devolve o indiceAcumulado da própria ocorrência
const idResolver = (oc: OcorrenciaDeFgts) => oc.getIndiceAcumulado();

function make(opts: {
  data?: Date;
  baseHistorico?: Decimal | null;
  baseVerba?: Decimal | null;
  baseVerbaSemAvisoPrevio?: Decimal | null;
  aliquota?: AliquotaDoFgtsEnum;
  depositado?: Decimal | null;
  taxaJuros?: Decimal | null;
  indice?: Decimal | null;
  tipoBase?: TipoDeBaseDoFgtsEnum;
  tipoDep?: TipoDeDepositadoDoFgtsEnum;
} = {}): OcorrenciaDeFgts {
  const oc = new OcorrenciaDeFgts();
  oc.setOcorrencia(opts.data ?? new Date(Date.UTC(2020, 0, 1)));
  if (opts.baseHistorico !== undefined) oc.setBaseHistorico(opts.baseHistorico);
  if (opts.baseVerba !== undefined) oc.setBaseVerba(opts.baseVerba);
  if (opts.baseVerbaSemAvisoPrevio !== undefined) oc.setBaseVerbaSemAvisoPrevio(opts.baseVerbaSemAvisoPrevio);
  if (opts.aliquota) oc.setAliquotaDoFgtsEnum(opts.aliquota);
  if (opts.depositado !== undefined) oc.setDepositado(opts.depositado);
  if (opts.taxaJuros !== undefined) oc.setTaxaDeJuros(opts.taxaJuros);
  if (opts.indice !== undefined) oc.setIndiceAcumulado(opts.indice);
  if (opts.tipoBase) oc.setTipoDeBaseDoFgts(opts.tipoBase);
  if (opts.tipoDep) oc.setTipoDeDepositadoDoFgts(opts.tipoDep);
  return oc;
}

describe('OcorrenciaDeFgts — defaults do construtor', () => {
  const oc = new OcorrenciaDeFgts();
  it('alíquota default 8%', () => {
    expect(oc.getAliquotaDoFgtsEnum()).toBe(AliquotaDoFgtsEnum.OITO_PORCENTO);
  });
  it('tipoDeBaseDoFgts default = CALCULADA', () => {
    expect(oc.getTipoDeBaseDoFgts()).toBe(TipoDeBaseDoFgtsEnum.CALCULADA);
  });
  it('tipoDeDepositadoDoFgts default = CALCULADA', () => {
    expect(oc.getTipoDeDepositadoDoFgts()).toBe(TipoDeDepositadoDoFgtsEnum.CALCULADA);
  });
  it('selecionada default = false', () => {
    expect(oc.getSelecionada()).toBe(false);
  });
  it('isOriginal sem ocorrenciaOriginal = true', () => {
    expect(oc.isOriginal()).toBe(true);
  });
});

describe('OcorrenciaDeFgts — predicados', () => {
  it('isValorCalculado / isValorInformado', () => {
    const oc = make({ tipoBase: TipoDeBaseDoFgtsEnum.INFORMADA });
    expect(oc.isValorCalculado()).toBe(false);
    expect(oc.isValorInformado()).toBe(true);
  });
  it('isDepositadoInformado', () => {
    const oc = make({ tipoDep: TipoDeDepositadoDoFgtsEnum.INFORMADA });
    expect(oc.isDepositadoInformado()).toBe(true);
  });
  it('isOriginal=false quando há ocorrenciaOriginal', () => {
    const oc = new OcorrenciaDeFgts();
    oc.setOcorrenciaOriginal(new OcorrenciaDeFgts());
    expect(oc.isOriginal()).toBe(false);
  });
});

describe('OcorrenciaDeFgts.getSomaDasBases', () => {
  it('soma baseHistorico + baseVerba', () => {
    const oc = make({ baseHistorico: new Decimal(1000), baseVerba: new Decimal(500) });
    expect(oc.getSomaDasBases().toString()).toBe('1500');
  });
  it('excluirAviso=true usa baseVerbaSemAvisoPrevio', () => {
    const oc = make({
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(500),
      baseVerbaSemAvisoPrevio: new Decimal(300),
    });
    expect(oc.getSomaDasBases(true).toString()).toBe('1300');
  });
  it('null em baseHistorico tratado como 0', () => {
    const oc = make({ baseHistorico: null, baseVerba: new Decimal(500) });
    expect(oc.getSomaDasBases().toString()).toBe('500');
  });
  it('todas nulas → 0', () => {
    const oc = make({ baseHistorico: null, baseVerba: null });
    expect(oc.getSomaDasBases().toString()).toBe('0');
  });
});

describe('OcorrenciaDeFgts.getValorDevido', () => {
  it('alíquota 8% × R$1500 = R$120', () => {
    const oc = make({ baseHistorico: new Decimal(1000), baseVerba: new Decimal(500) });
    expect(oc.getValorDevido().toString()).toBe('120');
  });
  it('alíquota 2% × R$1000 = R$20 (menor aprendiz)', () => {
    const oc = make({
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(0),
      aliquota: AliquotaDoFgtsEnum.DOIS_PORCENTO,
    });
    expect(oc.getValorDevido().toString()).toBe('20');
  });
});

describe('OcorrenciaDeFgts.getDiferenca', () => {
  it('devido R$120 − depositado R$80 = R$40', () => {
    const oc = make({
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(500),
      depositado: new Decimal(80),
    });
    expect(oc.getDiferenca().toString()).toBe('40');
  });
  it('depositado > devido → clamp 0', () => {
    const oc = make({
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(0),
      depositado: new Decimal(200),
    });
    // devido = 80, depositado = 200 → −120 → 0
    expect(oc.getDiferenca().toString()).toBe('0');
  });
  it('depositado null tratado como 0', () => {
    const oc = make({ baseHistorico: new Decimal(100), baseVerba: new Decimal(0), depositado: null });
    // 8 devido − 0 = 8
    expect(oc.getDiferenca().toString()).toBe('8');
  });
  it('excluiAviso=true', () => {
    const oc = make({
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(500),
      baseVerbaSemAvisoPrevio: new Decimal(300),
      depositado: new Decimal(80),
    });
    // devido sem aviso = 8% × 1300 = 104; − 80 = 24
    expect(oc.getDiferenca(true).toString()).toBe('24');
  });
});

describe('OcorrenciaDeFgts.getDiferencaCorrigida', () => {
  it('diferença R$40 × índice 1.05 = R$42', () => {
    const oc = make({
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(500),
      depositado: new Decimal(80),
      indice: new Decimal('1.05'),
    });
    expect(oc.getDiferencaCorrigida(idResolver).toString()).toBe('42');
  });
  it('diferença 0 → corrigida 0 (skip cálculo)', () => {
    const oc = make({ depositado: new Decimal(1000), baseHistorico: null, baseVerba: null });
    expect(oc.getDiferencaCorrigida(idResolver).toString()).toBe('0');
  });
});

describe('OcorrenciaDeFgts.getJuros / getTotal', () => {
  it('juros = diferença corrigida × taxa%', () => {
    const oc = make({
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(500),
      depositado: new Decimal(80),
      indice: new Decimal('1.05'),
      taxaJuros: new Decimal('10'), // 10%
    });
    // dif corrigida = 42; juros = 42 × 0.10 = 4.2
    expect(oc.getJuros(idResolver).toString()).toBe('4.2');
  });
  it('taxa null → juros 0', () => {
    const oc = make({
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(500),
      depositado: new Decimal(80),
      indice: new Decimal('1.05'),
      taxaJuros: null,
    });
    expect(oc.getJuros(idResolver).toString()).toBe('0');
  });
  it('getTotal = diferença corrigida + juros', () => {
    const oc = make({
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(500),
      depositado: new Decimal(80),
      indice: new Decimal('1.05'),
      taxaJuros: new Decimal('10'),
    });
    expect(oc.getTotal(idResolver).toString()).toBe('46.2');
  });
});

describe('OcorrenciaDeFgts — Contribuição Social LC 110/2001 (0,5%)', () => {
  it('competência fora da janela (2001-12) → 0', () => {
    const oc = make({
      data: new Date(Date.UTC(2001, 11, 15)),
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(0),
    });
    expect(oc.getValorDaContribuicaoSocialDe05().toString()).toBe('0');
  });
  it('competência dentro da janela (2003-06) → 0,5% × bases', () => {
    const oc = make({
      data: new Date(Date.UTC(2003, 5, 1)),
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(0),
    });
    // 0,5% × 1000 = 5
    expect(oc.getValorDaContribuicaoSocialDe05().toString()).toBe('5');
  });
  it('competência exatamente na borda final (2006-12-01) → ainda dentro', () => {
    const oc = make({
      data: new Date(Date.UTC(2006, 11, 1)),
      baseHistorico: new Decimal(2000),
      baseVerba: new Decimal(0),
    });
    expect(oc.getValorDaContribuicaoSocialDe05().toString()).toBe('10');
  });
  it('competência depois da janela (2007-01) → 0', () => {
    const oc = make({
      data: new Date(Date.UTC(2007, 0, 1)),
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(0),
    });
    expect(oc.getValorDaContribuicaoSocialDe05().toString()).toBe('0');
  });
  it('CS corrigida × índice 1.10', () => {
    const oc = make({
      data: new Date(Date.UTC(2003, 5, 1)),
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(0),
      indice: new Decimal('1.10'),
    });
    expect(oc.getValorDaContribuicaoSocialDe05Corrigido().toString()).toBe('5.5');
  });
  it('total CS = corrigido + juros', () => {
    const oc = make({
      data: new Date(Date.UTC(2003, 5, 1)),
      baseHistorico: new Decimal(1000),
      baseVerba: new Decimal(0),
      indice: new Decimal('1.10'),
      taxaJuros: new Decimal('10'),
    });
    // CS corrig = 5.5; juros = 5.5 × 0.10 = 0.55; total = 6.05
    expect(oc.getTotalDaContribuicaoSocialDe05().toString()).toBe('6.05');
  });
});

describe('OcorrenciaDeFgts.copiar / recuperarValorOriginal / copiarValoresInformadosAnteriormente', () => {
  it('copiar replica todos os campos editáveis', () => {
    const original = make({
      data: new Date(Date.UTC(2020, 5, 15)),
      baseHistorico: new Decimal(123),
      baseVerba: new Decimal(45),
      depositado: new Decimal(10),
      tipoBase: TipoDeBaseDoFgtsEnum.INFORMADA,
      aliquota: AliquotaDoFgtsEnum.DOIS_PORCENTO,
    });
    const novo = new OcorrenciaDeFgts();
    novo.copiar(original);
    expect(novo.getOcorrencia()).toEqual(original.getOcorrencia());
    expect(novo.getBaseHistorico()?.toString()).toBe('123');
    expect(novo.getBaseVerba()?.toString()).toBe('45');
    expect(novo.getDepositado()?.toString()).toBe('10');
    expect(novo.getTipoDeBaseDoFgts()).toBe(TipoDeBaseDoFgtsEnum.INFORMADA);
    expect(novo.getAliquotaDoFgtsEnum()).toBe(AliquotaDoFgtsEnum.DOIS_PORCENTO);
  });

  it('recuperarValorOriginal: aplica copiar quando há original', () => {
    const original = make({ baseHistorico: new Decimal(999), baseVerba: new Decimal(0) });
    const editada = new OcorrenciaDeFgts();
    editada.setBaseHistorico(new Decimal(0));
    editada.setOcorrenciaOriginal(original);
    editada.recuperarValorOriginal();
    expect(editada.getBaseHistorico()?.toString()).toBe('999');
  });

  it('copiarValoresInformadosAnteriormente preserva edições manuais', () => {
    const antiga = make({
      baseHistorico: new Decimal(123),
      depositado: new Decimal(50),
      tipoBase: TipoDeBaseDoFgtsEnum.INFORMADA,
      tipoDep: TipoDeDepositadoDoFgtsEnum.INFORMADA,
    });
    const nova = new OcorrenciaDeFgts();
    nova.copiarValoresInformadosAnteriormente(antiga);
    expect(nova.getBaseHistorico()?.toString()).toBe('123');
    expect(nova.getDepositado()?.toString()).toBe('50');
    expect(nova.getTipoDeBaseDoFgts()).toBe(TipoDeBaseDoFgtsEnum.INFORMADA);
    expect(nova.getTipoDeDepositadoDoFgts()).toBe(TipoDeDepositadoDoFgtsEnum.INFORMADA);
  });

  it('copiarValoresInformadosAnteriormente: antiga calculada → nova fica intacta', () => {
    const antiga = make({
      baseHistorico: new Decimal(123),
      tipoBase: TipoDeBaseDoFgtsEnum.CALCULADA,
      tipoDep: TipoDeDepositadoDoFgtsEnum.CALCULADA,
    });
    const nova = new OcorrenciaDeFgts();
    nova.copiarValoresInformadosAnteriormente(antiga);
    expect(nova.getBaseHistorico()).toBeNull();
    expect(nova.getDepositado()).toBeNull();
  });

  it('copiarValoresInformadosAnteriormente: antiga null → no-op', () => {
    const nova = new OcorrenciaDeFgts();
    nova.setBaseHistorico(new Decimal(99));
    nova.copiarValoresInformadosAnteriormente(null);
    expect(nova.getBaseHistorico()?.toString()).toBe('99');
  });
});

describe('OcorrenciaDeFgts.equalsOcorrencia', () => {
  it('mesma instância: true', () => {
    const oc = new OcorrenciaDeFgts();
    expect(oc.equalsOcorrencia(oc)).toBe(true);
  });
  it('outro tipo: false', () => {
    const oc = new OcorrenciaDeFgts();
    expect(oc.equalsOcorrencia({ id: 1 })).toBe(false);
  });
  it('mesmo id: true', () => {
    const a = new OcorrenciaDeFgts(); a.setId(42);
    const b = new OcorrenciaDeFgts(); b.setId(42);
    expect(a.equalsOcorrencia(b)).toBe(true);
  });
  it('ids diferentes: false', () => {
    const a = new OcorrenciaDeFgts(); a.setId(42);
    const b = new OcorrenciaDeFgts(); b.setId(43);
    expect(a.equalsOcorrencia(b)).toBe(false);
  });
});
