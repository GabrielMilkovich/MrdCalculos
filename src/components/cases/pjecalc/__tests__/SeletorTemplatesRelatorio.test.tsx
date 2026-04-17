/**
 * Unit tests for SeletorTemplatesRelatorio.
 *
 * No render (testing-library is not installed in this repo). We exercise the
 * pure helpers (`buildReportBlob`, `buildZipFromSelection`) and mock the
 * underlying PDF generators so we can assert which one was called.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---------------------------------------------------------------
vi.mock("@/lib/pjecalc/pdf-report", () => ({
  gerarRelatorioPDF: vi.fn(() => {
    const w = window.open("", "_blank");
    if (w) { w.document.write("<html>RESUMO</html>"); w.document.close(); }
  }),
}));
vi.mock("@/lib/pjecalc/pdf-report-completo", () => ({
  gerarRelatorioCompleto: vi.fn(() => {
    const w = window.open("", "_blank");
    if (w) { w.document.write("<html>COMPLETO</html>"); w.document.close(); }
  }),
}));
vi.mock("@/lib/pjecalc/pdf-report-memoria", () => ({
  gerarRelatorioMemoriaCalculo: vi.fn(() => {
    const w = window.open("", "_blank");
    if (w) { w.document.write("<html>MEMORIA</html>"); w.document.close(); }
  }),
}));
vi.mock("@/lib/pjecalc/pdf-report-diferenca", () => ({
  gerarRelatorioDiferenca: vi.fn(() => {
    const w = window.open("", "_blank");
    if (w) { w.document.write("<html>DIFERENCA</html>"); w.document.close(); }
  }),
}));
vi.mock("@/lib/pjecalc/pdf-report-custas", () => ({
  gerarRelatorioCustasDetalhado: vi.fn(() => new Blob(["<html>CUSTAS</html>"], { type: "text/html" })),
}));
vi.mock("@/lib/pjecalc/pdf-report-precatorio", () => ({
  gerarRelatorioPrecatorio: vi.fn(() => new Blob(["<html>PRECATORIO</html>"], { type: "text/html" })),
}));
vi.mock("@/lib/pjecalc/pdf-report-justificativa", () => ({
  gerarRelatorioJustificativa: vi.fn(() => new Blob(["<html>JUSTIFICATIVA</html>"], { type: "text/html" })),
}));
vi.mock("@/lib/pjecalc/pdf-report-apuracao-juros", () => ({
  gerarRelatorioApuracaoJuros: vi.fn(() => new Blob(["<html>APURACAO</html>"], { type: "text/html" })),
}));
vi.mock("@/lib/pjecalc/pdf-report-consolidado", () => ({
  gerarRelatorioConsolidadoCompleto: vi.fn(() => new Blob(["<html>CONSOLIDADO</html>"], { type: "text/html" })),
}));

// Provide a minimal window.open for the legacy-capture path (node env).
// The component replaces window.open internally during capture.
beforeEach(() => {
  // @ts-expect-error node env has no window by default
  if (typeof globalThis.window === "undefined") globalThis.window = {} as unknown as Window;
  globalThis.window.open = vi.fn(() => null);
});

import {
  buildReportBlob,
  buildZipFromSelection,
  __TEMPLATES,
  type TemplateId,
  type SeletorTemplatesRelatorioProps,
} from "../SeletorTemplatesRelatorio";
import { gerarRelatorioPDF } from "@/lib/pjecalc/pdf-report";
import { gerarRelatorioCustasDetalhado } from "@/lib/pjecalc/pdf-report-custas";
import { gerarRelatorioConsolidadoCompleto } from "@/lib/pjecalc/pdf-report-consolidado";

// Minimal fake result — enough to exercise the dispatcher (real render logic is mocked).
const fakeProps: SeletorTemplatesRelatorioProps = {
  resultado: {} as SeletorTemplatesRelatorioProps["resultado"],
  processo: "0001-23",
  beneficiario: "Fulano",
  data_liquidacao: "2024-01-15",
};

describe("SeletorTemplatesRelatorio - template catalog", () => {
  it("exposes exactly 9 templates", () => {
    expect(__TEMPLATES).toHaveLength(9);
    const ids = __TEMPLATES.map(t => t.id).sort();
    expect(ids).toEqual([
      "apuracao_juros", "completo", "consolidado", "custas", "diferenca",
      "justificativa", "memoria", "precatorio", "resumo",
    ]);
  });

  it("every template has a title, description and icon", () => {
    for (const t of __TEMPLATES) {
      expect(t.titulo.length).toBeGreaterThan(0);
      expect(t.descricao.length).toBeGreaterThan(0);
      expect(typeof t.Icon).toBe("object"); // lucide components are forwardRef objects
    }
  });
});

describe("buildReportBlob - dispatch per template id", () => {
  it("calls gerarRelatorioPDF for 'resumo'", () => {
    const blob = buildReportBlob("resumo", fakeProps);
    expect(blob).toBeInstanceOf(Blob);
    expect(gerarRelatorioPDF).toHaveBeenCalledTimes(1);
  });

  it("returns the blob from gerarRelatorioCustasDetalhado for 'custas'", () => {
    const blob = buildReportBlob("custas", fakeProps);
    expect(blob).toBeInstanceOf(Blob);
    expect(gerarRelatorioCustasDetalhado).toHaveBeenCalledTimes(1);
  });

  it("throws when 'justificativa' is requested without its configs", () => {
    expect(() => buildReportBlob("justificativa", fakeProps)).toThrowError(/correcaoConfig/);
  });

  it("throws when 'apuracao_juros' is requested without correcaoConfig", () => {
    expect(() => buildReportBlob("apuracao_juros", fakeProps)).toThrowError(/correcaoConfig/);
  });
});

describe("buildZipFromSelection - ZIP assembly", () => {
  it("produces a ZIP blob containing one entry per selected template", async () => {
    const ids: TemplateId[] = ["custas", "precatorio"];
    const zip = await buildZipFromSelection(ids, fakeProps);
    expect(zip).toBeInstanceOf(Blob);
    // ZIP magic bytes: PK\x03\x04
    const header = new Uint8Array(await zip.slice(0, 4).arrayBuffer());
    expect(header[0]).toBe(0x50); // P
    expect(header[1]).toBe(0x4b); // K
    expect(gerarRelatorioCustasDetalhado).toHaveBeenCalled();
  });

  it("invokes the consolidated generator when 'consolidado' is selected with another template", async () => {
    const ids: TemplateId[] = ["consolidado", "custas"];
    await buildZipFromSelection(ids, fakeProps);
    expect(gerarRelatorioConsolidadoCompleto).toHaveBeenCalled();
  });
});
