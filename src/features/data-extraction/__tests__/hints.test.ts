import { describe, expect, it } from 'vitest';
import { getDefaultHint } from '../classification/hints';

describe('getDefaultHint — DSR (avaliado primeiro)', () => {
  it('DSR(Comissão) sugere DSR', () => {
    expect(getDefaultHint('DSR(Comissão)')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'dsr',
    });
  });

  it('DSR (Comissão) com espaço sugere DSR', () => {
    expect(getDefaultHint('DSR (Comissão)')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'dsr',
    });
  });

  it('int. prêmio no DSR sugere DSR (não premiação)', () => {
    expect(getDefaultHint('int. prêmio no DSR')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'dsr',
    });
  });

  it('DSR (H.Extra) sugere ignorar (HE não entra)', () => {
    expect(getDefaultHint('DSR (H.Extra)')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });

  it('DSR genérico sem H.Extra sugere DSR', () => {
    expect(getDefaultHint('DSR')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'dsr',
    });
  });
});

describe('getDefaultHint — IGNORAR (HE e descontos)', () => {
  it('HORAS EXT-COMISS sugere ignorar (não comissão)', () => {
    expect(getDefaultHint('HORAS EXT-COMISS-50%')).toMatchObject({
      tipo: 'sugerir_ignorar',
    });
  });
  it('H.Extra sugere ignorar', () => {
    expect(getDefaultHint('H.Extra 100%')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('INSS sugere ignorar', () => {
    expect(getDefaultHint('INSS')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('IRRF sugere ignorar', () => {
    expect(getDefaultHint('IRRF')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('Vale Transporte sugere ignorar', () => {
    expect(getDefaultHint('Vale Transporte')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('Cesta Básica sugere ignorar', () => {
    expect(getDefaultHint('Cesta Básica')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('PRESTACAO DE CARNE sugere ignorar', () => {
    expect(getDefaultHint('PRESTACAO DE CARNE')).toMatchObject({
      tipo: 'sugerir_ignorar',
    });
  });
  it('INTERMEDICA SAUDE sugere ignorar', () => {
    expect(getDefaultHint('INTERMEDICA SAUDE')).toMatchObject({
      tipo: 'sugerir_ignorar',
    });
  });
  it('Contribuição sindical sugere ignorar', () => {
    expect(getDefaultHint('Contribuição Sindical')).toMatchObject({
      tipo: 'sugerir_ignorar',
    });
  });
});

describe('getDefaultHint — Comissão', () => {
  it('Comissões sugere comissão', () => {
    expect(getDefaultHint('Comissões')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'comissao',
    });
  });
  it('COM. GARANTIA sugere comissão', () => {
    expect(getDefaultHint('COM. GARANTIA')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'comissao',
    });
  });
  it('COM.SEGUROS sugere comissão', () => {
    expect(getDefaultHint('COM.SEGUROS')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'comissao',
    });
  });
  it('Compl. Vendedor sugere comissão', () => {
    expect(getDefaultHint('Compl. Vendedor Interno')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'comissao',
    });
  });
});

describe('getDefaultHint — Premiação', () => {
  it('PREMIO ANTECIPADO sugere premiação', () => {
    expect(getDefaultHint('PREMIO ANTECIPADO')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'premiacao',
    });
  });
  it('CAMPANHA SERVICOS sugere premiação', () => {
    expect(getDefaultHint('CAMPANHA SERVICOS')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'premiacao',
    });
  });
  it('Bonificação sugere premiação', () => {
    expect(getDefaultHint('Bonificação Anual')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'premiacao',
    });
  });
});

describe('getDefaultHint — Salário-família', () => {
  it('"Salário-família" → categoria salario_familia', () => {
    expect(getDefaultHint('Salário-família')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'salario_familia',
    });
  });
  it('"SALARIO FAMILIA" sem hífen → categoria salario_familia', () => {
    expect(getDefaultHint('SALARIO FAMILIA')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'salario_familia',
    });
  });
  it('"Sal. Família" abreviado → categoria salario_familia', () => {
    expect(getDefaultHint('Sal. Família')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'salario_familia',
    });
  });
});

describe('getDefaultHint — Mínimo Garantido', () => {
  it('"Mínimo Garantido" → categoria minimo_garantido', () => {
    expect(getDefaultHint('Mínimo Garantido')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'minimo_garantido',
    });
  });
  it('"GARANTIA MINIMA" → categoria minimo_garantido', () => {
    expect(getDefaultHint('GARANTIA MINIMA')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'minimo_garantido',
    });
  });
  // Importante: "COM. GARANTIA" deve continuar caindo em comissão (regex
  // específico bate antes), não em mínimo garantido.
  it('"COM. GARANTIA" continua sendo comissão (regex específico bate antes)', () => {
    expect(getDefaultHint('COM. GARANTIA')).toMatchObject({
      tipo: 'sugerir_categoria',
      slug: 'comissao',
    });
  });
});

describe('getDefaultHint — verbas rescisórias e 13º (não entram no histórico salarial)', () => {
  it('13º salário sugere ignorar', () => {
    expect(getDefaultHint('13º Salário')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('"DECIMO TERCEIRO" sugere ignorar', () => {
    expect(getDefaultHint('DECIMO TERCEIRO ADIANTADO')).toMatchObject({
      tipo: 'sugerir_ignorar',
    });
  });
  it('"13 SALARIO" sem ordinal sugere ignorar', () => {
    expect(getDefaultHint('13 SALARIO')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('Aviso prévio indenizado sugere ignorar', () => {
    expect(getDefaultHint('Aviso Prévio Indenizado')).toMatchObject({
      tipo: 'sugerir_ignorar',
    });
  });
  it('Aviso prévio trabalhado sugere ignorar (verba rescisória)', () => {
    expect(getDefaultHint('Aviso Prévio Trabalhado')).toMatchObject({
      tipo: 'sugerir_ignorar',
    });
  });
  it('Multa 40% FGTS sugere ignorar', () => {
    expect(getDefaultHint('Multa 40% FGTS')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('Férias indenizadas sugere ignorar', () => {
    expect(getDefaultHint('Férias Indenizadas')).toMatchObject({
      tipo: 'sugerir_ignorar',
    });
  });
  it('Férias proporcionais sugere ignorar (rescisão)', () => {
    expect(getDefaultHint('Férias Proporcionais')).toMatchObject({
      tipo: 'sugerir_ignorar',
    });
  });
  it('FGTS depósito (linha informativa) sugere ignorar', () => {
    expect(getDefaultHint('FGTS')).toMatchObject({ tipo: 'sugerir_ignorar' });
    expect(getDefaultHint('Depósito FGTS')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('PIS PASEP sugere ignorar', () => {
    expect(getDefaultHint('PIS')).toMatchObject({ tipo: 'sugerir_ignorar' });
  });
  it('Salário base não confunde com verbas rescisórias', () => {
    // "Salário Base" deve NÃO ser ignorado (cai em fallback salario_fixo).
    expect(getDefaultHint('Salário Base')).toBeNull();
  });
});

describe('getDefaultHint — null', () => {
  it('rubrica desconhecida não retorna nada', () => {
    expect(getDefaultHint('XYZ123')).toBeNull();
    expect(getDefaultHint('FOO BAR')).toBeNull();
  });
});

describe('getDefaultHint — motivos', () => {
  it('hint inclui motivo descritivo', () => {
    const r = getDefaultHint('DSR(Comissão)');
    expect(r).not.toBeNull();
    if (r) expect(r.motivo).toMatch(/dsr/i);
  });
});
