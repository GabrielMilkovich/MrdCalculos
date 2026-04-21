-- ============================================================
-- CORREÇÃO CIRÚRGICA de IPCA-E em pjecalc_correcao_monetaria
--
-- PROBLEMA: DB tinha IPCA-E com razão 2019-08 → 2024-08 = 1.4086
--           O valor correto (validado por 19/20 ≤10% delta vs PJe-Calc oficial
--           nos testes parity-pjcs-novos-independent) é 1.3183.
--           Divergência de +6.85% que inflava liquidações com correção monetária.
--
-- ESTRATÉGIA CIRÚRGICA:
--  1. Canonical = src/lib/pjecalc/indices-fallback.ts IPCA_E_ACUMULADO
--     (base 2014-12=100, validado por paridade GOLDEN).
--  2. Re-ancoragem em 2019-08: preserva a base original do DB (2000-01=1)
--     novo_acum[c] = db_acum[2019-08] × (canonical[c] / canonical[2019-08])
--  3. Recompute valor mensal: taxa[c] = (acum[c]/acum[c-1]-1)×100
--  4. Registra cada UPDATE em indices_correction_audit (reversível).
--
-- ESCOPO: apenas IPCA-E (SELIC tinha delta aceitável 0.6%; TR DB tem
-- variações reais que hardcoded simplificava como constante — NÃO tocar).
--
-- ALIASES: IPCAE/IPCA são normalizados para IPCA-E em pjc-to-engine.ts:798,
-- não precisam entrada própria no DB.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.indices_correction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applied_at timestamptz NOT NULL DEFAULT now(),
  indice text NOT NULL,
  competencia date NOT NULL,
  acumulado_antigo numeric,
  acumulado_novo numeric,
  valor_antigo numeric,
  valor_novo numeric,
  source text NOT NULL DEFAULT 'canonical-20260420',
  reason text
);

CREATE INDEX IF NOT EXISTS idx_indices_audit_idx_comp
  ON public.indices_correction_audit (indice, competencia);

ALTER TABLE public.indices_correction_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS indices_audit_service_only ON public.indices_correction_audit;
CREATE POLICY indices_audit_service_only ON public.indices_correction_audit
  FOR ALL USING (auth.role() = 'service_role' OR
                 (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user))
  WITH CHECK (auth.role() = 'service_role' OR
              (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user));

-- ============ CANONICAL SNAPSHOT (IPCA-E 2019-2026) ============
DO $$
DECLARE
  v_db_anchor numeric;
  v_hc_anchor numeric := 128.08764485;  -- canonical IPCA-E 2019-08
  v_updated int;
  v_razao_pos numeric;
BEGIN
  SELECT acumulado INTO v_db_anchor
  FROM pjecalc_correcao_monetaria
  WHERE indice='IPCA-E' AND competencia='2019-08-01';

  IF v_db_anchor IS NULL THEN
    RAISE NOTICE 'Âncora IPCA-E 2019-08 ausente no DB — abortando correção';
    RETURN;
  END IF;

  -- Staging em memória via CTE
  CREATE TEMP TABLE _ipca_canonical (
    competencia date PRIMARY KEY,
    acum_hc numeric NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _ipca_canonical (competencia, acum_hc) VALUES
    ('2019-01-01'::date,125.13297715::numeric),
    ('2019-02-01'::date,125.80869523::numeric),
    ('2019-03-01'::date,126.50064305::numeric),
    ('2019-04-01'::date,127.41144768::numeric),
    ('2019-05-01'::date,127.85738775::numeric),
    ('2019-06-01'::date,127.87017349::numeric),
    ('2019-07-01'::date,127.98525665::numeric),
    ('2019-08-01'::date,128.08764485::numeric),
    ('2019-09-01'::date,128.03640979::numeric),
    ('2019-10-01'::date,128.15164256::numeric),
    ('2019-11-01'::date,128.25416388::numeric),
    ('2019-12-01'::date,129.39562593::numeric),
    ('2020-01-01'::date,129.66735675::numeric),
    ('2020-02-01'::date,129.88779125::numeric),
    ('2020-03-01'::date,129.91376881::numeric),
    ('2020-04-01'::date,129.84881193::numeric),
    ('2020-05-01'::date,129.68000847::numeric),
    ('2020-06-01'::date,129.97827249::numeric),
    ('2020-07-01'::date,130.44619427::numeric),
    ('2020-08-01'::date,131.03320215::numeric),
    ('2020-09-01'::date,131.62285156::numeric),
    ('2020-10-01'::date,132.86010636::numeric),
    ('2020-11-01'::date,133.93627322::numeric),
    ('2020-12-01'::date,135.35599772::numeric),
    ('2021-01-01'::date,135.72145891::numeric),
    ('2021-02-01'::date,136.88866346::numeric),
    ('2021-03-01'::date,138.16172803::numeric),
    ('2021-04-01'::date,138.76963963::numeric),
    ('2021-05-01'::date,139.38022605::numeric),
    ('2021-06-01'::date,140.53708192::numeric),
    ('2021-07-01'::date,142.13920466::numeric),
    ('2021-08-01'::date,143.50374102::numeric),
    ('2021-09-01'::date,145.13968367::numeric),
    ('2021-10-01'::date,146.823304::numeric),
    ('2021-11-01'::date,148.54113666::numeric),
    ('2021-12-01'::date,149.04617652::numeric),
    ('2022-01-01'::date,149.91064435::numeric),
    ('2022-02-01'::date,151.39475973::numeric),
    ('2022-03-01'::date,153.84735483::numeric),
    ('2022-04-01'::date,156.50891407::numeric),
    ('2022-05-01'::date,157.27580775::numeric),
    ('2022-06-01'::date,158.2981005::numeric),
    ('2022-07-01'::date,157.22167342::numeric),
    ('2022-08-01'::date,156.65567539::numeric),
    ('2022-09-01'::date,156.20137393::numeric),
    ('2022-10-01'::date,157.12296204::numeric),
    ('2022-11-01'::date,157.95571374::numeric),
    ('2022-12-01'::date,158.93503917::numeric),
    ('2023-01-01'::date,159.80918188::numeric),
    ('2023-02-01'::date,161.00775074::numeric),
    ('2023-03-01'::date,162.11870422::numeric),
    ('2023-04-01'::date,162.94550962::numeric),
    ('2023-05-01'::date,163.01068782::numeric),
    ('2023-06-01'::date,162.84767713::numeric),
    ('2023-07-01'::date,162.73368376::numeric),
    ('2023-08-01'::date,162.79877723::numeric),
    ('2023-09-01'::date,163.05925528::numeric),
    ('2023-10-01'::date,163.54843304::numeric),
    ('2023-11-01'::date,164.0227235::numeric),
    ('2023-12-01'::date,164.58040076::numeric),
    ('2024-01-01'::date,165.27163844::numeric),
    ('2024-02-01'::date,166.56075722::numeric),
    ('2024-03-01'::date,167.16037595::numeric),
    ('2024-04-01'::date,167.67857311::numeric),
    ('2024-05-01'::date,168.41635883::numeric),
    ('2024-06-01'::date,169.07318263::numeric),
    ('2024-07-01'::date,169.09008995::numeric),
    ('2024-08-01'::date,168.85336382::numeric),
    ('2024-09-01'::date,169.0728732::numeric),
    ('2024-10-01'::date,169.98586671::numeric),
    ('2024-11-01'::date,171.03977909::numeric),
    ('2024-12-01'::date,171.62131434::numeric),
    ('2025-01-01'::date,171.81009779::numeric),
    ('2025-02-01'::date,173.92336199::numeric),
    ('2025-03-01'::date,175.03647151::numeric),
    ('2025-04-01'::date,175.78912834::numeric),
    ('2025-05-01'::date,176.4219692::numeric),
    ('2025-06-01'::date,176.88066632::numeric),
    ('2025-07-01'::date,177.46437252::numeric),
    ('2025-08-01'::date,177.2159224::numeric),
    ('2025-09-01'::date,178.06655883::numeric),
    ('2025-10-01'::date,178.38707864::numeric),
    ('2025-11-01'::date,178.7438528::numeric),
    ('2025-12-01'::date,179.19071243::numeric),
    ('2026-01-01'::date,179.54909385::numeric),
    ('2026-02-01'::date,181.05730624::numeric);

  CREATE TEMP TABLE _ipca_targets ON COMMIT DROP AS
  WITH scaled AS (
    SELECT competencia, (acum_hc * (v_db_anchor / v_hc_anchor))::numeric AS acum_novo
    FROM _ipca_canonical
  )
  SELECT
    s.competencia,
    s.acum_novo,
    CASE
      WHEN prev.acum_novo IS NULL OR prev.acum_novo = 0 THEN NULL
      ELSE ROUND(((s.acum_novo / prev.acum_novo - 1) * 100)::numeric, 4)
    END AS valor_novo
  FROM scaled s
  LEFT JOIN scaled prev
    ON prev.competencia = (s.competencia - interval '1 month')::date;

  -- AUDIT ANTES do UPDATE
  INSERT INTO indices_correction_audit
    (indice, competencia, acumulado_antigo, acumulado_novo,
     valor_antigo, valor_novo, reason)
  SELECT
    'IPCA-E', t.competencia, db.acumulado, t.acum_novo,
    db.valor, t.valor_novo,
    'IPCA-E re-ancorado (razão 2019-08→2024-08: 1.408 → 1.318)'
  FROM _ipca_targets t
  JOIN pjecalc_correcao_monetaria db
    ON db.indice = 'IPCA-E' AND db.competencia = t.competencia
  WHERE ABS(COALESCE(db.acumulado - t.acum_novo, 1)) > 0.0001;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  UPDATE pjecalc_correcao_monetaria m
  SET acumulado = t.acum_novo,
      valor = COALESCE(t.valor_novo, m.valor)
  FROM _ipca_targets t
  WHERE m.indice = 'IPCA-E'
    AND m.competencia = t.competencia
    AND ABS(COALESCE(m.acumulado - t.acum_novo, 1)) > 0.0001;

  SELECT
    (SELECT acumulado FROM pjecalc_correcao_monetaria WHERE indice='IPCA-E' AND competencia='2024-08-01')
    / NULLIF((SELECT acumulado FROM pjecalc_correcao_monetaria WHERE indice='IPCA-E' AND competencia='2019-08-01'), 0)
  INTO v_razao_pos;

  RAISE NOTICE 'IPCA-E corrigido: % rows auditados | razão 2019-08→2024-08 agora = %',
    v_updated, ROUND(v_razao_pos, 4);
END $$;

COMMENT ON TABLE public.indices_correction_audit IS
  'Audit trail de correções em pjecalc_correcao_monetaria. Permite reverter via INSERT-as-SELECT dos valores antigos.';
