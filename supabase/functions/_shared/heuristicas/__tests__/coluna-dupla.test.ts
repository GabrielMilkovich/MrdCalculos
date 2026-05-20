/**
 * Testes unitários do módulo de detecção de coluna dupla.
 *
 * Diagnóstico em /tmp/auditoria-coluna-dupla.md.
 */
import { describe, expect, it } from 'vitest';
import {
  detectarColunaDupla,
  detectarColunaDuplaPorContagem,
  detectarColunaDuplaPorHeader,
} from '../coluna-dupla';

// Helper para gerar linhas de dia sintéticas com N horários.
function linha8h(data: string): string {
  return `${data} SEG 09:00 12:00 13:05 17:25 09:00 12:00 13:05 18:53`;
}
function linha4h(data: string): string {
  return `${data} SEG 09:00 12:00 13:05 17:25`;
}
function linhaNoturna8h(data: string): string {
  // horário de entrada às 22:00, batida cruzando madrugada
  return `${data} SEG 22:00 02:00 03:00 06:00 22:00 02:00 03:00 06:00`;
}

describe('detectarColunaDuplaPorHeader', () => {
  it('casa padrão registrado-trabalho', () => {
    const texto = 'Data Dia Horário Registrado Horário de Trabalho HT HE';
    expect(detectarColunaDuplaPorHeader(texto)).toEqual({
      detectado: true,
      padrao: 'registrado-trabalho',
    });
  });

  it('casa padrão registrado-trabalho com "Horário Previsto"', () => {
    const texto = 'cabeçalho Horário Registrado X Y Horário Previsto Z';
    expect(detectarColunaDuplaPorHeader(texto)).toEqual({
      detectado: true,
      padrao: 'registrado-trabalho',
    });
  });

  it('casa padrão marcacoes-escala', () => {
    const texto = 'Data Dia Marcações Escala HT HE';
    expect(detectarColunaDuplaPorHeader(texto)).toEqual({
      detectado: true,
      padrao: 'marcacoes-escala',
    });
  });

  it('casa padrão real-previsto', () => {
    const texto = 'Data Dia Real Previsto HT';
    expect(detectarColunaDuplaPorHeader(texto)).toEqual({
      detectado: true,
      padrao: 'real-previsto',
    });
  });

  it('casa padrão apontamento-programado', () => {
    const texto = 'Data Apontamento Programado HT HE';
    expect(detectarColunaDuplaPorHeader(texto)).toEqual({
      detectado: true,
      padrao: 'apontamento-programado',
    });
  });

  it('casa apontamento + Jornada Prevista', () => {
    const texto = 'Apontamento Jornada Prevista';
    expect(detectarColunaDuplaPorHeader(texto)).toEqual({
      detectado: true,
      padrao: 'apontamento-programado',
    });
  });

  it('retorna não-detectado para texto sem padrão', () => {
    const texto = 'Empregado FULANO Competência 11/2020 totalmente arbitrário';
    expect(detectarColunaDuplaPorHeader(texto)).toEqual({
      detectado: false,
      padrao: null,
    });
  });

  it('aceita Horario sem acento, case-insensitive', () => {
    const texto = 'HORARIO REGISTRADO horario de trabalho';
    expect(detectarColunaDuplaPorHeader(texto)).toEqual({
      detectado: true,
      padrao: 'registrado-trabalho',
    });
  });

  it('NÃO casa "Real" como substring (ex: "realizado")', () => {
    // "realizado" não é palavra "Real" inteira
    const texto = 'Total realizado e total previsto';
    // "previsto" também é parte de "previstos" mas \bPrevisto\b casa
    // "previsto" literal — neste texto temos "previsto" inteiro,
    // mas "Real" não está como palavra inteira → resultado: não casa.
    const r = detectarColunaDuplaPorHeader(texto);
    expect(r.detectado).toBe(false);
    expect(r.padrao).toBe(null);
  });

  it('ordem: registrado-trabalho vence quando ambos casam', () => {
    const texto =
      'Horário Registrado Horário de Trabalho Real Previsto Marcações Escala';
    expect(detectarColunaDuplaPorHeader(texto)).toEqual({
      detectado: true,
      padrao: 'registrado-trabalho',
    });
  });
});

describe('detectarColunaDuplaPorContagem', () => {
  it('10 linhas todas com 8 horários → fração=1.0, detectado', () => {
    const linhas = Array.from({ length: 10 }, (_, i) =>
      linha8h(`0${i + 1}/05/2024`),
    );
    expect(detectarColunaDuplaPorContagem(linhas)).toEqual({
      detectado: true,
      fracao: 1.0,
      linhasOitoHorarios: 10,
      total: 10,
    });
  });

  it('5 com 8 horários + 5 com 4 horários → fração=0.5, detectado (limiar padrão)', () => {
    const linhas = [
      ...Array.from({ length: 5 }, (_, i) => linha8h(`0${i + 1}/05/2024`)),
      ...Array.from({ length: 5 }, (_, i) => linha4h(`1${i + 1}/05/2024`)),
    ];
    expect(detectarColunaDuplaPorContagem(linhas)).toEqual({
      detectado: true,
      fracao: 0.5,
      linhasOitoHorarios: 5,
      total: 10,
    });
  });

  it('4 com 8 horários, 6 com 4 horários → fração=0.4, não-detectado', () => {
    const linhas = [
      ...Array.from({ length: 4 }, (_, i) => linha8h(`0${i + 1}/05/2024`)),
      ...Array.from({ length: 6 }, (_, i) => linha4h(`1${i}/05/2024`)),
    ];
    expect(detectarColunaDuplaPorContagem(linhas)).toEqual({
      detectado: false,
      fracao: 0.4,
      linhasOitoHorarios: 4,
      total: 10,
    });
  });

  it('lista vazia → não detectado, total=0', () => {
    expect(detectarColunaDuplaPorContagem([])).toEqual({
      detectado: false,
      fracao: 0,
      linhasOitoHorarios: 0,
      total: 0,
    });
  });

  it('limiarFracao=0.7 — 4 de 10 = 0.4 não dispara', () => {
    const linhas = [
      ...Array.from({ length: 4 }, (_, i) => linha8h(`0${i + 1}/05/2024`)),
      ...Array.from({ length: 6 }, (_, i) => linha4h(`1${i}/05/2024`)),
    ];
    expect(
      detectarColunaDuplaPorContagem(linhas, { limiarFracao: 0.7 }),
    ).toEqual({
      detectado: false,
      fracao: 0.4,
      linhasOitoHorarios: 4,
      total: 10,
    });
  });

  it('limiarFracao=0.7 — 8 de 10 = 0.8 dispara', () => {
    const linhas = [
      ...Array.from({ length: 8 }, (_, i) => linha8h(`0${i + 1}/05/2024`)),
      ...Array.from({ length: 2 }, (_, i) => linha4h(`1${i}/05/2024`)),
    ];
    expect(
      detectarColunaDuplaPorContagem(linhas, { limiarFracao: 0.7 }),
    ).toEqual({
      detectado: true,
      fracao: 0.8,
      linhasOitoHorarios: 8,
      total: 10,
    });
  });

  it('input degenerado: strings vazias / só whitespace → fração=0', () => {
    expect(detectarColunaDuplaPorContagem(['', '   ', '\t\n'])).toEqual({
      detectado: false,
      fracao: 0,
      linhasOitoHorarios: 0,
      total: 3,
    });
  });
});

describe('detectarColunaDupla — salvaguardas combinadas', () => {
  it('happy: header registrado-trabalho + 10 linhas 8h → origem header', () => {
    const texto =
      'Cartão Ponto Horário Registrado Horário de Trabalho\n' +
      Array.from({ length: 10 }, (_, i) => linha8h(`0${i + 1}/05/2024`)).join(
        '\n',
      );
    const linhas = Array.from({ length: 10 }, (_, i) =>
      linha8h(`0${i + 1}/05/2024`),
    );
    expect(detectarColunaDupla(texto, linhas)).toEqual({
      detectado: true,
      origem: 'header',
    });
  });

  it('happy contagem: sem header, 10 linhas 8h, sem turno, sem noturno', () => {
    const texto = 'Empregado FULANO CPF X\n';
    const linhas = Array.from({ length: 10 }, (_, i) =>
      linha8h(`0${i + 1}/05/2024`),
    );
    expect(detectarColunaDupla(texto, linhas)).toEqual({
      detectado: true,
      origem: 'contagem-com-salvaguarda',
    });
  });

  it('salvaguarda (a): cartão semanal — 5 linhas 8h sem header → não detectado', () => {
    const texto = 'Empregado FULANO sem header descritivo';
    const linhas = Array.from({ length: 5 }, (_, i) =>
      linha8h(`0${i + 1}/05/2024`),
    );
    expect(detectarColunaDupla(texto, linhas)).toEqual({
      detectado: false,
      origem: null,
    });
  });

  it('salvaguarda (b): texto contém "Turno noturno" + contagem alta → não detectado', () => {
    const texto = 'Empregado FULANO Turno noturno fixo';
    const linhas = Array.from({ length: 10 }, (_, i) =>
      linha8h(`0${i + 1}/05/2024`),
    );
    expect(detectarColunaDupla(texto, linhas)).toEqual({
      detectado: false,
      origem: null,
    });
  });

  it('salvaguarda (b): texto contém "12x36" → não detectado', () => {
    const texto = 'Empregado FULANO Regime 12x36';
    const linhas = Array.from({ length: 10 }, (_, i) =>
      linha8h(`0${i + 1}/05/2024`),
    );
    expect(detectarColunaDupla(texto, linhas)).toEqual({
      detectado: false,
      origem: null,
    });
  });

  it('salvaguarda (c): vigilante noturno — 5+ linhas com 22:00/03:00 → não detectado', () => {
    const texto = 'Empregado FULANO sem header';
    const linhas = [
      ...Array.from({ length: 5 }, (_, i) =>
        linhaNoturna8h(`0${i + 1}/05/2024`),
      ),
      ...Array.from({ length: 5 }, (_, i) => linha8h(`1${i + 1}/05/2024`)),
    ];
    expect(detectarColunaDupla(texto, linhas)).toEqual({
      detectado: false,
      origem: null,
    });
  });

  it('salvaguarda (c): hospital plantão — 4+ linhas noturnas em 10 → não detectado', () => {
    const texto = 'Empregado FULANO sem header';
    const linhas = [
      ...Array.from({ length: 4 }, (_, i) =>
        linhaNoturna8h(`0${i + 1}/05/2024`),
      ),
      ...Array.from({ length: 6 }, (_, i) => linha8h(`1${i}/05/2024`)),
    ];
    // 4/10 = 0.40 >= 0.30 → salvaguarda dispara
    expect(detectarColunaDupla(texto, linhas)).toEqual({
      detectado: false,
      origem: null,
    });
  });

  it('edge: header bate MAS texto tem "noturno" → header sobrepõe', () => {
    const texto =
      'Cartão Ponto Horário Registrado Horário de Trabalho — Turno noturno';
    const linhas = Array.from({ length: 10 }, (_, i) =>
      linha8h(`0${i + 1}/05/2024`),
    );
    expect(detectarColunaDupla(texto, linhas)).toEqual({
      detectado: true,
      origem: 'header',
    });
  });

  it('salvaguarda (c): 00:00 exato NÃO conta como noturno (totalizador zerado)', () => {
    const texto = 'Empregado FULANO sem header';
    // 10 linhas com 00:00 (totalizador zerado) e horários diurnos —
    // antes da exceção, 00:00 era classificado como noturno, bloqueando
    // o detector erroneamente. Agora 00:00 exato é ignorado e o detector
    // dispara via contagem (8 horários/linha).
    const linhas = Array.from({ length: 10 }, (_, i) =>
      `0${i + 1}/05/2024 SEG 08:00 12:00 13:00 17:30 00:00 09:00 10:00 00:00`,
    );
    expect(detectarColunaDupla(texto, linhas)).toEqual({
      detectado: true,
      origem: 'contagem-com-salvaguarda',
    });
  });
});
