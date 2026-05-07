import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopNav } from "./top-nav";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export function MainLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col max-w-full overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-auto p-4 lg:p-8 bg-muted/20">
            <div className="max-w-7xl mx-auto w-full h-full animate-in fade-in duration-500">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
