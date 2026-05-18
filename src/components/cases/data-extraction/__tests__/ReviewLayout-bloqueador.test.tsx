// @vitest-environment jsdom
/**
 * Gate 2 — Cenário 1: lógica do banner-bloqueador no `ReviewLayout`.
 *
 * Por que aqui e não em cada um dos 4 dialogs (Faltas, Férias, Cartão,
 * Holerite): `ReviewLayout` é o ponto único onde 3 dos 4 dialogs renderizam
 * o banner-bloqueador. `HoleritePreviewDialog` e `CtpsReviewDialog` têm
 * banners inline pelo mesmo padrão (dívida de design registrada — extrair
 * para `<BlockerBanner />` quando estabilizar).
 *
 * Cobertura intencional:
 *   - bloqueador=true  → banner com role="alert" visível, botão "Baixar CSV"
 *     disabled, motivo legível renderizado.
 *   - bloqueador=false → banner ausente, botão habilitado.
 *
 * Não testa: behavior tátil ("cursor: not-allowed", clique no botão
 * disabled não dispara handler). Tátil só humano pega — fica no checklist
 * de Gate 2 e validação no Gate 3 com acervo real.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReviewLayout } from "../ReviewLayout";

beforeEach(() => {
  cleanup();
  // Bypass do painel OCR redimensionável (usa medições DOM que jsdom
  // não modela bem). Testa só a área superior do dialog: header + banner
  // + footer com botão.
  window.localStorage.setItem(
    "review-layout:ocr-hidden",
    JSON.stringify(true),
  );
});

const baseProps = {
  open: true,
  onOpenChange: () => {},
  title: "Teste bloqueador",
  ocrText: "linha 1\nlinha 2\n",
  warnings: [],
  contadores: { extraidos: 0, etiqueta: "item" },
  onConfirm: async () => {},
  children: <div data-testid="tabela-children">tabela</div>,
};

describe("ReviewLayout — banner-bloqueador", () => {
  it("bloqueador=true: renderiza banner role=alert + desabilita botão Baixar CSV", () => {
    render(
      <ReviewLayout
        {...baseProps}
        bloqueador={true}
        bloqueadorMotivo="Score 12 abaixo do mínimo aceitável (30)."
      />,
    );

    const banner = screen.getByRole("alert");
    expect(banner).toBeVisible();
    expect(banner).toHaveTextContent(/Download bloqueado/i);
    expect(banner).toHaveTextContent(
      /Score 12 abaixo do mínimo aceitável \(30\)/i,
    );
    expect(banner).toHaveTextContent(/não pode ser sobrescrito/i);

    const botao = screen.getByRole("button", { name: /baixar csv/i });
    expect(botao).toBeDisabled();
  });

  it("bloqueador=false: banner ausente + botão Baixar CSV habilitado", () => {
    render(<ReviewLayout {...baseProps} bloqueador={false} />);

    expect(screen.queryByRole("alert")).toBeNull();

    const botao = screen.getByRole("button", { name: /baixar csv/i });
    expect(botao).toBeEnabled();
  });

  it("sem bloqueador (prop omitida): banner ausente + botão habilitado (default seguro)", () => {
    render(<ReviewLayout {...baseProps} />);

    expect(screen.queryByRole("alert")).toBeNull();

    const botao = screen.getByRole("button", { name: /baixar csv/i });
    expect(botao).toBeEnabled();
  });

  it("bloqueadorMotivo null/undefined: banner mostra fallback genérico", () => {
    render(
      <ReviewLayout
        {...baseProps}
        bloqueador={true}
        bloqueadorMotivo={null}
      />,
    );

    const banner = screen.getByRole("alert");
    expect(banner).toBeVisible();
    expect(banner).toHaveTextContent(/inconsistência grave detectada/i);
  });
});
