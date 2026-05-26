import { describe, it, expect } from 'vitest';
import { classificarRubrica, CODIGO_PARA_GRUPO, ORDEM_GRUPOS_CSV } from '../grupos-planilha-dsr';

describe('grupos-planilha-dsr.classificarRubrica', () => {
  // Os 6 grupos + sub + descartado totalizam 7 valores possíveis.
  it('expõe 6 grupos para CSV em ordem fixa', () => {
    expect(ORDEM_GRUPOS_CSV).toHaveLength(6);
    expect(ORDEM_GRUPOS_CSV[0].slug).toBe('minimo_garantido');
    expect(ORDEM_GRUPOS_CSV[5].slug).toBe('salario_substituicao');
  });

  describe('path 1 — código catalogado (confiança alta)', () => {
    const casos: Array<[string, string, string]> = [
      ['0712', 'Mínimo Garantido — Comissionista', 'minimo_garantido'],
      ['3368', 'Horas Justificadas / TRN', 'minimo_garantido'],
      ['0620', 'Comissões', 'comissao_produtos'],
      ['7035', 'Ajuste de Líquido', 'comissao_produtos'],
      ['0501', 'DSR (Comissão)', 'dsr_comissao'],
      ['3391', 'Comissão Garantia', 'comissao_servicos'],
      ['3453', 'Comissão Frete', 'comissao_servicos'],
      ['4096', 'Comissão Montagem', 'comissao_servicos'],
      ['8489', 'Campanha Serviços', 'comissao_servicos'],
      ['3290', 'Prêmio Antecipado', 'premios'],
      ['4101', 'Prêmio Meta', 'premios'],
      ['8441', 'Antecip. Prêmio Estímulo', 'premios'],
      ['0040', 'Participação Lucros', 'desconsiderado'],
      ['0502', 'DSR (H. Extra)', 'desconsiderado'],
      ['2750', 'Média de Férias', 'desconsiderado'],
      ['5560', 'INSS', 'desconsiderado'],
    ];

    casos.forEach(([codigo, deno, grupo]) => {
      it(`código ${codigo} (${deno}) → ${grupo}`, () => {
        const r = classificarRubrica(codigo, deno);
        expect(r.grupo).toBe(grupo);
        expect(r.confianca).toBe('alta');
        expect(r.metodo).toBe('codigo');
      });
    });
  });

  describe('path 2/3/4 — match por nome quando código novo', () => {
    it('código desconhecido + nome "Premio Mensal" → premios (substring)', () => {
      const r = classificarRubrica('9999', 'Premio Mensal');
      expect(r.grupo).toBe('premios');
      expect(['nome_exato', 'nome_substring']).toContain(r.metodo);
    });

    it('código desconhecido + nome "Treinamento" → minimo_garantido (exato)', () => {
      const r = classificarRubrica('9998', 'Treinamento');
      expect(r.grupo).toBe('minimo_garantido');
    });

    it('código desconhecido + nome com typo "Comissao Garantida" → algum grupo válido', () => {
      const r = classificarRubrica('9997', 'Comissao Garantida');
      expect(['comissao_produtos', 'comissao_servicos']).toContain(r.grupo);
    });

    it('código desconhecido + nome "Adicional Noturno" → desconsiderado (planilha)', () => {
      const r = classificarRubrica('9996', 'Adicional Noturno');
      expect(r.grupo).toBe('desconsiderado');
    });

    it('código desconhecido + nome lixo → desconsiderado (fallback)', () => {
      const r = classificarRubrica('9995', 'XYZ123 RUBRICA INVENTADA');
      expect(r.grupo).toBe('desconsiderado');
      expect(r.metodo).toBe('fallback');
    });
  });

  describe('cobertura — todos os 58 códigos Via Varejo do banco têm grupo', () => {
    it('CODIGO_PARA_GRUPO contém todos os 58 códigos atuais', () => {
      // Snapshot tirado em 26/05/2026 do `rubrica_catalogo` Via Varejo.
      const codigosBanco = [
        '0040', '0501', '0502', '0510', '0511', '0590', '0591', '0620',
        '0712', '0832', '0833', '2750', '2751', '2752', '2823', '2824',
        '3290', '3317', '3368', '3391', '3393', '3415', '3453', '3640',
        '3669', '3673', '3678', '3684', '3720', '3721', '3743', '3784',
        '3795', '3796', '4013', '4016', '4096', '4101', '4325', '5500',
        '5501', '5551', '5560', '5561', '5580', '5616', '5760', '7035',
        '7076', '7103', '7520', '8000', '8441', '8489', '9900', '9921',
        '9926', '9953',
      ];
      const naoMapeados = codigosBanco.filter(c => !CODIGO_PARA_GRUPO[c]);
      expect(naoMapeados).toEqual([]);
    });
  });

  describe('case ROQUE 2016 — validação real do PDF', () => {
    // Esses são os códigos extraídos do PDF Ficha Financeira 2016.pdf
    // pelo parser determinístico (validado anteriormente).
    const casosRoque: Array<{ codigo: string; deno: string; grupo: string }> = [
      { codigo: '0040', deno: 'Participação Lucros', grupo: 'desconsiderado' },
      { codigo: '0501', deno: 'DSR(Comissão)', grupo: 'dsr_comissao' },
      { codigo: '0502', deno: 'DSR (H.Extra)', grupo: 'desconsiderado' },
      { codigo: '0510', deno: 'Adiant. 13Sal', grupo: 'desconsiderado' },
      { codigo: '0511', deno: '13Salário 1a Parcela', grupo: 'desconsiderado' },
      { codigo: '0590', deno: '1/3 Adic Const Fer', grupo: 'desconsiderado' },
      { codigo: '0620', deno: 'Comissões', grupo: 'comissao_produtos' },
      { codigo: '0712', deno: 'Mínimo Garantido - C', grupo: 'minimo_garantido' },
      { codigo: '2750', deno: 'Media de Férias', grupo: 'desconsiderado' },
      { codigo: '3290', deno: 'PREMIO ANTECIPADO', grupo: 'premios' },
      { codigo: '3391', deno: 'COM. GARANTIA', grupo: 'comissao_servicos' },
      { codigo: '3393', deno: 'COM.SEGUROS', grupo: 'comissao_servicos' },
      { codigo: '3453', deno: 'COMISSAO FRETE', grupo: 'comissao_servicos' },
      { codigo: '4096', deno: 'COMISSAO MONTAGEM', grupo: 'comissao_servicos' },
      { codigo: '4101', deno: 'PREMIO META', grupo: 'premios' },
      { codigo: '8441', deno: 'ANTECIP.PREMIO ESTIM', grupo: 'premios' },
      { codigo: '8489', deno: 'CAMPANHA SERVICOS', grupo: 'comissao_servicos' },
    ];

    casosRoque.forEach(({ codigo, deno, grupo }) => {
      it(`ROQUE: ${codigo} (${deno}) → ${grupo}`, () => {
        expect(classificarRubrica(codigo, deno).grupo).toBe(grupo);
      });
    });

    it('ROQUE: distribuição esperada dos 17 códigos extraídos', () => {
      const dist: Record<string, number> = {};
      for (const c of casosRoque) {
        const r = classificarRubrica(c.codigo, c.deno);
        dist[r.grupo] = (dist[r.grupo] ?? 0) + 1;
      }
      // 3 prêmios, 1 mínimo garantido, 1 dsr, 1 comissão produtos,
      // 5 comissão serviços, 6 desconsiderados (PLR + 13o + férias + DSR-HE)
      expect(dist.premios).toBe(3);
      expect(dist.minimo_garantido).toBe(1);
      expect(dist.dsr_comissao).toBe(1);
      expect(dist.comissao_produtos).toBe(1);
      expect(dist.comissao_servicos).toBe(5);
      expect(dist.desconsiderado).toBe(6);
    });
  });
});
