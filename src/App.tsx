import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Casos from "./pages/Casos";
import CasoDetalhe from "./pages/CasoDetalhe";
import Tabelas from "./pages/Tabelas";
import PjeCalcPage from "./pages/PjeCalcPage";
import NovoCalculo from "./pages/NovoCalculo";
import PJCAnalyzer from "./pages/admin/PJCAnalyzer";
import Configuracoes from "./pages/Configuracoes";
import Busca from "./pages/Busca";
import Documentos from "./pages/Documentos";
import RegrasTabelas from "./pages/RegrasTabelas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/casos" element={<Casos />} />
          <Route path="/casos/:id" element={<CasoDetalhe />} />
          <Route path="/tabelas" element={<Tabelas />} />
          <Route path="/tabelas/:tipo" element={<Tabelas />} />
          <Route path="/pjecalc/:id" element={<PjeCalcPage />} />
          <Route path="/novo-calculo" element={<NovoCalculo />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/busca" element={<Busca />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/regras" element={<RegrasTabelas />} />
          <Route path="/admin/pjc-analyzer" element={<PJCAnalyzer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
