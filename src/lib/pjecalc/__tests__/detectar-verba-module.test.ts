/**
 * Testes do detector heurístico de verba-module por nome.
 * Sessão 4 do roadmap pixel-perfect.
 */
import { describe, expect, it } from "vitest";
import { detectarVerbaModuleId } from "../detectar-verba-module";
import { makeVerba } from "./helpers";

describe("detectarVerbaModuleId — mapeamento nome→moduleId", () => {
  it.each([
    ["Horas Extras 50%", "HE_50"],
    ["HE 50%", "HE_50"],
    ["HORAS EXTRAS 100%", "HE_100"],
    ["HE 100", "HE_100"],
    ["DSR sobre HE", "DSR"],
    ["Repouso Semanal Remunerado", "DSR"],
    ["Adicional Noturno", "ADIC_NOTURNO"],
    ["Adic. Noturno 20%", "ADIC_NOTURNO"],
    ["Insalubridade Grau Médio", "INSALUBRIDADE"],
    ["Periculosidade 30%", "PERICULOSIDADE"],
    ["13º Salário Proporcional", "DECIMO_PROP"],
    ["Décimo Terceiro", "DECIMO_PROP"],
    ["Férias Proporcionais", "FERIAS_PROP"],
    ["Férias Vencidas Indenizadas", "FERIAS_VENC"],
    ["Aviso Prévio Indenizado", "AVISO_PREVIO_PROPORCIONAL"],
    ["Multa do Art. 467 CLT", "MULTA_467"],
    ["Multa Art. 477 CLT", "MULTA_477"],
    ["Multa de 40% do FGTS", "MULTA_40_FGTS"],
    ["Feriado Trabalhado", "DOM_FER"],
    ["Domingo Laborado", "DOM_FER"],
    ["Intervalo Intrajornada Suprimido", "INTRAJORNADA"],
    ["Intervalo Interjornada", "INTERJORNADA"],
    ["Art. 384 CLT", "ART384"],
    ["Adicional de Transferência", "ADIC_TRANSFERENCIA"],
    ["Acúmulo de Função", "ACUMULO_FUNCAO"],
    ["Gratificação de Função", "GRATIFICACAO_FUNCAO"],
    ["Diferenças Salariais", "DIF_SALARIAIS"],
    ["Comissões", "COMISSAO"],
    ["Cesta Básica", "CESTA_BASICA"],
    ["Vale Alimentação", "CESTA_BASICA"],
    ["PLR 2024", "PLR_PROP"],
    ["Participação nos Lucros", "PLR_PROP"],
    ["Danos Morais", "DANOS_MORAIS"],
    ["Danos Materiais", "DANOS_MATERIAIS"],
    ["Equiparação Salarial", "EQUIPARACAO_SALARIAL"],
    ["Estabilidade Gestante", "ESTABILIDADE"],
    ["Indenização Pré-Database", "INDENIZACAO_PRE_DATABASE"],
    ["Trabalho Intermitente", "TRABALHO_INTERMITENTE"],
    ["Gorjetas", "GORJETA"],
    ["Salário Maternidade", "SALARIO_MATERNIDADE"],
    ["Diferenças de FGTS", "FGTS_DIF"],
    ["Reintegração", "REINTEGRACAO"],
  ])("'%s' → moduleId '%s'", (nome, esperado) => {
    const v = makeVerba({ nome });
    expect(detectarVerbaModuleId(v)).toBe(esperado);
  });

  it("retorna null para nome desconhecido", () => {
    expect(detectarVerbaModuleId(makeVerba({ nome: "Verba Totalmente Inexistente XYZ" })))
      .toBeNull();
  });

  it("retorna null para nome vazio", () => {
    expect(detectarVerbaModuleId(makeVerba({ nome: "" }))).toBeNull();
  });

  it("é case-insensitive e tolera acento/no-acento", () => {
    expect(detectarVerbaModuleId(makeVerba({ nome: "ferias vencidas" })))
      .toBe("FERIAS_VENC");
    expect(detectarVerbaModuleId(makeVerba({ nome: "FÉRIAS VENCIDAS" })))
      .toBe("FERIAS_VENC");
  });
});
