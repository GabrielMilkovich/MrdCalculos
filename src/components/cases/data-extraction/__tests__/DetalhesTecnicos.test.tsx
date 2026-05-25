// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetalhesTecnicos } from "../DetalhesTecnicos";

describe("DetalhesTecnicos", () => {
  const items = [
    { label: "Método de extração", value: "Padrão genérico" },
    { label: "Confiança", value: "85/100" },
  ];

  it("começa fechado por padrão (children não visível)", () => {
    render(
      <DetalhesTecnicos items={items}>
        <p>Conteúdo extra</p>
      </DetalhesTecnicos>,
    );
    expect(screen.queryByText("Conteúdo extra")).toBeNull();
  });

  it("expande ao clicar no trigger", () => {
    render(
      <DetalhesTecnicos items={items}>
        <p>Conteúdo extra</p>
      </DetalhesTecnicos>,
    );
    const trigger = screen.getByText("Detalhes técnicos");
    fireEvent.click(trigger);
    expect(screen.getByText("Conteúdo extra")).toBeTruthy();
  });

  it("renderiza items como dt/dd", () => {
    render(<DetalhesTecnicos items={items} defaultOpen={true} />);
    expect(screen.getByText("Método de extração")).toBeTruthy();
    expect(screen.getByText("Padrão genérico")).toBeTruthy();
    expect(screen.getByText("Confiança")).toBeTruthy();
    expect(screen.getByText("85/100")).toBeTruthy();
  });

  it("respeita defaultOpen=true", () => {
    render(
      <DetalhesTecnicos items={items} defaultOpen={true}>
        <p>Visível imediatamente</p>
      </DetalhesTecnicos>,
    );
    expect(screen.getByText("Visível imediatamente")).toBeTruthy();
  });
});
