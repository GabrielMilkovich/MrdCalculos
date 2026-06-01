/**
 * Módulo "Dados do Processo" — paridade de input PJe-Calc Cidadão v2.15.1.
 * Spec: docs/specs/dados-do-processo.md (campos/validações extraídos do Java).
 *
 * Stack-alvo: react-hook-form + zod + Decimal.js (valor da causa), shadcn/ui.
 * Persistência: grava nas COLUNAS REAIS de `pjecalc_calculos` (corrige o bug
 * histórico que gravava aliases inexistentes na view → save falhava), via
 * upsert onConflict=case_id, mesmo padrão de ModuloParametrosGerais. user_id é
 * incluído p/ satisfazer a RLS (user_id = auth.uid()) no INSERT.
 */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { Save, Loader2, Search } from "lucide-react";
import {
  formatarCPF, formatarCNPJ, formatarPIS, formatarProcessoCNJ,
} from "@/lib/validadores";
import {
  dadosProcessoSchema, dadosProcessoDefaults, toPjecalcCalculosPayload,
  TIPO_CALCULO, TIPO_DOC_FISCAL, TIPO_DOC_PREV,
  type DadosProcessoForm, type TipoDocFiscal,
} from "./dados-processo-schema";

interface Props { caseId: string; }

const TIPO_CALCULO_LABEL: Record<string, string> = {
  ADVOGADO: "Advogado", CREDOR: "Credor", DEVEDOR: "Devedor", VARA: "Vara", GABINETE: "Gabinete",
};

/** Máscara do documento fiscal conforme o tipo selecionado. */
function mascararDocFiscal(valor: string, tipo: TipoDocFiscal): string {
  if (tipo === "CPF") return formatarCPF(valor);
  if (tipo === "CNPJ") return formatarCNPJ(valor);
  return valor.replace(/\D+/g, "").slice(0, 14); // CEI: só dígitos
}

export function ModuloDadosProcesso({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [buscandoCitacao, setBuscandoCitacao] = useState(false);

  const form = useForm<DadosProcessoForm>({
    resolver: zodResolver(dadosProcessoSchema),
    defaultValues: dadosProcessoDefaults,
  });

  // Lê a linha real de pjecalc_calculos (flat + JSONB dados_processo legado).
  const { data } = useQuery({
    queryKey: ["pjecalc_calculos", caseId],
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_calculos")
        .select("*").eq("case_id", caseId).maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });

  useEffect(() => {
    if (!data) return;
    const d = data;
    // Fallback p/ JSONB legado (ModuloParametrosGerais grava CNJ/valor/doc lá).
    const jp = (d.dados_processo as Record<string, unknown> | null) ?? {};
    const str = (v: unknown) => (v == null ? "" : String(v));
    form.reset({
      tipo_calculo: (TIPO_CALCULO as readonly string[]).includes(str(d.tipo_calculo))
        ? (d.tipo_calculo as DadosProcessoForm["tipo_calculo"]) : "ADVOGADO",
      processo_cnj: str(d.processo_cnj) || str(jp.cnj_numero_processo),
      valor_causa: d.valor_causa != null ? String(d.valor_causa) : str(jp.cnj_valor_causa),
      data_autuacao: str(d.data_autuacao),
      tribunal: str(d.tribunal) || str(jp.cnj_tribunal),
      vara: str(d.vara) || str(jp.cnj_vara),
      reclamante_nome: str(d.reclamante_nome),
      reclamante_doc_tipo: (TIPO_DOC_FISCAL as readonly string[]).includes(str(d.reclamante_doc_tipo))
        ? (d.reclamante_doc_tipo as TipoDocFiscal) : "CPF",
      reclamante_cpf: str(d.reclamante_cpf),
      reclamante_pis_nit_tipo: (TIPO_DOC_PREV as readonly string[]).includes(str(d.reclamante_pis_nit_tipo))
        ? (d.reclamante_pis_nit_tipo as DadosProcessoForm["reclamante_pis_nit_tipo"]) : "PIS",
      reclamante_pis_nit: str(d.reclamante_pis_nit) || str(jp.cnj_doc_previdenciario),
      reclamado_nome: str(d.reclamado_nome),
      reclamado_doc_tipo: (TIPO_DOC_FISCAL as readonly string[]).includes(str(d.reclamado_doc_tipo))
        ? (d.reclamado_doc_tipo as TipoDocFiscal) : "CNPJ",
      reclamado_cnpj: str(d.reclamado_cnpj),
      citacao_habilitada: d.modo_calculo === "assisted_from_pjc",
      data_citacao: str(d.data_citacao),
    });
  }, [data, form]);

  const buscarCitacaoDatajud = async () => {
    const numeroProcesso = form.getValues("processo_cnj")?.trim();
    if (!numeroProcesso) {
      toast.error("Informe o número do processo antes de buscar no Datajud.");
      return;
    }
    setBuscandoCitacao(true);
    try {
      const { data: fnData, error } = await supabase.functions.invoke("buscar-citacao-datajud", {
        body: { numero_processo: numeroProcesso },
      });
      if (error) throw new Error(error.message);
      if (fnData?.erro) { toast.warning(`Datajud: ${fnData.erro}`); return; }
      if (fnData?.data_citacao) {
        form.setValue("data_citacao", fnData.data_citacao, { shouldValidate: true });
        form.setValue("citacao_habilitada", true, { shouldValidate: true });
        toast.success(`Data de citação encontrada no Datajud: ${fnData.data_citacao}`);
        if (fnData.aviso) toast.warning(fnData.aviso);
      } else {
        toast.warning(fnData?.aviso ?? "Data de citação não encontrada no Datajud.");
      }
    } catch (e) {
      toast.error(`Erro ao buscar no Datajud: ${(e as Error).message}`);
    } finally {
      setBuscandoCitacao(false);
    }
  };

  const onSubmit = async (values: DadosProcessoForm) => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const payload = toPjecalcCalculosPayload(values, caseId, auth.user?.id ?? null);
      const { error } = await fromUntyped("pjecalc_calculos").upsert(payload, { onConflict: "case_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pjecalc_calculos", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_dados_processo", caseId] });
      qc.invalidateQueries({ queryKey: ["calculo_ativo", caseId] });
      toast.success("Dados do processo salvos!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const citacaoHabilitada = form.watch("citacao_habilitada");
  const reclamanteDocTipo = form.watch("reclamante_doc_tipo");
  const reclamadoDocTipo = form.watch("reclamado_doc_tipo");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dados do Processo</h2>
          <Button type="submit" disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
          </Button>
        </div>

        {/* Header do Cálculo */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Cálculo</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="tipo_calculo" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Tipo *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {TIPO_CALCULO.map((t) => <SelectItem key={t} value={t}>{TIPO_CALCULO_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Identificação do Processo */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Identificação do Processo</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="processo_cnj" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="text-xs">Nº do Processo (CNJ)</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-xs" placeholder="NNNNNNN-DD.AAAA.J.TR.OOOO"
                    onChange={(e) => field.onChange(formatarProcessoCNJ(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="valor_causa" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Valor da Causa (R$)</FormLabel>
                <FormControl><Input {...field} inputMode="decimal" className="h-8 text-xs" placeholder="0,00" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="data_autuacao" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Autuado em</FormLabel>
                <FormControl><Input {...field} type="date" className="h-8 text-xs" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tribunal" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Tribunal</FormLabel>
                <FormControl><Input {...field} className="h-8 text-xs" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="vara" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Vara / Órgão</FormLabel>
                <FormControl><Input {...field} className="h-8 text-xs" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Reclamante */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Reclamante</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="reclamante_nome" render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel className="text-xs">Nome</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reclamante_doc_tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Documento Fiscal</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-3 pt-1">
                      {TIPO_DOC_FISCAL.map((t) => (
                        <label key={t} className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <RadioGroupItem value={t} /> {t}
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reclamante_cpf" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs">Número</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-8 text-xs"
                      onChange={(e) => field.onChange(mascararDocFiscal(e.target.value, reclamanteDocTipo))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="reclamante_pis_nit_tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Doc. Previdenciário</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{TIPO_DOC_PREV.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reclamante_pis_nit" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs">Número</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-8 text-xs"
                      onChange={(e) => field.onChange(formatarPIS(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Reclamada */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Reclamada</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="reclamado_nome" render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel className="text-xs">Nome</FormLabel>
                <FormControl><Input {...field} className="h-8 text-xs" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reclamado_doc_tipo" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Documento Fiscal</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-3 pt-1">
                    {TIPO_DOC_FISCAL.map((t) => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <RadioGroupItem value={t} /> {t}
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="reclamado_cnpj" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="text-xs">Número</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-xs"
                    onChange={(e) => field.onChange(mascararDocFiscal(e.target.value, reclamadoDocTipo))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Extensão MRD (fora da paridade PJe): Citação ADC 58 + Datajud */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Citação (ADC 58) — extensão MRD</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="citacao_habilitada" render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <Label className="text-xs">Habilitar citação</Label>
              </FormItem>
            )} />
            <FormField control={form.control} name="data_citacao" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="text-xs">Data de Citação {citacaoHabilitada && <span className="text-destructive">*</span>}</FormLabel>
                <div className="flex gap-1.5">
                  <FormControl><Input {...field} type="date" disabled={!citacaoHabilitada} className="h-8 text-xs flex-1" /></FormControl>
                  <Button type="button" variant="outline" size="sm" className="h-8 px-2 shrink-0"
                    disabled={buscandoCitacao} onClick={buscarCitacaoDatajud} title="Buscar citação no Datajud (CNJ)">
                    {buscandoCitacao ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                  </Button>
                </div>
                <FormDescription className="text-[10px]">
                  Define modo do cálculo: habilitada → assisted_from_pjc; desabilitada → independent.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
