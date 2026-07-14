import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { AdminShell, StatCard } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/pricing";
import { readableError } from "@/lib/readable-error";
import { looseSupabase as db } from "@/lib/supabase-loose";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  head: () => ({
    meta: [{ title: "Pedidos - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: PedidosPage,
});

const COLUMNS: { id: string; label: string }[] = [
  { id: "aguardando_arte", label: "Aguardando arte" },
  { id: "arte_aprovada", label: "Arte aprovada" },
  { id: "em_producao", label: "Em producao" },
  { id: "acabamento", label: "Acabamento" },
  { id: "pronto", label: "Pronto" },
  { id: "entregue", label: "Entregue" },
];

interface Order {
  id: string;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  total: number;
  status: string;
  entrega_prevista: string | null;
  notas: string | null;
  custo_previsto: number | null;
  custo_real: number | null;
  lucro_previsto: number | null;
  lucro_real: number | null;
  valor_recebido: number | null;
  valor_pendente: number | null;
  prioridade: string | null;
  created_at: string;
}

interface StageHistory {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

function PedidosPage() {
  const qc = useQueryClient();
  const {
    data: orders = [],
    error: ordersError,
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const { data: history = [], error: historyError } = useQuery({
    queryKey: ["order_stage_history"],
    queryFn: async () => {
      const { data, error } = await db
        .from("order_stage_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as StageHistory[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, from, status }: { id: string; from: string; status: string }) => {
      const { error } = await db.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

      const { error: historyError } = await db.from("order_stage_history").insert({
        order_id: id,
        from_status: from,
        to_status: status,
        note: "Movido pelo Kanban",
      });
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order_stage_history"] });
    },
  });

  const active = orders.filter((order) => !["entregue", "cancelado"].includes(order.status));
  const activeValue = active.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const predictedProfit = orders.reduce((sum, order) => {
    const profit =
      order.lucro_previsto ??
      (order.custo_previsto ? Number(order.total || 0) - Number(order.custo_previsto) : 0);
    return sum + Number(profit || 0);
  }, 0);
  const pendingValue = orders.reduce((sum, order) => {
    const pending =
      order.valor_pendente ??
      Math.max(0, Number(order.total || 0) - Number(order.valor_recebido || 0));
    return sum + Number(pending || 0);
  }, 0);

  const pageError = ordersError ?? historyError;

  return (
    <AdminShell title="Pedidos" subtitle="Fluxo de producao em Kanban">
      {ordersLoading && (
        <div className="mb-4 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          Carregando pedidos...
        </div>
      )}
      {pageError && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Nao consegui carregar os pedidos. Tente sair e entrar de novo no painel.
          <p className="mt-2 text-xs opacity-80">{readableError(pageError)}</p>
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Pedidos ativos"
          value={String(active.length)}
          hint={formatBRL(activeValue)}
        />
        <StatCard label="Lucro previsto" value={formatBRL(predictedProfit)} />
        <StatCard label="Pendente" value={formatBRL(pendingValue)} hint="A receber" />
        <StatCard label="Historico" value={String(history.length)} hint="Ultimos movimentos" />
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {COLUMNS.map((col) => {
          const items = orders.filter((order) => order.status === col.id);
          const total = items.reduce((sum, order) => sum + Number(order.total), 0);
          return (
            <div key={col.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {col.label}
                </p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                  {items.length}
                </span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{formatBRL(total)}</p>
              <div className="space-y-2">
                {items.map((order) => {
                  const idx = COLUMNS.findIndex((column) => column.id === order.status);
                  const prev = COLUMNS[idx - 1];
                  const next = COLUMNS[idx + 1];
                  const cost = order.custo_real ?? order.custo_previsto;
                  const profit = order.lucro_real ?? order.lucro_previsto;
                  return (
                    <div
                      key={order.id}
                      className="rounded-xl border border-border/60 bg-secondary/40 p-3"
                    >
                      <p className="text-sm font-medium">{order.cliente_nome}</p>
                      <p className="mt-1 text-xs text-accent">{formatBRL(Number(order.total))}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                        <span>Custo: {cost ? formatBRL(Number(cost)) : "-"}</span>
                        <span>Lucro: {profit ? formatBRL(Number(profit)) : "-"}</span>
                      </div>
                      {order.prioridade && order.prioridade !== "normal" && (
                        <span className="mt-2 inline-flex rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive">
                          {order.prioridade}
                        </span>
                      )}
                      {order.entrega_prevista && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Entrega: {new Date(order.entrega_prevista).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      <div className="mt-2 flex gap-1">
                        {prev && (
                          <button
                            onClick={() =>
                              move.mutate({ id: order.id, from: order.status, status: prev.id })
                            }
                            className="flex-1 rounded border border-border px-2 py-1 text-[10px] hover:border-accent"
                            title="Voltar etapa"
                          >
                            {"<"}
                          </button>
                        )}
                        {next && (
                          <button
                            onClick={() =>
                              move.mutate({ id: order.id, from: order.status, status: next.id })
                            }
                            className="flex-1 rounded border border-border px-2 py-1 text-[10px] hover:border-accent"
                            title="Avancar etapa"
                          >
                            {">"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-[10px] text-muted-foreground">
                    vazio
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 card-elegant p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          <h2 className="font-display text-xl">Ultimos movimentos</h2>
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum movimento registrado.</p>
          )}
          {history.slice(0, 10).map((item) => {
            const order = orders.find((current) => current.id === item.order_id);
            return (
              <div key={item.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{order?.cliente_nome ?? "Pedido"}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(item.from_status ?? "inicio").replaceAll("_", " ")} -&gt;{" "}
                  {item.to_status.replaceAll("_", " ")}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
