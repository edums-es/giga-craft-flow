import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Eye, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/routes/_authenticated/admin.index";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — Painel Giga" }, { name: "robots", content: "noindex" }] }),
  component: OrcamentosPage,
});

interface QuoteItem {
  nome: string;
  quantidade: number;
  precoUnitario: number;
  precoTotal: number;
  resumo: string;
}
interface Quote {
  id: string;
  codigo: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  cliente_email: string | null;
  cliente_empresa: string | null;
  cliente_cidade: string | null;
  observacao: string | null;
  total: number;
  prazo_dias: number;
  status: string;
  items: QuoteItem[];
  created_at: string;
}

function OrcamentosPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("todos");
  const [opened, setOpened] = useState<Quote | null>(null);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Quote[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quotes").update({ status: status as never }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const convertToOrder = useMutation({
    mutationFn: async (q: Quote) => {
      const { error: e1 } = await supabase.from("orders").insert({
        quote_id: q.id,
        cliente_nome: q.cliente_nome,
        cliente_whatsapp: q.cliente_whatsapp,
        total: q.total,
        status: "aguardando_arte" as never,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("quotes").update({ status: "convertido" as never }).eq("id", q.id);
      if (e2) throw e2;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const filtered = filter === "todos" ? quotes : quotes.filter((q) => q.status === filter);

  return (
    <AdminShell title="Orçamentos" subtitle="Gerencie orçamentos recebidos pela vitrine">
      <div className="mb-4 flex flex-wrap gap-2">
        {["todos", "novo", "em_negociacao", "aprovado", "recusado", "convertido"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs ${filter === s ? "border-accent bg-accent/15 text-accent" : "border-border bg-secondary text-muted-foreground"}`}
          >
            {s === "todos" ? "Todos" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="card-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">WhatsApp</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum orçamento.</td></tr>
              )}
              {filtered.map((q) => (
                <tr key={q.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-mono text-xs">#{q.codigo}</td>
                  <td className="px-4 py-3">{q.cliente_nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{q.cliente_whatsapp}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatBRL(Number(q.total))}</td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setOpened(q)} className="rounded p-1.5 hover:bg-secondary" title="Ver">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove.mutate(q.id)} className="rounded p-1.5 text-destructive hover:bg-secondary" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {opened && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => setOpened(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto card-elegant p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-accent">Orçamento</p>
                <h2 className="font-display text-2xl">#{opened.codigo}</h2>
              </div>
              <button onClick={() => setOpened(null)} className="rounded p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <Info label="Cliente" value={opened.cliente_nome} />
              <Info label="WhatsApp" value={opened.cliente_whatsapp} />
              <Info label="E-mail" value={opened.cliente_email ?? "—"} />
              <Info label="Empresa" value={opened.cliente_empresa ?? "—"} />
              <Info label="Cidade" value={opened.cliente_cidade ?? "—"} />
              <Info label="Prazo" value={`${opened.prazo_dias} dias úteis`} />
            </div>
            {opened.observacao && (
              <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-muted-foreground"><b>Obs:</b> {opened.observacao}</p>
            )}
            <div className="mt-6 space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Itens</p>
              {opened.items.map((it, i) => (
                <div key={i} className="rounded-xl border border-border/60 p-3">
                  <div className="flex justify-between">
                    <p className="font-medium">{it.nome}</p>
                    <p className="text-accent">{formatBRL(it.precoTotal)}</p>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{it.resumo}</pre>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl text-accent">{formatBRL(Number(opened.total))}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <select
                value={opened.status}
                onChange={(e) => { updateStatus.mutate({ id: opened.id, status: e.target.value }); setOpened({ ...opened, status: e.target.value }); }}
                className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
              >
                <option value="novo">Novo</option>
                <option value="em_negociacao">Em negociação</option>
                <option value="aprovado">Aprovado</option>
                <option value="recusado">Recusado</option>
                <option value="convertido">Convertido</option>
              </select>
              <button
                onClick={() => { convertToOrder.mutate(opened); setOpened(null); }}
                className="btn-gold"
              >
                Converter em pedido
              </button>
              <a
                href={`https://wa.me/${opened.cliente_whatsapp.replace(/\D/g, "")}`}
                target="_blank" rel="noreferrer"
                className="btn-primary"
              >Chamar no WhatsApp</a>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
