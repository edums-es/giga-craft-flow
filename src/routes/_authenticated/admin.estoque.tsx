import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Boxes, Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell, StatCard } from "@/components/admin/AdminShell";
import { formatBRL } from "@/lib/pricing";
import { looseSupabase as db } from "@/lib/supabase-loose";

export const Route = createFileRoute("/_authenticated/admin/estoque")({
  head: () => ({
    meta: [{ title: "Estoque - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: EstoquePage,
});

type Supplier = { id: string; nome: string };
type Supply = {
  id: string;
  nome: string;
  categoria: string;
  fornecedor_id: string | null;
  unidade: string;
  quantidade_atual: number;
  estoque_minimo: number;
  ultimo_custo: number;
  custo_medio: number;
  quantidade_por_pacote: number | null;
  localizacao: string | null;
  observacoes: string | null;
  suppliers?: Supplier | null;
};
type Movement = {
  id: string;
  supply_id: string;
  tipo: string;
  quantidade: number;
  custo_unitario: number | null;
  observacao: string | null;
  created_at: string;
};

const emptySupply = {
  nome: "",
  categoria: "Papel",
  fornecedor_id: "",
  unidade: "un",
  quantidade_atual: "0",
  estoque_minimo: "0",
  ultimo_custo: "0",
  quantidade_por_pacote: "",
  localizacao: "",
  observacoes: "",
};

const emptyMovement = {
  supply_id: "",
  tipo: "entrada",
  quantidade: "",
  custo_unitario: "",
  observacao: "",
};

function EstoquePage() {
  const qc = useQueryClient();
  const [supplyForm, setSupplyForm] = useState(emptySupply);
  const [editing, setEditing] = useState<string | null>(null);
  const [movement, setMovement] = useState(emptyMovement);
  const [error, setError] = useState<string | null>(null);

  const { data: supplies = [], isLoading } = useQuery({
    queryKey: ["supplies"],
    queryFn: async () => {
      const { data, error } = await db
        .from("supplies")
        .select("*, suppliers(nome)")
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return data as Supply[];
    },
  });

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

  const { data: movements = [] } = useQuery({
    queryKey: ["stock_movements"],
    queryFn: async () => {
      const { data, error } = await db
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as Movement[];
    },
  });

  const stockValue = supplies.reduce(
    (sum, supply) => sum + Number(supply.quantidade_atual || 0) * Number(supply.custo_medio || 0),
    0,
  );
  const lowStock = supplies.filter(
    (supply) => Number(supply.quantidade_atual) <= Number(supply.estoque_minimo),
  );
  const categories = useMemo(
    () => Array.from(new Set(supplies.map((supply) => supply.categoria))).sort(),
    [supplies],
  );

  const saveSupply = useMutation({
    mutationFn: async () => {
      setError(null);
      const payload = {
        nome: supplyForm.nome.trim(),
        categoria: supplyForm.categoria.trim() || "Geral",
        fornecedor_id: supplyForm.fornecedor_id || null,
        unidade: supplyForm.unidade.trim() || "un",
        quantidade_atual: Number(supplyForm.quantidade_atual || 0),
        estoque_minimo: Number(supplyForm.estoque_minimo || 0),
        ultimo_custo: Number(supplyForm.ultimo_custo || 0),
        custo_medio: Number(supplyForm.ultimo_custo || 0),
        quantidade_por_pacote: supplyForm.quantidade_por_pacote
          ? Number(supplyForm.quantidade_por_pacote)
          : null,
        localizacao: supplyForm.localizacao.trim() || null,
        observacoes: supplyForm.observacoes.trim() || null,
      };
      const query = editing
        ? db.from("supplies").update(payload).eq("id", editing)
        : db.from("supplies").insert(payload);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplies"] });
      setSupplyForm(emptySupply);
      setEditing(null);
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o insumo."),
  });

  const addMovement = useMutation({
    mutationFn: async () => {
      setError(null);
      const selected = supplies.find((supply) => supply.id === movement.supply_id);
      if (!selected) throw new Error("Selecione um insumo.");

      const quantity = Number(movement.quantidade || 0);
      if (quantity <= 0) throw new Error("Informe uma quantidade maior que zero.");

      const direction = ["entrada", "devolucao"].includes(movement.tipo) ? 1 : -1;
      const nextQuantity = Math.max(
        0,
        Number(selected.quantidade_atual || 0) + quantity * direction,
      );
      const unitCost = movement.custo_unitario
        ? Number(movement.custo_unitario)
        : Number(selected.ultimo_custo || 0);
      const nextAverage =
        direction > 0 && unitCost > 0
          ? (Number(selected.quantidade_atual || 0) * Number(selected.custo_medio || 0) +
              quantity * unitCost) /
            Math.max(1, Number(selected.quantidade_atual || 0) + quantity)
          : Number(selected.custo_medio || 0);

      const { error: movementError } = await db.from("stock_movements").insert({
        supply_id: selected.id,
        tipo: movement.tipo,
        quantidade: quantity,
        custo_unitario: unitCost || null,
        observacao: movement.observacao.trim() || null,
      });
      if (movementError) throw movementError;

      const { error: supplyError } = await db
        .from("supplies")
        .update({
          quantidade_atual: nextQuantity,
          ultimo_custo: direction > 0 && unitCost > 0 ? unitCost : selected.ultimo_custo,
          custo_medio: nextAverage,
        })
        .eq("id", selected.id);
      if (supplyError) throw supplyError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplies"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      setMovement(emptyMovement);
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Nao foi possivel movimentar o estoque."),
  });

  const startEdit = (supply: Supply) => {
    setEditing(supply.id);
    setSupplyForm({
      nome: supply.nome,
      categoria: supply.categoria,
      fornecedor_id: supply.fornecedor_id ?? "",
      unidade: supply.unidade,
      quantidade_atual: String(supply.quantidade_atual ?? 0),
      estoque_minimo: String(supply.estoque_minimo ?? 0),
      ultimo_custo: String(supply.ultimo_custo ?? 0),
      quantidade_por_pacote: supply.quantidade_por_pacote
        ? String(supply.quantidade_por_pacote)
        : "",
      localizacao: supply.localizacao ?? "",
      observacoes: supply.observacoes ?? "",
    });
  };

  return (
    <AdminShell title="Estoque" subtitle="Insumos, saldos e movimentacoes">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Insumos"
          value={String(supplies.length)}
          hint={`${categories.length} categorias`}
        />
        <StatCard label="Valor em estoque" value={formatBRL(stockValue)} />
        <StatCard
          label="Abaixo do minimo"
          value={String(lowStock.length)}
          hint="Itens que pedem reposicao"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveSupply.mutate();
            }}
            className="card-elegant space-y-3 p-5"
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {editing ? "Editando insumo" : "Novo insumo"}
              </p>
              <h2 className="font-display text-2xl">
                {editing ? supplyForm.nome || "Insumo" : "Cadastro"}
              </h2>
            </div>
            <Field
              label="Nome*"
              value={supplyForm.nome}
              onChange={(nome) => setSupplyForm({ ...supplyForm, nome })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Categoria"
                value={supplyForm.categoria}
                onChange={(categoria) => setSupplyForm({ ...supplyForm, categoria })}
              />
              <Field
                label="Unidade"
                value={supplyForm.unidade}
                onChange={(unidade) => setSupplyForm({ ...supplyForm, unidade })}
              />
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Fornecedor
              </span>
              <select
                value={supplyForm.fornecedor_id}
                onChange={(event) =>
                  setSupplyForm({ ...supplyForm, fornecedor_id: event.target.value })
                }
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
            <div className="grid grid-cols-3 gap-3">
              <Field
                type="number"
                label="Atual"
                value={supplyForm.quantidade_atual}
                onChange={(quantidade_atual) => setSupplyForm({ ...supplyForm, quantidade_atual })}
              />
              <Field
                type="number"
                label="Minimo"
                value={supplyForm.estoque_minimo}
                onChange={(estoque_minimo) => setSupplyForm({ ...supplyForm, estoque_minimo })}
              />
              <Field
                type="number"
                label="Custo"
                value={supplyForm.ultimo_custo}
                onChange={(ultimo_custo) => setSupplyForm({ ...supplyForm, ultimo_custo })}
                step="0.0001"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                type="number"
                label="Qtd/pacote"
                value={supplyForm.quantidade_por_pacote}
                onChange={(quantidade_por_pacote) =>
                  setSupplyForm({ ...supplyForm, quantidade_por_pacote })
                }
              />
              <Field
                label="Local"
                value={supplyForm.localizacao}
                onChange={(localizacao) => setSupplyForm({ ...supplyForm, localizacao })}
              />
            </div>
            <Field
              label="Observacoes"
              value={supplyForm.observacoes}
              onChange={(observacoes) => setSupplyForm({ ...supplyForm, observacoes })}
            />
            <div className="flex justify-end gap-2 pt-2">
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setSupplyForm(emptySupply);
                  }}
                  className="btn-primary"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="btn-gold disabled:opacity-60"
                disabled={saveSupply.isPending || !supplyForm.nome.trim()}
              >
                {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Salvar
              </button>
            </div>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              addMovement.mutate();
            }}
            className="card-elegant space-y-3 p-5"
          >
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-accent" />
              <h2 className="font-display text-xl">Movimentar estoque</h2>
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Insumo
              </span>
              <select
                required
                value={movement.supply_id}
                onChange={(event) => setMovement({ ...movement, supply_id: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">Selecione</option>
                {supplies.map((supply) => (
                  <option key={supply.id} value={supply.id}>
                    {supply.nome}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Tipo
                </span>
                <select
                  value={movement.tipo}
                  onChange={(event) => setMovement({ ...movement, tipo: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saida</option>
                  <option value="perda">Perda</option>
                  <option value="uso_em_pedido">Uso em pedido</option>
                  <option value="devolucao">Devolucao</option>
                </select>
              </label>
              <Field
                type="number"
                label="Quantidade"
                value={movement.quantidade}
                onChange={(quantidade) => setMovement({ ...movement, quantidade })}
                required
              />
            </div>
            <Field
              type="number"
              label="Custo unitario"
              value={movement.custo_unitario}
              onChange={(custo_unitario) => setMovement({ ...movement, custo_unitario })}
              step="0.0001"
            />
            <Field
              label="Observacao"
              value={movement.observacao}
              onChange={(observacao) => setMovement({ ...movement, observacao })}
            />
            <button
              type="submit"
              className="btn-gold w-full disabled:opacity-60"
              disabled={addMovement.isPending}
            >
              Registrar
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card-elegant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Insumo</th>
                    <th className="px-4 py-3 text-left">Fornecedor</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-right">Minimo</th>
                    <th className="px-4 py-3 text-right">Custo medio</th>
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
                  {!isLoading && supplies.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        Nenhum insumo cadastrado.
                      </td>
                    </tr>
                  )}
                  {supplies.map((supply) => {
                    const low = Number(supply.quantidade_atual) <= Number(supply.estoque_minimo);
                    return (
                      <tr key={supply.id} className="border-t border-border/60">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => startEdit(supply)}
                            className="text-left font-medium hover:text-accent"
                          >
                            {supply.nome}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {supply.categoria}
                            {supply.localizacao ? ` - ${supply.localizacao}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {supply.suppliers?.nome ?? "-"}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${low ? "text-destructive" : "text-foreground"}`}
                        >
                          {Number(supply.quantidade_atual).toLocaleString("pt-BR")} {supply.unidade}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {Number(supply.estoque_minimo).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatBRL(Number(supply.custo_medio || supply.ultimo_custo || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-elegant p-5">
            <h2 className="font-display text-xl">Ultimas movimentacoes</h2>
            <div className="mt-4 space-y-2">
              {movements.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma movimentacao registrada.</p>
              )}
              {movements.map((item) => {
                const positive = ["entrada", "devolucao"].includes(item.tipo);
                const supply = supplies.find((current) => current.id === item.supply_id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {positive ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p>{supply?.nome ?? "Insumo"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.tipo.replaceAll("_", " ")} -{" "}
                          {new Date(item.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <span className={positive ? "text-green-500" : "text-destructive"}>
                      {positive ? "+" : "-"}
                      {Number(item.quantidade).toLocaleString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            </div>
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
        step={step ?? (type === "number" ? "0.001" : undefined)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
