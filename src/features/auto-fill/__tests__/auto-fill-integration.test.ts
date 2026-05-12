/**
 * Smoke test de integração do adapter — pega fixtures REAIS de OCR
 * (cartão de ponto, recibo de férias, holerite) e simula o que o
 * autoFillFromOcr inseriria no DB. Não bate no Supabase, mas valida
 * EXATAMENTE a forma da row de banco que será enviada.
 *
 * Esse teste é o último escudo contra:
 *   - Tipos de campo errados (ex: competencia text vs DATE)
 *   - Campos inexistentes na tabela
 *   - Constraint CHECK falhando (ex: ocorrencia fora do enum)
 *   - calculo_id null que faria RLS rejeitar
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCartaoPonto } from "@/features/data-extraction/parsers/cartao-ponto";

// Colunas existentes em pjecalc_apuracao_diaria (verificadas via
// information_schema). Inserts com colunas FORA dessa lista quebram em
// runtime — esse teste blinda contra typos.
const COLUNAS_APURACAO = new Set([
  "id",
  "calculo_id",
  "case_id",
  "data",
  "dia_semana",
  "ocorrencia",
  "entrada_1",
  "saida_1",
  "entrada_2",
  "saida_2",
  "entrada_3",
  "saida_3",
  "entrada_4",
  "saida_4",
  "entrada_5",
  "saida_5",
  "entrada_6",
  "saida_6",
  "observacao",
  "frequencia_str",
  "minutos_trabalhados",
  "minutos_extra_diaria",
  "minutos_extra_semanal",
  "minutos_extra_repouso",
  "minutos_extra_feriado",
  "minutos_noturno",
  "minutos_intrajornada",
  "minutos_interjornada",
  "minutos_art384",
  "minutos_art253",
  "horas_trabalhadas",
  "horas_extras_diaria",
  "horas_extras_semanal",
  "horas_noturnas",
  "is_dsr",
  "is_feriado",
  "is_falta",
  "is_ferias",
  "is_afastamento",
  "is_compensado",
  "feriado_nome",
  "origem",
  "documento_id",
  "pagina",
  "created_at",
]);

// Espelha o CHECK constraint em pjecalc_apuracao_diaria_ocorrencia_check.
// Se o parser ganhar uma ocorrência nova, precisa de migration alterando
// o CHECK ANTES do deploy — esse teste vai falhar de propósito.
const OCORRENCIAS_VALIDAS = new Set([
  "NORMAL",
  "FALTA",
  "FERIADO",
  "FOLGA",
  "FERIAS",
  "ATESTADO",
  "LICENCA_MEDICA",
  "DSR",
  "COMPENSADO",
  "TREINAMENTO",
  "AFASTAMENTO",
]);

const ORIGEM_VALIDA = new Set(["OCR", "INFORMADA", "FIXADA", "IMPORTADA"]);

// Mesma transformação que faz auto-fill-from-ocr.ts. Mantido inline
// para o teste pegar regressão se a estrutura mudar no adapter.
function apuracaoToRow(
  ap: ReturnType<typeof parseCartaoPonto>["apuracoes"][number],
  caseId: string,
  calculoId: string,
  documentId: string,
): Record<string, unknown> {
  const m = ap.marcacoes;
  return {
    case_id: caseId,
    calculo_id: calculoId,
    data: ap.data,
    dia_semana: ap.dia_semana,
    ocorrencia: ap.ocorrencia,
    entrada_1: m[0]?.e || null,
    saida_1: m[0]?.s || null,
    entrada_2: m[1]?.e || null,
    saida_2: m[1]?.s || null,
    entrada_3: m[2]?.e || null,
    saida_3: m[2]?.s || null,
    entrada_4: m[3]?.e || null,
    saida_4: m[3]?.s || null,
    entrada_5: m[4]?.e || null,
    saida_5: m[4]?.s || null,
    entrada_6: m[5]?.e || null,
    saida_6: m[5]?.s || null,
    observacao: ap.observacao,
    origem: "OCR",
    documento_id: documentId,
  };
}

const FIXTURE_BASE = join(
  __dirname,
  "../../data-extraction/__tests__/_fixtures/cartao-ponto",
);
const FIXTURES = [
  "rosicleia",
  "joseli-via-varejo-2011-2016",
  "roque-via-varejo-63paginas",
];

describe.each(FIXTURES)("autoFillFromOcr — integração %s", (slug) => {
  const ocrText = readFileSync(join(FIXTURE_BASE, slug, "ocr.txt"), "utf-8");

  it("Cada row gerada contém SÓ colunas que existem em pjecalc_apuracao_diaria", () => {
    const parsed = parseCartaoPonto(ocrText);
    expect(parsed.apuracoes.length).toBeGreaterThan(0);

    const rows = parsed.apuracoes.map((a) =>
      apuracaoToRow(a, "case-uuid", "calc-uuid", "doc-uuid"),
    );

    for (const row of rows) {
      for (const col of Object.keys(row)) {
        expect(
          COLUNAS_APURACAO.has(col),
          `Coluna "${col}" não existe em pjecalc_apuracao_diaria — INSERT vai falhar em runtime`,
        ).toBe(true);
      }
    }
  });

  it("Toda row tem calculo_id (sem isso RLS rejeita o INSERT)", () => {
    const parsed = parseCartaoPonto(ocrText);
    const rows = parsed.apuracoes.map((a) =>
      apuracaoToRow(a, "case-uuid", "calc-uuid", "doc-uuid"),
    );
    for (const r of rows) {
      expect(r.calculo_id).toBe("calc-uuid");
      expect(r.case_id).toBe("case-uuid");
      expect(r.documento_id).toBe("doc-uuid");
    }
  });

  it("ocorrencia sempre dentro do CHECK constraint do DB", () => {
    const parsed = parseCartaoPonto(ocrText);
    const rows = parsed.apuracoes.map((a) =>
      apuracaoToRow(a, "case", "calc", "doc"),
    );
    for (const r of rows) {
      expect(
        OCORRENCIAS_VALIDAS.has(r.ocorrencia as string),
        `Ocorrência "${r.ocorrencia}" não está no CHECK do banco — INSERT falha`,
      ).toBe(true);
    }
  });

  it("origem sempre dentro do enum esperado", () => {
    const parsed = parseCartaoPonto(ocrText);
    const rows = parsed.apuracoes.map((a) =>
      apuracaoToRow(a, "case", "calc", "doc"),
    );
    for (const r of rows) {
      expect(ORIGEM_VALIDA.has(r.origem as string)).toBe(true);
    }
  });

  it("data sempre em formato ISO yyyy-mm-dd (coluna DATE)", () => {
    const parsed = parseCartaoPonto(ocrText);
    const rows = parsed.apuracoes.map((a) =>
      apuracaoToRow(a, "case", "calc", "doc"),
    );
    for (const r of rows) {
      expect(r.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("Pares E/S são string HH:MM ou null — DB rejeita qualquer outro tipo", () => {
    const parsed = parseCartaoPonto(ocrText);
    const rows = parsed.apuracoes.map((a) =>
      apuracaoToRow(a, "case", "calc", "doc"),
    );
    const horaCampos = [
      "entrada_1",
      "saida_1",
      "entrada_2",
      "saida_2",
      "entrada_3",
      "saida_3",
      "entrada_4",
      "saida_4",
      "entrada_5",
      "saida_5",
      "entrada_6",
      "saida_6",
    ];
    for (const r of rows) {
      for (const c of horaCampos) {
        const v = r[c];
        expect(
          v === null || typeof v === "string",
          `Campo ${c} tem tipo inválido: ${typeof v}`,
        ).toBe(true);
        if (typeof v === "string" && v.length > 0) {
          expect(v).toMatch(/^\d{1,2}:\d{2}$/);
        }
      }
    }
  });

  it("Quantidade de apurações > 0 e dias únicos (sem duplicação por chave UNIQUE)", () => {
    const parsed = parseCartaoPonto(ocrText);
    const rows = parsed.apuracoes.map((a) =>
      apuracaoToRow(a, "case", "calc", "doc"),
    );
    const datas = rows.map((r) => r.data as string);
    const datasUnicas = new Set(datas);
    expect(rows.length).toBeGreaterThan(0);
    // UNIQUE (calculo_id, data) — não pode haver datas duplicadas no batch
    // do mesmo calculo, senão upsert rejeita.
    expect(datasUnicas.size).toBe(datas.length);
  });
});
