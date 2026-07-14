import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { sameCustomerContact } from "@/lib/customer-utils";
import { readableError } from "@/lib/readable-error";
import { looseSupabase as db } from "@/lib/supabase-loose";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({
    meta: [{ title: "Clientes - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
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

type CustomerForm = {
  nome: string;
  whatsapp: string;
  email: string;
  empresa: string;
  cidade: string;
  notas: string;
};

const emptyForm: CustomerForm = {
  nome: "",
  whatsapp: "",
  email: "",
  empresa: "",
  cidade: "",
  notas: "",
};

function ClientesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data: customers = [], error: loadError } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await db
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });

  const visibleCustomers = useMemo(() => dedupeCustomers(customers), [customers]);

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      const payload = customerPayload(form);
      if (!payload.nome || !payload.whatsapp) {
        throw new Error("Informe nome e WhatsApp do cliente.");
      }

      const existing = customers.find(
        (customer) => customer.id !== editingId && sameCustomerContact(customer, payload),
      );

      if (editingId) {
        const { error } = await db.from("customers").update(payload).eq("id", editingId);
        if (error) throw error;

        if (existing) {
          const { error: quoteError } = await db
            .from("quotes")
            .update({ customer_id: editingId })
            .eq("customer_id", existing.id);
          if (quoteError) throw quoteError;

          const { error: deleteError } = await db.from("customers").delete().eq("id", existing.id);
          if (deleteError) throw deleteError;
        }
        return;
      }

      if (existing) {
        const { error } = await db.from("customers").update(payload).eq("id", existing.id);
        if (error) throw error;
        return;
      }

      const { error } = await db.from("customers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
      closeModal();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o cliente."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
  });

  const openCreate = () => {
    setError(null);
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setError(null);
    setEditingId(customer.id);
    setForm({
      nome: customer.nome ?? "",
      whatsapp: customer.whatsapp ?? "",
      email: customer.email ?? "",
      empresa: customer.empresa ?? "",
      cidade: customer.cidade ?? "",
      notas: customer.notas ?? "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <AdminShell
      title="Clientes"
      subtitle="Base de contatos"
      actions={
        <button onClick={openCreate} className="btn-gold">
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
      }
    >
      {loadError && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Nao consegui carregar os clientes.
          <p className="mt-1 text-xs">{readableError(loadError)}</p>
        </div>
      )}

      <div className="card-elegant overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">WhatsApp</th>
              <th className="px-4 py-3 text-left">E-mail</th>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Cidade</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visibleCustomers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
            {visibleCustomers.map((customer) => (
              <tr key={customer.id} className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">{customer.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{customer.whatsapp}</td>
                <td className="px-4 py-3 text-muted-foreground">{customer.email ?? "-"}</td>
                <td className="px-4 py-3">{customer.empresa ?? "-"}</td>
                <td className="px-4 py-3">{customer.cidade ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(customer)}
                      className="rounded p-1.5 hover:bg-secondary"
                      title="Editar cliente"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove.mutate(customer.id)}
                      className="rounded p-1.5 text-destructive hover:bg-secondary"
                      title="Excluir cliente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
          onClick={closeModal}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
            className="card-elegant max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {editingId ? "Editar cliente" : "Novo cliente"}
                </p>
                <h2 className="text-2xl font-semibold">Cadastro</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded p-1 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <Input
              label="Nome*"
              value={form.nome}
              onChange={(value) => setForm({ ...form, nome: value })}
              required
            />
            <Input
              label="WhatsApp*"
              value={form.whatsapp}
              onChange={(value) => setForm({ ...form, whatsapp: value })}
              required
            />
            <Input
              label="E-mail"
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
            />
            <Input
              label="Empresa"
              value={form.empresa}
              onChange={(value) => setForm({ ...form, empresa: value })}
            />
            <Input
              label="Cidade"
              value={form.cidade}
              onChange={(value) => setForm({ ...form, cidade: value })}
            />
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Notas
              </label>
              <textarea
                rows={3}
                value={form.notas}
                onChange={(event) => setForm({ ...form, notas: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="btn-primary">
                Cancelar
              </button>
              <button type="submit" disabled={save.isPending} className="btn-gold">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

function customerPayload(form: CustomerForm) {
  return {
    nome: form.nome.trim(),
    whatsapp: form.whatsapp.trim(),
    email: form.email.trim() || null,
    empresa: form.empresa.trim() || null,
    cidade: form.cidade.trim() || null,
    notas: form.notas.trim() || null,
  };
}

function dedupeCustomers(customers: Customer[]) {
  return customers.filter((customer, index) => {
    const firstIndex = customers.findIndex((candidate) => sameCustomerContact(candidate, customer));
    return firstIndex === index;
  });
}

function Input({
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
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
