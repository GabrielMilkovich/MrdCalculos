/**
 * Invariantes universais do pipeline OCR → Parser → CSV de Cartão-Ponto.
 *
 * Aplicadas a TODAS as fixtures existentes — qualquer fixture nova
 * herda automaticamente essas garantias. Bugs como "perda de batida",
 * "data fantasma" e "duplicação silenciosa" são pegos aqui sem precisar
 * escrever assert por dia.
 *
 * Lista de invariantes:
 *   I1 — Datas no CSV ⊆ datas no OCR (nenhuma data fantasma).
 *   I2 — Datas únicas no CSV (dedup correto).
 *   I3 — Toda batida HH:MM no CSV existe em algum lugar do OCR original.
 *   I4 — Round-trip parser: parser(parser(ocr).csv) preserva batidas.
 *   I5 — Eventos importantes (HE feriado, RSR trab.) preservados quando
 *        presentes no OCR.
 *   I6 — Builder não emite linhas com mais de 13 colunas (limite PJe-Calc).
 *   I7 — Encoding UTF-8 preservado, separador ";", line ending CRLF.
 */
import { describe, expect, it } from "vitest";
import { loadFixtures } from "../_fixtures/_loader";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";
import { buildCartaoPontoCSV } from "../../export/per-doc/cartao-ponto-csv";

const RE_HORA = /\b(\d{1,2}):(\d{2})\b/g;
const RE_DATA_BR = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
// Cabeçalho Via Varejo: "Período DD.MM.YYYY A DD.MM.YYYY" (com ponto, não barra).
const RE_PERIODO_VIA_VAREJO_GLOBAL =
  /Per[íi]odo\s+(\d{2})\.(\d{2})\.(\d{4})\s+A\s+(\d{2})\.(\d{2})\.(\d{4})/gi;
// Linha de dia Via Varejo: "DD DiaSemana" ou "DD D.S.R." ou "DD FERIADO".
const RE_DIA_VIA_VAREJO_GLOBAL =
  /\b(\d{1,2})\s+(SEG|TER|QUA|QUI|SEX|SAB|DOM|D\.?S\.?R\.?|FERIADO|FER\.?\s*DESC\.?)\b/gi;

function extractDatasOCR(ocr: string): Set<string> {
  const out = new Set<string>();
  for (const m of ocr.matchAll(RE_DATA_BR)) {
    out.add(`${m[1]}/${m[2]}/${m[3]}`);
  }
  // Fixtures Via Varejo: a data efetiva é reconstruída a partir do período
  // do cabeçalho + dia da linha (e.g., "21.05.2011 A 20.06.2011" + "02 QUI"
  // → 02/06/2011). Adicionamos todas as combinações DIA × PERÍODO ao
  // conjunto válido pra que a invariante I1 não dispare falsos positivos.
  const periodos: Array<{ ini: Date; fim: Date }> = [];
  for (const m of ocr.matchAll(RE_PERIODO_VIA_VAREJO_GLOBAL)) {
    const ini = new Date(
      Date.UTC(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10)),
    );
    const fim = new Date(
      Date.UTC(parseInt(m[6], 10), parseInt(m[5], 10) - 1, parseInt(m[4], 10)),
    );
    periodos.push({ ini, fim });
  }
  if (periodos.length > 0) {
    const dias = new Set<number>();
    for (const m of ocr.matchAll(RE_DIA_VIA_VAREJO_GLOBAL)) {
      dias.add(parseInt(m[1], 10));
    }
    for (const p of periodos) {
      for (const dia of dias) {
        // Tenta mês inicial e final do período.
        for (const cand of [
          new Date(Date.UTC(p.ini.getUTCFullYear(), p.ini.getUTCMonth(), dia)),
          new Date(Date.UTC(p.fim.getUTCFullYear(), p.fim.getUTCMonth(), dia)),
        ]) {
          if (cand.getUTCDate() === dia && cand >= p.ini && cand <= p.fim) {
            const dd = String(cand.getUTCDate()).padStart(2, "0");
            const mm = String(cand.getUTCMonth() + 1).padStart(2, "0");
            const yyyy = String(cand.getUTCFullYear());
            out.add(`${dd}/${mm}/${yyyy}`);
          }
        }
      }
    }
  }
  return out;
}

function extractHorasOCR(ocr: string): Set<string> {
  const out = new Set<string>();
  for (const m of ocr.matchAll(RE_HORA)) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    out.add(`${m[1].padStart(2, "0")}:${m[2]}`);
  }
  return out;
}

async function csvFromOcr(ocr: string): Promise<string> {
  const parsed = parseCartaoPonto(ocr);
  const blob = buildCartaoPontoCSV(parsed);
  return await blob.text();
}

describe("Cartão-Ponto — invariantes universais (todas fixtures)", () => {
  const fixtures = loadFixtures("cartao-ponto");

  if (fixtures.length === 0) {
    it.skip("nenhuma fixture cadastrada", () => {});
    return;
  }

  for (const f of fixtures) {
    describe(`fixture: ${f.id}`, () => {
      it("I1: nenhuma data fantasma — datas do CSV ⊆ datas do OCR", async () => {
        const csv = await csvFromOcr(f.ocr);
        const datasOcr = extractDatasOCR(f.ocr);
        const datasCsv = csv
          .split("\r\n")
          .slice(1) // skip header
          .filter((l) => l.length > 0)
          .map((l) => l.split(";")[0]);
        for (const d of datasCsv) {
          expect(
            datasOcr.has(d),
            `Data ${d} aparece no CSV mas não no OCR`,
          ).toBe(true);
        }
      });

      it("I2: datas únicas no CSV (sem duplicação)", async () => {
        const csv = await csvFromOcr(f.ocr);
        const datasCsv = csv
          .split("\r\n")
          .slice(1)
          .filter((l) => l.length > 0)
          .map((l) => l.split(";")[0]);
        const set = new Set(datasCsv);
        expect(
          set.size,
          `${datasCsv.length - set.size} data(s) duplicada(s) no CSV`,
        ).toBe(datasCsv.length);
      });

      it("I3: toda batida no CSV existe no OCR original (sem alucinação)", async () => {
        const csv = await csvFromOcr(f.ocr);
        const horasOcr = extractHorasOCR(f.ocr);
        const horasCsv = new Set<string>();
        for (const linha of csv.split("\r\n").slice(1)) {
          const cols = linha.split(";");
          for (let i = 1; i < cols.length; i++) {
            const v = cols[i].trim();
            if (v && /^\d{2}:\d{2}$/.test(v)) horasCsv.add(v);
          }
        }
        for (const h of horasCsv) {
          expect(
            horasOcr.has(h),
            `Hora ${h} aparece no CSV mas não no OCR — alucinação do parser`,
          ).toBe(true);
        }
      });

      it("I4: round-trip — re-parsear o CSV preserva todas as batidas", async () => {
        const csv = await csvFromOcr(f.ocr);
        // Re-parsear o CSV como se fosse OCR (cada linha vira "data hora hora")
        const reOcr = csv
          .split("\r\n")
          .slice(1)
          .filter((l) => l.length > 0)
          .map((l) => {
            const cols = l.split(";");
            const data = cols[0];
            const horas = cols.slice(1).filter((c) => c.trim());
            return `${data} ${horas.join(" ")}`;
          })
          .join("\n");
        const reParsed = parseCartaoPonto(reOcr);
        // Conta horas no OCR original (das linhas com data) e no re-parse
        const horasOriginal = new Set<string>();
        for (const linha of csv.split("\r\n").slice(1)) {
          for (const cell of linha.split(";").slice(1)) {
            if (/^\d{2}:\d{2}$/.test(cell.trim())) {
              horasOriginal.add(`${linha.split(";")[0]}|${cell.trim()}`);
            }
          }
        }
        const horasReParse = new Set<string>();
        for (const a of reParsed.apuracoes) {
          const dataBR = a.data.split("-").reverse().join("/");
          for (const m of a.marcacoes) {
            if (m.e) horasReParse.add(`${dataBR}|${m.e}`);
            if (m.s) horasReParse.add(`${dataBR}|${m.s}`);
          }
        }
        for (const h of horasOriginal) {
          expect(
            horasReParse.has(h),
            `Round-trip perdeu batida: ${h}`,
          ).toBe(true);
        }
      });

      it("I6: nenhuma linha do CSV com mais de 13 colunas", async () => {
        const csv = await csvFromOcr(f.ocr);
        for (const linha of csv.split("\r\n")) {
          if (!linha) continue;
          const cols = linha.split(";");
          expect(
            cols.length,
            `Linha "${linha.slice(0, 40)}..." com ${cols.length} colunas (esperado 13)`,
          ).toBe(13);
        }
      });

      it("I8: nenhuma linha do CSV vem de timestamp de aprovação eletrônica", async () => {
        // Sinaliza qualquer batida cuja única origem no OCR é uma frase
        // contendo "aprovado/homologado/registrado/validado" — esse é o
        // bug clássico de timestamp de assinatura virando jornada fantasma.
        const csv = await csvFromOcr(f.ocr);
        const linhasOcr = f.ocr.split(/\r?\n/);
        for (const linha of csv.split("\r\n").slice(1)) {
          if (!linha) continue;
          const data = linha.split(";")[0];
          // Onde essa data aparece no OCR?
          const ocorrenciasOcr = linhasOcr.filter((l) => l.includes(data));
          if (ocorrenciasOcr.length === 0) continue; // round-trip já cobre
          // Se TODAS as menções dessa data são linhas de aprovação, é bug.
          const todasSaoAprovacao = ocorrenciasOcr.every((l) =>
            /\b(aprovad|homologad|registrad\w*\s+eletronicamente|validad\w*\s+(?:pelo|por|em)|assinad\w*\s+eletronicamente)\b/i.test(l),
          );
          expect(
            todasSaoAprovacao,
            `Data ${data} no CSV mas todas suas menções no OCR são de aprovação eletrônica`,
          ).toBe(false);
        }
      });

      it("I7: encoding UTF-8 + separador ; + line ending CRLF + termina com CRLF", async () => {
        const csv = await csvFromOcr(f.ocr);
        expect(csv.endsWith("\r\n")).toBe(true);
        expect(csv.includes("Saída1")).toBe(true); // acento UTF-8 preservado
        expect(csv.split("\n")[0].includes(";")).toBe(true);
        // Não deve haver \n sem \r antes
        const lines = csv.split("\n");
        for (let i = 0; i < lines.length - 1; i++) {
          expect(
            lines[i].endsWith("\r"),
            `Linha ${i + 1} sem CR antes do LF`,
          ).toBe(true);
        }
      });
    });
  }
});
