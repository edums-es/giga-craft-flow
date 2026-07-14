import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { readableError } from "@/lib/readable-error";
import { looseSupabase as db } from "@/lib/supabase-loose";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  head: () => ({
    meta: [{ title: "Produtos - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: ProdutosPage,
});

type Category = {
  id: string;
  nome: string;
};

type Product = {
  id: string;
  slug: string;
  nome: string;
  categoria_id: string | null;
  tipo: string;
  descricao: string;
  medida_publica: string | null;
  quantidade_minima: number;
  is_featured: boolean;
  is_active: boolean;
  public_config: Record<string, unknown>;
  internal_config: Record<string, unknown>;
  created_at: string;
};

type ProductForm = {
  id: string | null;
  slug: string;
  nome: string;
  categoria_id: string;
  tipo: string;
  descricao: string;
  medida_publica: string;
  quantidade_minima: string;
  is_featured: boolean;
  is_active: boolean;
  public_config: string;
  internal_config: string;
};

const emptyForm: ProductForm = {
  id: null,
  slug: "",
  nome: "",
  categoria_id: "sacolas",
  tipo: "sacola",
  descricao: "",
  medida_publica: "",
  quantidade_minima: "25",
  is_featured: false,
  is_active: true,
  public_config: "{}",
  internal_config: "{}",
};

const PRODUCT_TYPES = [
  { value: "sacola", label: "Sacola" },
  { value: "tag", label: "Tag" },
  { value: "cartao", label: "Cartao" },
  { value: "caixa", label: "Caixa" },
  { value: "adesivo", label: "Adesivo" },
  { value: "embalagem", label: "Embalagem" },
  { value: "kit", label: "Kit" },
  { value: "sob_medida", label: "Sob medida" },
];

function ProdutosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [], error: categoriesError } = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await db
        .from("product_categories")
        .select("id, nome")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const {
    data: products = [],
    isLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["products-admin"],
    queryFn: async () => {
      const { data, error } = await db
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    if (filter === "todos") return products;
    if (filter === "ativos") return products.filter((product) => product.is_active);
    if (filter === "inativos") return products.filter((product) => !product.is_active);
    return products.filter((product) => product.categoria_id === filter);
  }, [products, filter]);

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      const publicConfig = parseJson(form.public_config, "Config publico");
      const internalConfig = parseJson(form.internal_config, "Config interno");
      const slug = form.slug.trim() || slugify(form.nome);
      if (!form.nome.trim()) throw new Error("Informe o nome do produto.");
      if (!slug) throw new Error("Informe um slug ou um nome valido.");

      const payload = {
        slug,
        nome: form.nome.trim(),
        categoria_id: form.categoria_id || null,
        tipo: form.tipo,
        descricao: form.descricao.trim(),
        medida_publica: form.medida_publica.trim() || null,
        quantidade_minima: Math.max(1, Number(form.quantidade_minima || 1)),
        is_featured: form.is_featured,
        is_active: form.is_active,
        public_config: publicConfig,
        internal_config: internalConfig,
      };

      const query = form.id
        ? db.from("products").update(payload).eq("id", form.id)
        : db.from("products").insert(payload);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products-admin"] });
      setForm(emptyForm);
      setShowForm(false);
    },
    onError: (err) => setError(readableError(err, "Nao foi possivel salvar o produto.")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      setError(null);
      const { error } = await db.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products-admin"] }),
    onError: (err) => setError(readableError(err, "Nao foi possivel remover o produto.")),
  });

  const startNew = () => {
    setForm({
      ...emptyForm,
      categoria_id: categories[0]?.id ?? "sacolas",
    });
    setShowForm(true);
    setError(null);
  };

  const startEdit = (product: Product) => {
    setForm({
      id: product.id,
      slug: product.slug,
      nome: product.nome,
      categoria_id: product.categoria_id ?? "",
      tipo: product.tipo,
      descricao: product.descricao,
      medida_publica: product.medida_publica ?? "",
      quantidade_minima: String(product.quantidade_minima ?? 25),
      is_featured: product.is_featured,
      is_active: product.is_active,
      public_config: JSON.stringify(product.public_config ?? {}, null, 2),
      internal_config: JSON.stringify(product.internal_config ?? {}, null, 2),
    });
    setShowForm(true);
    setError(null);
  };

  const pageError = productsError ?? categoriesError;

  return (
    <AdminShell
      title="Produtos"
      subtitle="Cadastro de produtos, vitrine e regras internas"
      actions={
        <button type="button" onClick={startNew} className="btn-gold">
          <Plus className="h-4 w-4" />
          Novo produto
        </button>
      }
    >
      {pageError && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Nao consegui carregar os produtos. Tente sair e entrar de novo no painel.
          <p className="mt-2 text-xs opacity-80">{readableError(pageError)}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: "todos", label: "Todos" },
          { id: "ativos", label: "Ativos" },
          { id: "inativos", label: "Inativos" },
          ...categories.map((category) => ({ id: category.id, label: category.nome })),
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === item.id
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="mb-6 card-elegant space-y-4 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {form.id ? "Editando produto" : "Novo produto"}
              </p>
              <h2 className="font-display text-2xl">{form.nome || "Cadastro"}</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-primary">
                Cancelar
              </button>
              <button type="submit" disabled={save.isPending} className="btn-gold">
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Field
              label="Nome*"
              value={form.nome}
              onChange={(nome) => setForm({ ...form, nome })}
              required
            />
            <Field label="Slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug })} />
            <Field
              type="number"
              label="Quantidade minima"
              value={form.quantidade_minima}
              onChange={(quantidade_minima) => setForm({ ...form, quantidade_minima })}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Categoria
              </span>
              <select
                value={form.categoria_id}
                onChange={(event) => setForm({ ...form, categoria_id: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Tipo</span>
              <select
                value={form.tipo}
                onChange={(event) => setForm({ ...form, tipo: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {PRODUCT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Medida publica"
              value={form.medida_publica}
              onChange={(medida_publica) => setForm({ ...form, medida_publica })}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Descricao
            </label>
            <textarea
              rows={4}
              value={form.descricao}
              onChange={(event) => setForm({ ...form, descricao: event.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <JsonField
              label="Config publico"
              value={form.public_config}
              onChange={(public_config) => setForm({ ...form, public_config })}
            />
            <JsonField
              label="Config interno"
              value={form.internal_config}
              onChange={(internal_config) => setForm({ ...form, internal_config })}
            />
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(event) => setForm({ ...form, is_featured: event.target.checked })}
                className="h-4 w-4 accent-[oklch(0.72_0.09_40)]"
              />
              Destaque na vitrine
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                className="h-4 w-4 accent-[oklch(0.72_0.09_40)]"
              />
              Produto ativo
            </label>
          </div>
        </form>
      )}

      <div className="card-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-right">Minimo</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Carregando produtos...
                  </td>
                </tr>
              )}
              {!isLoading && !pageError && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
              {filtered.map((product) => (
                <tr key={product.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{product.nome}</p>
                    <p className="text-xs text-muted-foreground">{product.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {categoryName(categories, product.categoria_id)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.tipo}</td>
                  <td className="px-4 py-3 text-right">{product.quantidade_minima}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        product.is_active
                          ? "bg-green-500/15 text-green-500"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {product.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(product)}
                        className="rounded p-1.5 hover:bg-secondary"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove.mutate(product.id)}
                        className="rounded p-1.5 text-destructive hover:bg-secondary"
                        title="Excluir"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        required={required}
        type={type}
        min={type === "number" ? "1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}

function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <textarea
        rows={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-xs outline-none focus:border-accent"
      />
    </div>
  );
}

function parseJson(value: string, label: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} precisa ser um objeto JSON.`);
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${label} tem JSON invalido.`);
  }
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryName(categories: Category[], id: string | null) {
  return categories.find((category) => category.id === id)?.nome ?? "-";
}
