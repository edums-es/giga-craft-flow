import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Package,
  Sliders,
  Users,
  KanbanSquare,
  Wallet,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/giga-logo.asset.json";

interface Item {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: Item[] = [
  { to: "/admin",              label: "Dashboard",   icon: LayoutDashboard },
  { to: "/admin/orcamentos",   label: "Orçamentos",  icon: FileText },
  { to: "/admin/pedidos",      label: "Pedidos",     icon: KanbanSquare },
  { to: "/admin/clientes",     label: "Clientes",    icon: Users },
  { to: "/admin/produtos",     label: "Produtos",    icon: Package },
  { to: "/admin/parametros",   label: "Preços",      icon: Sliders },
  { to: "/admin/financeiro",   label: "Financeiro",  icon: Wallet },
  { to: "/admin/configuracoes",label: "Configurações", icon: Settings },
];

export function AdminShell({ title, subtitle, actions, children }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
          <div className="flex items-center gap-3 border-b border-border px-5 py-5">
            <img src={logo.url} alt="Giga" className="h-8 w-auto" />
            <div>
              <p className="font-display text-lg leading-none">Giga</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Painel</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => {
              const active = item.to === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-3 space-y-1">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" /> Ver vitrine
            </a>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
            {email && <p className="mt-2 truncate px-3 text-[10px] text-muted-foreground/70">{email}</p>}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <div>
                <h1 className="font-display text-2xl leading-tight">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-3">{actions}</div>
            </div>
            {/* Mobile nav */}
            <div className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
              {NAV.map((item) => {
                const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                      active ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-elegant p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
