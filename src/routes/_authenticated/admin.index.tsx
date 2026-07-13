import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, KanbanSquare, TrendingUp, Users } from "lucide-react";
import { AdminShell, StatCard } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Painel Giga" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [q, o, c, r] = await Promise.all([
        supabase.from("quotes").select("id, total, status, created_at").order("created_at", { ascending: false }),
        supabase.from("orders").select("id, total, status"),
        supabase.from("customers").select("id"),
        supabase.from("revenues").select("valor, data"),
      ]);
      return {
        quotes: q.data ?? [],
        orders: o.data ?? [],
        customers: c.data ?? [],
        revenues: r.data ?? [],
      };
    },
  });

  const totalOrcamentos = data?.quotes.length ?? 0;
  const valorEmOrcamentos = (data?.quotes ?? []).reduce((s, q) => s + Number(q.total || 0), 0);
  const pedidosAtivos = (data?.orders ?? []).filter((o) => !["entregue", "cancelado"].includes(o.status as string)).length;
  const receitaMes = (data?.revenues ?? [])
    .filter((r) => new Date(r.data).getMonth() === new Date().getMonth())
    .reduce((s, r) => s + Number(r.valor), 0);
  const ultimos = (data?.quotes ?? []).slice(0, 6);

  return (
    <AdminShell title="Dashboard" subtitle="Visão geral do negócio">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orçamentos" value={String(totalOrcamentos)} hint={formatBRL(valorEmOrcamentos) + " estimado"} />
        <StatCard label="Pedidos ativos" value={String(pedidosAtivos)} hint="Em produção" />
        <StatCard label="Clientes" value={String(data?.customers.length ?? 0)} />
        <StatCard label="Receita do mês" value={formatBRL(receitaMes)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card-elegant p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <h2 className="font-display text-xl">Últimos orçamentos</h2>
            </div>
            <button onClick={() => navigate({ to: "/admin/orcamentos" })} className="text-xs text-accent hover:underline">
              Ver todos →
            </button>
          </div>
          <div className="space-y-2">
            {ultimos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum orçamento ainda.</p>}
            {ultimos.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")}</span>
                <span className="font-medium">{formatBRL(Number(q.total))}</span>
                <StatusBadge status={q.status as string} />
              </div>
            ))}
          </div>
        </div>

        <div className="card-elegant p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h2 className="font-display text-xl">Ações rápidas</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction icon={<KanbanSquare className="h-4 w-4" />} label="Ver pedidos"
              onClick={() => navigate({ to: "/admin/pedidos" })} />
            <QuickAction icon={<Users className="h-4 w-4" />} label="Novo cliente"
              onClick={() => navigate({ to: "/admin/clientes" })} />
            <QuickAction icon={<FileText className="h-4 w-4" />} label="Orçamentos"
              onClick={() => navigate({ to: "/admin/orcamentos" })} />
            <QuickAction icon={<TrendingUp className="h-4 w-4" />} label="Financeiro"
              onClick={() => navigate({ to: "/admin/financeiro" })} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm hover:border-accent"
    >
      <span className="text-accent">{icon}</span> {label}
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    novo: "bg-accent/15 text-accent",
    em_negociacao: "bg-yellow-500/15 text-yellow-500",
    aprovado: "bg-green-500/15 text-green-500",
    recusado: "bg-red-500/15 text-red-400",
    convertido: "bg-blue-500/15 text-blue-400",
  };
  const label: Record<string, string> = {
    novo: "Novo", em_negociacao: "Em negociação", aprovado: "Aprovado",
    recusado: "Recusado", convertido: "Convertido",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${map[status] ?? "bg-secondary text-muted-foreground"}`}>{label[status] ?? status}</span>;
}
