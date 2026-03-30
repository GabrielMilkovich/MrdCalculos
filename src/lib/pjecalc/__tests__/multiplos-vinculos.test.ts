/**
 * Múltiplos Vínculos — Padrão B
 * Testes para cálculo de avos e FGTS com períodos descontínuos.
 */
import { describe, it, expect } from 'vitest';
import { calcularAvosMultiplosVinculos, calcularFGTSPorVinculo } from '../multiplos-vinculos';
import type { VinculoEmpregaticio } from '../pjc-analyzer';

function gerarCompetencias(inicio: string, fim: string): string[] {
  const result: string[] = [];
  let [ano, mes] = inicio.split('-').map(Number);
  const [anoFim, mesFim] = fim.split('-').map(Number);
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    result.push(`${ano}-${String(mes).padStart(2, '0')}`);
    mes++;
    if (mes > 12) { mes = 1; ano++; }
  }
  return result;
}

describe('Múltiplos Vínculos — Padrão B', () => {
  const vinculos: VinculoEmpregaticio[] = [
    {
      id: 'v1',
      data_admissao: '2018-01-15', // dia 15 → conta avo jan
      data_demissao: '2020-12-10', // dia 10 → não conta avo dez
      salario_inicial: 3000,
      salario_final: 4000,
    },
    {
      id: 'v2',
      data_admissao: '2021-07-01', // dia 1 → conta avo jul
      data_demissao: '2025-03-20', // dia 20 → conta avo mar
      salario_inicial: 4500,
      salario_final: 6000,
    },
  ];

  it('deve calcular avos corretamente com 2 períodos descontínuos', () => {
    const compsV1 = gerarCompetencias('2018-01', '2020-12');
    const compsV2 = gerarCompetencias('2021-07', '2025-03');

    const avos = calcularAvosMultiplosVinculos(vinculos, [...compsV1, ...compsV2]);

    // V1: Jan conta (adm dia 15 ≤ 15), Dez não conta (dem dia 10 < 15)
    //     Feb/2018 to Nov/2020 = 34 middle months + Jan = 35
    // V2: Jul conta (adm dia 1 ≤ 15), Mar conta (dem dia 20 ≥ 15)
    //     Aug/2021 to Feb/2025 = 43 middle months + Jul + Mar = 45
    // Total: 35 + 45 = 80
    expect(avos).toBe(80);
  });

  it('não deve somar período de intervalo como tempo de serviço', () => {
    const compsIntervalo = gerarCompetencias('2021-01', '2021-06');
    const compsV1 = gerarCompetencias('2018-01', '2020-12');
    const compsV2 = gerarCompetencias('2021-07', '2025-03');

    const avos = calcularAvosMultiplosVinculos(
      vinculos,
      [...compsV1, ...compsIntervalo, ...compsV2],
    );

    // Intervalo competências don't belong to any vínculo → ignored
    expect(avos).toBe(80);
  });

  it('deve calcular vínculo único corretamente', () => {
    const single: VinculoEmpregaticio[] = [{
      id: 'v1',
      data_admissao: '2020-03-01',
      data_demissao: '2024-08-31',
      salario_inicial: 2000,
      salario_final: 3000,
    }];
    const comps = gerarCompetencias('2020-03', '2024-08');
    const avos = calcularAvosMultiplosVinculos(single, comps);

    // Mar conta (dia 1 ≤ 15), Aug conta (dia 31 ≥ 15)
    // Apr/2020 to Jul/2024 = 52 middle + Mar + Aug = 54
    expect(avos).toBe(54);
  });

  it('deve calcular FGTS por vínculo separadamente', () => {
    const ocorrencias = [
      { competencia: '2018-06', diferenca: 240 },
      { competencia: '2019-01', diferenca: 280 },
      { competencia: '2021-08', diferenca: 360 },
      { competencia: '2022-01', diferenca: 400 },
    ];

    const fgts = calcularFGTSPorVinculo(vinculos, ocorrencias, 0.40);

    // V1: 240 + 280 = 520, multa 40% = 208, total 728
    expect(fgts[0].depositos).toBe(520);
    expect(fgts[0].multa_rescisoria).toBe(208);
    expect(fgts[0].total).toBe(728);

    // V2: 360 + 400 = 760, multa 40% = 304, total 1064
    expect(fgts[1].depositos).toBe(760);
    expect(fgts[1].multa_rescisoria).toBe(304);
    expect(fgts[1].total).toBe(1064);
  });

  it('deve respeitar percentual de multa culpa recíproca (20%)', () => {
    const ocorrencias = [
      { competencia: '2018-06', diferenca: 1000 },
    ];
    const fgts = calcularFGTSPorVinculo(vinculos, ocorrencias, 0.20);
    expect(fgts[0].multa_rescisoria).toBe(200); // 20% of 1000
  });
});
