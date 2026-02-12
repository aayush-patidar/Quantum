import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Loader2 } from "lucide-react";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Composer from "@/pages/composer";
import CircuitsPage from "@/pages/circuits";
import JobsPage from "@/pages/jobs";
import BackendsPage from "@/pages/backends";
import ResultsPage from "@/pages/results";
import SettingsPage from "@/pages/settings";
import SupportPage from "@/pages/support";
import DocumentationPage from "@/pages/documentation";
import EducationPage from "@/pages/education";
import AssistantPage from "@/pages/assistant";
import HackathonPage from "@/pages/hackathon";
import UseCasesPage from "@/pages/use-cases";
import LabsPage from "@/pages/labs";
import WorkspacesPage from "@/pages/workspaces";
import TemplatesPage from "@/pages/templates";
import GalleryPage from "@/pages/gallery";
import CodeSubmitPage from "@/pages/code-submit";
import CoursesPage from "@/pages/courses";
import AnalyticsPage from "@/pages/analytics";
import NetworkLabPage from "@/pages/network-lab";
import SnapshotsPage from "@/pages/snapshots";
import NotFound from "@/pages/not-found";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/composer" component={Composer} />
      <Route path="/circuits" component={CircuitsPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/backends" component={BackendsPage} />
      <Route path="/results" component={ResultsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/documentation" component={DocumentationPage} />
      <Route path="/education" component={EducationPage} />
      <Route path="/assistant" component={AssistantPage} />
      <Route path="/hackathon" component={HackathonPage} />
      <Route path="/use-cases" component={UseCasesPage} />
      <Route path="/labs" component={LabsPage} />
      <Route path="/workspaces" component={WorkspacesPage} />
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/code-submit" component={CodeSubmitPage} />
      <Route path="/courses" component={CoursesPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/network-lab" component={NetworkLabPage} />
      <Route path="/snapshots" component={SnapshotsPage} />
      <Route path="/login" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b h-12">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <AppRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
