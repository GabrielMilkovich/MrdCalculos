import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Search,
  Plus,
  ChevronRight,
  Home,
  FileText,
  Calculator,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IndexSyncStatusBadge } from "@/components/layout/IndexSyncStatusBadge";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  breadcrumbs?: Breadcrumb[];
  title?: string;
}

export function Topbar({ breadcrumbs = [], title }: TopbarProps) {
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const [userName, setUserName] = useState("U");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.charAt(0).toUpperCase());
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success("Sessão encerrada");
      navigate("/auth");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/95 backdrop-blur-sm px-6">
        {/* Left: Breadcrumbs */}
        <nav className="flex items-center text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-muted-foreground/40" />
              {crumb.href ? (
                <Link to={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          <IndexSyncStatusBadge />
          {/* Search */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex gap-2 text-muted-foreground font-normal h-8 px-3 border-border/60"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Buscar...</span>
            <kbd className="ml-2 inline-flex h-5 items-center gap-0.5 rounded border border-border/60 bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </Button>

          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => navigate("/casos")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo Caso</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {userName}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" align="end">
              <DropdownMenuLabel className="text-xs">Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="text-xs cursor-pointer">
                <User className="mr-2 h-3.5 w-3.5" /> Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="text-xs cursor-pointer">
                <Settings className="mr-2 h-3.5 w-3.5" /> Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-xs cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Buscar ação ou página..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          <CommandGroup heading="Ações">
            <CommandItem onSelect={() => { navigate("/casos"); setCommandOpen(false); }}>
              <Plus className="mr-2 h-4 w-4" /> Novo Caso
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/busca"); setCommandOpen(false); }}>
              <Search className="mr-2 h-4 w-4" /> Buscar Documentos
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Páginas">
            <CommandItem onSelect={() => { navigate("/"); setCommandOpen(false); }}>
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/casos"); setCommandOpen(false); }}>
              <FileText className="mr-2 h-4 w-4" /> Casos
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/calculadoras"); setCommandOpen(false); }}>
              <Calculator className="mr-2 h-4 w-4" /> Calculadoras
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
