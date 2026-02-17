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
  SidebarGroupLabel,
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
  Settings,
  HelpCircle,
  BookOpen,
  GraduationCap,
  Bot,
  Trophy,
  LogOut,
  Wand2,
  FlaskConical,
  Monitor,
  LayoutTemplate,
  Image,
  Code2,
  PieChart,
  Network,
  Camera,
} from "lucide-react";

const platformItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, testId: "nav-dashboard" },
  { title: "Circuit Composer", url: "/composer", icon: Cpu, testId: "nav-composer" },
  { title: "My Circuits", url: "/circuits", icon: CircuitBoard, testId: "nav-circuits" },
  { title: "Jobs", url: "/jobs", icon: Play, testId: "nav-jobs" },
  { title: "Backends", url: "/backends", icon: Server, testId: "nav-backends" },
  { title: "Results", url: "/results", icon: BarChart3, testId: "nav-results" },
];

const toolsItems = [
  { title: "AI Assistant", url: "/assistant", icon: Bot, testId: "nav-assistant" },
  { title: "Documentation", url: "/documentation", icon: BookOpen, testId: "nav-documentation" },

  { title: "Hackathons", url: "/hackathon", icon: Trophy, testId: "nav-hackathon" },
  { title: "Use Cases", url: "/use-cases", icon: Wand2, testId: "nav-use-cases" },
  { title: "Labs", url: "/labs", icon: FlaskConical, testId: "nav-labs" },
  { title: "Workspaces", url: "/workspaces", icon: Monitor, testId: "nav-workspaces" },
  { title: "Templates", url: "/templates", icon: LayoutTemplate, testId: "nav-templates" },
  { title: "Gallery", url: "/gallery", icon: Image, testId: "nav-gallery" },
  { title: "Code Submit", url: "/code-submit", icon: Code2, testId: "nav-code-submit" },
  { title: "Courses", url: "/courses", icon: GraduationCap, testId: "nav-courses" },
  { title: "Analytics", url: "/analytics", icon: PieChart, testId: "nav-analytics" },
  { title: "Network Lab", url: "/network-lab", icon: Network, testId: "nav-network-lab" },
  { title: "Snapshots", url: "/snapshots", icon: Camera, testId: "nav-snapshots" },
];

const accountItems = [
  { title: "Settings", url: "/settings", icon: Settings, testId: "nav-settings" },
  { title: "Support", url: "/support", icon: HelpCircle, testId: "nav-support" },
];

function NavGroup({ items, location }: { items: typeof platformItems; location: string }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
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
  );
}

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
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup items={platformItems} location={location} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Tools & Learning</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup items={toolsItems} location={location} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup items={accountItems} location={location} />
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
