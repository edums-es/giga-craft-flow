import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Filter, PackageCheck, Search, Sparkles } from "lucide-react";
import { z } from "zod";
import { useMemo, type ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { CATEGORIAS, PRODUTOS, type CategoriaId } from "@/data/catalog";
import { useSiteBrandConfig } from "@/lib/use-site-brand-config";

const searchSchema = z.object({
  categoria: z.string().optional(),
});

export const Route = createFileRoute("/catalogo")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Catalogo - Giga Personalizados" },
      {
        name: "description",
        content: "Todos os produtos da Giga: sacolas, tags, cartoes, caixas, embalagens e mais.",
      },
      { property: "og:title", content: "Catalogo - Giga Personalizados" },
      { property: "og:description", content: "Todos os produtos da Giga em um so lugar." },
    ],
  }),
  component: Catalogo,
});

function Catalogo() {
  const { categoria } = Route.useSearch();
  const brand = useSiteBrandConfig();
  const produtos = categoria ? PRODUTOS.filter((p) => p.categoria === categoria) : PRODUTOS;
  const selectedCategory = CATEGORIAS.find((c) => c.id === categoria);
  const featured = useMemo(() => produtos.filter((p) => p.destaque).slice(0, 2), [produtos]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-surface)_82%,black),var(--color-background))]">
          <div className="container-giga grid gap-8 py-12 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Catalogo Giga
              </span>
              <h1 className="mt-5 max-w-3xl font-display text-4xl leading-tight text-foreground md:text-6xl">
                Produtos personalizados prontos para virar proposta.
              </h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Filtre por categoria, escolha o item e configure quantidade, material,
                acabamento e prazo direto na pagina do produto.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Destaques da vitrine
              </p>
              <div className="mt-4 space-y-3">
                {(featured.length ? featured : PRODUTOS.slice(0, 2)).map((produto) => (
                  <Link
                    key={produto.slug}
                    to="/produto/$slug"
                    params={{ slug: produto.slug }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/35 p-3 transition hover:border-accent/70"
                  >
                    <ProductThumb logo={brand.logoUrl} label={produto.nome} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{produto.nome}</p>
                      <p className="text-xs text-muted-foreground">{produto.medida ?? "Sob medida"}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-accent" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-giga py-8">
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-accent" />
                  <p className="font-semibold">Categorias</p>
                </div>
                <div className="mt-4 space-y-2">
                  <FilterChip active={!categoria} to={{ search: {} }} count={PRODUTOS.length}>
                    Todos
                  </FilterChip>
                  {CATEGORIAS.map((c) => (
                    <FilterChip
                      key={c.id}
                      active={categoria === c.id}
                      to={{ search: { categoria: c.id } }}
                      count={PRODUTOS.filter((p) => p.categoria === c.id).length}
                    >
                      {c.nome}
                    </FilterChip>
                  ))}
                </div>
              </div>
            </aside>

            <div>
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-accent">
                    {selectedCategory?.nome ?? "Todos os produtos"}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    {produtos.length} {produtos.length === 1 ? "produto" : "produtos"}
                  </h2>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-2 text-sm text-muted-foreground">
                  <Search className="h-4 w-4" />
                  Escolha um produto para configurar
                </div>
              </div>

              {produtos.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                  Em breve novos produtos nesta categoria. Fale com a gente pelo WhatsApp para
                  orcamento sob medida.
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {produtos.map((produto) => (
                  <Link
                    key={produto.slug}
                    to="/produto/$slug"
                    params={{ slug: produto.slug }}
                    className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-accent/70"
                  >
                    <div className="relative flex aspect-[4/3] items-center justify-center bg-secondary/70 p-7">
                      <ProductMockup logo={brand.logoUrl} label={produto.nome} tipo={produto.tipo} />
                      {produto.destaque && (
                        <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                          Mais pedido
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs uppercase tracking-widest text-accent">
                        {CATEGORIAS.find((c) => c.id === produto.categoria)?.nome}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold text-foreground">{produto.nome}</h3>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {produto.descricao}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <InfoPill icon={<PackageCheck className="h-3.5 w-3.5" />}>
                          Min. {produto.quantidadeMinima} un.
                        </InfoPill>
                        <InfoPill>{produto.medida ?? "Sob medida"}</InfoPill>
                      </div>
                      <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent">
                        Configurar produto
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

function FilterChip({
  active,
  to,
  count,
  children,
}: {
  active: boolean;
  to: { search: { categoria?: CategoriaId | string } };
  count: number;
  children: ReactNode;
}) {
  return (
    <Link
      to="/catalogo"
      search={to.search as { categoria?: string }}
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border bg-secondary/35 text-muted-foreground hover:border-accent/70"
      }`}
    >
      <span>{children}</span>
      <span className="rounded-full bg-background px-2 py-0.5 text-xs">{count}</span>
    </Link>
  );
}

function InfoPill({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="flex min-h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 py-2">
      {icon && <span className="text-accent">{icon}</span>}
      {children}
    </span>
  );
}

function ProductThumb({ logo, label }: { logo: string; label: string }) {
  return (
    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-[linear-gradient(145deg,#f9f3ec,#e8c1a4)] p-2">
      <img src={logo} alt={label} className="max-h-9 object-contain" />
    </div>
  );
}

function ProductMockup({ logo, label, tipo }: { logo: string; label: string; tipo: string }) {
  const isBag = tipo === "sacola";
  return (
    <div
      className={`relative flex items-center justify-center border border-accent/25 bg-[linear-gradient(145deg,#f9f3ec,#e8c1a4)] shadow-lg ${
        isBag
          ? "h-full max-h-48 w-36 rounded-b-2xl rounded-t-sm"
          : "aspect-[4/3] h-full max-h-44 rounded-lg"
      }`}
    >
      {isBag && (
        <div className="absolute left-1/2 top-5 h-9 w-16 -translate-x-1/2 rounded-b-full border-b-2 border-x-2 border-zinc-900/45" />
      )}
      <div className="rounded-md bg-white/84 px-4 py-3 text-center shadow-sm">
        <img src={logo} alt="" className="mx-auto h-10 object-contain" />
        <p className="mt-2 max-w-28 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-800">
          {label}
        </p>
      </div>
    </div>
  );
}
