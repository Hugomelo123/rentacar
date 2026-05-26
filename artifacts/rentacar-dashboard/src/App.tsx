import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/layout/Shell";
import Dashboard from "@/pages/Dashboard";
import Fleet from "@/pages/Fleet";
import Settings from "@/pages/Settings";
import Welcome from "@/pages/Welcome";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route>
        <Shell>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/fleet" component={Fleet} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Shell>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster theme="dark" position="bottom-left" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
