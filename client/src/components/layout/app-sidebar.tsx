import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  BookOpen,
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  ShieldAlert,
  Mic,
  Wand2,
  Activity,
  ClipboardCheck,
  BarChart3
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role;

  const routes = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard", roles: ["l_and_d", "manager", "employee"] },
    { title: "Workforce Analysis", icon: Activity, url: "/analysis", roles: ["l_and_d"] },
    { title: "Assessments", icon: ClipboardCheck, url: "/assessments", roles: ["l_and_d", "employee"] },
    { title: "Analytics & Intervention", icon: BarChart3, url: "/analytics", roles: ["l_and_d", "manager"] },
    { title: "My Learning", icon: GraduationCap, url: "/learning", roles: ["employee", "manager"] },
    { title: "Speaking Coach", icon: Mic, url: "/speaking", roles: ["employee", "manager", "l_and_d"] },
    { title: "Course Library", icon: BookOpen, url: "/courses", roles: ["l_and_d", "employee"] },
    { title: "Team Progress", icon: Users, url: "/team", roles: ["manager", "l_and_d"] },
    { title: "AI Course Builder", icon: Wand2, url: "/generator", roles: ["l_and_d"] },
  ];

  const visibleRoutes = routes.filter(r => r.roles.includes(role));

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none">LMS Pro</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">
              {role.replace('_', ' ')}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {visibleRoutes.map((route) => (
                <SidebarMenuItem key={route.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === route.url}
                    className="rounded-lg transition-all hover:bg-primary/5 active:bg-primary/10"
                  >
                    <Link href={route.url} className="flex items-center gap-3 py-2.5">
                      <route.icon className="w-5 h-5 text-primary/70" />
                      <span className="font-medium">{route.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
