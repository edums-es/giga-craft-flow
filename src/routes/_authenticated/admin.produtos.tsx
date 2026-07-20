import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit2,
  Eye,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
  public_config: Record<string, unknown> | null;
  internal_config: Record<string, unknown> | null;
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
  imagem_url: string;
  selo: string;
  preco_referencia: string;
  sku: string;
  estoque_status: string;
  prazo_texto: string;
  material_padrao: string;
  custo_base: string;
  margem_alvo: string;
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
  imagem_url: "",
  selo: "",
  preco_referencia: "",
  sku: "",
  estoque_status: "Sob encomenda",
  prazo_texto: "Prazo combinado no orcamento",
  material_padrao: "Offset 180g",
  custo_base: "",
  margem_alvo: "65",
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

const STOCK_STATUS = ["Sob encomenda", "Disponivel", "Poucas unidades", "Pausado"];

function ProdutosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
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

  const stats = useMemo(
    () => ({
      total: products.length,
      ativos: products.filter((product) => product.is_active).length,
      destaques: products.filter((product) => product.is_featured).length,
      categorias: new Set(products.map((product) => product.categoria_id).filter(Boolean)).size,
    }),
    [products],
  );

  const filtered = useMemo(() => {
    const term = normalizeSearch(search);
    return products.filter((product) => {
      const matchesFilter =
        filter === "todos" ||
        (filter === "ativos" && product.is_active) ||
        (filter === "inativos" && !product.is_active) ||
        product.categoria_id === filter;
      const matchesSearch =
        !term ||
        normalizeSearch(product.nome).includes(term) ||
        normalizeSearch(product.slug).includes(term) ||
        normalizeSearch(product.tipo).includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [products, filter, search]);

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      const publicConfig = cleanConfig({
        ...parseJson(form.public_config, "Config publico"),
        imagemUrl: optionalText(form.imagem_url),
        selo: optionalText(form.selo),
        precoReferencia: optionalNumber(form.preco_referencia),
        sku: optionalText(form.sku),
        estoqueStatus: optionalText(form.estoque_status),
        prazoTexto: optionalText(form.prazo_texto),
      });
      const internalConfig = cleanConfig({
        ...parseJson(form.internal_config, "Config interno"),
        materialPadrao: optionalText(form.material_padrao),
        custoBase: optionalNumber(form.custo_base),
        margemAlvo: optionalNumber(form.margem_alvo),
      });
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
    const publicConfig = recordConfig(product.public_config);
    const internalConfig = recordConfig(product.internal_config);
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
      imagem_url: configString(publicConfig, ["imagemUrl", "imagem_url", "imageUrl"]),
      selo: configString(publicConfig, ["selo", "badge"]),
      preco_referencia: configNumber(publicConfig, ["precoReferencia", "preco_referencia"]),
      sku: configString(publicConfig, ["sku"]),
      estoque_status:
        configString(publicConfig, ["estoqueStatus", "estoque_status"]) || "Sob encomenda",
      prazo_texto: configString(publicConfig, ["prazoTexto", "prazo_texto"]),
      material_padrao: configString(internalConfig, ["materialPadrao", "material_padrao"]),
      custo_base: configNumber(internalConfig, ["custoBase", "custo_base"]),
      margem_alvo: configNumber(internalConfig, ["margemAlvo", "margem_alvo"]),
      public_config: JSON.stringify(publicConfig, null, 2),
      internal_config: JSON.stringify(internalConfig, null, 2),
    });
    setShowForm(true);
    setError(null);
  };

  const pageError = productsError ?? categoriesError;

  return (
    <AdminShell
      title="Produtos"
      subtitle="Cadastro, vitrine publica e configuracao comercial"
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

      <div className="mb-5 grid gap-3 lg:grid-cols-4">
        <Metric icon={<ShoppingBag className="h-4 w-4" />} label="Produtos" value={stats.total} />
        <Metric icon={<Package className="h-4 w-4" />} label="Ativos" value={stats.ativos} />
        <Metric icon={<Star className="h-4 w-4" />} label="Destaques" value={stats.destaques} />
        <Metric icon={<Tag className="h-4 w-4" />} label="Categorias" value={stats.categorias} />
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "todos", label: "Todos" },
            { id: "ativos", label: "Ativos" },
            { id: "inativos", label: "Inativos" },
            ...categories.map((category) => ({ id: category.id, label: category.nome })),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                filter === item.id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="flex min-w-[260px] items-center gap-2 rounded-lg border border-border bg-input px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar produto, slug ou tipo"
            className="w-full bg-transparent outline-none"
          />
        </label>
      </div>

      {showForm && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="mb-6 rounded-xl border border-accent/35 bg-card"
        >
          <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-accent">
                {form.id ? "Editando produto" : "Novo produto"}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{form.nome || "Cadastro ecommerce"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Organize nome, imagem, preco, status e regras internas do produto.
              </p>
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

          <div className="grid gap-6 p-5 xl:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <FormBlock title="Vitrine do produto" icon={<ShoppingBag className="h-4 w-4" />}>
                <div className="grid gap-3 lg:grid-cols-3">
                  <Field
                    label="Nome*"
                    value={form.nome}
                    onChange={(nome) => setForm({ ...form, nome })}
                    required
                  />
                  <Field
                    label="Slug"
                    value={form.slug}
                    onChange={(slug) => setForm({ ...form, slug })}
                  />
                  <Field
                    label="SKU / codigo interno"
                    value={form.sku}
                    onChange={(sku) => setForm({ ...form, sku })}
                  />
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
                  <Field
                    label="Imagem do produto"
                    value={form.imagem_url}
                    onChange={(imagem_url) => setForm({ ...form, imagem_url })}
                    placeholder="https://..."
                  />
                  <Field
                    label="Selo"
                    value={form.selo}
                    onChange={(selo) => setForm({ ...form, selo })}
                    placeholder="Mais vendido"
                  />
                  <Field
                    type="number"
                    label="Preco referencia"
                    value={form.preco_referencia}
                    onChange={(preco_referencia) => setForm({ ...form, preco_referencia })}
                    placeholder="0"
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
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Tipo
                    </span>
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
                  <label className="block">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Status de estoque
                    </span>
                    <select
                      value={form.estoque_status}
                      onChange={(event) =>
                        setForm({ ...form, estoque_status: event.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      {STOCK_STATUS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <Field
                    label="Medida publica"
                    value={form.medida_publica}
                    onChange={(medida_publica) => setForm({ ...form, medida_publica })}
                    placeholder="15 x 14 x 7,5 cm"
                  />
                  <Field
                    type="number"
                    label="Quantidade minima"
                    value={form.quantidade_minima}
                    onChange={(quantidade_minima) => setForm({ ...form, quantidade_minima })}
                  />
                  <Field
                    label="Prazo publico"
                    value={form.prazo_texto}
                    onChange={(prazo_texto) => setForm({ ...form, prazo_texto })}
                  />
                </div>

                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    Descricao para vitrine
                  </span>
                  <textarea
                    rows={4}
                    value={form.descricao}
                    onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>

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
              </FormBlock>

              <FormBlock title="Comercial e producao" icon={<Package className="h-4 w-4" />}>
                <div className="grid gap-3 lg:grid-cols-3">
                  <Field
                    label="Material padrao"
                    value={form.material_padrao}
                    onChange={(material_padrao) => setForm({ ...form, material_padrao })}
                  />
                  <Field
                    type="number"
                    label="Custo base interno"
                    value={form.custo_base}
                    onChange={(custo_base) => setForm({ ...form, custo_base })}
                    placeholder="0"
                  />
                  <Field
                    type="number"
                    label="Margem alvo %"
                    value={form.margem_alvo}
                    onChange={(margem_alvo) => setForm({ ...form, margem_alvo })}
                    placeholder="65"
                  />
                </div>
              </FormBlock>

              <FormBlock title="Configuracao avancada" icon={<Eye className="h-4 w-4" />}>
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
              </FormBlock>
            </div>

            <aside className="space-y-4">
              <ProductPreview form={form} categoryName={categoryName(categories, form.categoria_id)} />
              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Como isso aparece na loja</p>
                <p className="mt-2">
                  Nome, imagem, selo, medida, preco de referencia e prazo alimentam a vitrine. Os
                  campos internos ficam para calculo, compra e producao.
                </p>
              </div>
            </aside>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-xl border border-border bg-card" />
          ))}

        {!isLoading && !pageError && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground md:col-span-2 xl:col-span-3">
            Nenhum produto encontrado.
          </div>
        )}

        {filtered.map((product) => (
          <AdminProductCard
            key={product.id}
            product={product}
            category={categoryName(categories, product.categoria_id)}
            onEdit={() => startEdit(product)}
            onRemove={() => remove.mutate(product.id)}
            removing={remove.isPending}
          />
        ))}
      </div>
    </AdminShell>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="rounded-lg bg-accent/10 p-2 text-accent">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FormBlock({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-accent">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ProductPreview({ form, categoryName }: { form: ProductForm; categoryName: string }) {
  const price = optionalNumber(form.preco_referencia);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-secondary p-5">
        {form.imagem_url ? (
          <img src={form.imagem_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-accent/45 bg-background/60 text-accent">
            <ImagePlus className="h-8 w-8" />
          </div>
        )}
        {form.selo && (
          <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            {form.selo}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">{categoryName}</p>
            <h3 className="mt-1 text-lg font-semibold">{form.nome || "Nome do produto"}</h3>
          </div>
          {form.is_featured && <Star className="h-4 w-4 fill-accent text-accent" />}
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {form.descricao || "Descricao curta do produto para ajudar o cliente a entender a oferta."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="rounded-lg bg-secondary px-3 py-2">
            Min. {form.quantidade_minima || 1} un.
          </span>
          <span className="rounded-lg bg-secondary px-3 py-2">
            {form.medida_publica || "Medida variavel"}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">A partir de</p>
            <p className="text-xl font-semibold">{price ? formatBRL(price) : "Sob consulta"}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              form.is_active ? "bg-green-500/15 text-green-500" : "bg-secondary text-muted-foreground"
            }`}
          >
            {form.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
      </div>
    </div>
  );
}

function AdminProductCard({
  product,
  category,
  onEdit,
  onRemove,
  removing,
}: {
  product: Product;
  category: string;
  onEdit: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const publicConfig = recordConfig(product.public_config);
  const imageUrl = configString(publicConfig, ["imagemUrl", "imagem_url", "imageUrl"]);
  const badge = configString(publicConfig, ["selo", "badge"]);
  const price = optionalNumber(configNumber(publicConfig, ["precoReferencia", "preco_referencia"]));

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative flex aspect-[16/10] items-center justify-center bg-secondary">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-accent/35 bg-background/60 text-accent">
            <Package className="h-7 w-7" />
          </div>
        )}
        {badge && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            {badge}
          </span>
        )}
        <div className="absolute right-3 top-3 flex gap-2">
          <button onClick={onEdit} className="rounded-lg bg-background/85 p-2 hover:bg-background" title="Editar">
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            disabled={removing}
            className="rounded-lg bg-background/85 p-2 text-destructive hover:bg-background disabled:opacity-50"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">{category}</p>
            <h3 className="mt-1 font-semibold">{product.nome}</h3>
          </div>
          {product.is_featured && <Star className="h-4 w-4 fill-accent text-accent" />}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.descricao}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="rounded-lg bg-secondary px-3 py-2">{product.tipo}</span>
          <span className="rounded-lg bg-secondary px-3 py-2">Min. {product.quantidade_minima}</span>
          <span className="rounded-lg bg-secondary px-3 py-2">{product.medida_publica ?? "Sem medida"}</span>
          <span className="rounded-lg bg-secondary px-3 py-2">{product.slug}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="font-semibold">{price ? formatBRL(price) : "Sob consulta"}</p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs ${
              product.is_active
                ? "bg-green-500/15 text-green-500"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {product.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        required={required}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
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
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <textarea
        rows={7}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-xs outline-none focus:border-accent"
      />
    </label>
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

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function optionalNumber(value: string | number | undefined) {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function cleanConfig(config: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined && value !== ""),
  );
}

function recordConfig(value: Record<string, unknown> | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function configString(config: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

function configNumber(config: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
