import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Clock,
  PackageCheck,
  Palette,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
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

      <section className="relative overflow-hidden border-b border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-surface)_78%,black),var(--color-background))]">
        <div className="container-giga relative grid gap-10 pb-12 pt-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-16 lg:pt-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Papelaria personalizada para marcas
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.03] text-foreground md:text-6xl">
              Embalagens, tags e cartões com cara de produto premium.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Escolha o produto, ajuste quantidade, material e acabamento, e receba uma estimativa
              organizada antes de falar com a Giga.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/catalogo" className="btn-gold">
                Ver catálogo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/produto/$slug"
                params={{ slug: "sacola-personalizada" }}
                className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition hover:border-accent"
              >
                Ver sacolas
              </Link>
            </div>
            <div className="mt-9 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <Feature icon={<Clock className="h-4 w-4" />} label="Preço e prazo na hora" />
              <Feature icon={<PackageCheck className="h-4 w-4" />} label="Sacolas, tags e caixas" />
              <Feature icon={<ShieldCheck className="h-4 w-4" />} label="Aprovação antes de produzir" />
            </div>
          </div>

          <div className="relative min-h-[420px]">
            <div className="absolute inset-x-6 bottom-0 h-16 rounded-[50%] bg-black/35 blur-xl" />
            <div className="relative grid min-h-[420px] grid-cols-[0.85fr_1.15fr] items-end gap-4 rounded-[2rem] border border-border bg-card p-5 shadow-[0_32px_90px_-55px_rgba(0,0,0,0.8)]">
              <div className="space-y-4 pb-4">
                <ProductMockup logo={brand.logoUrl} label="Tags" className="h-32 rotate-[-4deg]" />
                <ProductMockup
                  logo={brand.logoUrl}
                  label="Cartões"
                  className="h-28 translate-x-6 rotate-[3deg]"
                />
              </div>
              <div className="relative flex h-[350px] items-end justify-center">
                <div className="relative h-[330px] w-[240px] rounded-b-[1.5rem] rounded-t-sm border border-accent/35 bg-[linear-gradient(160deg,#f8f3eb,#dfb08f_72%,#ba7e61)] shadow-2xl">
                  <div className="absolute left-1/2 top-7 h-16 w-28 -translate-x-1/2 rounded-b-full border-b-2 border-x-2 border-zinc-900/55" />
                  <div className="absolute inset-x-6 top-28 rounded-xl bg-white/84 p-4 text-center shadow-lg">
                    <img src={brand.logoUrl} alt={brand.nome} className="mx-auto h-14 object-contain" />
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-800">
                      Personalizados
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-giga py-14">
        <div className="grid gap-4 md:grid-cols-3">
          <Benefit
            icon={<Palette className="h-5 w-5" />}
            title="Personalização guiada"
            text="Produto, papel, acabamento e quantidade no mesmo fluxo."
          />
          <Benefit
            icon={<Truck className="h-5 w-5" />}
            title="Pedido pronto para negociar"
            text="O carrinho vira uma proposta organizada para o WhatsApp."
          />
          <Benefit
            icon={<PackageCheck className="h-5 w-5" />}
            title="Catálogo vivo"
            text="Novos produtos entram no sistema sem depender de retrabalho."
          />
        </div>
      </section>

      <section className="container-giga py-12">
        <SectionTitle overline="Explore" title="Categorias" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIAS.map((c) => (
            <Link
              key={c.id}
              to="/catalogo"
              search={{ categoria: c.id }}
              className="group rounded-lg border border-border bg-card p-5 transition hover:border-accent/70"
            >
              <p className="font-display text-xl text-foreground">{c.nome}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.descricao}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-accent">
                Ver produtos
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-giga py-8 pb-24">
        <SectionTitle overline="Mais pedidos" title="Personalize agora" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {destaques.map((p) => (
            <Link
              key={p.slug}
              to="/produto/$slug"
              params={{ slug: p.slug }}
              className="group overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent/70"
            >
              <div className="flex aspect-[4/3] items-center justify-center bg-secondary/70 p-7">
                <ProductMockup logo={brand.logoUrl} label={p.nome} className="h-full max-h-44" />
              </div>
              <div className="p-5">
                <p className="text-xs uppercase tracking-widest text-accent">
                  {CATEGORIAS.find((c) => c.id === p.categoria)?.nome}
                </p>
                <p className="mt-1 font-display text-xl text-foreground">{p.nome}</p>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.descricao}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Configurar
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}

function ProductMockup({
  logo,
  label,
  className = "",
}: {
  logo: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex aspect-[4/3] items-center justify-center rounded-lg border border-accent/25 bg-[linear-gradient(145deg,#f9f3ec,#e8c1a4)] p-4 shadow-lg ${className}`}
    >
      <div className="absolute inset-2 rounded-md border border-white/45" />
      <div className="relative rounded-md bg-white/82 px-4 py-3 text-center shadow-sm">
        <img src={logo} alt="" className="mx-auto h-10 object-contain" />
        <p className="mt-2 max-w-28 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-800">
          {label}
        </p>
      </div>
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

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </div>
      <p className="mt-4 font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function SectionTitle({ overline, title }: { overline: string; title: string }) {
  return (
    <div className="text-center">
      <span className="text-xs uppercase tracking-[0.3em] text-accent">{overline}</span>
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="divider-gold" />
        <h2 className="font-display text-3xl text-foreground md:text-4xl">{title}</h2>
        <span className="divider-gold" />
      </div>
    </div>
  );
}
