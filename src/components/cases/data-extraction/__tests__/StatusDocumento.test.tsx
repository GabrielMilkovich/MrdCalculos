// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusDocumento, type StatusDoc } from "../StatusDocumento";

describe("StatusDocumento", () => {
  const statuses: StatusDoc[] = ["processando", "conferir", "conferido", "erro", "ignorado"];
  const expectedLabels: Record<StatusDoc, string> = {
    processando: "Processando",
    conferir: "Conferir",
    conferido: "Conferido",
    erro: "Não foi possível ler",
    ignorado: "Ignorado",
  };

  for (const status of statuses) {
    it(`renderiza label correto para status "${status}"`, () => {
      render(<StatusDocumento status={status} />);
      expect(screen.getByText(expectedLabels[status])).toBeTruthy();
    });
  }

  it("status processando tem ícone com animate-spin", () => {
    const { container } = render(<StatusDocumento status="processando" />);
    const spinIcon = container.querySelector(".animate-spin");
    expect(spinIcon).toBeTruthy();
  });

  it("status conferido NÃO tem animate-spin", () => {
    const { container } = render(<StatusDocumento status="conferido" />);
    const spinIcon = container.querySelector(".animate-spin");
    expect(spinIcon).toBeNull();
  });

  it("mostra detalhe quando passado", () => {
    render(<StatusDocumento status="conferir" detalhe="12 verbas" />);
    expect(screen.getByText("· 12 verbas")).toBeTruthy();
  });

  it("não mostra detalhe quando não passado", () => {
    render(<StatusDocumento status="conferir" />);
    expect(screen.queryByText(/·/)).toBeNull();
  });
});
