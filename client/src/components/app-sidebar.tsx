import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Atom,
  LayoutDashboard,
  Cpu,
  CircuitBoard,
  Play,
  Server,
  BarChart3,
  LogOut,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, testId: "nav-dashboard" },
  { title: "Circuit Composer", url: "/composer", icon: Cpu, testId: "nav-composer" },
  { title: "My Circuits", url: "/circuits", icon: CircuitBoard, testId: "nav-circuits" },
  { title: "Jobs", url: "/jobs", icon: Play, testId: "nav-jobs" },
  { title: "Backends", url: "/backends", icon: Server, testId: "nav-backends" },
  { title: "Results", url: "/results", icon: BarChart3, testId: "nav-results" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <Atom className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm tracking-tight">QuantumCloud</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        {user && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate" data-testid="text-username">
                {user.username}
              </span>
              <Badge variant="secondary" className="w-fit text-xs no-default-hover-elevate" data-testid="text-role">
                {user.role}
              </Badge>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
