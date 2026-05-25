// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FaltasReviewDialog } from "../FaltasReviewDialog";
import type { ParseFaltasResult, FaltaParseada } from "@/features/data-extraction";

vi.mock("@/features/data-extraction", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/features/data-extraction");
  return {
    ...actual,
    logCsvExport: vi.fn(),
    triggerBlobDownload: vi.fn(),
  };
});

function makeFalta(overrides: Partial<FaltaParseada> = {}): FaltaParseada {
  return {
    data_inicio: "2024-01-15",
    data_fim: "2024-01-15",
    tipo_afastamento: "falta_simples",
    duracao_dias: 1,
    justificada: false,
    reiniciar_periodo_aquisitivo: false,
    justificativa: null,
    ...overrides,
  };
}

function makeParsed(n: number): ParseFaltasResult {
  const faltas: FaltaParseada[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(i + 1).padStart(2, "0");
    faltas.push(makeFalta({
      data_inicio: `2024-01-${day}`,
      data_fim: `2024-01-${day}`,
    }));
  }
  return { faltas, warnings: [], unparsed_lines: [] };
}

beforeEach(() => cleanup());

describe("FaltasReviewDialog — tabela compacta", () => {
  it("renderiza tabela com 10 faltas sem scroll excessivo", () => {
    render(
      <FaltasReviewDialog
        open={true}
        onOpenChange={() => {}}
        parsed={makeParsed(10)}
        ocrText=""
        filename="test.csv"
      />,
    );
    expect(screen.getByText("10 registro(s). Clique em \"Editar\" para alterar.")).toBeTruthy();
    const editButtons = screen.getAllByText("Editar");
    expect(editButtons.length).toBe(10);
  });

  it("click em Editar abre edição inline da linha", () => {
    render(
      <FaltasReviewDialog
        open={true}
        onOpenChange={() => {}}
        parsed={makeParsed(3)}
        ocrText=""
        filename="test.csv"
      />,
    );
    const editButtons = screen.getAllByText("Editar");
    fireEvent.click(editButtons[0]);
    expect(screen.getByText("Fechar")).toBeTruthy();
    expect(screen.getByPlaceholderText(/Justificativa/)).toBeTruthy();
  });

  it("click em Editar de outra linha fecha a primeira", () => {
    render(
      <FaltasReviewDialog
        open={true}
        onOpenChange={() => {}}
        parsed={makeParsed(3)}
        ocrText=""
        filename="test.csv"
      />,
    );
    const editButtons = screen.getAllByText("Editar");
    fireEvent.click(editButtons[0]);
    expect(screen.getByText("Fechar")).toBeTruthy();

    const editButtons2 = screen.getAllByText("Editar");
    fireEvent.click(editButtons2[0]);
    const closeButtons = screen.queryAllByText("Fechar");
    expect(closeButtons.length).toBe(1);
  });

  it("data fim < data início aplica classe rose na linha", () => {
    const parsed = {
      faltas: [makeFalta({ data_inicio: "2024-01-20", data_fim: "2024-01-10" })],
      warnings: [],
      unparsed_lines: [],
    };
    render(
      <FaltasReviewDialog
        open={true}
        onOpenChange={() => {}}
        parsed={parsed}
        ocrText=""
        filename="test.csv"
      />,
    );
    const rows = document.querySelectorAll("tr[data-row-key]");
    expect(rows.length).toBe(1);
    expect(rows[0].className).toContain("rose");
  });

  it("Adicionar falta cria uma nova linha", () => {
    render(
      <FaltasReviewDialog
        open={true}
        onOpenChange={() => {}}
        parsed={makeParsed(2)}
        ocrText=""
        filename="test.csv"
      />,
    );
    expect(screen.getByText("2 registro(s). Clique em \"Editar\" para alterar.")).toBeTruthy();
    fireEvent.click(screen.getByText("Adicionar falta"));
    expect(screen.getByText("3 registro(s). Clique em \"Editar\" para alterar.")).toBeTruthy();
  });
});
