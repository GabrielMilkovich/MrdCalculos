// @vitest-environment jsdom
/**
 * Gate 2 — Cenário 1: lógica do banner-bloqueador no `ReviewLayout`.
 *
 * NOTA HISTÓRICA: design mudou entre 2 sessões.
 * - Versão A (esta sessão, commit a32ab36 original): banner role="alert" com
 *   texto "Download bloqueado — ...", botão Baixar CSV DISABLED, sem override.
 * - Versão B (atual em main após commit 2c5282a "fix(ui): banner de bloqueador
 *   vira ALERTA visual — não trava mais download"): banner div em vermelho com
 *   texto "Atenção — possíveis erros detectados", botão Baixar CSV CONTINUA
 *   HABILITADO. Decisão de produto: operador SEMPRE decide se baixa.
 *
 * Este teste valida a Versão B (estado atual em main). Se a equipe voltar
 * para Versão A no futuro, atualizar este arquivo.
 *
 * Por que aqui e não em cada um dos 4 dialogs: `ReviewLayout` é o ponto único
 * onde 3 dos 4 dialogs renderizam o banner-bloqueador.
 *
 * Cobertura intencional:
 *   - bloqueador=true  → banner em vermelho visível, com motivo legível
 *   - bloqueador=false → banner ausente
 *
 * Não testa: comportamento tátil + interação com checkbox de override.
 * Tátil só humano pega — fica no checklist de Gate 2 e validação no Gate 3.
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

describe("ReviewLayout — banner-bloqueador (design 'Atenção' pós-2c5282a)", () => {
  it("bloqueador=true + reasons: renderiza banner com 'Atenção' e razões", () => {
    render(
      <ReviewLayout
        {...baseProps}
        bloqueador={true}
        bloqueadorReasons={[
          "BLOQUEADOR: Score 12 abaixo do mínimo aceitável (30).",
          "BLOQUEADOR: Nenhuma rubrica reconhecida.",
        ]}
      />,
    );

    expect(
      screen.getByText(/Atenção.*possíveis erros detectados/i),
    ).toBeVisible();
    // Razões aparecem na lista (sem o prefixo "BLOQUEADOR:" que é stripado pelo componente).
    expect(
      screen.getByText(/Score 12 abaixo do mínimo aceitável/i),
    ).toBeVisible();
    expect(
      screen.getByText(/Nenhuma rubrica reconhecida/i),
    ).toBeVisible();
  });

  it("bloqueador=true sem reasons: banner ainda mostra cabeçalho de atenção", () => {
    render(<ReviewLayout {...baseProps} bloqueador={true} />);

    expect(
      screen.getByText(/Atenção.*possíveis erros detectados/i),
    ).toBeVisible();
    // Bloco de reasons não aparece quando reasons é vazio/undefined.
    expect(screen.queryByText(/Score \d+ abaixo/i)).toBeNull();
  });

  it("bloqueador=false: banner de atenção ausente", () => {
    render(<ReviewLayout {...baseProps} bloqueador={false} />);
    expect(screen.queryByText(/Atenção.*possíveis erros detectados/i)).toBeNull();
  });

  it("sem bloqueador (prop omitida): banner ausente (default seguro)", () => {
    render(<ReviewLayout {...baseProps} />);
    expect(screen.queryByText(/Atenção.*possíveis erros detectados/i)).toBeNull();
  });

  it("botão 'Baixar CSV' fica habilitado MESMO com bloqueador=true (design pós-2c5282a)", () => {
    // Decisão de produto explícita no commit 2c5282a: o banner é INFORMATIVO,
    // operador SEMPRE decide se baixa. Se este teste quebrar no futuro, é
    // sinal de que a equipe reverteu para o design "hard block" — aí
    // ajustar este teste em conjunto.
    render(
      <ReviewLayout
        {...baseProps}
        bloqueador={true}
        bloqueadorReasons={["BLOQUEADOR: Teste"]}
      />,
    );
    const botao = screen.getByRole("button", { name: /baixar csv/i });
    expect(botao).toBeEnabled();
  });
});
