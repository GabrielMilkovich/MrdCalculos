/**
 * Carrega metadados do caso necessários para popular `PjcMeta` ao gerar o
 * arquivo .pjc. Une dados de:
 *   - cases.cliente / .numero_processo
 *   - pjecalc_dados_processo (data_admissao, data_demissao, datas de cálculo,
 *     data_ajuizamento, reclamante_cpf, reclamante_nome)
 *   - pjecalc_parametros (fallback p/ data_admissao/demissao)
 *
 * Campos faltantes ficam como string vazia (ou null) — o builder do .pjc lida
 * com null no XML, mas datas faltantes geram epoch=0 (que importa "1970"
 * no PJe-Calc; UI deve avisar antes).
 */
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import type { PjcMeta } from "../export/pjc/builder";

export type PjcMetaCheck = {
  meta: PjcMeta;
  missing: string[]; // campos que faltaram (UI avisa antes do export)
};

export async function loadPjcMeta(caseId: string): Promise<PjcMetaCheck> {
  const { data: caseRow } = await supabase
    .from("cases")
    .select("cliente, numero_processo")
    .eq("id", caseId)
    .maybeSingle();

  const dadosResult = await fromUntyped("pjecalc_dados_processo")
    .select(
      "data_admissao, data_demissao, data_inicio_calculo, data_fim_calculo, data_ajuizamento, reclamante_cpf, reclamante_nome",
    )
    .eq("case_id", caseId)
    .maybeSingle();
  const dados = (dadosResult.data ?? null) as
    | {
        data_admissao: string | null;
        data_demissao: string | null;
        data_inicio_calculo: string | null;
        data_fim_calculo: string | null;
        data_ajuizamento: string | null;
        reclamante_cpf: string | null;
        reclamante_nome: string | null;
      }
    | null;

  const paramsResult = await fromUntyped("pjecalc_parametros")
    .select("data_admissao, data_demissao")
    .eq("case_id", caseId)
    .maybeSingle();
  const params = (paramsResult.data ?? null) as
    | { data_admissao: string | null; data_demissao: string | null }
    | null;

  const data_admissao = dados?.data_admissao ?? params?.data_admissao ?? "";
  const data_demissao = dados?.data_demissao ?? params?.data_demissao ?? null;
  const data_inicio_calculo = dados?.data_inicio_calculo ?? data_admissao;
  const data_termino_calculo =
    dados?.data_fim_calculo ?? data_demissao ?? data_admissao;

  const nome_beneficiario =
    dados?.reclamante_nome?.trim() || caseRow?.cliente?.trim() || "";
  const cpf = dados?.reclamante_cpf ?? "";
  const numero_processo = caseRow?.numero_processo ?? "";

  const meta: PjcMeta = {
    nome_beneficiario,
    cpf,
    data_admissao,
    data_demissao,
    data_inicio_calculo,
    data_termino_calculo,
    data_ajuizamento: dados?.data_ajuizamento ?? null,
    numero_processo,
  };

  const missing: string[] = [];
  if (!nome_beneficiario) missing.push("Nome do beneficiário");
  if (!data_admissao) missing.push("Data de admissão");
  if (!numero_processo) missing.push("Número do processo");
  if (!data_inicio_calculo) missing.push("Data início do cálculo");
  if (!data_termino_calculo) missing.push("Data término do cálculo");

  return { meta, missing };
}
