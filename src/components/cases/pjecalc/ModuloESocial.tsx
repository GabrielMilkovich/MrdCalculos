import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Download, FileText, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  gerarS2500,
  gerarS2501,
  downloadXml,
  exportarESocialZip,
  type ESocialConfig,
  type ESocialDadosProcesso,
} from "@/lib/pjecalc/esocial-export";
import type { PjeLiquidacaoResult } from "@/lib/pjecalc/engine-types";

interface Props {
  caseId: string;
  resultado: PjeLiquidacaoResult | null;
  dadosProcesso?: {
    numero_processo?: string;
    reclamante_nome?: string;
    reclamante_cpf?: string;
    reclamada_nome?: string;
    reclamada_cnpj?: string;
  };
  params?: {
    data_admissao?: string;
    data_demissao?: string;
  };
}

export function ModuloESocial({ caseId, resultado, dadosProcesso, params }: Props) {
  const [exporting, setExporting] = useState(false);
  const [previewXml, setPreviewXml] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'S2500' | 'S2501'>('S2500');

  // Form state
  const [cnpjEmpregador, setCnpjEmpregador] = useState(dadosProcesso?.reclamada_cnpj || '');
  const [nomeEmpregador, setNomeEmpregador] = useState(dadosProcesso?.reclamada_nome || '');
  const [cpfTrab, setCpfTrab] = useState(dadosProcesso?.reclamante_cpf || '');
  const [nmTrab, setNmTrab] = useState(dadosProcesso?.reclamante_nome || '');
  const [nrProcTrab, setNrProcTrab] = useState(dadosProcesso?.numero_processo || '');
  const [perApurPgto, setPerApurPgto] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dtAdm, setDtAdm] = useState(params?.data_admissao || '');
  const [dtDeslig, setDtDeslig] = useState(params?.data_demissao || '');
  const [codCateg, setCodCateg] = useState('101');
  const [indContr, setIndContr] = useState<'1' | '2'>('1');
  const [tpTrib, setTpTrib] = useState<'1' | '2'>('2');
  const [ambiente, setAmbiente] = useState<'1' | '2'>('2');
  const buildConfig = (): ESocialConfig => ({
    dados: {
      cnpjEmpregador,
      nomeEmpregador,
      cpfTrab,
      nmTrab,
      nrProcTrab,
      perApurPgto,
      dtAdm,
      dtDeslig: dtDeslig || undefined,
      codCateg,
      indContr,
      tpTrib,
    },
    ambiente,
    tpProcesso: '2',
  });

  const validacoes = (): string[] => {
    const erros: string[] = [];
    if (!cnpjEmpregador) erros.push('CNPJ do empregador é obrigatório');
    if (!cpfTrab) erros.push('CPF do trabalhador é obrigatório');
    if (!nrProcTrab) erros.push('Número do processo é obrigatório');
    if (!dtAdm) erros.push('Data de admissão é obrigatória');
    if (!perApurPgto) erros.push('Período de apuração é obrigatório');
    if (!resultado) erros.push('Execute a liquidação antes de exportar');
    return erros;
  };

  const erros = validacoes();
  const isValid = erros.length === 0;

  const handlePreview = (type: 'S2500' | 'S2501') => {
    if (!resultado) { toast.error('Execute a liquidação primeiro'); return; }
    const config = buildConfig();
    const xml = type === 'S2500'
      ? gerarS2500(config, resultado)
      : gerarS2501(config, resultado);
    setPreviewXml(xml);
    setPreviewType(type);
  };

  const handleDownloadSingle = (type: 'S2500' | 'S2501') => {
    if (!resultado) { toast.error('Execute a liquidação primeiro'); return; }
    const config = buildConfig();
    const xml = type === 'S2500'
      ? gerarS2500(config, resultado)
      : gerarS2501(config, resultado);
    downloadXml(xml, `${type}-${nrProcTrab || 'processo'}.xml`);
    toast.success(`${type}.xml exportado com sucesso`);
  };

  const handleExportZip = async () => {
    if (!resultado) { toast.error('Execute a liquidação primeiro'); return; }
    setExporting(true);
    try {
      const config = buildConfig();
      await exportarESocialZip(config, resultado);
      toast.success('Pacote eSocial exportado com sucesso');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Exportação eSocial</h2>
          <p className="text-xs text-muted-foreground">Eventos S-2500 e S-2501 — Processo Trabalhista</p>
        </div>
        <Badge variant={isValid ? "default" : "secondary"} className="text-xs">
          {isValid ? (
            <><CheckCircle2 className="h-3 w-3 mr-1" />Pronto para exportar</>
          ) : (
            <><AlertTriangle className="h-3 w-3 mr-1" />{erros.length} pendência(s)</>
          )}
        </Badge>
      </div>

      {/* Validation Alerts */}
      {erros.length > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="p-3">
            <ul className="text-xs text-destructive space-y-1">
              {erros.map((e, i) => (
                <li key={i} className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {e}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Empregador */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Empregador (Reclamada)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">CNPJ</Label>
              <Input value={cnpjEmpregador} onChange={e => setCnpjEmpregador(e.target.value)} placeholder="00.000.000/0001-00" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Razão Social</Label>
              <Input value={nomeEmpregador} onChange={e => setNomeEmpregador(e.target.value)} className="mt-1 h-8 text-xs" />
            </div>
          </CardContent>
        </Card>

        {/* Trabalhador */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Trabalhador (Reclamante)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">CPF</Label>
              <Input value={cpfTrab} onChange={e => setCpfTrab(e.target.value)} placeholder="000.000.000-00" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Nome Completo</Label>
              <Input value={nmTrab} onChange={e => setNmTrab(e.target.value)} className="mt-1 h-8 text-xs" />
            </div>
          </CardContent>
        </Card>

        {/* Processo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Dados do Processo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Nº Processo (CNJ)</Label>
              <Input value={nrProcTrab} onChange={e => setNrProcTrab(e.target.value)} placeholder="0000000-00.0000.0.00.0000" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Período Apuração Pgto</Label>
              <Input type="month" value={perApurPgto} onChange={e => setPerApurPgto(e.target.value)} className="mt-1 h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipo Decisão</Label>
                <Select value={tpTrib} onValueChange={v => setTpTrib(v as '1' | '2')}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Conciliação</SelectItem>
                    <SelectItem value="2">Decisão Judicial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Vínculo</Label>
                <Select value={indContr} onValueChange={v => setIndContr(v as '1' | '2')}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Reconhecido</SelectItem>
                    <SelectItem value="2">Sem Vínculo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contrato */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Contrato de Trabalho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Admissão</Label>
                <Input type="date" value={dtAdm} onChange={e => setDtAdm(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Desligamento</Label>
                <Input type="date" value={dtDeslig} onChange={e => setDtDeslig(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Categoria eSocial</Label>
                <Select value={codCateg} onValueChange={setCodCateg}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="101">101 - Empregado Geral</SelectItem>
                    <SelectItem value="102">102 - Empregado Rural</SelectItem>
                    <SelectItem value="103">103 - Aprendiz</SelectItem>
                    <SelectItem value="104">104 - Doméstico</SelectItem>
                    <SelectItem value="105">105 - Temporário</SelectItem>
                    <SelectItem value="111">111 - Intermitente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ambiente</Label>
                <Select value={ambiente} onValueChange={v => setAmbiente(v as '1' | '2')}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Produção Restrita</SelectItem>
                    <SelectItem value="1">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-end flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handlePreview('S2500')} disabled={!resultado}>
                <FileText className="h-4 w-4 mr-1" /> Visualizar S-2500
              </Button>
              <Button size="sm" variant="outline" onClick={() => handlePreview('S2501')} disabled={!resultado}>
                <FileText className="h-4 w-4 mr-1" /> Visualizar S-2501
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <Button size="sm" variant="outline" onClick={() => handleDownloadSingle('S2500')} disabled={!isValid}>
                <Download className="h-4 w-4 mr-1" /> S-2500.xml
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDownloadSingle('S2501')} disabled={!isValid}>
                <Download className="h-4 w-4 mr-1" /> S-2501.xml
              </Button>
              <Button size="sm" onClick={handleExportZip} disabled={!isValid || exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                Exportar .ZIP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* XML Preview */}
      {previewXml && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Preview — {previewType}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setPreviewXml(null)}>Fechar</Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-[10px] font-mono bg-muted/50 p-3 rounded-md overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap break-all">
              {previewXml}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="border-primary/20">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Os eventos S-2500 e S-2501 são obrigatórios desde outubro/2023 para processos trabalhistas
            com decisão condenatória ou homologatória. O XML gerado segue o layout eSocial v. S-1.2
            (Nota Técnica 01/2023). Valide o arquivo no portal eSocial antes do envio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
