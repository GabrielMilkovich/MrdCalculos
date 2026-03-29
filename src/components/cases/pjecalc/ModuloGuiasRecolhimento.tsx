/**
 * ModuloGuiasRecolhimento — GPS and DARF generation UI for PJe-Calc.
 * Shows GPS entries (INSS per competência) and DARF entries (IRRF),
 * with options to print forms and export data.
 */
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Download, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { PjeLiquidacaoResult } from "@/lib/pjecalc/engine-types";
import {
  gerarGPS,
  gerarDARF,
  imprimirGuias,
  exportarGuiasCSV,
  type GPSData,
  type DARFData,
  type DadosProcessoGPS,
  type DadosProcessoDARF,
} from "@/lib/pjecalc/gps-darf-generator";
import { downloadCSV } from "@/lib/pjecalc/excel-export";

interface Props {
  result: PjeLiquidacaoResult;
  dadosProcesso?: {
    reclamada_cnpj?: string;
    reclamada_nome?: string;
    reclamante_cpf?: string;
    reclamante_nome?: string;
    numero_processo?: string;
  };
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function ModuloGuiasRecolhimento({ result, dadosProcesso }: Props) {
  const [tab, setTab] = useState<string>("gps");

  const processoDados = dadosProcesso || {};
  const gpsInput: DadosProcessoGPS = {
    reclamada_cnpj: processoDados.reclamada_cnpj || "00.000.000/0001-00",
    reclamada_nome: processoDados.reclamada_nome || "Empresa Reclamada",
    numero_processo: processoDados.numero_processo || "",
  };
  const darfInput: DadosProcessoDARF = {
    reclamante_cpf: processoDados.reclamante_cpf || "000.000.000-00",
    reclamante_nome: processoDados.reclamante_nome || "Reclamante",
    numero_processo: processoDados.numero_processo || "",
  };

  const gpsData = useMemo(() => gerarGPS(result, gpsInput), [result]);
  const darfData = useMemo(() => gerarDARF(result, darfInput), [result]);

  const totalINSS = gpsData.reduce((s, g) => s + g.valor_total, 0);
  const totalIR = darfData.reduce((s, d) => s + d.valor_total, 0);

  const handlePrint = () => {
    imprimirGuias(gpsData, darfData);
  };

  const handleExportCSV = () => {
    try {
      const csv = exportarGuiasCSV(gpsData, darfData);
      const filename = processoDados.numero_processo
        ? `guias_${processoDados.numero_processo.replace(/[^0-9.-]/g, '')}.csv`
        : "guias_recolhimento.csv";
      downloadCSV(csv, filename);
      toast.success("Dados das guias exportados com sucesso!");
    } catch (e) {
      toast.error("Erro ao exportar: " + (e as Error).message);
    }
  };

  const missingData = !processoDados.reclamada_cnpj || !processoDados.reclamante_cpf;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Guias de Recolhimento (GPS / DARF)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={gpsData.length === 0 && darfData.length === 0}
            >
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={gpsData.length === 0 && darfData.length === 0}
            >
              <Printer className="h-4 w-4 mr-1" /> Imprimir Guias
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning for missing data */}
        {missingData && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-xs">
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <strong>Dados incompletos.</strong> Preencha o CNPJ da reclamada e o CPF do reclamante
              no módulo Dados do Processo para gerar guias completas.
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-md bg-muted/50">
            <div className="text-xs text-muted-foreground">Total INSS a Recolher</div>
            <div className="text-lg font-bold text-primary">{fmt(totalINSS)}</div>
            <div className="text-[10px] text-muted-foreground">{gpsData.length} GPS(s)</div>
          </div>
          <div className="p-3 rounded-md bg-muted/50">
            <div className="text-xs text-muted-foreground">Total IRRF a Recolher</div>
            <div className="text-lg font-bold text-primary">{fmt(totalIR)}</div>
            <div className="text-[10px] text-muted-foreground">{darfData.length} DARF(s)</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gps">
              GPS ({gpsData.length})
            </TabsTrigger>
            <TabsTrigger value="darf">
              DARF ({darfData.length})
            </TabsTrigger>
          </TabsList>

          {/* GPS Tab */}
          <TabsContent value="gps" className="mt-3">
            {gpsData.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhuma GPS a gerar. (INSS segurado + empregador = R$ 0,00)
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-2 text-left">Competência</th>
                      <th className="p-2 text-left">Cód.</th>
                      <th className="p-2 text-right">INSS Segurado</th>
                      <th className="p-2 text-right">INSS Empresa</th>
                      <th className="p-2 text-right">Terceiros</th>
                      <th className="p-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gpsData.map((g, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="p-2 font-mono">{g.competencia}</td>
                        <td className="p-2">
                          <Badge variant="secondary" className="text-[10px]">{g.codigo_pagamento}</Badge>
                        </td>
                        <td className="p-2 text-right font-mono">{fmt(g.valor_inss_segurado)}</td>
                        <td className="p-2 text-right font-mono">{fmt(g.valor_inss_empresa)}</td>
                        <td className="p-2 text-right font-mono">{fmt(g.valor_outras_entidades)}</td>
                        <td className="p-2 text-right font-mono font-semibold">{fmt(g.valor_total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-semibold">
                      <td className="p-2" colSpan={2}>TOTAL</td>
                      <td className="p-2 text-right font-mono">
                        {fmt(gpsData.reduce((s, g) => s + g.valor_inss_segurado, 0))}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {fmt(gpsData.reduce((s, g) => s + g.valor_inss_empresa, 0))}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {fmt(gpsData.reduce((s, g) => s + g.valor_outras_entidades, 0))}
                      </td>
                      <td className="p-2 text-right font-mono">{fmt(totalINSS)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* DARF Tab */}
          <TabsContent value="darf" className="mt-3">
            {darfData.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhuma DARF a gerar. (IRRF = R$ 0,00)
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-2 text-left">Período Apuração</th>
                      <th className="p-2 text-left">Cód. Receita</th>
                      <th className="p-2 text-right">Principal</th>
                      <th className="p-2 text-right">Multa</th>
                      <th className="p-2 text-right">Juros</th>
                      <th className="p-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {darfData.map((d, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="p-2 font-mono">{d.periodo_apuracao}</td>
                        <td className="p-2">
                          <Badge variant="secondary" className="text-[10px]">{d.codigo_receita}</Badge>
                        </td>
                        <td className="p-2 text-right font-mono">{fmt(d.valor_principal)}</td>
                        <td className="p-2 text-right font-mono">{fmt(d.multa)}</td>
                        <td className="p-2 text-right font-mono">{fmt(d.juros_encargos)}</td>
                        <td className="p-2 text-right font-mono font-semibold">{fmt(d.valor_total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-semibold">
                      <td className="p-2" colSpan={2}>TOTAL</td>
                      <td className="p-2 text-right font-mono">
                        {fmt(darfData.reduce((s, d) => s + d.valor_principal, 0))}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {fmt(darfData.reduce((s, d) => s + d.multa, 0))}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {fmt(darfData.reduce((s, d) => s + d.juros_encargos, 0))}
                      </td>
                      <td className="p-2 text-right font-mono">{fmt(totalIR)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-[10px] text-muted-foreground">
          GPS Cód. 2909 = Reclamatória Trabalhista (CNPJ). DARF Cód. 5936 = IRRF Decisão Justiça do Trabalho.
          Valores sujeitos a conferência. Imprima as guias para obter formulários no formato oficial.
        </p>
      </CardContent>
    </Card>
  );
}
