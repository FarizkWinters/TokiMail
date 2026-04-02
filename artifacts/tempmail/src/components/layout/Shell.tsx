import { Link, useLocation } from "wouter";
import { Mail, KeyRound, BookOpen, Menu, Code2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 60000 }
  });

  const links = [
    { href: "/", label: "Mailboxes", icon: Mail },
    { href: "/keys", label: "API Keys", icon: KeyRound },
    { href: "/docs", label: "Documentation", icon: BookOpen },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-sm">
      <aside className="w-64 border-r border-border bg-sidebar shrink-0 hidden md:flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors">
            <div className="size-6 bg-primary flex items-center justify-center rounded text-primary-foreground">
              <Code2 className="size-4" />
            </div>
            <span className="tracking-tight text-base">tokito.me</span>
          </Link>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <nav className="space-y-1">
            {links.map((link) => {
              const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-border mt-auto bg-card/50">
          <div className="text-xs text-muted-foreground flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground/80">System Status</span>
              {health?.status === "ok" ? (
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Operational
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-destructive">
                  <Activity className="size-3" />
                  Degraded
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span>TempMail API</span>
              <span className="font-mono opacity-50">v0.1.0</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="h-14 border-b border-border flex items-center px-4 md:hidden shrink-0 bg-background/80 backdrop-blur z-10">
          <Button variant="ghost" size="icon" className="-ml-2 mr-2">
            <Menu className="size-4" />
          </Button>
          <span className="font-bold tracking-tight">tokito.me</span>
        </header>

        <main className="flex-1 overflow-y-auto w-full relative">
          {children}
        </main>
      </div>
    </div>
  );
}
