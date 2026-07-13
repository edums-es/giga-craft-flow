import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Painel Giga" }, { name: "robots", content: "noindex" }] }),
  component: PedidosPage,
});

const COLUMNS: { id: string; label: string }[] = [
  { id: "aguardando_arte", label: "Aguardando arte" },
  { id: "arte_aprovada",   label: "Arte aprovada" },
  { id: "em_producao",     label: "Em produção" },
  { id: "acabamento",      label: "Acabamento" },
  { id: "pronto",          label: "Pronto" },
  { id: "entregue",        label: "Entregue" },
];

interface Order {
  id: string;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  total: number;
  status: string;
  entrega_prevista: string | null;
  notas: string | null;
  created_at: string;
}

function PedidosPage() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Order[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status: status as never }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  return (
    <AdminShell title="Pedidos" subtitle="Fluxo de produção em Kanban">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {COLUMNS.map((col) => {
          const items = orders.filter((o) => o.status === col.id);
          const total = items.reduce((s, o) => s + Number(o.total), 0);
          return (
            <div key={col.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{col.label}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{items.length}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{formatBRL(total)}</p>
              <div className="space-y-2">
                {items.map((o) => {
                  const idx = COLUMNS.findIndex((c) => c.id === o.status);
                  const prev = COLUMNS[idx - 1];
                  const next = COLUMNS[idx + 1];
                  return (
                    <div key={o.id} className="rounded-xl border border-border/60 bg-secondary/40 p-3">
                      <p className="text-sm font-medium">{o.cliente_nome}</p>
                      <p className="mt-1 text-xs text-accent">{formatBRL(Number(o.total))}</p>
                      {o.entrega_prevista && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Entrega: {new Date(o.entrega_prevista).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      <div className="mt-2 flex gap-1">
                        {prev && (
                          <button
                            onClick={() => move.mutate({ id: o.id, status: prev.id })}
                            className="flex-1 rounded border border-border px-2 py-1 text-[10px] hover:border-accent"
                          >←</button>
                        )}
                        {next && (
                          <button
                            onClick={() => move.mutate({ id: o.id, status: next.id })}
                            className="flex-1 rounded border border-border px-2 py-1 text-[10px] hover:border-accent"
                          >→</button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-[10px] text-muted-foreground">vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
