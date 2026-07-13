import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { AdminShell, StatCard } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Painel Giga" }, { name: "robots", content: "noindex" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const qc = useQueryClient();

  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenues").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalReceitas = revenues.reduce((s, r) => s + Number(r.valor), 0);
  const totalDespesas = expenses.reduce((s, e) => s + Number(e.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  const [rForm, setRForm] = useState({ descricao: "", valor: "", data: new Date().toISOString().slice(0, 10) });
  const [eForm, setEForm] = useState({ descricao: "", valor: "", categoria: "", data: new Date().toISOString().slice(0, 10) });

  const addRev = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("revenues").insert({ descricao: rForm.descricao, valor: Number(rForm.valor), data: rForm.data });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["revenues"] }); setRForm({ descricao: "", valor: "", data: new Date().toISOString().slice(0, 10) }); },
  });
  const addExp = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({ descricao: eForm.descricao, valor: Number(eForm.valor), categoria: eForm.categoria || null, data: eForm.data });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setEForm({ descricao: "", valor: "", categoria: "", data: new Date().toISOString().slice(0, 10) }); },
  });
  const delRev = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("revenues").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenues"] }),
  });
  const delExp = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("expenses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  return (
    <AdminShell title="Financeiro" subtitle="Receitas, despesas e saldo">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Receitas" value={formatBRL(totalReceitas)} />
        <StatCard label="Despesas" value={formatBRL(totalDespesas)} />
        <StatCard label="Saldo" value={formatBRL(saldo)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card-elegant p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h3 className="font-display text-xl">Receitas</h3>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); addRev.mutate(); }} className="mb-4 grid gap-2 sm:grid-cols-[1fr_100px_140px_auto]">
            <input required placeholder="Descrição" value={rForm.descricao} onChange={(e) => setRForm({ ...rForm, descricao: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm" />
            <input required type="number" step="0.01" placeholder="R$" value={rForm.valor} onChange={(e) => setRForm({ ...rForm, valor: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm" />
            <input required type="date" value={rForm.data} onChange={(e) => setRForm({ ...rForm, data: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm" />
            <button className="btn-gold"><Plus className="h-4 w-4" /></button>
          </form>
          <div className="space-y-1">
            {revenues.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma receita.</p>}
            {revenues.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <div>
                  <p>{r.descricao}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.data).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">{formatBRL(Number(r.valor))}</span>
                  <button onClick={() => delRev.mutate(r.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elegant p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <h3 className="font-display text-xl">Despesas</h3>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); addExp.mutate(); }} className="mb-4 grid gap-2 sm:grid-cols-[1fr_110px_100px_140px_auto]">
            <input required placeholder="Descrição" value={eForm.descricao} onChange={(e) => setEForm({ ...eForm, descricao: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm" />
            <input placeholder="Categoria" value={eForm.categoria} onChange={(e) => setEForm({ ...eForm, categoria: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm" />
            <input required type="number" step="0.01" placeholder="R$" value={eForm.valor} onChange={(e) => setEForm({ ...eForm, valor: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm" />
            <input required type="date" value={eForm.data} onChange={(e) => setEForm({ ...eForm, data: e.target.value })}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm" />
            <button className="btn-gold"><Plus className="h-4 w-4" /></button>
          </form>
          <div className="space-y-1">
            {expenses.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa.</p>}
            {expenses.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <div>
                  <p>{r.descricao} {r.categoria && <span className="text-xs text-muted-foreground">· {r.categoria}</span>}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.data).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-destructive">{formatBRL(Number(r.valor))}</span>
                  <button onClick={() => delExp.mutate(r.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
        <Wallet className="h-4 w-4 text-accent" /> Pedidos convertidos podem virar receita automaticamente em versões futuras.
      </div>
    </AdminShell>
  );
}
