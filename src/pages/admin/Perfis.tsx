import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProfileEditor } from "@/components/admin/ProfileEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Settings2, Edit, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  nome: string;
  descricao: string | null;
  config: {
    atualizacao: string;
    juros: string;
    arredondamento: string;
  };
  calculadoras_incluidas: string[];
  ativo: boolean;
  criado_em: string;
}

interface Calculator {
  id: string;
  nome: string;
  categoria: string;
  versions: Array<{
    id: string;
    versao: string;
    vigencia_inicio: string;
  }>;
}

export default function Perfis() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculation_profiles")
        .select("*")
        .eq("ativo", true)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data as unknown as Profile[];
    },
  });

  const { data: calculators = [] } = useQuery({
    queryKey: ["calculators-for-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculators")
        .select(`
          id,
          nome,
          categoria,
          calculator_versions (
            id,
            versao,
            vigencia_inicio
          )
        `)
        .eq("ativo", true);

      if (error) throw error;
      return data.map((calc) => ({
        id: calc.id,
        nome: calc.nome,
        categoria: calc.categoria,
        versions: calc.calculator_versions || [],
      })) as Calculator[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      nome: string;
      descricao?: string;
      config: object;
      calculadoras_incluidas: string[];
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.from("calculation_profiles").insert([{
        nome: data.nome,
        descricao: data.descricao || null,
        config: data.config,
        calculadoras_incluidas: data.calculadoras_incluidas,
        criado_por: session?.session?.user.id,
      }] as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Perfil criado com sucesso!");
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar perfil: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        nome: string;
        descricao?: string;
        config: object;
        calculadoras_incluidas: string[];
      };
    }) => {
      const { error } = await supabase
        .from("calculation_profiles")
        .update({
          nome: data.nome,
          descricao: data.descricao || null,
          config: data.config,
          calculadoras_incluidas: data.calculadoras_incluidas,
        } as Record<string, unknown>)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Perfil atualizado!");
      setEditingProfile(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calculation_profiles")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Perfil removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const configLabels: Record<string, Record<string, string>> = {
    atualizacao: {
      ipca_e: "IPCA-E",
      inpc: "INPC",
      tr: "TR",
      selic: "SELIC",
    },
    juros: {
      "1_pct_mes": "1% a.m.",
      selic: "SELIC",
      "0_5_pct_mes": "0,5% a.m.",
      sem_juros: "Sem juros",
    },
    arredondamento: {
      competencia: "Por competência",
      final: "Só no final",
      nenhum: "Nenhum",
    },
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Perfis de Cálculo</h1>
            <p className="text-muted-foreground">
              Configure cenários de cálculo com diferentes parâmetros
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Perfil de Cálculo</DialogTitle>
              </DialogHeader>
              <ProfileEditor
                calculators={calculators}
                onSubmit={async (data) => {
                  await createMutation.mutateAsync(data);
                }}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Settings2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{profile.nome}</CardTitle>
                      {profile.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {profile.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {configLabels.atualizacao[profile.config.atualizacao] || profile.config.atualizacao}
                  </Badge>
                  <Badge variant="outline">
                    {configLabels.juros[profile.config.juros] || profile.config.juros}
                  </Badge>
                  <Badge variant="outline">
                    {configLabels.arredondamento[profile.config.arredondamento] || profile.config.arredondamento}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {profile.calculadoras_incluidas.length} calculadora(s) incluída(s)
                </p>

                <div className="flex gap-2">
                  <Dialog
                    open={editingProfile?.id === profile.id}
                    onOpenChange={(open) => !open && setEditingProfile(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingProfile(profile)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Editar Perfil - {profile.nome}</DialogTitle>
                      </DialogHeader>
                      <ProfileEditor
                        calculators={calculators}
                        initialData={{
                          nome: profile.nome,
                          descricao: profile.descricao || undefined,
                          config: profile.config,
                          calculadoras_incluidas: profile.calculadoras_incluidas,
                        }}
                        onSubmit={async (data) => {
                          await updateMutation.mutateAsync({ id: profile.id, data });
                        }}
                        isLoading={updateMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover perfil?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O perfil "{profile.nome}" será desativado. Esta ação pode ser revertida.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(profile.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {profiles.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum perfil criado.
                <br />
                Crie um perfil para definir parâmetros de cálculo.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Perfil
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
