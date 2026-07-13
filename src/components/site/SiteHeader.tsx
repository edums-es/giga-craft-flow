import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import logo from "@/assets/giga-logo.asset.json";
import { useCartCount, useHydrated } from "@/lib/cart";
import { SITE } from "@/lib/site-config";

export function SiteHeader() {
  const count = useCartCount();
  const hydrated = useHydrated();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container-giga flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo.url} alt={SITE.nome} className="h-12 w-auto" />
        </Link>
        <nav className="hidden gap-8 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/" activeOptions={{ exact: true }} className="hover:text-foreground [&.active]:text-foreground">
            Início
          </Link>
          <Link to="/catalogo" className="hover:text-foreground [&.active]:text-foreground">
            Catálogo
          </Link>
          <Link to="/orcamento" className="hover:text-foreground [&.active]:text-foreground">
            Meu orçamento
          </Link>
        </nav>
        <Link
          to="/orcamento"
          className="relative inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-accent"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Orçamento</span>
          {hydrated && count > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
