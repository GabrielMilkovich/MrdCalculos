import { describe, expect, it } from 'vitest';
import { layoutViaVarejoV1 } from '../layouts/via-varejo-v1';

const FIXTURE_HOLERITE_VIA_VAREJO = `
RECIBO DE PAGAMENTO DE SALÁRIO
VIA VAREJO S.A.
CNPJ: 33.041.260/0001-04
Filial: VIA VAREJO LOJA EQ 123

Empregado: 12345 ROQUE GUERREIRO TEIXEIRA
Admissão: 24/11/2003
Função: VENDEDOR COMISSIONISTA

REFERÊNCIA: 11/2021

COD   DESCRIÇÃO                    REF        VENCIMENTO    DESCONTO
0001  SALARIO BASE                 30,00       1.320,00
0620  COMISSOES                                1.309,42
0501  DSR S/ COMISSAO                            362,40
3290  PREMIO ANTECIPADO                          250,00
0712  MINIMO GARANTIDO                           880,00
4013  HORAS EXTRAS COM 75%          2,50         123,45
5560  INSS                                                    187,50
5500  IR RETIDO                                                45,20
3684  CONVENIO MEDICO                                         120,00

TOTAL VENCIMENTOS                             4.245,27
TOTAL DESCONTOS                                               352,70
LIQUIDO                                       3.892,57
`;

const FIXTURE_SEM_REFERENCIA = `
VIA VAREJO S.A.
REFERÊNCIA DO MES

COD   DESCRIÇÃO                    VENCIMENTO
0001  SALARIO BASE                 1.320,00
0620  COMISSOES                    1.309,42
`;

describe('layoutViaVarejoV1', () => {
  it('reconhece sinais Via Varejo no fixture', () => {
    const todosMatch = layoutViaVarejoV1.sinaisIdentificacao.every((re) =>
      re.test(FIXTURE_HOLERITE_VIA_VAREJO),
    );
    expect(todosMatch).toBe(true);
  });

  it('não reconhece documento sem Via Varejo', () => {
    const text = 'RECIBO DE PAGAMENTO EMPRESA GENÉRICA REFERÊNCIA: 11/2021';
    const todosMatch = layoutViaVarejoV1.sinaisIdentificacao.every((re) =>
      re.test(text),
    );
    expect(todosMatch).toBe(false);
  });

  it('extrai competência correta 11/2021', () => {
    const result = layoutViaVarejoV1.parse(FIXTURE_HOLERITE_VIA_VAREJO);
    expect(result?.competencia).toBe('11/2021');
  });

  it('extrai todas as 9 rubricas', () => {
    const result = layoutViaVarejoV1.parse(FIXTURE_HOLERITE_VIA_VAREJO);
    expect(result?.rubricas.length).toBe(9);
  });

  it('primeiro rubrica é SALARIO BASE com vencimento 1320', () => {
    const result = layoutViaVarejoV1.parse(FIXTURE_HOLERITE_VIA_VAREJO);
    const r = result!.rubricas[0];
    expect(r.codigo).toBe('0001');
    expect(r.nome).toContain('SALARIO BASE');
    expect(r.valor_vencimento).toBe(1320.00);
  });

  it('COMISSOES tem valor vencimento correto', () => {
    const result = layoutViaVarejoV1.parse(FIXTURE_HOLERITE_VIA_VAREJO);
    const comissao = result!.rubricas.find((r) => r.codigo === '0620');
    expect(comissao).toBeDefined();
    expect(comissao!.valor_vencimento).toBe(1309.42);
  });

  it('INSS tem valor desconto (não vencimento)', () => {
    const result = layoutViaVarejoV1.parse(FIXTURE_HOLERITE_VIA_VAREJO);
    const inss = result!.rubricas.find((r) => r.codigo === '5560');
    expect(inss).toBeDefined();
    expect(inss!.valor_vencimento).toBe(187.50);
  });

  it('layout_usado é via_varejo_v1', () => {
    const result = layoutViaVarejoV1.parse(FIXTURE_HOLERITE_VIA_VAREJO);
    expect(result?.layout_usado).toBe('via_varejo_v1');
  });

  it('sem warning provisório', () => {
    const result = layoutViaVarejoV1.parse(FIXTURE_HOLERITE_VIA_VAREJO);
    expect(result?.warnings.find((w) => w.includes('provisório'))).toBeUndefined();
  });

  it('competência não detectada emite warning', () => {
    const result = layoutViaVarejoV1.parse(FIXTURE_SEM_REFERENCIA);
    expect(result?.competencia).toBe('00/0000');
    expect(result?.warnings).toContain('Competência não detectada — usando 00/0000.');
  });

  it('código de 3 dígitos é aceito', () => {
    const text = `VIA VAREJO S.A.\nREFERÊNCIA: 01/2024\n001  SALARIO  1.000,00`;
    const result = layoutViaVarejoV1.parse(text);
    expect(result!.rubricas.length).toBe(1);
    expect(result!.rubricas[0].codigo).toBe('001');
  });

  it('código de 5 dígitos é aceito', () => {
    const text = `VIA VAREJO S.A.\nREFERÊNCIA: 01/2024\n10001 VERBA ESPECIAL  500,00`;
    const result = layoutViaVarejoV1.parse(text);
    expect(result!.rubricas.length).toBe(1);
    expect(result!.rubricas[0].codigo).toBe('10001');
  });

  it('linha truncada sem valor não produz rubrica (sem crash)', () => {
    const text = `VIA VAREJO S.A.\nREFERÊNCIA: 01/2024\n0001 SALARIO BASE\n0620 COMISSOES  1.000,00`;
    const result = layoutViaVarejoV1.parse(text);
    expect(result!.rubricas.length).toBe(1);
    expect(result!.rubricas[0].codigo).toBe('0620');
  });
});
