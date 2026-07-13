import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Painel Giga" }, { name: "robots", content: "noindex" }] }),
  component: ConfigPage,
});

interface Config { id: number; nome: string; whatsapp: string; instagram: string | null; email: string | null; cidade: string | null }

function ConfigPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Config | null>(null);

  const { data } = useQuery({
    queryKey: ["site_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_config").select("*").eq("id", 1).single();
      if (error) throw error;
      return data as Config;
    },
  });
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const { error } = await supabase.from("site_config").update({
        nome: form.nome, whatsapp: form.whatsapp, instagram: form.instagram,
        email: form.email, cidade: form.cidade, updated_at: new Date().toISOString(),
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_config"] }),
  });

  if (!form) return <AdminShell title="Configurações"><Loader2 className="h-6 w-6 animate-spin text-accent" /></AdminShell>;

  return (
    <AdminShell
      title="Configurações"
      subtitle="Dados de contato exibidos na vitrine"
      actions={
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-gold">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
        </button>
      }
    >
      <div className="max-w-2xl card-elegant p-6 space-y-4">
        <Field label="Nome da empresa" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
        <Field label="WhatsApp (apenas números com DDI, ex: 5511999999999)" value={form.whatsapp}
          onChange={(v) => setForm({ ...form, whatsapp: v })} />
        <Field label="Instagram" value={form.instagram ?? ""} onChange={(v) => setForm({ ...form, instagram: v })} />
        <Field label="E-mail" value={form.email ?? ""} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Cidade" value={form.cidade ?? ""} onChange={(v) => setForm({ ...form, cidade: v })} />
      </div>
    </AdminShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent" />
    </div>
  );
}
