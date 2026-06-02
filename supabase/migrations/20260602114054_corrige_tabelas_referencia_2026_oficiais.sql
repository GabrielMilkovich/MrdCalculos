-- Correção das tabelas de referência 2026 contra fontes oficiais.
--
-- Razão: tabelas foram seedadas em 2026-04-13 (criação do projeto) com valores
-- projetados/incorretos e nunca foram revisadas contra DOU/portarias oficiais.
-- O sistema de sync automático (BCB, IPEA, BrasilAPI) cobre apenas índices e
-- feriados — tabelas anuais (SM/INSS/IR) ficaram fora porque mudam por
-- instrumento normativo único (Decreto/Portaria/Lei).
--
-- Fontes consultadas em 2026-06-02:
--   SM 2026:    Decreto 12.797/2025  (R$ 1.621,00)
--   INSS 2026:  Portaria Interministerial MPS/MF nº 13/2026 (teto R$ 8.475,55)
--   IR 2026:    Lei 9.250/1995 (tabela formal mantida) + Lei 15.270/2025
--               (desconto progressivo separado, NÃO implementado nesta tabela —
--                deve ser aplicado em camada de cálculo na engine IRRF).
--
-- Antes desta migração (valores INCORRETOS no banco):
--   SM 2026:    R$ 1.622,00          (projeção PLDO, decreto saiu R$ 1.621)
--   INSS 2026:  teto R$ 8.341,15     (projeção, oficial R$ 8.475,55)
--   IR 2026:    tabela colapsada com isenção R$ 5.000 e só 3 faixas
--               (mistura indevida da Lei 15.270 com tabela formal)

DO $$
DECLARE
  v_ir_id uuid;
BEGIN
  -- ============================================================
  -- 1) SALÁRIO MÍNIMO 2026 — Decreto 12.797/2025
  -- ============================================================
  UPDATE pjecalc_salario_minimo
  SET valor = 1621.00
  WHERE competencia = '2026-01-01' AND valor <> 1621.00;

  IF NOT FOUND THEN
    INSERT INTO pjecalc_salario_minimo (competencia, valor)
    VALUES ('2026-01-01', 1621.00)
    ON CONFLICT (competencia) DO NOTHING;
  END IF;

  -- ============================================================
  -- 2) INSS 2026 — Portaria Interministerial MPS/MF nº 13/2026
  --    Faixas progressivas iniciam no SM (R$ 1.621,00) e vão até
  --    o teto previdenciário (R$ 8.475,55).
  -- ============================================================
  DELETE FROM pjecalc_inss_faixas WHERE competencia_inicio = '2026-01-01';

  INSERT INTO pjecalc_inss_faixas
    (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, teto_previdenciario, progressiva)
  VALUES
    ('2026-01-01','2026-12-31', 1, 1621.00, 0.075, NULL, false),
    ('2026-01-01','2026-12-31', 2, 2902.84, 0.090, NULL, false),
    ('2026-01-01','2026-12-31', 3, 4354.27, 0.120, NULL, false),
    ('2026-01-01','2026-12-31', 4, 8475.55, 0.140, NULL, false);

  -- ============================================================
  -- 3) IR 2026 — Tabela progressiva mensal (Lei 9.250, valores
  --    mantidos de 2025-02 sem reajuste em 2026).
  --
  --    ATENÇÃO ENGINE: a Lei 15.270/2025 instituiu um "desconto
  --    progressivo" SEPARADO que zera o IR até R$ 5.000 e reduz
  --    gradualmente até R$ 7.350. Esse mecanismo é aplicado POR CIMA
  --    do IR calculado por esta tabela formal — NÃO substitui as
  --    faixas. Implementação fica na camada de cálculo da engine
  --    IRRF, não nesta tabela de referência.
  -- ============================================================
  SELECT id INTO v_ir_id FROM pjecalc_imposto_renda WHERE competencia = '2026-01-01';

  IF v_ir_id IS NULL THEN
    INSERT INTO pjecalc_imposto_renda (competencia, deducao_dependente, deducao_aposentado_65)
    VALUES ('2026-01-01', 189.59, 2428.80)
    RETURNING id INTO v_ir_id;
  ELSE
    UPDATE pjecalc_imposto_renda
    SET deducao_dependente    = 189.59,
        deducao_aposentado_65 = 2428.80
    WHERE id = v_ir_id;
  END IF;

  DELETE FROM pjecalc_imposto_renda_faixas WHERE ir_id = v_ir_id;

  INSERT INTO pjecalc_imposto_renda_faixas
    (ir_id, faixa, valor_inicial, valor_final, aliquota, parcela_deduzir)
  VALUES
    (v_ir_id, 1, 0,       2428.80, 0,    0),
    (v_ir_id, 2, 2428.81, 2826.65, 7.5,  182.16),
    (v_ir_id, 3, 2826.66, 3751.05, 15,   394.16),
    (v_ir_id, 4, 3751.06, 4664.68, 22.5, 675.49),
    (v_ir_id, 5, 4664.69, 999999,  27.5, 908.73);

  -- ============================================================
  -- VALIDAÇÃO PÓS-COMMIT — falha alto e claro se algo divergir
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM pjecalc_salario_minimo WHERE competencia='2026-01-01' AND valor=1621.00) THEN
    RAISE EXCEPTION 'SM 2026 não bate com 1621.00 após migration';
  END IF;

  IF (SELECT COUNT(*) FROM pjecalc_inss_faixas WHERE competencia_inicio='2026-01-01') <> 4 THEN
    RAISE EXCEPTION 'INSS 2026 deveria ter exatamente 4 faixas';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pjecalc_inss_faixas WHERE competencia_inicio='2026-01-01' AND faixa=4 AND valor_ate=8475.55) THEN
    RAISE EXCEPTION 'INSS 2026 teto não bate com 8475.55';
  END IF;

  IF (SELECT COUNT(*) FROM pjecalc_imposto_renda_faixas f JOIN pjecalc_imposto_renda ir ON ir.id=f.ir_id WHERE ir.competencia='2026-01-01') <> 5 THEN
    RAISE EXCEPTION 'IR 2026 deveria ter exatamente 5 faixas (tabela formal Lei 9.250)';
  END IF;
END $$;
