import { describe, expect, it } from "vitest";
import { autoDetectTipoExtracao } from "../classification/auto-detect-tipo";

describe("autoDetectTipoExtracao — holerite", () => {
  it("holerite com sinais fortes → alta confiança", () => {
    const text = `
      RECIBO DE PAGAMENTO DE SALÁRIO
      Empregado: João da Silva
      VENCIMENTOS                  DESCONTOS
      0001 Salário base   3.500,00
      0620 Comissões      1.200,00
      0501 DSR sobre Comissões 200,00
      ====
      Base de Cálculo INSS: 4.500,00
      Referência: 03/2024
    `;
    const r = autoDetectTipoExtracao(text);
    expect(r.tipo).toBe("holerite");
    expect(r.confianca).toBe("alta");
    expect(r.motivos.length).toBeGreaterThan(0);
  });

  it("holerite com poucos sinais → média", () => {
    // Recibo de pagamento (10) + comissões (3) = 13 → alta
    // Removendo o cabeçalho específico, fica mais ambíguo
    const text = `
      Folha de pagamento de Maio
      Vencimentos
      Descontos
    `;
    const r = autoDetectTipoExtracao(text);
    // "vencimentos" + "descontos" = 8 pontos — média
    expect(r.tipo).toBe("holerite");
    expect(r.confianca).toBe("media");
  });
});

describe("autoDetectTipoExtracao — recibo de férias", () => {
  it("recibo de férias com período aquisitivo + gozo", () => {
    const text = `
      AVISO DE FÉRIAS
      Empregado: João da Silva
      Período Aquisitivo: 2022/2023
      Período de gozo: 01/06/2024 a 30/06/2024
      Abono pecuniário: 10 dias
    `;
    const r = autoDetectTipoExtracao(text);
    expect(r.tipo).toBe("recibo_ferias");
    expect(r.confianca).toMatch(/alta|media/);
  });

  it("recibo com terço constitucional", () => {
    const text = `
      RECIBO DE FÉRIAS
      Período Aquisitivo 2023/2024
      1/3 constitucional sobre férias
    `;
    const r = autoDetectTipoExtracao(text);
    expect(r.tipo).toBe("recibo_ferias");
  });
});

describe("autoDetectTipoExtracao — registro de faltas", () => {
  it("folha de faltas com atestado", () => {
    const text = `
      FOLHA DE FALTAS DO MÊS
      João da Silva
      Atestado médico em 12/03/2024
      Ausência justificada por 3 dias
      CID: M54
    `;
    const r = autoDetectTipoExtracao(text);
    expect(r.tipo).toBe("registro_faltas");
    expect(r.confianca).toMatch(/alta|media/);
  });

  it("controle de frequência com ausências", () => {
    const text = `
      CONTROLE DE FREQUÊNCIA
      Ausência injustificada em 15/03/2024
      Atestado médico em 22/03/2024
    `;
    const r = autoDetectTipoExtracao(text);
    expect(r.tipo).toBe("registro_faltas");
  });
});

describe("autoDetectTipoExtracao — cartão de ponto (first-class v3)", () => {
  it("cartão de ponto detectado vira tipo cartao_ponto com confiança alta", () => {
    const text = `
      CARTÃO DE PONTO
      Empregado: João da Silva
      Data       Entrada    Saída    Entrada    Saída
      01/03/2024 08:00      12:00    13:00      18:00
    `;
    const r = autoDetectTipoExtracao(text);
    expect(r.tipo).toBe("cartao_ponto");
    expect(r.confianca).toMatch(/alta|media/);
    expect(r.motivos[0]).toMatch(/cart[ãa]o\/espelho de ponto/i);
  });

  it("espelho de ponto também vira cartao_ponto", () => {
    const text = `
      ESPELHO DE PONTO
      Jornada de trabalho
      01/03/2024 08:00 12:00 13:00 18:00
    `;
    const r = autoDetectTipoExtracao(text);
    expect(r.tipo).toBe("cartao_ponto");
  });
});

describe("autoDetectTipoExtracao — casos negativos", () => {
  it("OCR vazio → nao_extrair confiança baixa", () => {
    const r = autoDetectTipoExtracao("");
    expect(r.tipo).toBe("nao_extrair");
    expect(r.confianca).toBe("baixa");
    expect(r.motivos[0]).toMatch(/curto/i);
  });

  it("OCR muito curto → nao_extrair", () => {
    const r = autoDetectTipoExtracao("oi");
    expect(r.tipo).toBe("nao_extrair");
    expect(r.confianca).toBe("baixa");
  });

  it("texto genérico sem sinais → nao_extrair confiança baixa", () => {
    const text = "Texto longo qualquer sem nada relevante para detecção. ".repeat(10);
    const r = autoDetectTipoExtracao(text);
    expect(r.tipo).toBe("nao_extrair");
    expect(r.confianca).toBe("baixa");
    expect(r.motivos[0]).toMatch(/insuficiente/i);
  });

  it("empate técnico → nao_extrair", () => {
    // Sinais de holerite (3) + sinais de férias (4) — empate técnico
    const text = `
      Comissões mencionadas
      Abono pecuniário citado
    `;
    const r = autoDetectTipoExtracao(text);
    // 3 vs 4 — gap < 4, então empate técnico
    expect(r.tipo).toBe("nao_extrair");
    expect(r.confianca).toBe("baixa");
  });
});

describe("autoDetectTipoExtracao — scoresPorTipo", () => {
  it("retorna scores de todos os tipos avaliados", () => {
    // Texto > 50 chars com sinal forte de holerite
    const r = autoDetectTipoExtracao(
      "RECIBO DE PAGAMENTO de salário do mês de março — empregado João da Silva",
    );
    expect(r.scoresPorTipo).toHaveProperty("holerite");
    expect(r.scoresPorTipo).toHaveProperty("recibo_ferias");
    expect(r.scoresPorTipo).toHaveProperty("registro_faltas");
    expect(r.scoresPorTipo).toHaveProperty("cartao_ponto");
    expect(r.scoresPorTipo.holerite).toBeGreaterThan(0);
  });
});

describe("autoDetectTipoExtracao — CTPS (Carteira de Trabalho)", () => {
  it("CTPS com férias E faltas detectada como 'ctps'", () => {
    const ocr = `
      CARTEIRA DE TRABALHO E PREVIDÊNCIA SOCIAL
      ANOTAÇÕES GERAIS
      Período aquisitivo: 01/06/2022 a 31/05/2023
      Recibo de Férias 30 dias
      Faltas:
      15/03/2024 ausência injustificada
      22/03/2024 atestado médico
    `;
    const r = autoDetectTipoExtracao(ocr);
    expect(r.tipo).toBe("ctps");
    expect(r.motivos).toContain("cabeçalho 'Carteira de Trabalho'");
  });

  it("CTPS só com sigla CTPS (sem nome completo) + férias detecta", () => {
    const ocr = `
      Documento CTPS nº 12345
      ALTERAÇÕES DE SALÁRIO
      Período aquisitivo: 2022/2023
      Recibo de Férias
    `;
    const r = autoDetectTipoExtracao(ocr);
    expect(r.tipo).toBe("ctps");
  });

  it("Documento só com 'Carteira de Trabalho' SEM férias/faltas NÃO vira ctps", () => {
    const ocr = `
      CARTEIRA DE TRABALHO E PREVIDÊNCIA SOCIAL
      Documento de identificação do trabalhador.
      CTPS nº 12345 série 001-RJ
    `;
    const r = autoDetectTipoExtracao(ocr);
    // Sem férias/faltas no doc, não classifica como ctps.
    expect(r.tipo).not.toBe("ctps");
  });

  it("Recibo de férias avulso (sem sinal CTPS) continua sendo recibo_ferias", () => {
    const ocr = `
      RECIBO DE FÉRIAS
      Empregado: João da Silva
      Período Aquisitivo: 2022/2023
      30 dias de férias gozadas integralmente
      Período de gozo: 01/06/2024 a 30/06/2024
      Abono pecuniário de 10 dias
    `;
    const r = autoDetectTipoExtracao(ocr);
    expect(r.tipo).toBe("recibo_ferias");
  });
});
