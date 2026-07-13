import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Painel Giga" }, { name: "robots", content: "noindex" }] }),
  component: ClientesPage,
});

interface Customer {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  empresa: string | null;
  cidade: string | null;
  notas: string | null;
  created_at: string;
}

function ClientesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "", empresa: "", cidade: "", notas: "" });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Customer[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setForm({ nome: "", whatsapp: "", email: "", empresa: "", cidade: "", notas: "" });
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  return (
    <AdminShell
      title="Clientes"
      subtitle="Base de contatos"
      actions={
        <button onClick={() => setOpen(true)} className="btn-gold">
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
      }
    >
      <div className="card-elegant overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">WhatsApp</th>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Cidade</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum cliente cadastrado.</td></tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">{c.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.whatsapp}</td>
                <td className="px-4 py-3">{c.empresa ?? "—"}</td>
                <td className="px-4 py-3">{c.cidade ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove.mutate(c.id)} className="rounded p-1.5 text-destructive hover:bg-secondary">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => setOpen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
            className="w-full max-w-lg card-elegant space-y-3 p-6"
          >
            <h2 className="font-display text-2xl">Novo cliente</h2>
            <Input label="Nome*" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
            <Input label="WhatsApp*" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} required />
            <Input label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Empresa" value={form.empresa} onChange={(v) => setForm({ ...form, empresa: v })} />
            <Input label="Cidade" value={form.cidade} onChange={(v) => setForm({ ...form, cidade: v })} />
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Notas</label>
              <textarea rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-primary">Cancelar</button>
              <button type="submit" className="btn-gold">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent" />
    </div>
  );
}
