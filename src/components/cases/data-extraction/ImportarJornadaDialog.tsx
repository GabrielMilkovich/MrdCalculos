/**
 * ImportarJornadaDialog — permite o usuário colar texto OCR ou CSV
 * delimitado e converter pra apurações diárias.
 *
 * Aceita 2 formatos:
 *   1. Texto livre (OCR colado) → roda parseCartaoPonto
 *   2. CSV ; — formato canônico:
 *        data;ocorrencia;e1;s1;e2;s2;e3;s3;observacao
 *      Linhas vazias e cabeçalho são ignorados.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Upload, FileText, Sparkles } from "lucide-react";
import { parseCartaoPonto } from "@/features/data-extraction";
import type { ApuracaoDiaria } from "@/features/data-extraction";
import { parseCsvToApuracoes, CSV_HEADER } from "./parse-csv-apuracoes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  competencia: string;
  onImport: (apuracoes: ApuracaoDiaria[]) => void;
}

export function ImportarJornadaDialog({
  open,
  onOpenChange,
  competencia,
  onImport,
}: Props) {
  const [ocrText, setOcrText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewCount, setPreviewCount] = useState(0);

  const reset = () => {
    setOcrText("");
    setCsvText("");
    setError(null);
    setWarnings([]);
    setPreviewCount(0);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleParseOcr = () => {
    setError(null);
    try {
      const result = parseCartaoPonto(ocrText, competencia);
      if (result.apuracoes.length === 0) {
        setError("Nenhuma apuração detectada. Verifique o texto colado.");
        setWarnings(result.warnings);
        return;
      }
      setWarnings(result.warnings);
      setPreviewCount(result.apuracoes.length);
      onImport(result.apuracoes);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleParseCsv = () => {
    setError(null);
    try {
      const apuracoes = parseCsvToApuracoes(csvText);
      if (apuracoes.length === 0) {
        setError("Nenhuma linha válida no CSV.");
        return;
      }
      setPreviewCount(apuracoes.length);
      onImport(apuracoes);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Importar jornada — {competencia}
          </DialogTitle>
          <DialogDescription>
            Cole o texto do OCR ou um CSV no formato canônico para preencher as
            apurações diárias.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ocr">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="ocr" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Texto OCR (auto)
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> CSV canônico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ocr" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Cole o texto integral do cartão de ponto. O parser identifica datas,
              ocorrências (FALTA, FOLGA, ATESTADO...) e marcações de hora. Linhas
              de outros meses serão ignoradas.
            </p>
            <Textarea
              rows={10}
              placeholder="01/03/2024  08:00 12:00 13:00 17:00&#10;02/03/2024  FOLGA&#10;..."
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              onClick={handleParseOcr}
              disabled={!ocrText.trim()}
              className="w-full"
            >
              Processar texto
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Formato:{" "}
              <code className="bg-muted px-1 rounded text-[11px]">
                {CSV_HEADER}
              </code>
              <br />
              Datas em <strong>yyyy-mm-dd</strong>, horas em{" "}
              <strong>HH:MM</strong>. Pares e/s em branco se não houver marcação.
            </p>
            <Textarea
              rows={10}
              placeholder={`${CSV_HEADER}\n2024-03-01;NORMAL;08:00;12:00;13:00;17:00;;;\n2024-03-02;FOLGA;;;;;;\n2024-03-03;FALTA;;;;;;injustificada`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              onClick={handleParseCsv}
              disabled={!csvText.trim()}
              className="w-full"
            >
              Importar CSV
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert className="mt-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs">
              <div className="font-medium">{warnings.length} aviso(s) ao parsear:</div>
              <ul className="mt-1 list-disc list-inside max-h-24 overflow-auto">
                {warnings.slice(0, 6).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {warnings.length > 6 && <li>...e mais {warnings.length - 6}</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {previewCount > 0 && (
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            {previewCount} apuração(ões) detectadas.
          </p>
        )}

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

