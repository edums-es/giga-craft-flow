import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { looseSupabase as db } from "@/lib/supabase-loose";

export const Route = createFileRoute("/_authenticated/admin/fornecedores")({
  head: () => ({
    meta: [{ title: "Fornecedores - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: FornecedoresPage,
});

type Supplier = {
  id: string;
  nome: string;
  contato: string | null;
  whatsapp: string | null;
  cnpj: string | null;
  observacoes: string | null;
  created_at: string;
};

const emptyForm = {
  nome: "",
  contato: "",
  whatsapp: "",
  cnpj: "",
  observacoes: "",
};

function FornecedoresPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await db
        .from("suppliers")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      const payload = {
        nome: form.nome.trim(),
        contato: form.contato.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        cnpj: form.cnpj.trim() || null,
        observacoes: form.observacoes.trim() || null,
      };

      const query = editing
        ? db.from("suppliers").update(payload).eq("id", editing)
        : db.from("suppliers").insert(payload);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setForm(emptyForm);
      setEditing(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Nao foi possivel salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      setError(null);
      const { error } = await db.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
    onError: (err) => setError(err instanceof Error ? err.message : "Nao foi possivel remover."),
  });

  const startEdit = (supplier: Supplier) => {
    setEditing(supplier.id);
    setForm({
      nome: supplier.nome,
      contato: supplier.contato ?? "",
      whatsapp: supplier.whatsapp ?? "",
      cnpj: supplier.cnpj ?? "",
      observacoes: supplier.observacoes ?? "",
    });
  };

  return (
    <AdminShell title="Fornecedores" subtitle="Cadastro de parceiros e contatos de compra">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="card-elegant h-fit space-y-3 p-5"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {editing ? "Editando fornecedor" : "Novo fornecedor"}
            </p>
            <h2 className="font-display text-2xl">
              {editing ? form.nome || "Fornecedor" : "Cadastro"}
            </h2>
          </div>

          <Field
            label="Nome*"
            value={form.nome}
            onChange={(nome) => setForm({ ...form, nome })}
            required
          />
          <Field
            label="Contato"
            value={form.contato}
            onChange={(contato) => setForm({ ...form, contato })}
          />
          <Field
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(whatsapp) => setForm({ ...form, whatsapp })}
          />
          <Field label="CNPJ" value={form.cnpj} onChange={(cnpj) => setForm({ ...form, cnpj })} />
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Observacoes
            </label>
            <textarea
              rows={4}
              value={form.observacoes}
              onChange={(event) => setForm({ ...form, observacoes: event.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm);
                }}
                className="btn-primary"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={save.isPending || !form.nome.trim()}
              className="btn-gold disabled:opacity-60"
            >
              {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        </form>

        <div className="card-elegant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Contato</th>
                  <th className="px-4 py-3 text-left">WhatsApp</th>
                  <th className="px-4 py-3 text-left">CNPJ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!isLoading && suppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Nenhum fornecedor cadastrado.
                    </td>
                  </tr>
                )}
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">
                      <button
                        onClick={() => startEdit(supplier)}
                        className="text-left hover:text-accent"
                      >
                        {supplier.nome}
                      </button>
                      {supplier.observacoes && (
                        <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                          {supplier.observacoes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{supplier.contato ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{supplier.whatsapp ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{supplier.cnpj ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove.mutate(supplier.id)}
                        className="rounded p-1.5 text-destructive hover:bg-secondary"
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
