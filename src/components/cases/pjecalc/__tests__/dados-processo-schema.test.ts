/**
 * Testes de paridade de validação — Dados do Processo (Seção 1).
 * Fonte das regras: docs/specs/dados-do-processo.md (Java decompilado).
 * Fixtures de documentos reutilizam valores já provados em validadores.test.ts.
 */
import { describe, it, expect } from "vitest";
import {
  dadosProcessoSchema,
  dadosProcessoDefaults,
  toPjecalcCalculosPayload,
  parseValorCausa,
  type DadosProcessoForm,
} from "../dados-processo-schema";

const base = (over: Partial<DadosProcessoForm> = {}): DadosProcessoForm => ({
  ...dadosProcessoDefaults,
  ...over,
});

describe("dadosProcessoSchema — paridade PJe-Calc", () => {
  it("aceita form mínimo (tudo opcional vazio + defaults)", () => {
    expect(dadosProcessoSchema.safeParse(base()).success).toBe(true);
  });

  it("aceita form completo válido", () => {
    const r = dadosProcessoSchema.safeParse(
      base({
        tipo_calculo: "VARA",
        processo_cnj: "0001327-25.2010.8.26.0100",
        valor_causa: "1.234,56",
        data_autuacao: "2010-01-04",
        reclamante_nome: "Fulano",
        reclamante_doc_tipo: "CPF",
        reclamante_cpf: "529.982.247-25",
        reclamante_pis_nit_tipo: "PIS",
        reclamante_pis_nit: "120.56412.54-5",
        reclamado_nome: "Empresa",
        reclamado_doc_tipo: "CNPJ",
        reclamado_cnpj: "33.000.167/0001-01",
      }),
    );
    expect(r.success).toBe(true);
  });

  // ---- CNJ ----
  it("rejeita CNJ com dígito verificador inválido", () => {
    const r = dadosProcessoSchema.safeParse(base({ processo_cnj: "00013272620108260100" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "processo_cnj")).toBe(true);
  });
  it("aceita CNJ válido", () => {
    expect(dadosProcessoSchema.safeParse(base({ processo_cnj: "00013272520108260100" })).success).toBe(true);
  });

  // ---- Reclamante doc fiscal (validado por tipo) ----
  it("rejeita CPF inválido do reclamante (tipo=CPF)", () => {
    const r = dadosProcessoSchema.safeParse(base({ reclamante_doc_tipo: "CPF", reclamante_cpf: "52998224726" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "reclamante_cpf")).toBe(true);
  });
  it("valida reclamante como CNPJ quando tipo=CNPJ", () => {
    expect(dadosProcessoSchema.safeParse(base({ reclamante_doc_tipo: "CNPJ", reclamante_cpf: "33000167000101" })).success).toBe(true);
    expect(dadosProcessoSchema.safeParse(base({ reclamante_doc_tipo: "CNPJ", reclamante_cpf: "33000167000102" })).success).toBe(false);
  });

  // ---- Paridade: reclamado NÃO é validado (Java não valida) ----
  it("aceita doc fiscal INVÁLIDO da reclamada (paridade: Java não valida reclamado)", () => {
    const r = dadosProcessoSchema.safeParse(base({ reclamado_doc_tipo: "CNPJ", reclamado_cnpj: "00000000000000" }));
    expect(r.success).toBe(true);
  });

  // ---- PIS/NIT (mod-11) ----
  it("rejeita PIS/NIT inválido do reclamante", () => {
    const r = dadosProcessoSchema.safeParse(base({ reclamante_pis_nit: "12056412546" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "reclamante_pis_nit")).toBe(true);
  });

  // ---- valor da causa ----
  it("rejeita valor da causa negativo e inválido", () => {
    expect(dadosProcessoSchema.safeParse(base({ valor_causa: "-10" })).success).toBe(false);
    expect(dadosProcessoSchema.safeParse(base({ valor_causa: "abc" })).success).toBe(false);
  });

  // ---- citação (ADC 58) ----
  it("exige data de citação quando habilitada", () => {
    expect(dadosProcessoSchema.safeParse(base({ citacao_habilitada: true, data_citacao: "" })).success).toBe(false);
    expect(dadosProcessoSchema.safeParse(base({ citacao_habilitada: true, data_citacao: "2020-01-01" })).success).toBe(true);
  });
});

describe("parseValorCausa — Decimal.js (nunca number nativo)", () => {
  it("formata pt-BR e en para 2 casas", () => {
    expect(parseValorCausa("1.234,56")).toBe("1234.56");
    expect(parseValorCausa("1234,5")).toBe("1234.50");
    expect(parseValorCausa("1234.56")).toBe("1234.56");
    expect(parseValorCausa("")).toBeNull();
    expect(parseValorCausa(null)).toBeNull();
  });
});

describe("toPjecalcCalculosPayload — corrige o bug histórico de colunas inexistentes", () => {
  const form = base({
    processo_cnj: "0001327-25.2010.8.26.0100",
    valor_causa: "1.234,56",
    reclamante_nome: "Fulano",
    reclamado_nome: "Empresa",
    citacao_habilitada: true,
    data_citacao: "2020-01-01",
  });

  it("gera SOMENTE colunas reais de pjecalc_calculos (sem aliases fictícios)", () => {
    const payload = toPjecalcCalculosPayload(form, "case-1", "user-1");
    const COLUNAS_REAIS = new Set([
      "case_id", "user_id", "tipo_calculo", "processo_cnj", "valor_causa", "data_autuacao",
      "tribunal", "vara", "reclamante_nome", "reclamante_doc_tipo", "reclamante_cpf",
      "reclamante_pis_nit_tipo", "reclamante_pis_nit", "reclamado_nome", "reclamado_doc_tipo",
      "reclamado_cnpj", "data_citacao", "modo_calculo",
    ]);
    for (const k of Object.keys(payload)) {
      expect(COLUNAS_REAIS.has(k), `coluna inesperada no payload: ${k}`).toBe(true);
    }
    // Garante ausência dos aliases fictícios que quebravam o save antigo.
    for (const fict of ["numero_processo", "reclamada_nome", "reclamada_cnpj", "comarca", "uf", "tipo_acao", "rito", "objeto", "juiz", "data_distribuicao", "data_transito"]) {
      expect(fict in payload).toBe(false);
    }
  });

  it("inclui user_id (RLS user_id = auth.uid()) e mapeia valor via Decimal + modo_calculo", () => {
    const payload = toPjecalcCalculosPayload(form, "case-1", "user-1");
    expect(payload.user_id).toBe("user-1");
    expect(payload.valor_causa).toBe("1234.56");
    expect(payload.modo_calculo).toBe("assisted_from_pjc");
    expect(payload.processo_cnj).toBe("0001327-25.2010.8.26.0100");
  });

  it("omite user_id quando ausente (UPDATE de linha existente)", () => {
    const payload = toPjecalcCalculosPayload(form, "case-1", null);
    expect("user_id" in payload).toBe(false);
    expect(payload.modo_calculo).toBe("assisted_from_pjc");
  });

  it("modo_calculo = independent quando citação desabilitada", () => {
    const payload = toPjecalcCalculosPayload(base(), "case-1", null);
    expect(payload.modo_calculo).toBe("independent");
  });
});
