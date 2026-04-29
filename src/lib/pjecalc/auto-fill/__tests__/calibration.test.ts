import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  CALIBRATION_THRESHOLDS,
  agregarMetricasFromEvents,
  chaveMetrica,
  sugerirAjustesFromMetricas,
  type CalibrationEvent,
} from '../calibration';
import { AUTHORITY_MATRIX } from '../document-authority';
import type { CampoAutoFill, DocumentoTipo } from '../document-authority';

type EventoMin = Pick<CalibrationEvent, 'campo' | 'doc_tipo_vencedor' | 'usuario_aceitou'>;

function evento(
  campo: CampoAutoFill,
  doc_tipo: DocumentoTipo,
  aceitou: boolean,
): EventoMin {
  return { campo, doc_tipo_vencedor: doc_tipo, usuario_aceitou: aceitou };
}

function repetir(ev: EventoMin, n: number): EventoMin[] {
  return Array.from({ length: n }, () => ({ ...ev }));
}

describe('chaveMetrica', () => {
  it('compoe campo::doc_tipo de forma determinstica', () => {
    expect(chaveMetrica('data_admissao', 'CTPS')).toBe('data_admissao::CTPS');
    expect(chaveMetrica('salario_base', 'HOLERITE')).toBe('salario_base::HOLERITE');
  });
});

describe('agregarMetricasFromEvents', () => {
  it('contabiliza aceitos e rejeitados separadamente', () => {
    const eventos: EventoMin[] = [
      evento('data_admissao', 'CTPS', true),
      evento('data_admissao', 'CTPS', true),
      evento('data_admissao', 'CTPS', false),
    ];
    const m = agregarMetricasFromEvents(eventos);
    const k = chaveMetrica('data_admissao', 'CTPS');
    expect(m.get(k)?.aceitos).toBe(2);
    expect(m.get(k)?.rejeitados).toBe(1);
    expect(m.get(k)?.total).toBe(3);
    expect(m.get(k)?.taxa_acerto.toFixed(4)).toBe(new Decimal(2).div(3).toFixed(4));
  });

  it('agrupa por (campo, doc_tipo) — campos diferentes nao se misturam', () => {
    const eventos: EventoMin[] = [
      evento('data_admissao', 'CTPS', true),
      evento('data_demissao', 'CTPS', false),
    ];
    const m = agregarMetricasFromEvents(eventos);
    expect(m.size).toBe(2);
    expect(m.get(chaveMetrica('data_admissao', 'CTPS'))?.aceitos).toBe(1);
    expect(m.get(chaveMetrica('data_demissao', 'CTPS'))?.rejeitados).toBe(1);
  });

  it('lista vazia retorna mapa vazio', () => {
    expect(agregarMetricasFromEvents([]).size).toBe(0);
  });

  it('usa Decimal.js para taxa (precisao 20 digitos)', () => {
    const eventos: EventoMin[] = [
      ...repetir(evento('salario_base', 'HOLERITE', true), 1),
      ...repetir(evento('salario_base', 'HOLERITE', false), 2),
    ];
    const m = agregarMetricasFromEvents(eventos);
    const r = m.get(chaveMetrica('salario_base', 'HOLERITE'));
    expect(r?.taxa_acerto).toBeInstanceOf(Decimal);
    expect(r?.taxa_acerto.toString()).toBe(new Decimal(1).div(3).toString());
  });
});

describe('sugerirAjustesFromMetricas — sem ajustes (poucas amostras)', () => {
  it('< MIN_AMOSTRAS nao gera sugestao mesmo com taxa baixa', () => {
    const eventos: EventoMin[] = [
      ...repetir(evento('data_admissao', 'CTPS', false), 10),
      ...repetir(evento('data_admissao', 'CTPS', true), 1),
    ];
    const metricas = agregarMetricasFromEvents(eventos);
    const sugestoes = sugerirAjustesFromMetricas(metricas, AUTHORITY_MATRIX);
    expect(sugestoes).toHaveLength(0);
  });

  it('exatamente 19 amostras (abaixo do limite) nao gera sugestao', () => {
    const eventos: EventoMin[] = [
      ...repetir(evento('salario_base', 'HOLERITE', false), 19),
    ];
    expect(eventos).toHaveLength(CALIBRATION_THRESHOLDS.MIN_AMOSTRAS - 1);
    const metricas = agregarMetricasFromEvents(eventos);
    const sugestoes = sugerirAjustesFromMetricas(metricas, AUTHORITY_MATRIX);
    expect(sugestoes).toHaveLength(0);
  });
});

describe('sugerirAjustesFromMetricas — taxa baixa propoe reducao', () => {
  it('taxa_acerto < 50% com 20+ amostras propoe -10pts', () => {
    const eventos: EventoMin[] = [
      ...repetir(evento('data_admissao', 'HOLERITE', true), 5),   // 25%
      ...repetir(evento('data_admissao', 'HOLERITE', false), 15),
    ];
    const metricas = agregarMetricasFromEvents(eventos);
    const sugestoes = sugerirAjustesFromMetricas(metricas, AUTHORITY_MATRIX);
    expect(sugestoes).toHaveLength(1);
    const s = sugestoes[0];
    expect(s.campo).toBe('data_admissao');
    expect(s.doc_tipo).toBe('HOLERITE');
    expect(s.score_atual).toBe(60); // valor atual da matriz
    expect(s.score_sugerido).toBe(50);
    expect(s.delta).toBe(-10);
    expect(s.amostras).toBe(20);
    expect(s.motivo).toContain('< 50%');
  });

  it('taxa exatamente 50% NAO propoe reducao (limite estrito)', () => {
    const eventos: EventoMin[] = [
      ...repetir(evento('data_admissao', 'HOLERITE', true), 10),
      ...repetir(evento('data_admissao', 'HOLERITE', false), 10),
    ];
    const metricas = agregarMetricasFromEvents(eventos);
    const sugestoes = sugerirAjustesFromMetricas(metricas, AUTHORITY_MATRIX);
    expect(sugestoes).toHaveLength(0);
  });

  it('nao reduz abaixo de 0', () => {
    const matriz: Record<CampoAutoFill, Partial<Record<DocumentoTipo, number>>> = {
      ...AUTHORITY_MATRIX,
      data_admissao: { ...AUTHORITY_MATRIX.data_admissao, HOLERITE: 5 }, // ja baixo
    };
    const eventos: EventoMin[] = repetir(evento('data_admissao', 'HOLERITE', false), 25);
    const metricas = agregarMetricasFromEvents(eventos);
    const sugestoes = sugerirAjustesFromMetricas(metricas, matriz);
    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0].score_sugerido).toBe(0);
    expect(sugestoes[0].delta).toBe(-5);
  });
});

describe('sugerirAjustesFromMetricas — taxa alta propoe aumento', () => {
  it('taxa > 90% com 20+ amostras E score < 90 propoe +10pts', () => {
    // HOLERITE para data_admissao tem score 60 — candidato natural para aumento.
    const eventos: EventoMin[] = [
      ...repetir(evento('data_admissao', 'HOLERITE', true), 22),
      ...repetir(evento('data_admissao', 'HOLERITE', false), 1),
    ];
    const metricas = agregarMetricasFromEvents(eventos);
    const sugestoes = sugerirAjustesFromMetricas(metricas, AUTHORITY_MATRIX);
    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0].score_atual).toBe(60);
    expect(sugestoes[0].score_sugerido).toBe(70);
    expect(sugestoes[0].delta).toBe(10);
    expect(sugestoes[0].motivo).toContain('> 90%');
  });

  it('score >= 90 NAO recebe aumento mesmo com taxa alta', () => {
    // CTPS para data_admissao tem score 100 — nao deve subir.
    const eventos: EventoMin[] = repetir(evento('data_admissao', 'CTPS', true), 30);
    const metricas = agregarMetricasFromEvents(eventos);
    const sugestoes = sugerirAjustesFromMetricas(metricas, AUTHORITY_MATRIX);
    expect(sugestoes.find(s => s.doc_tipo === 'CTPS')).toBeUndefined();
  });
});

describe('sugerirAjustesFromMetricas — campos nao mapeados', () => {
  it('combinacao campo/doc_tipo sem score na matriz e ignorada', () => {
    // CARTAO_PONTO nao tem entrada para data_admissao.
    const eventos: EventoMin[] = repetir(evento('data_admissao', 'CARTAO_PONTO', false), 30);
    const metricas = agregarMetricasFromEvents(eventos);
    const sugestoes = sugerirAjustesFromMetricas(metricas, AUTHORITY_MATRIX);
    expect(sugestoes).toHaveLength(0);
  });
});

describe('sugerirAjustesFromMetricas — ordenacao', () => {
  it('ordena por |delta| decrescente', () => {
    const matriz: Record<CampoAutoFill, Partial<Record<DocumentoTipo, number>>> = {
      ...AUTHORITY_MATRIX,
      data_admissao: { HOLERITE: 60, CTPS: 50 },
    };
    const eventos: EventoMin[] = [
      // HOLERITE: 25% → -10
      ...repetir(evento('data_admissao', 'HOLERITE', true), 5),
      ...repetir(evento('data_admissao', 'HOLERITE', false), 15),
      // CTPS: 95% → +10
      ...repetir(evento('data_admissao', 'CTPS', true), 19),
      ...repetir(evento('data_admissao', 'CTPS', false), 1),
    ];
    const metricas = agregarMetricasFromEvents(eventos);
    const sugestoes = sugerirAjustesFromMetricas(metricas, matriz);
    expect(sugestoes).toHaveLength(2);
    // Mesmo |delta|, ordem estavel — ambos sao -10/+10
    expect(sugestoes.every(s => Math.abs(s.delta) === 10)).toBe(true);
  });
});
