import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import AdminErrors from "./pages/admin/Erros";
import Configuracoes from "./pages/Configuracoes";
import Busca from "./pages/Busca";
import Documentos from "./pages/Documentos";
import RegrasTabelas from "./pages/RegrasTabelas";
import NotFound from "./pages/NotFound";
import { BetaParityBanner } from "./components/BetaParityBanner";
import { reportError, installGlobalErrorHandlers } from "@/lib/error-reporter";
import { setLastMutationError } from "@/lib/last-mutation-status";

installGlobalErrorHandlers();

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const e = error instanceof Error ? error : new Error(String(error));
      void reportError({
        message: e.message,
        stack: e.stack,
        source: "react-query",
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
        context: { kind: "query", queryKey: query.queryKey },
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      const e = error instanceof Error ? error : new Error(String(error));
      setLastMutationError(true);
      void reportError({
        message: e.message,
        stack: e.stack,
        source: "react-query",
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
        context: { kind: "mutation", mutationKey: mutation.options.mutationKey },
      });
    },
    onSuccess: () => {
      setLastMutationError(false);
    },
  }),
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <BetaParityBanner />
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
            <Route path="/admin/erros" element={<AdminRoute><AdminErrors /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
