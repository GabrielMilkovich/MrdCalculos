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
import TelemetriaCSV from "./pages/admin/TelemetriaCSV";
import Configuracoes from "./pages/Configuracoes";
import Busca from "./pages/Busca";
import Documentos from "./pages/Documentos";
import RegrasTabelas from "./pages/RegrasTabelas";
import NotFound from "./pages/NotFound";
import { BetaParityBanner } from "./components/BetaParityBanner";
import { reportError, installGlobalErrorHandlers, extractErrorMessage } from "@/lib/error-reporter";
import { setLastMutationError } from "@/lib/last-mutation-status";

installGlobalErrorHandlers();

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const { message, stack } = extractErrorMessage(error);
      void reportError({
        message,
        stack,
        source: "react-query",
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
        context: { kind: "query", queryKey: query.queryKey, raw: serializeRaw(error) },
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      const { message, stack } = extractErrorMessage(error);
      setLastMutationError(true);
      void reportError({
        message,
        stack,
        source: "react-query",
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
        context: { kind: "mutation", mutationKey: mutation.options.mutationKey, raw: serializeRaw(error) },
      });
    },
    onSuccess: () => {
      setLastMutationError(false);
    },
  }),
});

/** Serializa erro pra inclusão no context (preserva code, hint, details). */
function serializeRaw(err: unknown): unknown {
  if (err === null || err === undefined) return null;
  if (err instanceof Error) return { name: err.name, message: err.message };
  if (typeof err === "object") {
    try {
      return JSON.parse(JSON.stringify(err));
    } catch {
      return String(err);
    }
  }
  return err;
}

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
            <Route path="/admin/telemetria-csv" element={<AdminRoute><TelemetriaCSV /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
