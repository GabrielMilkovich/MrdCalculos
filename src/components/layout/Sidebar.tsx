import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Search, 
  Settings, 
  LogOut,
  Scale,
  Calculator,
  Settings2,
  TrendingUp,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// /documentos e /busca-semantica ficam ocultos do menu enquanto sao
// wireframes (botoes sem onClick, KPIs hardcoded). Re-exibir quando
// implementacao real estiver pronta. Ref STATE-OF-PRODUCTION.md P0-3.
const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Briefcase, label: "Casos", path: "/casos" },
];

const adminNavItems = [
  { icon: Calculator, label: "Calculadoras", path: "/admin/calculadoras" },
  { icon: Settings2, label: "Perfis de Cálculo", path: "/admin/perfis" },
  { icon: TrendingUp, label: "Índices e Tabelas", path: "/admin/indices" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(
    location.pathname.startsWith("/admin")
  );

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      toast.success("Sessão encerrada");
      navigate("/auth");
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Scale className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">JurisCálculo</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestão Trabalhista</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {/* Main nav */}
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Admin section */}
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen} className="mt-6">
            <CollapsibleTrigger className="sidebar-nav-item w-full justify-between text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5" />
                <span>Administração</span>
              </div>
              {adminOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 mt-1 space-y-1">
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          {/* Settings */}
          <Link
            to="/configuracoes"
            className={`sidebar-nav-item mt-4 ${location.pathname === "/configuracoes" ? "active" : ""}`}
          >
            <Settings className="h-5 w-5" />
            <span>Configurações</span>
          </Link>
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            className="sidebar-nav-item w-full text-sidebar-foreground/60 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
