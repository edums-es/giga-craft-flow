import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell, StatCard } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/pricing";
import { looseSupabase as db } from "@/lib/supabase-loose";

export const Route = createFileRoute("/_authenticated/admin/compras")({
  head: () => ({
    meta: [{ title: "Compras - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: ComprasPage,
});

type Supplier = { id: string; nome: string };
type Supply = {
  id: string;
  nome: string;
  unidade: string;
  quantidade_atual: number;
  ultimo_custo: number;
  custo_medio: number;
};
type Purchase = {
  id: string;
  fornecedor_id: string | null;
  data: string;
  total: number;
  frete: number;
  desconto: number;
  taxas: number;
  pagamento: string | null;
  observacoes: string | null;
  suppliers?: Supplier | null;
  purchase_items?: PurchaseItem[];
};
type PurchaseItem = {
  id?: string;
  supply_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

type ItemForm = {
  supply_id: string;
  descricao: string;
  quantidade: string;
  valor_unitario: string;
};

const blankItem: ItemForm = { supply_id: "", descricao: "", quantidade: "1", valor_unitario: "0" };

function ComprasPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fornecedor_id: "",
    data: new Date().toISOString().slice(0, 10),
    frete: "0",
    desconto: "0",
    taxas: "0",
    pagamento: "",
    observacoes: "",
  });
  const [items, setItems] = useState<ItemForm[]>([{ ...blankItem }]);
  const [error, setError] = useState<string | null>(null);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await db
        .from("suppliers")
        .select("id, nome")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ["supplies"],
    queryFn: async () => {
      const { data, error } = await db
        .from("supplies")
        .select("id, nome, unidade, quantidade_atual, ultimo_custo, custo_medio")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data as Supply[];
    },
  });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await db
        .from("purchases")
        .select("*, suppliers(nome), purchase_items(*)")
        .order("data", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Purchase[];
    },
  });

  const itemSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.quantidade || 0) * Number(item.valor_unitario || 0),
        0,
      ),
    [items],
  );
  const total =
    itemSubtotal + Number(form.frete || 0) + Number(form.taxas || 0) - Number(form.desconto || 0);
  const totalMes = purchases
    .filter((purchase) => new Date(purchase.data).getMonth() === new Date().getMonth())
    .reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);

  const savePurchase = useMutation({
    mutationFn: async () => {
      setError(null);
      const validItems = items
        .map((item) => {
          const supply = supplies.find((current) => current.id === item.supply_id);
          return {
            supply,
            supply_id: item.supply_id || null,
            descricao: item.descricao.trim() || supply?.nome || "Item de compra",
            quantidade: Number(item.quantidade || 0),
            valor_unitario: Number(item.valor_unitario || 0),
          };
        })
        .filter((item) => item.quantidade > 0 && item.valor_unitario >= 0);

      if (validItems.length === 0) throw new Error("Adicione pelo menos um item valido.");

      const { data: purchase, error: purchaseError } = await db
        .from("purchases")
        .insert({
          fornecedor_id: form.fornecedor_id || null,
          data: form.data,
          frete: Number(form.frete || 0),
          desconto: Number(form.desconto || 0),
          taxas: Number(form.taxas || 0),
          total,
          pagamento: form.pagamento.trim() || null,
          observacoes: form.observacoes.trim() || null,
        })
        .select("id")
        .single();
      if (purchaseError) throw purchaseError;

      const purchaseItems = validItems.map((item) => ({
        purchase_id: purchase.id,
        supply_id: item.supply_id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.quantidade * item.valor_unitario,
      }));

      const { error: itemsError } = await db.from("purchase_items").insert(purchaseItems);
      if (itemsError) throw itemsError;

      for (const item of validItems) {
        if (!item.supply) continue;

        const currentQuantity = Number(item.supply.quantidade_atual || 0);
        const currentAverage = Number(item.supply.custo_medio || item.supply.ultimo_custo || 0);
        const nextQuantity = currentQuantity + item.quantidade;
        const nextAverage =
          (currentQuantity * currentAverage + item.quantidade * item.valor_unitario) /
          Math.max(1, nextQuantity);

        const { error: movementError } = await db.from("stock_movements").insert({
          supply_id: item.supply.id,
          tipo: "entrada",
          quantidade: item.quantidade,
          custo_unitario: item.valor_unitario,
          observacao: `Compra ${purchase.id}`,
        });
        if (movementError) throw movementError;

        const { error: updateError } = await db
          .from("supplies")
          .update({
            quantidade_atual: nextQuantity,
            ultimo_custo: item.valor_unitario,
            custo_medio: nextAverage,
          })
          .eq("id", item.supply.id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["supplies"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      setForm({
        fornecedor_id: "",
        data: new Date().toISOString().slice(0, 10),
        frete: "0",
        desconto: "0",
        taxas: "0",
        pagamento: "",
        observacoes: "",
      });
      setItems([{ ...blankItem }]);
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar a compra."),
  });

  const updateItem = (index: number, patch: Partial<ItemForm>) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  return (
    <AdminShell title="Compras" subtitle="Registro de compras e entrada de materiais">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Compras registradas" value={String(purchases.length)} />
        <StatCard label="Compras do mes" value={formatBRL(totalMes)} />
        <StatCard label="Total em aberto" value={formatBRL(total)} hint="Formulario atual" />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[460px_1fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            savePurchase.mutate();
          }}
          className="card-elegant h-fit space-y-4 p-5"
        >
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-accent" />
            <h2 className="font-display text-xl">Nova compra</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Fornecedor
              </span>
              <select
                value={form.fornecedor_id}
                onChange={(event) => setForm({ ...form, fornecedor_id: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">Sem fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.nome}
                  </option>
                ))}
              </select>
            </label>
            <Field
              type="date"
              label="Data"
              value={form.data}
              onChange={(data) => setForm({ ...form, data })}
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Itens</p>
              <button
                type="button"
                onClick={() => setItems([...items, { ...blankItem }])}
                className="rounded-full border border-border p-2 hover:border-accent"
                title="Adicionar item"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {items.map((item, index) => {
              const supply = supplies.find((current) => current.id === item.supply_id);
              return (
                <div key={index} className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      value={item.supply_id}
                      onChange={(event) => {
                        const selected = supplies.find(
                          (current) => current.id === event.target.value,
                        );
                        updateItem(index, {
                          supply_id: event.target.value,
                          descricao: selected?.nome ?? item.descricao,
                          valor_unitario: selected
                            ? String(selected.ultimo_custo || selected.custo_medio || 0)
                            : item.valor_unitario,
                        });
                      }}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      <option value="">Item avulso</option>
                      {supplies.map((supplyOption) => (
                        <option key={supplyOption.id} value={supplyOption.id}>
                          {supplyOption.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}
                      disabled={items.length === 1}
                      className="rounded-lg border border-border px-3 text-destructive disabled:opacity-40"
                      title="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_90px_110px]">
                    <input
                      value={item.descricao}
                      placeholder={supply?.nome ?? "Descricao"}
                      onChange={(event) => updateItem(index, { descricao: event.target.value })}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={item.quantidade}
                      onChange={(event) => updateItem(index, { quantidade: event.target.value })}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={item.valor_unitario}
                      onChange={(event) =>
                        updateItem(index, { valor_unitario: event.target.value })
                      }
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <p className="mt-2 text-right text-xs text-muted-foreground">
                    Total do item:{" "}
                    {formatBRL(Number(item.quantidade || 0) * Number(item.valor_unitario || 0))}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field
              type="number"
              label="Frete"
              value={form.frete}
              onChange={(frete) => setForm({ ...form, frete })}
              step="0.01"
            />
            <Field
              type="number"
              label="Taxas"
              value={form.taxas}
              onChange={(taxas) => setForm({ ...form, taxas })}
              step="0.01"
            />
            <Field
              type="number"
              label="Desconto"
              value={form.desconto}
              onChange={(desconto) => setForm({ ...form, desconto })}
              step="0.01"
            />
          </div>
          <Field
            label="Pagamento"
            value={form.pagamento}
            onChange={(pagamento) => setForm({ ...form, pagamento })}
          />
          <Field
            label="Observacoes"
            value={form.observacoes}
            onChange={(observacoes) => setForm({ ...form, observacoes })}
          />

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-2xl text-accent">{formatBRL(total)}</span>
          </div>
          <button
            type="submit"
            className="btn-gold w-full disabled:opacity-60"
            disabled={savePurchase.isPending}
          >
            Registrar compra
          </button>
        </form>

        <div className="card-elegant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Fornecedor</th>
                  <th className="px-4 py-3 text-left">Itens</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!isLoading && purchases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Nenhuma compra registrada.
                    </td>
                  </tr>
                )}
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-t border-border/60">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(purchase.data).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{purchase.suppliers?.nome ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-md space-y-1">
                        {(purchase.purchase_items ?? []).map((item) => (
                          <p key={item.id} className="truncate text-xs text-muted-foreground">
                            {item.descricao} - {Number(item.quantidade).toLocaleString("pt-BR")} x{" "}
                            {formatBRL(Number(item.valor_unitario))}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatBRL(Number(purchase.total))}
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
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        required={required}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={step ?? (type === "number" ? "0.01" : undefined)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
