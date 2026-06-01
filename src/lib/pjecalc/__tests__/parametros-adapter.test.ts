/**
 * Seção 2 — Parâmetros Gerais: prova que a linha de pjecalc_calculos (onde o
 * form grava) é canonicalizada no shape do engine, com cada campo mapeado e
 * enums normalizados. DoD §3 (cada campo chega ao engine).
 */
import { describe, it, expect } from "vitest";
import { mapCalculoRowToParametros, normalizeRegime } from "../parametros-adapter";

const fullRow: Record<string, unknown> = {
  id: "calc-1",
  case_id: "case-1",
  uf: "SP",
  municipio_ibge: "3550308",
  data_admissao: "2020-01-01",
  data_demissao: "2023-06-30",
  data_ajuizamento: "2023-08-01",
  data_inicio_calculo: "2020-02-01",
  data_fim_calculo: "2023-06-30",
  prescricao_quinquenal: true,
  prescricao_fgts: false,
  regime_contrato: "INTEGRAL",
  divisor_horas: 200,
  valor_maior_remuneracao: 3500.55,
  valor_ultima_remuneracao: 3000.0,
  prazo_aviso_previo: "informado",
  aviso_previo_dias: 33,
  projetar_aviso_indenizado: false,
  limitar_avos_periodo_calculo: true,
  zera_valor_negativo: true,
  sabado_dia_util: false,
  considera_feriado_estadual: false,
  considera_feriado_municipal: false,
  tipo_mes: "civil",
  jornada_contratual_horas: 44,
  observacoes: "comentário livre",
  pontos_facultativos: ["carnaval", "corpus_christi"],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

describe("mapCalculoRowToParametros — wiring Parâmetros Gerais → engine", () => {
  it("mapeia TODAS as colunas de pjecalc_calculos para o shape do engine", () => {
    const p = mapCalculoRowToParametros(fullRow);
    expect(p).toMatchObject({
      case_id: "case-1",
      estado: "SP",
      municipio: "3550308",
      data_admissao: "2020-01-01",
      data_demissao: "2023-06-30",
      data_ajuizamento: "2023-08-01",
      data_inicial: "2020-02-01",
      data_final: "2023-06-30",
      prescricao_quinquenal: true,
      prescricao_fgts: false,
      regime_trabalho: "tempo_integral",
      carga_horaria_padrao: 200,
      maior_remuneracao: 3500.55,
      ultima_remuneracao: 3000.0,
      prazo_aviso_previo: "informado",
      prazo_aviso_dias: 33,
      projetar_aviso_indenizado: false,
      limitar_avos_periodo: true,
      zerar_valor_negativo: true,
      sabado_dia_util: false,
      considerar_feriado_estadual: false,
      considerar_feriado_municipal: false,
      tipo_mes: "civil",
      jornada_semanal: 44,
      comentarios: "comentário livre",
      pontos_facultativos: ["carnaval", "corpus_christi"],
    });
  });

  it("aplica defaults do Calculo.java em linha vazia (paridade)", () => {
    const p = mapCalculoRowToParametros({ id: "x", case_id: "c" });
    expect(p.carga_horaria_padrao).toBe(220);          // BigDecimal("220.0")
    expect(p.sabado_dia_util).toBe(true);              // true
    expect(p.projetar_aviso_indenizado).toBe(true);    // true
    expect(p.considerar_feriado_estadual).toBe(true);  // true
    expect(p.considerar_feriado_municipal).toBe(true); // true
    expect(p.limitar_avos_periodo).toBe(false);        // false
    expect(p.zerar_valor_negativo).toBe(false);
    expect(p.regime_trabalho).toBe("tempo_integral");
    expect(p.prazo_aviso_previo).toBe("nao_apurar");
    expect(p.tipo_mes).toBe("comercial");
    expect(p.pontos_facultativos).toEqual([]);
  });

  it("normaliza regime_contrato (case-insensitive)", () => {
    expect(normalizeRegime("INTEGRAL")).toBe("tempo_integral");
    expect(normalizeRegime("parcial")).toBe("tempo_parcial");
    expect(normalizeRegime("INTERMITENTE")).toBe("intermitente");
    expect(normalizeRegime("lixo")).toBe("tempo_integral");
    expect(normalizeRegime(null)).toBe("tempo_integral");
  });
});
