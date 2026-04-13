import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Eager: auth e landing (carregam imediato)
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy: páginas pesadas (code-split por rota)
const Casos = lazy(() => import("./pages/Casos"));
const CasoDetalhe = lazy(() => import("./pages/CasoDetalhe"));
const Tabelas = lazy(() => import("./pages/Tabelas"));
const PjeCalcPage = lazy(() => import("./pages/PjeCalcPage"));
const NovoCalculo = lazy(() => import("./pages/NovoCalculo"));
const PJCAnalyzer = lazy(() => import("./pages/admin/PJCAnalyzer"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Busca = lazy(() => import("./pages/Busca"));
const Documentos = lazy(() => import("./pages/Documentos"));
const RegrasTabelas = lazy(() => import("./pages/RegrasTabelas"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/admin/pjc-analyzer" element={<ProtectedRoute><PJCAnalyzer /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
