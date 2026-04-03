import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";
import { AdminGuard } from "@/components/AdminGuard";
import Home from "@/pages/home";
import Inbox from "@/pages/inbox";
import MessageView from "@/pages/message";
import KeysPage from "@/pages/keys";
import DocsPage from "@/pages/docs";
import AdminLoginPage from "@/pages/admin-login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Admin login — tanpa Shell agar fullscreen */}
      <Route path="/admin/login" component={AdminLoginPage} />

      {/* Semua halaman lain pakai Shell */}
      <Route>
        <Shell>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/inbox/:address" component={Inbox} />
            <Route path="/message/:address/:id" component={MessageView} />

            {/* Admin-only routes */}
            <Route path="/admin/keys">
              <AdminGuard>
                <KeysPage />
              </AdminGuard>
            </Route>
            <Route path="/admin/docs">
              <AdminGuard>
                <DocsPage />
              </AdminGuard>
            </Route>

            <Route component={NotFound} />
          </Switch>
        </Shell>
      </Route>
    </Switch>
  );
}

function App() {
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
