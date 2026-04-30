import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Calculator, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { CaseMode } from "@/features/data-extraction";

export function CreateCaseDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState("");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [mode, setMode] = useState<CaseMode>("calculation");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cliente.trim();
    if (!trimmed) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    if (trimmed.length > 200) {
      toast.error("Nome do cliente muito longo");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sessão expirada. Faça login novamente.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from("cases").insert({
      cliente: trimmed,
      numero_processo: numeroProcesso.trim() || null,
      tribunal: tribunal.trim() || null,
      criado_por: user.id,
      status: "rascunho",
      mode,
    }).select("id").single();

    setLoading(false);

    if (error) {
      toast.error("Erro ao criar caso: " + error.message);
    } else {
      toast.success("Caso criado com sucesso!");
      setCliente("");
      setNumeroProcesso("");
      setTribunal("");
      setMode("calculation");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["cases-with-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-cases"] });
      if (data?.id) navigate(`/casos/${data.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-9 text-sm">
          <Plus className="h-4 w-4" />
          Novo Caso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Caso Trabalhista</DialogTitle>
          <DialogDescription>
            Preencha os dados básicos. Documentos e fatos serão adicionados depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente">Nome do Cliente *</Label>
            <Input
              id="cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ex: João da Silva"
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="processo">Número do Processo</Label>
            <Input
              id="processo"
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              placeholder="Ex: 0001234-56.2024.5.01.0001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tribunal">Tribunal / Vara</Label>
            <Input
              id="tribunal"
              value={tribunal}
              onChange={(e) => setTribunal(e.target.value)}
              placeholder="Ex: 1ª Vara do Trabalho de São Paulo"
            />
          </div>

          {/* Modo do caso — IMUTÁVEL após criação. */}
          <div className="space-y-2">
            <Label>Modo do caso *</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as CaseMode)}
              className="gap-2"
            >
              <label
                htmlFor="mode-calc"
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent transition"
              >
                <RadioGroupItem value="calculation" id="mode-calc" className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calculator className="h-4 w-4" /> Cálculo Completo
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Liquidação trabalhista completa no MRD Calc (engine 98% paridade PJe-Calc).
                  </p>
                </div>
              </label>
              <label
                htmlFor="mode-extract"
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent transition"
              >
                <RadioGroupItem value="data_extraction" id="mode-extract" className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileSpreadsheet className="h-4 w-4" /> Extração de Dados
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Extrai dados de documentos para gerar CSVs do PJe-Calc Cidadão (Histórico Salarial, Férias, Faltas), sem cálculo no MRD.
                  </p>
                </div>
              </label>
            </RadioGroup>
            <p className="text-[11px] text-muted-foreground italic">
              O modo é definido na criação e não pode ser alterado depois.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Criando..." : "Criar Caso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
