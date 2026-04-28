import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
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
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/casos" element={<ProtectedRoute><Casos /></ProtectedRoute>} />
            <Route path="/casos/:id" element={<ProtectedRoute><CasoDetalhe /></ProtectedRoute>} />
            <Route path="/tabelas" element={<ProtectedRoute><Tabelas /></ProtectedRoute>} />
            <Route path="/tabelas/:tipo" element={<ProtectedRoute><Tabelas /></ProtectedRoute>} />
            <Route path="/pjecalc/:id" element={<ProtectedRoute><PjeCalcPage /></ProtectedRoute>} />
            <Route path="/novo-calculo" element={<ProtectedRoute><NovoCalculo /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/busca" element={<ProtectedRoute><Busca /></ProtectedRoute>} />
            <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
            <Route path="/regras" element={<ProtectedRoute><RegrasTabelas /></ProtectedRoute>} />
            <Route path="/admin/pjc-analyzer" element={<AdminRoute><PJCAnalyzer /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
