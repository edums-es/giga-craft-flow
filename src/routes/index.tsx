import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Clock, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { CATEGORIAS, PRODUTOS } from "@/data/catalog";
import { useSiteBrandConfig } from "@/lib/use-site-brand-config";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const destaques = PRODUTOS.filter((p) => p.destaque);
  const brand = useSiteBrandConfig();
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 h-[500px] bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--color-rose-gold)_25%,transparent),transparent_60%)]" />
        <div className="container-giga relative grid gap-12 pb-16 pt-16 md:grid-cols-2 md:items-center md:pb-24 md:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Papelaria artesanal premium
            </span>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-foreground md:text-6xl">
              Sacolas, tags e cartões <span className="text-accent">com a alma</span> da sua marca.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Monte seu orçamento em minutos: escolha o produto, personalize e finalize direto no
              WhatsApp. Sem cadastro, sem burocracia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/catalogo" className="btn-gold">
                Começar orçamento <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/produto/$slug"
                params={{ slug: "sacola-personalizada" }}
                className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition hover:border-accent"
              >
                Ver sacolas
              </Link>
            </div>
            <div className="mt-10 grid gap-6 text-sm text-muted-foreground sm:grid-cols-3">
              <Feature
                icon={<Clock className="h-4 w-4" />}
                label="Preço e prazo estimados na hora"
              />
              <Feature
                icon={<Sparkles className="h-4 w-4" />}
                label="Papel premium e acabamento fino"
              />
              <Feature
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Aprovação de arte antes de imprimir"
              />
            </div>
          </div>
          <div className="relative">
            <div className="mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-3xl bg-gradient-to-br from-nude via-card to-rose-gold-soft/40 p-10 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
              <img
                src={brand.logoUrl}
                alt={brand.nome}
                className="w-full max-w-xs object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="container-giga py-20">
        <SectionTitle overline="Explore" title="Categorias" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIAS.map((c) => (
            <Link
              key={c.id}
              to="/catalogo"
              search={{ categoria: c.id }}
              className="card-elegant group p-6"
            >
              <p className="font-display text-2xl text-foreground">{c.nome}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.descricao}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-accent">
                Ver produtos{" "}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Destaques */}
      <section className="container-giga py-8 pb-24">
        <SectionTitle overline="Mais pedidos" title="Personalize agora" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {destaques.map((p) => (
            <Link
              key={p.slug}
              to="/produto/$slug"
              params={{ slug: p.slug }}
              className="card-elegant flex flex-col p-6"
            >
              <div className="mb-6 flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-nude to-rose-gold-soft/40">
                <span className="font-display text-4xl text-accent/70">{p.nome[0]}</span>
              </div>
              <p className="font-display text-2xl text-foreground">{p.nome}</p>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.descricao}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Configurar <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-accent">
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}

function SectionTitle({ overline, title }: { overline: string; title: string }) {
  return (
    <div className="text-center">
      <span className="text-xs uppercase tracking-[0.3em] text-accent">{overline}</span>
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="divider-gold" />
        <h2 className="font-display text-4xl text-foreground">{title}</h2>
        <span className="divider-gold" />
      </div>
    </div>
  );
}
