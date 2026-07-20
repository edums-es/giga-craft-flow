import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Info,
  Loader2,
  PackageCheck,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import {
  CATEGORIAS,
  getProdutoBySlug,
  MATERIAIS,
  QUANTIDADES_PADRAO,
  SACOLAS,
  type AlcaId,
  type CoberturaId,
  type MaterialId,
  type SacolaSize,
} from "@/data/catalog";
import { pricingQuote } from "@/lib/pricing.functions";
import { addToCart } from "@/lib/cart";
import {
  OPCOES_COBERTURA,
  formatBRL,
  type PricingResult,
  type PrintMode,
} from "@/lib/pricing";
import { useSiteBrandConfig } from "@/lib/use-site-brand-config";

export const Route = createFileRoute("/produto/$slug")({
  loader: ({ params }) => {
    const p = getProdutoBySlug(params.slug);
    if (!p) throw notFound();
    return { produto: p };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.produto.nome} - Giga Personalizados` },
          { name: "description", content: loaderData.produto.descricao },
          { property: "og:title", content: `${loaderData.produto.nome} - Giga Personalizados` },
          { property: "og:description", content: loaderData.produto.descricao },
        ]
      : [{ title: "Produto - Giga Personalizados" }],
  }),
  component: ProdutoPage,
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container-giga py-24 text-center">
        <h1 className="font-display text-4xl">Produto não encontrado</h1>
        <Link to="/catalogo" className="mt-6 inline-block text-accent">
          Voltar ao catálogo
        </Link>
      </div>
      <SiteFooter />
    </div>
  ),
});

function ProdutoPage() {
  const { produto } = Route.useLoaderData();
  const navigate = useNavigate();
  const priceFn = useServerFn(pricingQuote);
  const brand = useSiteBrandConfig();

  const [materialId, setMaterialId] = useState<MaterialId>("offset180");
  const [tamanho, setTamanho] = useState<SacolaSize>("p");
  const [quantidade, setQuantidade] = useState<number>(100);
  const [cobertura, setCobertura] = useState<CoberturaId>("branca");
  const [alca, setAlca] = useState<AlcaId>("poliester");
  const [impressao, setImpressao] = useState<PrintMode>("frente");
  const [criacaoArte, setCriacaoArte] = useState(false);
  const [urgencia, setUrgencia] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [adicionado, setAdicionado] = useState(false);

  useEffect(() => {
    setMaterialId(produto.slug === "santinho-politico" ? "offset90" : "offset180");
    setImpressao("frente");
  }, [produto.slug]);

  const input = useMemo(
    () => ({
      slug: produto.slug,
      quantidade,
      materialId,
      cobertura,
      tamanho: produto.tipo === "sacola" ? tamanho : undefined,
      alca: produto.tipo === "sacola" ? alca : undefined,
      impressao,
      criacaoArte,
      urgencia,
    }),
    [
      produto.slug,
      produto.tipo,
      quantidade,
      materialId,
      cobertura,
      tamanho,
      alca,
      impressao,
      criacaoArte,
      urgencia,
    ],
  );

  const mutation = useMutation<PricingResult>({
    mutationFn: () => priceFn({ data: input }),
  });

  useEffect(() => {
    const t = setTimeout(() => mutation.mutate(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);

  const price = mutation.data;
  const categoria = CATEGORIAS.find((c) => c.id === produto.categoria)?.nome ?? "Produto";
  const selectedSize = SACOLAS.find((s) => s.id === tamanho);

  const handleAdd = () => {
    if (!price || !price.valido) return;
    addToCart({
      slug: produto.slug,
      nome: produto.nome,
      config: input,
      precoUnitario: price.precoUnitario,
      precoTotal: price.precoTotal,
      prazoDiasUteis: price.prazoDiasUteis,
      adicionais: price.adicionais,
      resumo: price.resumo,
      observacao: observacao || undefined,
    });
    setAdicionado(true);
    setTimeout(() => navigate({ to: "/orcamento" }), 600);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-giga py-8">
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative flex aspect-square min-h-[360px] items-center justify-center bg-secondary/55 p-8">
                <ProductVisual logo={brand.logoUrl} label={produto.nome} tipo={produto.tipo} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniPreview label={categoria} />
              <MiniPreview label={produto.medida ?? selectedSize?.medida ?? "Sob medida"} icon={<Ruler className="h-4 w-4" />} />
              <MiniPreview label="Produção sob pedido" icon={<PackageCheck className="h-4 w-4" />} />
            </div>
          </section>

          <section>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-accent">{categoria}</p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-foreground md:text-5xl">
                {produto.nome}
              </h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">{produto.descricao}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Trust icon={<ShieldCheck className="h-4 w-4" />} label="Arte aprovada antes" />
                <Trust icon={<Sparkles className="h-4 w-4" />} label="Acabamento artesanal" />
                <Trust icon={<PackageCheck className="h-4 w-4" />} label="Orçamento organizado" />
              </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                {produto.tipo === "sacola" && (
                  <ConfiguratorSection number={1} title="Tamanho">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {SACOLAS.map((s) => (
                        <Option
                          key={s.id}
                          selected={tamanho === s.id}
                          onSelect={() => setTamanho(s.id)}
                          title={s.nome}
                          sub={s.medida}
                        />
                      ))}
                    </div>
                  </ConfiguratorSection>
                )}

                <ConfiguratorSection number={produto.tipo === "sacola" ? 2 : 1} title="Material">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {MATERIAIS.map((m) => (
                      <Option
                        key={m.id}
                        selected={materialId === m.id}
                        onSelect={() => setMaterialId(m.id)}
                        title={m.nome}
                        sub={m.id === "offset90" ? "Leve para impressos" : "Papel premium"}
                      />
                    ))}
                  </div>
                </ConfiguratorSection>

                <ConfiguratorSection
                  number={produto.tipo === "sacola" ? 3 : 2}
                  title="Quantidade"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {QUANTIDADES_PADRAO.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantidade(q)}
                        className={`h-10 rounded-lg border px-4 text-sm transition ${
                          quantidade === q
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border bg-input hover:border-accent"
                        }`}
                      >
                        {q} un.
                      </button>
                    ))}
                    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-input px-3">
                      <span className="text-xs text-muted-foreground">Outra</span>
                      <input
                        type="number"
                        min={1}
                        value={quantidade}
                        onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 0))}
                        className="w-20 bg-transparent text-sm outline-none"
                      />
                    </label>
                  </div>
                </ConfiguratorSection>

                <ConfiguratorSection
                  number={produto.tipo === "sacola" ? 4 : 3}
                  title="Impressão e cobertura"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Option
                      selected={impressao === "frente"}
                      onSelect={() => setImpressao("frente")}
                      title="Frente"
                      sub="Impressão em uma face"
                    />
                    <Option
                      selected={impressao === "frente_verso"}
                      onSelect={() => setImpressao("frente_verso")}
                      title="Frente e verso"
                      sub="Duas faces impressas"
                    />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {OPCOES_COBERTURA.map((o) => (
                      <Option
                        key={o.id}
                        selected={cobertura === o.id}
                        onSelect={() => setCobertura(o.id)}
                        title={o.nome}
                        sub={o.hint}
                      />
                    ))}
                  </div>
                </ConfiguratorSection>

                {produto.tipo === "sacola" && (
                  <ConfiguratorSection number={5} title="Alça">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Option selected={alca === "poliester"} onSelect={() => setAlca("poliester")} title="Poliéster" sub="Pronta e resistente" />
                      <Option selected={alca === "gorgurao"} onSelect={() => setAlca("gorgurao")} title="Gorgurão" sub="Fita de tecido" />
                      <Option selected={alca === "sem"} onSelect={() => setAlca("sem")} title="Sem alça" sub="Modelo envelope" />
                    </div>
                  </ConfiguratorSection>
                )}

                <ConfiguratorSection
                  number={produto.tipo === "sacola" ? 6 : 4}
                  title="Adicionais"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Toggle checked={criacaoArte} onChange={setCriacaoArte} label="Criação de arte" hint="A Giga monta a arte para você." />
                    <Toggle checked={urgencia} onChange={setUrgencia} label="Produção urgente" hint="Reduz prazo com taxa adicional." />
                  </div>
                </ConfiguratorSection>

                <ConfiguratorSection
                  number={produto.tipo === "sacola" ? 7 : 5}
                  title="Observações"
                >
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={3}
                    placeholder="Cores, referência de marca, prazo desejado..."
                    className="w-full rounded-lg border border-border bg-input p-4 text-sm outline-none focus:border-accent"
                  />
                </ConfiguratorSection>
              </div>

              <aside className="xl:sticky xl:top-28 xl:self-start">
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-accent">Estimativa</p>
                  <div className="mt-5 space-y-3">
                    <SummaryLine
                      label="Valor unitário"
                      value={price?.valido ? formatBRL(price.precoUnitario) : "-"}
                    />
                    <SummaryLine
                      label={`Total (${quantidade} un.)`}
                      value={price?.valido ? formatBRL(price.precoTotal) : "-"}
                      strong
                    />
                    <SummaryLine
                      label="Prazo"
                      value={price?.valido ? `${price.prazoDiasUteis} dias úteis` : "-"}
                    />
                  </div>

                  {price?.adicionais.length ? (
                    <div className="mt-4 space-y-1 border-t border-border/60 pt-4 text-sm">
                      {price.adicionais.map((a) => (
                        <div key={a.nome} className="flex justify-between text-muted-foreground">
                          <span>{a.nome}</span>
                          <span>{formatBRL(a.valor)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    Valor estimado. A confirmação final acontece na aprovação do orçamento.
                  </p>

                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!price?.valido || mutation.isPending}
                    className="btn-gold mt-5 w-full disabled:opacity-60"
                  >
                    {mutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : adicionado ? (
                      <>
                        <Check className="h-4 w-4" />
                        Adicionado
                      </>
                    ) : (
                      <>
                        Adicionar ao orçamento
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

function ProductVisual({ logo, label, tipo }: { logo: string; label: string; tipo: string }) {
  if (tipo === "sacola") {
    return (
      <div className="relative h-[320px] w-[230px] rounded-b-[1.5rem] rounded-t-sm border border-accent/35 bg-[linear-gradient(160deg,#f8f3eb,#dfb08f_72%,#ba7e61)] shadow-2xl">
        <div className="absolute left-1/2 top-7 h-16 w-28 -translate-x-1/2 rounded-b-full border-b-2 border-x-2 border-zinc-900/55" />
        <div className="absolute inset-x-6 top-28 rounded-xl bg-white/84 p-4 text-center shadow-lg">
          <img src={logo} alt="" className="mx-auto h-14 object-contain" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-800">
            {label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex aspect-[4/3] w-full max-w-md rotate-[-2deg] items-center justify-center rounded-xl border border-accent/25 bg-[linear-gradient(145deg,#f9f3ec,#e8c1a4)] p-8 shadow-2xl">
      <div className="absolute inset-4 rounded-lg border border-white/45" />
      <div className="relative rounded-lg bg-white/86 px-8 py-6 text-center shadow">
        <img src={logo} alt="" className="mx-auto h-16 object-contain" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-800">
          {label}
        </p>
      </div>
    </div>
  );
}

function MiniPreview({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="text-accent">{icon ?? <Sparkles className="h-4 w-4" />}</span>
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}

function Trust({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/35 px-3 py-2 text-sm text-muted-foreground">
      <span className="text-accent">{icon}</span>
      {label}
    </div>
  );
}

function ConfiguratorSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-xs font-semibold text-accent">
          {number}
        </span>
        <h3 className="font-display text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Option({
  selected,
  onSelect,
  title,
  sub,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-20 rounded-lg border p-4 text-left transition ${
        selected
          ? "border-accent bg-accent/10"
          : "border-border bg-input hover:border-accent/60"
      }`}
    >
      <p className="font-medium text-foreground">{title}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
        checked ? "border-accent bg-accent/10" : "border-border bg-input hover:border-accent/60"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[oklch(0.72_0.09_40)]"
      />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </label>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? "font-display text-2xl text-accent" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
