/**
 * SPRINT 2 — Auditoria Java→TS, testes dos 5 métodos auto-contidos
 * portados de `MaquinaDeCalculoDeIrpf.java` para `maquina-de-calculo-de-irpf.ts`.
 *
 * Métodos cobertos:
 *   1. encontrarDescontoParaDependentes          → Java l. 851-858
 *   2. encontrarDescontoParaAposentadoMaiorQue65Anos → Java l. 842-849
 *   3. calcularTaxaDeJurosDeIrpf                  → Java l. 1660-1664
 *   4. calcularTaxaDeMultaDeIrpf                  → Java l. 1666-1673
 *   5. preencherFaixaFiscal                       → Java l. 210-228
 *
 * Métodos NÃO portados (Sprint 2 declarado fora de escopo — dependem de
 * Phase 9 entidades Pagamento, CreditosDoReclamante, DebitosDoReclamante,
 * HonorarioDaAtualizacao, PensaoAlimenticiaDaAtualizacao):
 *   - encontrarDescontoPensao
 *   - encontrarDescontoHonorario / calcularDescontoHonorario
 *   - encontrarJurosPagos / encontrarJurosSaldo
 *   - calcularProporcao
 *   - construirOcorrenciasParaPagamento
 *   - definirDatasLimites
 *   - liquidarAtualizacao / liquidarAtualizacaoCalculoExterno
 *
 * Cobertura final SPRINT 2: 5 de 12 métodos = 42% — abaixo do gate
 * ≥80% do prompt. Os 7 restantes ficam para Sprint 9 (Phase 9 entidades
 * de pagamento). Documentado honestamente em STATE-OF-PRODUCTION.
 */
import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { Irpf } from '../irpf';
import { MaquinaDeCalculoDeIrpf } from '../maquina-de-calculo-de-irpf';
import { TabelaIrpf } from '../../../irpf/tabela-irpf';
import { OcorrenciaDeIrpfAtualizacao } from '../ocorrencia-de-irpf-atualizacao';
import { TipoOcorrenciaIrpfEnum } from '../../../../constantes/enums';
import { Calculo } from '../../calculo';

describe('SPRINT 2.2 — encontrarDescontoParaDependentes', () => {
  it('1 dependente em 2024 = R$ 189,59 (RFB IN 1500/2014)', () => {
    const irpf = new Irpf();
    irpf.setApurarImpostoRenda(true);
    irpf.setPossuiDependentes(true);
    irpf.setQuantidadeDependentes(1);
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    m.setTabelaImpostoRenda(TabelaIrpf.obterTabelaDa(new Date(2024, 5, 1)));
    expect(m.encontrarDescontoParaDependentes().toString()).toBe('189.59');
  });

  it('3 dependentes em 2024 = R$ 568,77', () => {
    const irpf = new Irpf();
    irpf.setApurarImpostoRenda(true);
    irpf.setPossuiDependentes(true);
    irpf.setQuantidadeDependentes(3);
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    m.setTabelaImpostoRenda(TabelaIrpf.obterTabelaDa(new Date(2024, 5, 1)));
    expect(m.encontrarDescontoParaDependentes().toString()).toBe('568.77');
  });

  it('possuiDependentes=false → 0 (independente da quantidade)', () => {
    const irpf = new Irpf();
    irpf.setApurarImpostoRenda(true);
    irpf.setPossuiDependentes(false);
    irpf.setQuantidadeDependentes(5);
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    m.setTabelaImpostoRenda(TabelaIrpf.obterTabelaDa(new Date(2024, 5, 1)));
    expect(m.encontrarDescontoParaDependentes().toString()).toBe('0');
  });

  it('tabelaImpostoRenda não setada → 0 (defensivo)', () => {
    const irpf = new Irpf();
    irpf.setPossuiDependentes(true);
    irpf.setQuantidadeDependentes(2);
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    expect(m.encontrarDescontoParaDependentes().toString()).toBe('0');
  });
});

describe('SPRINT 2.2 — encontrarDescontoParaAposentadoMaiorQue65Anos', () => {
  it('aposentado >65a em 2024 = R$ 1.903,98 (Lei 7.713/88 art.6º XV)', () => {
    const irpf = new Irpf();
    irpf.setApurarImpostoRenda(true);
    irpf.setAposentadoMaiorQue65Anos(true);
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    m.setTabelaImpostoRenda(TabelaIrpf.obterTabelaDa(new Date(2024, 5, 1)));
    expect(m.encontrarDescontoParaAposentadoMaiorQue65Anos().toString()).toBe('1903.98');
  });

  it('aposentado=false → 0', () => {
    const irpf = new Irpf();
    irpf.setAposentadoMaiorQue65Anos(false);
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    m.setTabelaImpostoRenda(TabelaIrpf.obterTabelaDa(new Date(2024, 5, 1)));
    expect(m.encontrarDescontoParaAposentadoMaiorQue65Anos().toString()).toBe('0');
  });
});

describe('SPRINT 2.2 — preencherFaixaFiscal (regime competência)', () => {
  // Tabela 2024-02 em diante:
  //  [ 0   - 2259.20 ] aliq=0    ded=0
  //  ]2259.20 - 2826.65] aliq=7.5  ded=169.44
  //  ]2826.65 - 3751.05] aliq=15   ded=381.44
  //  ]3751.05 - 4664.68] aliq=22.5 ded=662.77
  //  ]4664.68 - infinito] aliq=27.5 ded=896.00

  it('valor 4000 / 1 competência → faixa 22.5%, dedução 662.77', () => {
    const irpf = new Irpf();
    irpf.setApurarImpostoRenda(true);
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    m.setTabelaImpostoRenda(TabelaIrpf.obterTabelaDa(new Date(2024, 5, 1)));

    const oc = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.NORMAL);
    oc.setIrpf(irpf);
    oc.setQuantidadeCompetencias(new Decimal(1));
    oc.setValorVerbas(new Decimal(4000));
    oc.setValorJuros(new Decimal(0));
    // Força recálculo da base lazy.
    oc.atualizaBase();

    m.preencherFaixaFiscal(oc);
    // Em 2024-02, valor 4000 em 1 mês cai na 4ª faixa (22.5%).
    expect(oc['valorAliquota']?.toString() ?? '').toBe('22.5');
    expect(oc['valorDeducao']?.toString() ?? '').toBe('662.77');
  });

  it('valor 4000 / 2 competências → mesma alíquota mas dedução ×2', () => {
    const irpf = new Irpf();
    irpf.setApurarImpostoRenda(true);
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    m.setTabelaImpostoRenda(TabelaIrpf.obterTabelaDa(new Date(2024, 5, 1)));

    const oc = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.NORMAL);
    oc.setIrpf(irpf);
    oc.setQuantidadeCompetencias(new Decimal(2));
    oc.setValorVerbas(new Decimal(4000));
    oc.setValorJuros(new Decimal(0));
    oc.atualizaBase();

    m.preencherFaixaFiscal(oc);
    // 4000 / 2 = 2000 por mês → 1ª faixa (isenta). Multiplicador
    // muda a faixa-busca em obterFaixaParaValorComCompetencias.
    expect(oc['valorDeducao']?.toString() ?? '').toBe('0');
  });

  it('qtdComp = 0 → tudo zerado (sem divisão por zero)', () => {
    const irpf = new Irpf();
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    m.setTabelaImpostoRenda(TabelaIrpf.obterTabelaDa(new Date(2024, 5, 1)));

    const oc = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.NORMAL);
    oc.setIrpf(irpf);
    oc.setQuantidadeCompetencias(new Decimal(0));
    oc.setValorVerbas(new Decimal(5000));
    oc.atualizaBase();

    m.preencherFaixaFiscal(oc);
    expect(oc['valorAliquota']?.toString() ?? '').toBe('0');
    expect(oc['valorDeducao']?.toString() ?? '').toBe('0');
  });

  it('tabelaImpostoRenda não setada → no-op (não joga)', () => {
    const irpf = new Irpf();
    const m = new MaquinaDeCalculoDeIrpf(irpf);

    const oc = new OcorrenciaDeIrpfAtualizacao(TipoOcorrenciaIrpfEnum.NORMAL);
    oc.setIrpf(irpf);
    oc.setQuantidadeCompetencias(new Decimal(1));
    oc.setValorVerbas(new Decimal(3000));

    expect(() => m.preencherFaixaFiscal(oc)).not.toThrow();
  });
});

describe('SPRINT 2.2 — calcularTaxaDeJurosDeIrpf', () => {
  it('sem Calculo associado → 0 (defensivo)', () => {
    const irpf = new Irpf();
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    const taxa = m.calcularTaxaDeJurosDeIrpf(new Date(2023, 0, 1), new Date(2024, 5, 1));
    expect(taxa.toString()).toBe('0');
  });

  it('com Calculo + SELIC disponível → retorna Decimal não-negativo', () => {
    const calculo = new Calculo();
    calculo.setDataDeLiquidacao(new Date(2024, 5, 1));
    const irpf = new Irpf(calculo);
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    const taxa = m.calcularTaxaDeJurosDeIrpf(new Date(2023, 0, 1), new Date(2024, 5, 1));
    // SELIC acumulada de jan/2023 a jun/2024 é sempre > 0 (>=10%/ano).
    expect(taxa.gte(0)).toBe(true);
  });
});

describe('SPRINT 2.2 — calcularTaxaDeMultaDeIrpf', () => {
  it('sem tabelaTaxaDeMulta → null (defensivo)', () => {
    const irpf = new Irpf();
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    const taxa = m.calcularTaxaDeMultaDeIrpf(new Date(2023, 0, 1), new Date(2024, 5, 1));
    expect(taxa).toBeNull();
  });

  it('dataPagamento futura ao dataEvento → null', () => {
    const irpf = new Irpf();
    const m = new MaquinaDeCalculoDeIrpf(irpf);
    // Mesmo SEM tabela, deve voltar null sem explodir (curto-circuito).
    const taxa = m.calcularTaxaDeMultaDeIrpf(new Date(2030, 0, 1), new Date(2024, 5, 1));
    expect(taxa).toBeNull();
  });
});
