// @vitest-environment jsdom
/**
 * Testes do banner + dialog manual de classificação ontológica (Sprint 2 / Fase 3).
 *
 * Cobre o caminho mínimo:
 *   - quando `nao_classificadas === 0`: banner ausente
 *   - quando > 0: banner visível com contador e lista resumida
 *   - dialog manual abre e mostra as rubricas pendentes
 *
 * Não testa a persistência via supabase (requer mock do client; escopo de
 * teste de integração futuro).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { OntologiaClassificacaoBanner } from "../OntologiaClassificacaoBanner";
import type { ResumoClassificacaoOntologia } from "@/features/data-extraction/parsers/holerite/types";

beforeEach(() => {
  cleanup();
});

const resumoBase: ResumoClassificacaoOntologia = {
  total_rubricas: 20,
  classificadas: 18,
  nao_classificadas: 2,
  por_metodo: {
    exato: 5,
    normalizado: 8,
    sinonimo: 3,
    fuzzy: 2,
    nao_encontrado: 2,
  },
  base_dsr_comissoes_produtos_centavos: 100000,
  base_dsr_comissoes_servicos_centavos: 0,
  base_dsr_premios_centavos: 0,
  dsr_ja_pago_centavos: 0,
  minimo_garantido_centavos: 0,
  desconsiderado_centavos: 0,
  nao_classificadas_centavos: 50000,
  rubricas_nao_classificadas: ["Salário Família", "Verba XPTO"],
};

describe("OntologiaClassificacaoBanner", () => {
  it("não renderiza nada quando todas as rubricas foram classificadas", () => {
    const resumoTudoOk: ResumoClassificacaoOntologia = {
      ...resumoBase,
      nao_classificadas: 0,
      por_metodo: { ...resumoBase.por_metodo, nao_encontrado: 0 },
      rubricas_nao_classificadas: [],
    };
    const { container } = render(
      <OntologiaClassificacaoBanner documentId="abc-123" resumo={resumoTudoOk} />,
    );
    expect(container.querySelector('[data-testid="ontologia-banner-nao-classificadas"]')).toBeNull();
  });

  it("renderiza banner amarelo com contador e nomes das pendentes", () => {
    render(<OntologiaClassificacaoBanner documentId="abc-123" resumo={resumoBase} />);
    const banner = screen.getByTestId("ontologia-banner-nao-classificadas");
    expect(banner).toBeInTheDocument();
    // Contador
    expect(banner).toHaveTextContent("2 de 20");
    // Lista resumida
    expect(banner).toHaveTextContent("Salário Família");
    expect(banner).toHaveTextContent("Verba XPTO");
  });

  it("renderiza botão 'Classificar manualmente'", () => {
    render(<OntologiaClassificacaoBanner documentId="abc-123" resumo={resumoBase} />);
    const btn = screen.getByRole("button", { name: /classificar manualmente/i });
    expect(btn).toBeInTheDocument();
  });

  it("abre dialog ao clicar e mostra cada rubrica pendente uma vez", () => {
    render(<OntologiaClassificacaoBanner documentId="abc-123" resumo={resumoBase} />);
    fireEvent.click(screen.getByRole("button", { name: /classificar manualmente/i }));
    // Título do dialog
    expect(screen.getByText(/classificar rubricas manualmente/i)).toBeInTheDocument();
    // Cada rubrica aparece exatamente uma vez (dedup de duplicatas)
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Salário Família");
    expect(dialog).toHaveTextContent("Verba XPTO");
  });

  it("trata duplicatas em rubricas_nao_classificadas — exibe nome único uma só vez", () => {
    const resumoDup: ResumoClassificacaoOntologia = {
      ...resumoBase,
      nao_classificadas: 4,
      por_metodo: { ...resumoBase.por_metodo, nao_encontrado: 4 },
      rubricas_nao_classificadas: ["Salário Família", "Salário Família", "Verba XPTO", "Salário Família"],
    };
    render(<OntologiaClassificacaoBanner documentId="abc-123" resumo={resumoDup} />);
    fireEvent.click(screen.getByRole("button", { name: /classificar manualmente/i }));
    const dialog = screen.getByRole("dialog");
    const ocorrencias = dialog.querySelectorAll('div.font-mono');
    const nomes = Array.from(ocorrencias).map((el) => el.textContent);
    expect(nomes.filter((n) => n === "Salário Família").length).toBe(1);
    expect(nomes.filter((n) => n === "Verba XPTO").length).toBe(1);
  });
});
