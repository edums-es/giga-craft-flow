import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { CATEGORIAS, PRODUTOS, type CategoriaId } from "@/data/catalog";

const searchSchema = z.object({
  categoria: z.string().optional(),
});

export const Route = createFileRoute("/catalogo")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Catálogo — Giga Personalizados" },
      { name: "description", content: "Todos os produtos da Giga: sacolas, tags, cartões, caixas, embalagens e mais." },
      { property: "og:title", content: "Catálogo — Giga Personalizados" },
      { property: "og:description", content: "Todos os produtos da Giga em um só lugar." },
    ],
  }),
  component: Catalogo,
});

function Catalogo() {
  const { categoria } = Route.useSearch();
  const produtos = categoria ? PRODUTOS.filter((p) => p.categoria === categoria) : PRODUTOS;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container-giga py-14">
        <span className="text-xs uppercase tracking-[0.3em] text-accent">Catálogo</span>
        <h1 className="mt-3 font-display text-5xl text-foreground">Nossos produtos</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Escolha uma categoria para filtrar ou navegue por todos os produtos disponíveis.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <FilterChip active={!categoria} to={{ search: {} }}>Todos</FilterChip>
          {CATEGORIAS.map((c) => (
            <FilterChip
              key={c.id}
              active={categoria === c.id}
              to={{ search: { categoria: c.id } }}
            >
              {c.nome}
            </FilterChip>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {produtos.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Em breve novos produtos nesta categoria. Fale com a gente pelo WhatsApp para orçamento sob medida.
            </div>
          )}
          {produtos.map((p) => (
            <Link
              key={p.slug}
              to="/produto/$slug"
              params={{ slug: p.slug }}
              className="card-elegant flex flex-col p-6"
            >
              <div className="mb-6 flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-nude to-rose-gold-soft/40">
                <span className="font-display text-4xl text-accent/70">{p.nome[0]}</span>
              </div>
              <p className="text-xs uppercase tracking-widest text-accent">
                {CATEGORIAS.find((c) => c.id === p.categoria)?.nome}
              </p>
              <p className="mt-1 font-display text-2xl text-foreground">{p.nome}</p>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.descricao}</p>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

function FilterChip({
  active,
  to,
  children,
}: {
  active: boolean;
  to: { search: { categoria?: CategoriaId | string } };
  children: React.ReactNode;
}) {
  return (
    <Link
      to="/catalogo"
      search={to.search as { categoria?: string }}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-card hover:border-accent"
      }`}
    >
      {children}
    </Link>
  );
}
